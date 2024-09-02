import { test, describe } from 'node:test'
import { equal, ok, deepEqual } from 'node:assert/strict'
import { EdgeVectorShape } from './EdgeVectorShape'
import { ShapeIndex } from './ShapeIndex'
import { CrossingEdgeQuery } from './CrossingEdgeQuery'
import { CROSS, crossingSign, DO_NOT_CROSS } from './edge_crossings'
import { distanceFromSegment, interpolateAtDistance } from './edge_distances'
import { MAX_LEVEL } from './cellid_constants'
import { MaxDiagMetric } from './Metric_constants'
import { CROSSING_TYPE_ALL, CROSSING_TYPE_INTERIOR } from './shapeutil'
import {
  oneIn,
  randomCellID,
  randomCellIDForLevel,
  randomFloat64,
  randomUniformInt,
  samplePointFromCap
} from './testing'
import { makePolyline, parsePoint } from './testing_textformat'
import { faceUVToXYZ, unitNorm, uvwAxis } from './stuv'
import { Point } from './Point'
import { Cap } from './Cap'
import { Cell } from './Cell'
import { Edge } from './Shape'
import { Polyline } from './Polyline'
import { nextAfter } from '../r1/math'

const MAX_EDGES_PER_CELL = 1

describe('s2.CrossingEdgeQuery', () => {
  /**
   * Perturbs a point at a given distance along the edge defined by points a0 and b0.
   * Randomly perturbs the coordinates slightly to one side of the edge or the other.
   */
  const perturbAtDistance = (distance: number, a0: Point, b0: Point): Point => {
    let x = interpolateAtDistance(distance, a0, b0)

    if (oneIn(2)) {
      x = new Point(
        oneIn(2) ? nextAfter(x.x, 1) : nextAfter(x.x, -1),
        oneIn(2) ? nextAfter(x.y, 1) : nextAfter(x.y, -1),
        oneIn(2) ? nextAfter(x.z, 1) : nextAfter(x.z, -1)
      )
      x = Point.fromVector(x.vector.normalize())
    }

    return x
  }

  /**
   * Generates sub-edges of some given edge (a, b).
   * The length of the sub-edges is distributed exponentially over a large range,
   * and the endpoints may be slightly perturbed to one side of (a, b) or the other.
   */
  const generatePerturbedSubEdges = (a: Point, b: Point, count: number): Edge[] => {
    const edges: Edge[] = []

    a = Point.fromVector(a.vector.normalize())
    b = Point.fromVector(b.vector.normalize())

    const length0 = a.distance(b)

    for (let i = 0; i < count; i++) {
      const length = length0 * Math.pow(1e-15, randomFloat64())
      const offset = (length0 - length) * randomFloat64()
      edges.push(new Edge(perturbAtDistance(offset, a, b), perturbAtDistance(offset + length, a, b)))
    }

    return edges
  }

  /**
   * Creates edges whose center is randomly chosen from the given cap,
   * and whose length is randomly chosen up to maxLength.
   */
  const generateCapEdges = (centerCap: Cap, maxLength: number, count: number): Edge[] => {
    const edges: Edge[] = []

    for (let i = 0; i < count; i++) {
      const center = samplePointFromCap(centerCap)
      const edgeCap = Cap.fromCenterAngle(center, 0.5 * maxLength)
      const p1 = samplePointFromCap(edgeCap)

      // Compute p1 reflected through center, and normalize for good measure.
      const p2 = Point.fromVector(
        center.vector
          .mul(2 * p1.vector.dot(center.vector))
          .sub(p1.vector)
          .normalize()
      )

      edges.push(new Edge(p1, p2))
    }

    return edges
  }

  const testCrossingEdgeQueryAllCrossings = (edges: Edge[]) => {
    const s = new EdgeVectorShape()
    for (const edge of edges) s.add(edge.v0, edge.v1)

    const index = new ShapeIndex()
    index.maxEdgesPerCell = MAX_EDGES_PER_CELL
    index.add(s)

    let numCandidates = 0
    let numNearbyPairs = 0

    for (const edge of edges) {
      const { v0: a, v1: b } = edge
      const query = new CrossingEdgeQuery(index)
      const candidates = query.candidates(a, b, s)

      const edgeMap = query.candidatesEdgeMap(a, b)
      equal(edgeMap.size, 1)

      for (const [k, v] of Object.entries(edgeMap)) {
        equal(s, k)
        deepEqual(candidates, v)
      }

      ok(candidates.length > 0)

      for (let i = 0; i < candidates.length - 1; i++) {
        ok(candidates[i] <= candidates[i + 1])
      }

      ok(candidates[0] >= 0)
      ok(candidates[candidates.length - 1] < s.numEdges())

      numCandidates += candidates.length

      const expectedCrossings: number[] = []
      const expectedInteriorCrossings: number[] = []
      const missingCandidates: number[] = []

      for (let i = 0; i < s.numEdges(); i++) {
        const edge = s.edge(i)
        const sign = crossingSign(a, b, edge.v0, edge.v1)
        if (sign !== DO_NOT_CROSS) {
          expectedCrossings.push(i)
          if (sign === CROSS) expectedInteriorCrossings.push(i)
          numNearbyPairs++

          if (!candidates.includes(i)) missingCandidates.push(i)
        } else {
          const maxDist = MaxDiagMetric.value(MAX_LEVEL)
          if (
            distanceFromSegment(a, edge.v0, edge.v1) < maxDist ||
            distanceFromSegment(b, edge.v0, edge.v1) < maxDist ||
            distanceFromSegment(edge.v0, a, b) < maxDist ||
            distanceFromSegment(edge.v1, a, b) < maxDist
          ) {
            numNearbyPairs++
          }
        }
      }

      equal(missingCandidates.length, 0)

      const actualCrossings = query.crossings(a, b, s, CROSSING_TYPE_ALL)
      deepEqual(actualCrossings, expectedCrossings)

      const edgeMapCrossings = query.crossingsEdgeMap(a, b, CROSSING_TYPE_ALL)
      if (Object.keys(edgeMapCrossings).length > 0) {
        equal(Object.keys(edgeMapCrossings).length, 1)
        for (const [k, v] of Object.entries(edgeMapCrossings)) {
          equal(s, k)
          deepEqual(v, expectedCrossings)
        }
      }

      const actualInteriorCrossings = query.crossings(a, b, s, CROSSING_TYPE_INTERIOR)
      deepEqual(actualInteriorCrossings, expectedInteriorCrossings)
    }

    ok(numCandidates <= 3 * numNearbyPairs)
  }

  test('crossing candidates perturbed cube edges', () => {
    for (let iter = 0; iter < 10; iter++) {
      const face = randomUniformInt(6)
      const scale = Math.pow(1e-15, randomFloat64())
      const u = scale * 2 * randomUniformInt(2) - 1
      const v = scale * 2 * randomUniformInt(2) - 1

      const a = Point.fromVector(faceUVToXYZ(face, u, v))
      const b = Point.fromVector(a.vector.sub(unitNorm(face).mul(2)))

      const edges = generatePerturbedSubEdges(a, b, 30)
      testCrossingEdgeQueryAllCrossings(edges)
    }
  })

  test('candidates perturbed cube face axes', () => {
    for (let iter = 0; iter < 5; iter++) {
      const face = randomUniformInt(6)
      const scale = Math.pow(1e-15, randomFloat64())
      const axis = uvwAxis(face, randomUniformInt(2))
      const a = Point.fromVector(axis.mul(scale).add(unitNorm(face)))
      const b = Point.fromVector(axis.mul(scale).sub(unitNorm(face)))
      const edges = generatePerturbedSubEdges(a, b, 30)
      testCrossingEdgeQueryAllCrossings(edges)
    }
  })

  test('candidates cap edges near cube vertex', () => {
    const edges = generateCapEdges(Cap.fromCenterAngle(Point.fromCoords(-1, -1, 1), 1e-3), 1e-4, 1000)
    testCrossingEdgeQueryAllCrossings(edges)
  })

  test('candidates degenerate edge on cell vertex is its own candidate', () => {
    for (let iter = 0; iter < 100; iter++) {
      const cell = Cell.fromCellID(randomCellID())
      const edges = [new Edge(cell.vertex(0), cell.vertex(0))]
      testCrossingEdgeQueryAllCrossings(edges)
    }
  })

  test('candidates collinear edges on cell boundaries', () => {
    const NUM_EDGE_INTERVALS = 8
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const edges: Edge[] = []
      const cell = Cell.fromCellID(randomCellIDForLevel(level))
      const i = randomUniformInt(4)
      const p1 = cell.vertex(i % 4)
      const p2 = cell.vertex((i + 1) % 4)
      const delta = p2.vector.sub(p1.vector).mul(1 / NUM_EDGE_INTERVALS)

      for (let i = 0; i <= NUM_EDGE_INTERVALS; i++) {
        for (let j = 0; j < i; j++) {
          edges.push(
            new Edge(
              Point.fromVector(p1.vector.add(delta.mul(i)).normalize()),
              Point.fromVector(p1.vector.add(delta.mul(j)).normalize())
            )
          )
        }
      }
      testCrossingEdgeQueryAllCrossings(edges)
    }
  })

  test('crossings polyline crossings', () => {
    const index = new ShapeIndex()

    index.add(makePolyline('0:0, 2:1, 0:2, 2:3, 0:4, 2:5, 0:6'))
    index.add(makePolyline('1:0, 3:1, 1:2, 3:3, 1:4, 3:5, 1:6'))
    index.add(makePolyline('2:0, 4:1, 2:2, 4:3, 2:4, 4:5, 2:6'))
    index.begin()

    const tests = [
      { a0: parsePoint('1:0'), a1: parsePoint('1:4') },
      { a0: parsePoint('5:5'), a1: parsePoint('6:6') }
    ]

    for (const { a0, a1 } of tests) {
      const query = new CrossingEdgeQuery(index)
      const edgeMap = query.crossingsEdgeMap(a0, a1, CROSSING_TYPE_ALL)

      if (edgeMap.size === 0) continue

      edgeMap.forEach((edges, shape) => {
        const polyline = shape as Polyline
        ok(edges.length > 0)

        for (const edge of edges) {
          const b0 = polyline.points[edge]
          const b1 = polyline.points[edge + 1]
          const got = crossingSign(a0, a1, b0, b1)
          ok(got !== DO_NOT_CROSS)
        }
      })

      index.shapes.forEach((shape) => {
        const polyline = shape as Polyline
        const edges = edgeMap.get(shape) || []

        for (let e = 0; e < polyline.points.length - 1; e++) {
          const got = crossingSign(a0, a1, polyline.points[e], polyline.points[e + 1])
          if (got !== DO_NOT_CROSS) {
            const count = edges.filter((edge) => edge === e).length
            equal(count, 1)
          }
        }
      })
    }
  })

  test('iniqueInts', () => {
    const tests = [
      { have: [], want: [] },
      { have: [1], want: [1] },
      { have: [3, 2, 1], want: [1, 2, 3] },
      { have: [4, 4, 4], want: [4] },
      {
        have: [1, 2, 3, 4, 2, 3, 5, 4, 6, 1, 2, 3, 4, 5, 7, 8, 1, 3, 1, 2, 3, 9, 3, 2, 1],
        want: [1, 2, 3, 4, 5, 6, 7, 8, 9]
      }
    ]

    for (const { have, want } of tests) {
      const got = CrossingEdgeQuery.uniqueInts(have)
      deepEqual(got, want)
    }
  })
})
