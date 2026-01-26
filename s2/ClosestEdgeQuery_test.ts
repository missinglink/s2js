import { test, describe } from 'node:test'
import { equal, ok } from 'node:assert/strict'
import {
  ClosestEdgeQuery,
  ClosestEdgeQueryOptions,
  ClosestEdgeQueryResult,
  PointTarget,
  EdgeTarget,
  CellTarget,
  ShapeIndexTarget,
  isInteriorResult,
  isEmptyResult,
  emptyClosestEdgeQueryResult
} from './ClosestEdgeQuery'
import { Cell } from './Cell'
import { LatLng } from './LatLng'
import { Loop } from './Loop'
import { Point } from './Point'
import { Polygon } from './Polygon'
import { Polyline } from './Polyline'
import { PointVector } from './PointVector'
import { ShapeIndex } from './ShapeIndex'
import * as chordangle from '../s1/chordangle'
import { parsePoint, parsePoints } from './testing_textformat'
import { Vector } from '../r3/Vector'

/**
 * Creates a rectangular S2Polygon from lat/lng bounds in degrees.
 * The loop is oriented counter-clockwise (interior on the left).
 */
const makeRectPolygon = (
  bottomLeftLat: number,
  bottomLeftLng: number,
  topRightLat: number,
  topRightLng: number
): Polygon => {
  const bottomLeft = Point.fromLatLng(LatLng.fromDegrees(bottomLeftLat, bottomLeftLng))
  const bottomRight = Point.fromLatLng(LatLng.fromDegrees(bottomLeftLat, topRightLng))
  const topRight = Point.fromLatLng(LatLng.fromDegrees(topRightLat, topRightLng))
  const topLeft = Point.fromLatLng(LatLng.fromDegrees(topRightLat, bottomLeftLng))
  // CCW order: bottomLeft -> topLeft -> topRight -> bottomRight
  const loop = new Loop([bottomLeft, bottomRight, topRight, topLeft])
  return new Polygon([loop])
}

/**
 * Creates a ShapeIndex containing points from a string specification.
 * Format: "lat1:lng1 | lat2:lng2 | ..."
 */
const makePointIndex = (spec: string): ShapeIndex => {
  const index = new ShapeIndex()
  const pointStrings = spec.split('|').map((s) => s.trim())
  for (const ps of pointStrings) {
    if (ps.length === 0) continue
    const point = parsePoint(ps)
    // Create a degenerate polyline (single point).
    const polyline = new Polyline([point, point])
    index.add(polyline)
  }
  return index
}

/**
 * Creates a ShapeIndex containing a polyline from a string specification.
 * Format: "lat1:lng1, lat2:lng2, lat3:lng3"
 */
const makePolylineIndex = (spec: string): ShapeIndex => {
  const index = new ShapeIndex()
  const points = parsePoints(spec)
  const polyline = new Polyline(points)
  index.add(polyline)
  return index
}

/**
 * Creates a ShapeIndex containing a polygon from vertices.
 */
const makePolygonIndex = (spec: string): ShapeIndex => {
  const index = new ShapeIndex()
  const points = parsePoints(spec)
  const loop = new Loop(points)
  const polygon = new Polygon([loop])
  index.add(polygon)
  return index
}

describe('S2ClosestEdgeQuery', () => {
  test('NoEdges', () => {
    // Precondition: An empty ShapeIndex.
    const index = new ShapeIndex()

    // Under test: Query for the closest edge returns an empty result.
    const query = new ClosestEdgeQuery(index)
    const target = new PointTarget(new Point(1, 0, 0))
    const edge = query.findClosestEdge(target)

    // Postcondition: Result indicates no edge was found.
    equal(edge.distance, chordangle.infChordAngle())
    equal(edge.shapeID, -1)
    equal(edge.edgeID, -1)
    ok(!isInteriorResult(edge))
    ok(isEmptyResult(edge))
    equal(query.getDistance(target), chordangle.infChordAngle())
  })

  test('OptionsNotModified', () => {
    // Precondition: An index with 3 point shapes and specific query options.
    const options = new ClosestEdgeQueryOptions()
    options.maxResults = 3
    options.maxDistance = chordangle.fromAngle(3 * (Math.PI / 180)) // 3 degrees
    options.maxError = chordangle.fromAngle(0.001 * (Math.PI / 180)) // 0.001 degrees

    const index = makePointIndex('1:1 | 1:2 | 1:3')
    const query = new ClosestEdgeQuery(index, options)
    const target = new PointTarget(parsePoint('2:2'))

    // Under test: Query methods should not modify options.
    const closestEdge = query.findClosestEdge(target)
    // The closest point is 1:2 which is shape 1 (second shape), edge 0.
    equal(closestEdge.shapeID, 1)
    equal(closestEdge.edgeID, 0)

    const distance = query.getDistance(target)
    const distanceDegrees = chordangle.angle(distance) * (180 / Math.PI)
    ok(Math.abs(distanceDegrees - 1.0) < 0.1, `Distance should be approximately 1 degree, got ${distanceDegrees}`)

    ok(query.isDistanceLess(target, chordangle.fromAngle(1.5 * (Math.PI / 180))))

    // Postcondition: Options remain unchanged.
    equal(query.options.maxResults, 3)
    equal(query.options.maxDistance, options.maxDistance)
    equal(query.options.maxError, options.maxError)
  })

  test('DistanceEqualToLimit', () => {
    // Precondition: An index with one point.
    const p0 = parsePoint('23:12')
    const p1 = parsePoint('47:11')

    const index = new ShapeIndex()
    const polyline = new Polyline([p0, p0])
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)

    // Under test: Distance comparison methods with zero distance.
    const target0 = new PointTarget(p0)
    const dist0 = 0 // Zero distance

    ok(!query.isDistanceLess(target0, dist0), 'isDistanceLess should return false for exact distance')
    ok(query.isDistanceLessOrEqual(target0, dist0), 'isDistanceLessOrEqual should return true for exact distance')
    ok(
      query.isConservativeDistanceLessOrEqual(target0, dist0),
      'isConservativeDistanceLessOrEqual should return true'
    )

    // Under test: Distance comparison with non-zero distance.
    const target1 = new PointTarget(p1)
    const dist1 = Point.chordAngleBetweenPoints(p0, p1)

    ok(!query.isDistanceLess(target1, dist1), 'isDistanceLess should return false for exact distance')
    ok(query.isDistanceLessOrEqual(target1, dist1), 'isDistanceLessOrEqual should return true for exact distance')
    ok(
      query.isConservativeDistanceLessOrEqual(target1, dist1),
      'isConservativeDistanceLessOrEqual should return true'
    )
  })

  test('TargetPointInsideIndexedPolygon', () => {
    // Precondition: An index with a polyline loop and a polygon.
    // The polyline loop (no interior): 0:0, 0:5, 5:5, 5:0
    // The polygon: 0:10, 0:15, 5:15, 5:10
    const polylineIndex = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:5, 5:5, 5:0'))
    polylineIndex.add(polyline)

    const polygonPoints = parsePoints('0:10, 0:15, 5:15, 5:10')
    const loop = new Loop(polygonPoints)
    const polygon = new Polygon([loop])
    polylineIndex.add(polygon)

    const options = new ClosestEdgeQueryOptions()
    options.includeInteriors = true
    options.maxDistance = chordangle.fromAngle(1 * (Math.PI / 180)) // 1 degree

    const query = new ClosestEdgeQuery(polylineIndex, options)

    // Under test: Query for a point inside the indexed polygon.
    const target = new PointTarget(parsePoint('2:12'))
    const results = query.findClosestEdges(target)

    // Postcondition: Should find the polygon interior.
    equal(results.length, 1)
    equal(results[0].distance, 0)
    equal(results[0].shapeID, 1)
    equal(results[0].edgeID, -1)
    ok(isInteriorResult(results[0]))
    ok(!isEmptyResult(results[0]))
  })

  test('TargetPointOutsideIndexedPolygon', () => {
    // Precondition: An index with a polyline loop (no interior) and a polygon.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:5, 5:5, 5:0'))
    index.add(polyline)

    const polygonPoints = parsePoints('0:10, 0:15, 5:15, 5:10')
    const loop = new Loop(polygonPoints)
    const polygon = new Polygon([loop])
    index.add(polygon)

    const options = new ClosestEdgeQueryOptions()
    options.includeInteriors = true
    options.maxDistance = chordangle.fromAngle(1 * (Math.PI / 180)) // 1 degree

    const query = new ClosestEdgeQuery(index, options)

    // Under test: Query for a point inside the polyline loop (but not inside the polygon).
    const target = new PointTarget(parsePoint('2:2'))
    const results = query.findClosestEdges(target)

    // Postcondition: No results since polyline has no interior.
    equal(results.length, 0)
  })

  test('TargetPolygonContainingIndexedPoints', () => {
    // Precondition: An index with 4 points (each as a separate degenerate polyline shape).
    // Two points are inside a polyline loop (no interior): 2:2, 3:3
    // Two points are inside a polygon: 1:11, 3:13
    const index = makePointIndex('2:2 | 3:3 | 1:11 | 3:13')

    const query = new ClosestEdgeQuery(index)
    query.options.maxDistance = chordangle.fromAngle(1 * (Math.PI / 180)) // 1 degree

    // Create target with polyline and polygon.
    const targetIndex = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:5, 5:5, 5:0'))
    targetIndex.add(polyline)

    const polygonPoints = parsePoints('0:10, 0:15, 5:15, 5:10')
    const loop = new Loop(polygonPoints)
    const polygon = new Polygon([loop])
    targetIndex.add(polygon)

    const target = new ShapeIndexTarget(targetIndex)
    target.setIncludeInteriors(true)

    // Under test: Query returns points inside the polygon.
    const results = query.findClosestEdges(target)

    // Postcondition: Only the 2 points inside the polygon are returned.
    // Each point is a separate shape (shapeID 2 = 1:11, shapeID 3 = 3:13).
    equal(results.length, 2)
    equal(results[0].distance, 0)
    equal(results[0].shapeID, 2) // Shape containing point 1:11
    equal(results[0].edgeID, 0)
    ok(!isInteriorResult(results[0]))

    equal(results[1].distance, 0)
    equal(results[1].shapeID, 3) // Shape containing point 3:13
    equal(results[1].edgeID, 0)
    ok(!isInteriorResult(results[1]))
  })

  test('EmptyTargetOptimized', () => {
    // Precondition: An index with a large polygon.
    const index = new ShapeIndex()
    const loop = Loop.regularLoop(new Point(1, 0, 0), 0.1, 1000)
    const polygon = new Polygon([loop])
    index.add(polygon)

    const query = new ClosestEdgeQuery(index)
    query.options.maxDistance = 1e-5 // Very small radius

    // Under test: Query with an empty ShapeIndex target.
    const targetIndex = new ShapeIndex()
    const target = new ShapeIndexTarget(targetIndex)

    const results = query.findClosestEdges(target)

    // Postcondition: No results are returned.
    equal(results.length, 0)
  })

  test('EmptyResult', () => {
    // Precondition: Create an empty result.
    const result = emptyClosestEdgeQueryResult()

    // Under test: Check that the result is empty.
    ok(isEmptyResult(result))
    equal(result.shapeID, -1)
    equal(result.edgeID, -1)
    equal(result.distance, chordangle.infChordAngle())
  })

  test('GetEdge', () => {
    // Precondition: An index with a polyline.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 1:1, 2:2'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const target = new PointTarget(parsePoint('0.5:0.5'))

    // Under test: Find closest edge and retrieve its endpoints.
    const result = query.findClosestEdge(target)
    const edge = query.getEdge(result)

    // Postcondition: Edge endpoints are valid.
    ok(edge.v0 instanceof Point)
    ok(edge.v1 instanceof Point)
  })

  describe('ClosestEdgeQueryOptions', () => {
    test('DefaultOptions', () => {
      // Precondition: Create default options.
      const options = new ClosestEdgeQueryOptions()

      // Under test: Check default values.
      equal(options.maxResults, Infinity)
      equal(options.maxDistance, chordangle.infChordAngle())
      equal(options.maxError, 0)
      equal(options.includeInteriors, true)
      equal(options.useBruteForce, false)
    })

    test('SetInclusiveMaxDistance', () => {
      // Precondition: Create options and set inclusive max distance.
      const options = new ClosestEdgeQueryOptions()
      const distance = chordangle.fromAngle(1 * (Math.PI / 180)) // 1 degree

      // Under test: setInclusiveMaxDistance sets the successor.
      options.setInclusiveMaxDistance(distance)

      // Postcondition: maxDistance is the successor of the input.
      equal(options.maxDistance, chordangle.successor(distance))
    })

    test('SetConservativeMaxDistance', () => {
      // Precondition: Create options and set conservative max distance.
      const options = new ClosestEdgeQueryOptions()
      const distance = chordangle.fromAngle(1 * (Math.PI / 180)) // 1 degree

      // Under test: setConservativeMaxDistance sets distance with error.
      options.setConservativeMaxDistance(distance)

      // Postcondition: maxDistance is greater than the original distance.
      ok(options.maxDistance > distance)
    })
  })

  describe('PointTarget', () => {
    test('Construction', () => {
      // Precondition: Create a point.
      const point = parsePoint('45:90')

      // Under test: Create a PointTarget.
      const target = new PointTarget(point)

      // Postcondition: Target contains the point.
      ok(target.point.equals(point))
    })

    test('IncludeInteriors', () => {
      // Precondition: Create a PointTarget.
      const target = new PointTarget(new Point(1, 0, 0))

      // Under test: Default includeInteriors is true.
      ok(target.includeInteriors())

      // Under test: Can set includeInteriors to false.
      target.setIncludeInteriors(false)
      ok(!target.includeInteriors())
    })
  })

  describe('EdgeTarget', () => {
    test('Construction', () => {
      // Precondition: Create two points.
      const a = parsePoint('0:0')
      const b = parsePoint('1:1')

      // Under test: Create an EdgeTarget.
      const target = new EdgeTarget(a, b)

      // Postcondition: Target contains the edge endpoints.
      ok(target.a.equals(a))
      ok(target.b.equals(b))
    })

    test('IncludeInteriors', () => {
      // Precondition: Create an EdgeTarget.
      const target = new EdgeTarget(new Point(1, 0, 0), new Point(0, 1, 0))

      // Under test: Default includeInteriors is true.
      ok(target.includeInteriors())

      // Under test: Can set includeInteriors to false.
      target.setIncludeInteriors(false)
      ok(!target.includeInteriors())
    })
  })

  describe('CellTarget', () => {
    test('Construction', () => {
      // Precondition: Create a cell.
      const point = parsePoint('45:90')
      const cell = Cell.fromPoint(point)

      // Under test: Create a CellTarget.
      const target = new CellTarget(cell)

      // Postcondition: Target contains the cell.
      equal(target.cell.id, cell.id)
    })

    test('IncludeInteriors', () => {
      // Precondition: Create a CellTarget.
      const cell = Cell.fromPoint(new Point(1, 0, 0))
      const target = new CellTarget(cell)

      // Under test: Default includeInteriors is true.
      ok(target.includeInteriors())

      // Under test: Can set includeInteriors to false.
      target.setIncludeInteriors(false)
      ok(!target.includeInteriors())
    })
  })

  describe('ShapeIndexTarget', () => {
    test('Construction', () => {
      // Precondition: Create a ShapeIndex.
      const index = new ShapeIndex()
      const polyline = new Polyline(parsePoints('0:0, 1:1'))
      index.add(polyline)

      // Under test: Create a ShapeIndexTarget.
      const target = new ShapeIndexTarget(index)

      // Postcondition: Target contains the index.
      equal(target.index, index)
    })

    test('IncludeInteriors', () => {
      // Precondition: Create a ShapeIndexTarget.
      const index = new ShapeIndex()
      const target = new ShapeIndexTarget(index)

      // Under test: Default includeInteriors is true.
      ok(target.includeInteriors())

      // Under test: Can set includeInteriors to false.
      target.setIncludeInteriors(false)
      ok(!target.includeInteriors())
    })
  })

  describe('FindClosestEdges', () => {
    test('WithMaxResults', () => {
      // Precondition: An index with multiple edges.
      const index = new ShapeIndex()
      const polyline = new Polyline(parsePoints('0:0, 0:1, 0:2, 0:3, 0:4, 0:5'))
      index.add(polyline)

      const options = new ClosestEdgeQueryOptions()
      options.maxResults = 3

      const query = new ClosestEdgeQuery(index, options)

      // Under test: Find closest edges with maxResults limit.
      const target = new PointTarget(parsePoint('0:2.5'))
      const results = query.findClosestEdges(target)

      // Postcondition: Returns at most maxResults edges.
      ok(results.length <= 3, 'Should return at most 3 results')
      ok(results.length > 0, 'Should return at least 1 result')

      // Results should be sorted by distance.
      for (let i = 1; i < results.length; i++) {
        ok(results[i].distance >= results[i - 1].distance, 'Results should be sorted by distance')
      }
    })

    test('WithMaxDistance', () => {
      // Precondition: An index with edges at varying distances.
      const index = new ShapeIndex()
      const polyline = new Polyline(parsePoints('0:0, 0:10, 0:20, 0:30'))
      index.add(polyline)

      const options = new ClosestEdgeQueryOptions()
      options.maxDistance = chordangle.fromAngle(15 * (Math.PI / 180)) // 15 degrees

      const query = new ClosestEdgeQuery(index, options)

      // Under test: Find edges within maxDistance.
      const target = new PointTarget(parsePoint('0:0'))
      const results = query.findClosestEdges(target)

      // Postcondition: Only edges within maxDistance are returned.
      for (const result of results) {
        ok(result.distance < query.options.maxDistance, 'All results should be within maxDistance')
      }
    })
  })

  test('ReuseOfQuery', () => {
    // Precondition: An index with one point.
    const index = new ShapeIndex()
    const polyline = new Polyline([parsePoint('2:2'), parsePoint('2:2')])
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    query.options.maxError = chordangle.fromAngle(1 * (Math.PI / 180)) // 1 degree

    // Create target.
    const targetIndex = makePolygonIndex('0:0, 0:5, 5:5, 5:0')
    const target = new ShapeIndexTarget(targetIndex)

    // Under test: Query can be reused between calls.
    const results1 = query.findClosestEdges(target)
    const results2 = query.findClosestEdges(target)

    // Postcondition: Both queries return the same results.
    equal(results1.length, results2.length)
  })

  test('IsDistanceLess', () => {
    // Precondition: An index with one edge.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 1:1'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const target = new PointTarget(parsePoint('0:0'))

    // Under test: isDistanceLess returns correct values.
    ok(query.isDistanceLess(target, chordangle.fromAngle(1 * (Math.PI / 180))))
    ok(!query.isDistanceLess(target, 0))
  })

  test('IsDistanceLessOrEqual', () => {
    // Precondition: An index with one point.
    const p0 = parsePoint('0:0')
    const index = new ShapeIndex()
    const polyline = new Polyline([p0, p0])
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const target = new PointTarget(p0)

    // Under test: isDistanceLessOrEqual returns true for zero distance.
    ok(query.isDistanceLessOrEqual(target, 0))
  })

  test('IsConservativeDistanceLessOrEqual', () => {
    // Precondition: An index with one point.
    const p0 = parsePoint('0:0')
    const index = new ShapeIndex()
    const polyline = new Polyline([p0, p0])
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const target = new PointTarget(p0)

    // Under test: isConservativeDistanceLessOrEqual returns true for zero distance.
    ok(query.isConservativeDistanceLessOrEqual(target, 0))
  })

  test('BasicTestWithPointVector', () => {
    // Precondition: An index with 3 points in a single PointVector shape.
    const index = new ShapeIndex()
    const points = [parsePoint('1:1'), parsePoint('1:2'), parsePoint('1:3')]
    const pv = new PointVector(points)
    index.add(pv)

    const options = new ClosestEdgeQueryOptions()
    options.maxResults = 1
    options.maxDistance = chordangle.fromAngle(3 * (Math.PI / 180)) // 3 degrees
    options.maxError = chordangle.fromAngle(0.001 * (Math.PI / 180)) // 0.001 degrees

    const query = new ClosestEdgeQuery(index, options)
    const target = new PointTarget(parsePoint('2:2'))

    // Under test: Query returns the closest edge (point 1:2 is edge 1).
    const result = query.findClosestEdge(target)

    // Postcondition: Edge 1 (point 1:2) is the closest.
    equal(result.edgeID, 1)

    const distance = query.getDistance(target)
    const distanceDegrees = chordangle.angle(distance) * (180 / Math.PI)
    ok(Math.abs(distanceDegrees - 1.0) < 0.1, `Distance should be approximately 1 degree, got ${distanceDegrees}`)

    ok(query.isDistanceLess(target, chordangle.fromAngle(1.5 * (Math.PI / 180))))
  })

  test('TrueDistanceLessThanChordAngleDistance', () => {
    // Precondition: Two points with worst-case ChordAngle error.
    // These points were chosen because ChordAngle distance is ~4 ulps greater than true distance.
    const p0 = Point.fromVector(
      new Vector(0.78516762584829192, -0.5020040069084597, -0.36263449417782678)
    )
    const p1 = Point.fromVector(
      new Vector(0.78563011732429433, -0.50187655940493503, -0.36180828883938054)
    )

    const index = new ShapeIndex()
    const pv = new PointVector([p0])
    index.add(pv)

    const query = new ClosestEdgeQuery(index)

    // Under test: The ChordAngle distance has error compared to true distance.
    const dist = Point.chordAngleBetweenPoints(p0, p1)
    // Go 4 ulps back from the computed distance.
    const limit = chordangle.predecessor(
      chordangle.predecessor(chordangle.predecessor(chordangle.predecessor(dist)))
    )

    const target = new PointTarget(p1)

    // Postcondition: isDistanceLess should return false for the predecessor limit.
    ok(!query.isDistanceLess(target, limit), 'isDistanceLess should return false')

    // Postcondition: isConservativeDistanceLessOrEqual should still return true.
    ok(
      query.isConservativeDistanceLessOrEqual(target, limit),
      'isConservativeDistanceLessOrEqual should return true'
    )
  })

  test('DistanceEqualToLimitWithSuccessor', () => {
    // Precondition: An index with one point.
    const p0 = parsePoint('23:12')
    const p1 = parsePoint('47:11')

    const index = new ShapeIndex()
    const pv = new PointVector([p0])
    index.add(pv)

    const query = new ClosestEdgeQuery(index)

    // Under test: isDistanceLess with successor returns true.
    const target0 = new PointTarget(p0)
    const dist0 = 0

    ok(!query.isDistanceLess(target0, dist0), 'isDistanceLess should return false for exact distance')
    ok(
      query.isDistanceLess(target0, chordangle.successor(dist0)),
      'isDistanceLess should return true for successor'
    )
    ok(query.isConservativeDistanceLessOrEqual(target0, dist0), 'isConservativeDistanceLessOrEqual should return true')

    // Under test: With non-zero distance.
    const target1 = new PointTarget(p1)
    const dist1 = Point.chordAngleBetweenPoints(p0, p1)

    ok(!query.isDistanceLess(target1, dist1), 'isDistanceLess should return false for exact distance')
    ok(
      query.isDistanceLess(target1, chordangle.successor(dist1)),
      'isDistanceLess should return true for successor'
    )
    ok(query.isConservativeDistanceLessOrEqual(target1, dist1), 'isConservativeDistanceLessOrEqual should return true')
  })

  test('TargetPolygonContainingIndexedPointsWithPointVector', () => {
    // Precondition: An index with 4 points in a single PointVector.
    // Two points are inside a polyline loop (no interior): 2:2, 3:3
    // Two points are inside a polygon: 1:11, 3:13
    const index = new ShapeIndex()
    const points = [parsePoint('2:2'), parsePoint('3:3'), parsePoint('1:11'), parsePoint('3:13')]
    const pv = new PointVector(points)
    index.add(pv)

    const options = new ClosestEdgeQueryOptions()
    options.useBruteForce = false
    options.maxDistance = chordangle.fromAngle(1 * (Math.PI / 180)) // 1 degree

    const query = new ClosestEdgeQuery(index, options)

    // Create target with polyline and polygon.
    const targetIndex = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:5, 5:5, 5:0'))
    targetIndex.add(polyline)

    const polygonPoints = parsePoints('0:10, 0:15, 5:15, 5:10')
    const loop = new Loop(polygonPoints)
    const polygon = new Polygon([loop])
    targetIndex.add(polygon)

    const target = new ShapeIndexTarget(targetIndex)
    target.setIncludeInteriors(true)

    // Under test: Query returns points inside the polygon.
    const results = query.findClosestEdges(target)

    // Postcondition: Only the 2 points inside the polygon are returned (edgeIDs 2 and 3).
    equal(results.length, 2)
    equal(results[0].distance, 0)
    equal(results[0].shapeID, 0)
    equal(results[0].edgeID, 2) // Point 1:11
    ok(!isInteriorResult(results[0]))

    equal(results[1].distance, 0)
    equal(results[1].shapeID, 0)
    equal(results[1].edgeID, 3) // Point 3:13
    ok(!isInteriorResult(results[1]))
  })

  test('BruteForceVsOptimizedConsistency', () => {
    // Precondition: An index with multiple edges.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 1:1, 2:2, 3:3, 4:4'))
    index.add(polyline)

    const target = new PointTarget(parsePoint('1.5:1.5'))

    // Under test: Both brute force and optimized should give same results.
    const optsBruteForce = new ClosestEdgeQueryOptions()
    optsBruteForce.useBruteForce = true
    optsBruteForce.maxResults = 2

    const optsOptimized = new ClosestEdgeQueryOptions()
    optsOptimized.useBruteForce = false
    optsOptimized.maxResults = 2

    const queryBruteForce = new ClosestEdgeQuery(index, optsBruteForce)
    const queryOptimized = new ClosestEdgeQuery(index, optsOptimized)

    const resultsBruteForce = queryBruteForce.findClosestEdges(target)
    const resultsOptimized = queryOptimized.findClosestEdges(target)

    // Postcondition: Both return same number of results.
    equal(resultsBruteForce.length, resultsOptimized.length)

    // Postcondition: Both return same closest edge.
    if (resultsBruteForce.length > 0 && resultsOptimized.length > 0) {
      equal(resultsBruteForce[0].shapeID, resultsOptimized[0].shapeID)
      equal(resultsBruteForce[0].edgeID, resultsOptimized[0].edgeID)
    }
  })

  test('EdgeTargetQuery', () => {
    // Precondition: An index with a polyline.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:10, 10:10, 10:0'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)

    // Under test: Query with an edge target.
    const target = new EdgeTarget(parsePoint('5:5'), parsePoint('5:15'))
    const result = query.findClosestEdge(target)

    // Postcondition: Found a closest edge.
    ok(!isEmptyResult(result))
    ok(result.distance >= 0)
  })

  test('CellTargetQuery', () => {
    // Precondition: An index with a polyline.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:10, 10:10, 10:0'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)

    // Under test: Query with a cell target.
    const cell = Cell.fromPoint(parsePoint('5:5'))
    const target = new CellTarget(cell)
    const result = query.findClosestEdge(target)

    // Postcondition: Found a closest edge.
    ok(!isEmptyResult(result))
    ok(result.distance >= 0)
  })

  test('ShapeIndexTargetQuery', () => {
    // Precondition: An index with a polyline.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:10, 10:10, 10:0'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)

    // Under test: Query with a ShapeIndex target containing another polyline.
    const targetIndex = new ShapeIndex()
    const targetPolyline = new Polyline(parsePoints('5:5, 5:15, 15:15'))
    targetIndex.add(targetPolyline)

    const target = new ShapeIndexTarget(targetIndex)
    const result = query.findClosestEdge(target)

    // Postcondition: Found a closest edge.
    ok(!isEmptyResult(result))
    ok(result.distance >= 0)
  })

  test('ProjectPointToEdge', () => {
    // Precondition: An index with a vertical polyline (lng = 0, lat from 0 to 10).
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 10:0'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const queryPoint = parsePoint('5:5')
    const target = new PointTarget(queryPoint)

    // Under test: Project finds closest point on edge.
    const result = query.findClosestEdge(target)
    const projected = query.project(queryPoint, result)

    // Postcondition: Projected point is on the edge.
    const projectedLatLng = LatLng.fromPoint(projected)
    const DEGREE = Math.PI / 180
    // The edge goes from lat 0 to lat 10 degrees at lng 0.
    // The projected point should have lng near 0.
    const lngDegrees = projectedLatLng.lng / DEGREE
    ok(Math.abs(lngDegrees) < 1, `Projected point should have lng near 0, got ${lngDegrees}`)
    // The projected point should have lat between 0 and 10 degrees.
    const latDegrees = projectedLatLng.lat / DEGREE
    ok(latDegrees >= 0 && latDegrees <= 10, `Projected point lat should be on edge, got ${latDegrees}`)
  })

  test('ShapeFilterExcludesShapes', () => {
    // Precondition: An index with multiple shapes.
    const index = new ShapeIndex()
    const polyline1 = new Polyline(parsePoints('0:0, 0:10'))
    const polyline2 = new Polyline(parsePoints('1:0, 1:10'))
    const polyline3 = new Polyline(parsePoints('2:0, 2:10'))
    index.add(polyline1) // shapeID 0
    index.add(polyline2) // shapeID 1
    index.add(polyline3) // shapeID 2

    const query = new ClosestEdgeQuery(index)
    const target = new PointTarget(parsePoint('0.5:5'))

    // Under test: Filter to only include shapeID 1.
    const filter = (shapeID: number) => shapeID === 1
    const result = query.findClosestEdge(target, filter)

    // Postcondition: Only shapeID 1 is returned.
    equal(result.shapeID, 1)
  })

  test('ShapeFilterExcludesAllShapes', () => {
    // Precondition: An index with shapes.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:10'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const target = new PointTarget(parsePoint('0:5'))

    // Under test: Filter that excludes all shapes.
    const filter = (_shapeID: number) => false
    const result = query.findClosestEdge(target, filter)

    // Postcondition: No result found.
    ok(isEmptyResult(result))
  })

  test('MultipleCallsReturnConsistentResults', () => {
    // Precondition: An index with edges.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 1:1, 2:2'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const target = new PointTarget(parsePoint('0.5:0.5'))

    // Under test: Multiple calls return same results.
    const result1 = query.findClosestEdge(target)
    const result2 = query.findClosestEdge(target)
    const result3 = query.findClosestEdge(target)

    // Postcondition: All results are identical.
    equal(result1.shapeID, result2.shapeID)
    equal(result1.edgeID, result2.edgeID)
    equal(result1.distance, result2.distance)
    equal(result2.shapeID, result3.shapeID)
    equal(result2.edgeID, result3.edgeID)
    equal(result2.distance, result3.distance)
  })

  test('VisitClosestEdges', () => {
    // Precondition: An index with multiple edges.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:1, 0:2, 0:3'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const options = new ClosestEdgeQueryOptions()
    options.maxResults = 10

    const target = new PointTarget(parsePoint('0:1.5'))

    // Under test: Visit all closest edges.
    const visited: ClosestEdgeQueryResult[] = []
    query.visitClosestEdges(target, options, (result) => {
      visited.push({ ...result })
      return true
    })

    // Postcondition: Visited some edges.
    ok(visited.length > 0)

    // Postcondition: Results are sorted by distance.
    for (let i = 1; i < visited.length; i++) {
      ok(visited[i].distance >= visited[i - 1].distance)
    }
  })

  test('VisitClosestEdgesCanStopEarly', () => {
    // Precondition: An index with multiple edges.
    const index = new ShapeIndex()
    const polyline = new Polyline(parsePoints('0:0, 0:1, 0:2, 0:3, 0:4, 0:5'))
    index.add(polyline)

    const query = new ClosestEdgeQuery(index)
    const options = new ClosestEdgeQueryOptions()
    options.maxResults = 10

    const target = new PointTarget(parsePoint('0:2.5'))

    // Under test: Stop after visiting 2 edges.
    const visited: ClosestEdgeQueryResult[] = []
    query.visitClosestEdges(target, options, (result) => {
      visited.push({ ...result })
      return visited.length < 2
    })

    // Postcondition: Stopped after 2 edges.
    equal(visited.length, 2)
  })

  test('VisitClosestShapes', () => {
    // Precondition: An index with multiple shapes.
    const index = new ShapeIndex()
    const polyline1 = new Polyline(parsePoints('0:0, 0:5'))
    const polyline2 = new Polyline(parsePoints('1:0, 1:5'))
    index.add(polyline1)
    index.add(polyline2)

    const query = new ClosestEdgeQuery(index)
    const options = new ClosestEdgeQueryOptions()
    options.maxResults = 10

    const target = new PointTarget(parsePoint('0.5:2.5'))

    // Under test: Visit closest edge per shape.
    const visited: ClosestEdgeQueryResult[] = []
    query.visitClosestShapes(target, options, (result) => {
      visited.push({ ...result })
      return true
    })

    // Postcondition: Visited 2 shapes (one result per shape).
    equal(visited.length, 2)
    // Postcondition: Different shape IDs.
    ok(visited[0].shapeID !== visited[1].shapeID)
  })
})

