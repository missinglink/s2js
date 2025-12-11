import { test, describe } from 'node:test'
import { equal, ok, deepEqual } from 'node:assert/strict'
import { CellIndex } from './CellIndex'
import {
  ClosestCellQuery,
  ClosestCellQueryOptions,
  PointTarget,
  EdgeTarget,
  CellTarget,
  CellUnionTarget,
  ShapeIndexTarget
} from './ClosestCellQuery'
import { Cell } from './Cell'
import { CellUnion } from './CellUnion'
import { Point } from './Point'
import { ShapeIndex } from './ShapeIndex'
import { LatLng } from './LatLng'
import * as cellid from './cellid'
import * as chordangle from '../s1/chordangle'
import { parsePoint } from './testing_textformat'
import { randomCellID, samplePointFromCap, randomPoint } from './testing'
import { Cap } from './Cap'
import { RegionCoverer } from './RegionCoverer'

/**
 * Helper to create a CellID from a lat:lng string.
 */
const cellIDFromLatLng = (str: string): bigint => {
  const point = parsePoint(str)
  return cellid.fromPoint(point)
}

/**
 * Helper to create a CellID from a cell string like "4/012".
 */
const cellIDFromString = (s: string): bigint => {
  return cellid.fromString(s)
}

describe('S2ClosestCellQuery', () => {
  test('NoCells', () => {
    // Precondition: An empty CellIndex is built.
    const index = new CellIndex()
    index.build()

    // Under test: Query for the closest cell returns an empty result.
    const query = new ClosestCellQuery(index)
    const target = new PointTarget(new Point(1, 0, 0))
    const result = query.findClosestCell(target)

    // Postcondition: Result indicates no cell was found.
    equal(result.distance, chordangle.infChordAngle())
    equal(result.cellID, 0n)
    equal(result.label, -1)
    equal(query.getDistance(target), chordangle.infChordAngle())
  })

  test('OptionsNotModified', () => {
    // Precondition: An index with 3 cells and specific query options.
    const options = new ClosestCellQueryOptions()
    options.maxResults = 3
    options.maxDistance = chordangle.fromAngle(3 * (Math.PI / 180)) // 3 degrees
    options.maxError = chordangle.fromAngle(0.001 * (Math.PI / 180)) // 0.001 degrees

    const index = new CellIndex()
    index.add(cellIDFromLatLng('1:1'), 1)
    index.add(cellIDFromLatLng('1:2'), 2)
    index.add(cellIDFromLatLng('1:3'), 3)
    index.build()

    const query = new ClosestCellQuery(index, options)
    const target = new PointTarget(parsePoint('2:2'))

    // Under test: Query methods do not modify options.
    const closestResult = query.findClosestCell(target)
    equal(closestResult.label, 2)

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
    // Precondition: An index with one cell.
    const id0 = cellIDFromLatLng('23:12')
    const id1 = cellIDFromLatLng('47:11')

    const index = new CellIndex()
    index.add(id0, 0)
    index.build()

    const query = new ClosestCellQuery(index)

    // Under test: Distance comparison methods with identical cells (zero distance).
    const target0 = new CellTarget(Cell.fromCellID(id0))
    const dist0 = 0 // Zero distance

    // Postcondition: isDistanceLess returns false for zero, but isDistanceLessOrEqual returns true.
    ok(!query.isDistanceLess(target0, dist0), 'isDistanceLess should return false for exact distance')
    ok(query.isDistanceLessOrEqual(target0, dist0), 'isDistanceLessOrEqual should return true for exact distance')
    ok(query.isConservativeDistanceLessOrEqual(target0, dist0), 'isConservativeDistanceLessOrEqual should return true')

    // Under test: Distance comparison with non-zero distance between different cells.
    const target1 = new CellTarget(Cell.fromCellID(id1))
    const cell0 = Cell.fromCellID(id0)
    const cell1 = Cell.fromCellID(id1)
    const dist1 = cell0.distanceToCell(cell1)

    // Postcondition: Same pattern for non-zero distance.
    ok(!query.isDistanceLess(target1, dist1), 'isDistanceLess should return false for exact distance')
    ok(query.isDistanceLessOrEqual(target1, dist1), 'isDistanceLessOrEqual should return true for exact distance')
    ok(query.isConservativeDistanceLessOrEqual(target1, dist1), 'isConservativeDistanceLessOrEqual should return true')
  })

  test('TargetPointInsideIndexedCell', () => {
    // Precondition: An index with one cell.
    const cellId = cellIDFromString('4/012')

    const index = new CellIndex()
    index.add(cellId, 1)
    index.build()

    const query = new ClosestCellQuery(index)

    // Under test: Query for a point inside the indexed cell.
    const target = new PointTarget(cellid.point(cellId))
    const result = query.findClosestCell(target)

    // Postcondition: Distance is zero, and the correct cell is returned.
    equal(result.distance, 0)
    equal(result.cellID, cellId)
    equal(result.label, 1)
  })

  test('EmptyTargetOptimized', () => {
    // Precondition: An index with many random cells.
    const index = new CellIndex()
    for (let i = 0; i < 1000; i++) {
      index.add(randomCellID(), i)
    }
    index.build()

    const query = new ClosestCellQuery(index)
    query.options.maxDistance = 1e-5 // Very small radius

    // Under test: Query with an empty ShapeIndex target.
    const targetIndex = new ShapeIndex()
    const target = new ShapeIndexTarget(targetIndex)

    const results = query.findClosestCells(target)

    // Postcondition: No results are returned.
    equal(results.length, 0)
  })

  test('EmptyCellUnionTarget', () => {
    // Precondition: An empty CellUnion target.
    const target = new CellUnionTarget(new CellUnion())

    // Under test: Query against empty index.
    const emptyIndex = new CellIndex()
    emptyIndex.build()
    const emptyQuery = new ClosestCellQuery(emptyIndex)

    // Postcondition: Returns infinity distance.
    equal(emptyQuery.getDistance(target), chordangle.infChordAngle())

    // Under test: Query against index with one cell.
    const oneCellIndex = new CellIndex()
    oneCellIndex.add(cellIDFromString('1/123123'), 1)
    oneCellIndex.build()
    const oneCellQuery = new ClosestCellQuery(oneCellIndex)

    // Postcondition: Returns infinity distance for empty target.
    equal(oneCellQuery.getDistance(target), chordangle.infChordAngle())
  })

  test('FindClosestCellsWithMaxResults', () => {
    // Precondition: An index with multiple cells.
    const index = new CellIndex()
    index.add(cellIDFromLatLng('0:0'), 0)
    index.add(cellIDFromLatLng('0:1'), 1)
    index.add(cellIDFromLatLng('0:2'), 2)
    index.add(cellIDFromLatLng('0:3'), 3)
    index.add(cellIDFromLatLng('0:4'), 4)
    index.build()

    const query = new ClosestCellQuery(index)
    query.options.maxResults = 3

    // Under test: Find closest cells with maxResults limit.
    const target = new PointTarget(parsePoint('0:1.5'))
    const results = query.findClosestCells(target)

    // Postcondition: Returns at most maxResults cells.
    ok(results.length <= 3, 'Should return at most 3 results')
    ok(results.length > 0, 'Should return at least 1 result')

    // Results should be sorted by distance.
    for (let i = 1; i < results.length; i++) {
      ok(results[i].distance >= results[i - 1].distance, 'Results should be sorted by distance')
    }
  })

  test('FindClosestCellsWithMaxDistance', () => {
    // Precondition: An index with cells at varying distances.
    const index = new CellIndex()
    index.add(cellIDFromLatLng('0:0'), 0)
    index.add(cellIDFromLatLng('0:10'), 10)
    index.add(cellIDFromLatLng('0:20'), 20)
    index.add(cellIDFromLatLng('0:30'), 30)
    index.build()

    const query = new ClosestCellQuery(index)
    query.options.maxDistance = chordangle.fromAngle(15 * (Math.PI / 180)) // 15 degrees

    // Under test: Find cells within maxDistance.
    const target = new PointTarget(parsePoint('0:0'))
    const results = query.findClosestCells(target)

    // Postcondition: Only cells within maxDistance are returned.
    for (const result of results) {
      ok(result.distance < query.options.maxDistance, 'All results should be within maxDistance')
    }
  })

  test('EdgeTarget', () => {
    // Precondition: An index with one cell.
    const index = new CellIndex()
    const cellId = cellIDFromLatLng('0:0')
    index.add(cellId, 0)
    index.build()

    const query = new ClosestCellQuery(index)

    // Under test: Query with an edge target that passes near the cell.
    const a = parsePoint('1:0')
    const b = parsePoint('-1:0')
    const target = new EdgeTarget(a, b)

    const result = query.findClosestCell(target)

    // Postcondition: The cell is found.
    equal(result.label, 0)
  })

  test('CellUnionTarget', () => {
    // Precondition: An index with cells and a CellUnion target.
    const index = new CellIndex()
    index.add(cellIDFromLatLng('0:0'), 0)
    index.add(cellIDFromLatLng('10:10'), 1)
    index.add(cellIDFromLatLng('20:20'), 2)
    index.build()

    // Create a CellUnion covering an area near one of the indexed cells.
    const cap = Cap.fromCenterAngle(parsePoint('0:1'), 0.01)
    const coverer = new RegionCoverer({ maxCells: 4 })
    const covering = coverer.covering(cap)

    const query = new ClosestCellQuery(index)
    const target = new CellUnionTarget(covering)

    const result = query.findClosestCell(target)

    // Postcondition: The closest cell is found.
    // The cell at 0:0 should be closest to the covering near 0:1.
    equal(result.label, 0)
  })

  test('InclusiveMaxDistance', () => {
    // Precondition: An index with one cell and options with inclusive max distance.
    const id0 = cellIDFromLatLng('0:0')
    const id1 = cellIDFromLatLng('1:0')

    const index = new CellIndex()
    index.add(id0, 0)
    index.build()

    // Compute exact distance between cells.
    const cell0 = Cell.fromCellID(id0)
    const cell1 = Cell.fromCellID(id1)
    const exactDistance = cell0.distanceToCell(cell1)

    const query = new ClosestCellQuery(index)

    // Under test: With regular maxDistance, exact distance is excluded.
    query.options.maxDistance = exactDistance
    const target = new CellTarget(cell1)
    let results = query.findClosestCells(target)
    equal(results.length, 0, 'Exact distance should be excluded with regular maxDistance')

    // Under test: With inclusive maxDistance, exact distance is included.
    query.options.setInclusiveMaxDistance(exactDistance)
    results = query.findClosestCells(target)
    equal(results.length, 1, 'Exact distance should be included with inclusive maxDistance')
  })

  test('MultipleLabelsForSameCell', () => {
    // Precondition: An index with the same cell added multiple times with different labels.
    const cellId = cellIDFromLatLng('0:0')
    const index = new CellIndex()
    index.add(cellId, 1)
    index.add(cellId, 2)
    index.add(cellId, 3)
    index.build()

    const query = new ClosestCellQuery(index)
    const target = new PointTarget(cellid.point(cellId))

    // Under test: Query returns all instances.
    const results = query.findClosestCells(target)

    // Postcondition: All three labels are returned.
    equal(results.length, 3)
    const labels = results.map((r) => r.label).sort()
    deepEqual(labels, [1, 2, 3])
  })

  test('RandomPointTargets', () => {
    // Precondition: An index with random cells in a cap.
    const numCells = 50
    const indexCap = Cap.fromCenterAngle(randomPoint(), 0.1)
    const index = new CellIndex()

    for (let i = 0; i < numCells; i++) {
      const point = samplePointFromCap(indexCap)
      index.add(cellid.fromPoint(point), i)
    }
    index.build()

    const query = new ClosestCellQuery(index)
    query.options.maxResults = 5

    // Under test: Query with random point targets.
    for (let i = 0; i < 10; i++) {
      const targetPoint = samplePointFromCap(indexCap)
      const target = new PointTarget(targetPoint)

      const results = query.findClosestCells(target)

      // Postcondition: Results are valid and sorted.
      ok(results.length > 0, 'Should find at least one cell')
      ok(results.length <= 5, 'Should return at most maxResults cells')

      for (let j = 1; j < results.length; j++) {
        ok(results[j].distance >= results[j - 1].distance, 'Results should be sorted by distance')
      }
    }
  })

  test('GetDistanceReturnsClosest', () => {
    // Precondition: An index with cells at known distances.
    const index = new CellIndex()
    index.add(cellIDFromLatLng('0:0'), 0)
    index.add(cellIDFromLatLng('0:5'), 5)
    index.add(cellIDFromLatLng('0:10'), 10)
    index.build()

    const query = new ClosestCellQuery(index)

    // Under test: GetDistance returns the minimum distance.
    const target = new PointTarget(parsePoint('0:2'))
    const distance = query.getDistance(target)

    // Postcondition: Distance should be to the closest cell (0:0).
    const expectedCell = Cell.fromCellID(cellIDFromLatLng('0:0'))
    const expectedDistance = expectedCell.distance(parsePoint('0:2'))

    // Allow some tolerance due to cell center vs actual point.
    ok(Math.abs(distance - expectedDistance) < 0.1, 'Distance should be approximately to closest cell')
  })
})
