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
import { ShapeIndex } from './ShapeIndex'
import * as chordangle from '../s1/chordangle'
import { parsePoint, parsePoints } from './testing_textformat'

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
})

