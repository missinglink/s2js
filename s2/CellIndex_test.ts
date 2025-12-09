import { test, describe } from 'node:test'
import { equal, ok, deepEqual } from 'node:assert/strict'
import {
  CellIndex,
  CellIndexRangeIterator,
  CellIndexContentsIterator,
  type CellIndexNode
} from './CellIndex'
import type { CellID } from './cellid'
import * as cellid from './cellid'
import { MAX_LEVEL } from './cellid_constants'
import { CellUnion } from './CellUnion'
import { randomCellIDForLevel, randomUniformInt, skewedInt } from './testing'

/**
 * Represents a test input for CellIndex consisting of a cell string and label.
 */
interface CellIndexTestInput {
  cellID: string
  label: number
}

/**
 * Reports whether this node is less than the other for sorting purposes.
 * Only compares cellID and label, not parent (which is implementation detail).
 */
const nodeLess = (a: CellIndexNode, b: CellIndexNode): number => {
  if (a.cellID !== b.cellID) {
    return a.cellID < b.cellID ? -1 : 1
  }
  if (a.label !== b.label) {
    return a.label < b.label ? -1 : 1
  }
  return 0
}

/**
 * Creates a copy of the nodes so that sorting and other tests don't alter the instance in a given CellIndex.
 */
const copyCellIndexNodes = (nodes: CellIndexNode[]): CellIndexNode[] => {
  return nodes.map((n) => ({ cellID: n.cellID, label: n.label, parent: n.parent }))
}

/**
 * Reports whether two sorted arrays of nodes are equal.
 * Only compares cellID and label, not parent (which is implementation detail).
 */
const cellIndexNodesEqual = (a: CellIndexNode[], b: CellIndexNode[]): boolean => {
  const aSorted = copyCellIndexNodes(a).sort(nodeLess)
  const bSorted = copyCellIndexNodes(b).sort(nodeLess)

  if (aSorted.length !== bSorted.length) return false

  for (let i = 0; i < aSorted.length; i++) {
    if (aSorted[i].cellID !== bSorted[i].cellID) return false
    if (aSorted[i].label !== bSorted[i].label) return false
  }

  return true
}

/**
 * Serializes CellIndexNode arrays to a string, handling BigInt values.
 */
const stringifyNodes = (nodes: CellIndexNode[]): string => {
  return JSON.stringify(nodes, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
}

/**
 * Verifies that positioning the CellIndexRangeIterator to finished results in done() being true.
 */
const verifyCellIndexCellIterator = (_desc: string, _index: CellIndex): void => {
  // TODO: Once the plain iterator is implemented, add this check.
  /*
    const actual: CellIndexNode[] = []
    const iter = new CellIndexIterator(index)
    for (iter.begin(); !iter.done(); iter.next()) {
      actual.push({ cellID: iter.startID(), label: iter.label(), parent: -1 })
    }
    const want = copyCellIndexNodes(index.cellTree)
    ok(cellIndexNodesEqual(actual, want), `${desc}: cellIndexNodes not equal but should be`)
  */
}

/**
 * Verifies that the CellIndexRangeIterator and CellIndexNonEmptyRangeIterator work correctly.
 */
const verifyCellIndexRangeIterators = (desc: string, index: CellIndex): void => {
  // Precondition: The index has been built.
  // Under test: The range iterator correctly positions and navigates.
  // Postcondition: All iterator operations behave correctly.

  // Tests finish(), which is not otherwise tested below.
  const it = new CellIndexRangeIterator(index)
  it.begin()
  it.finish()
  ok(it.done(), `${desc}: positioning iterator to finished should be done, but was not`)

  // And also for non-empty ranges.
  const nonEmpty = new CellIndexRangeIterator(index, true)
  nonEmpty.begin()
  nonEmpty.finish()
  ok(nonEmpty.done(), `${desc}: positioning non-empty iterator to finished should be done, but was not`)

  // Iterate through all the ranges in the index. We simultaneously iterate
  // through the non-empty ranges and check that the correct ranges are found.
  let prevStart: CellID = 0n
  let nonEmptyPrevStart: CellID = 0n
  it.begin()
  nonEmpty.begin()

  while (!it.done()) {
    // Check that seeking in the current range takes us to this range.
    const it2 = new CellIndexRangeIterator(index)
    const start = it.startID()
    it2.seek(it.startID())
    equal(it2.startID(), start, `${desc}: it2.startID() = ${it2.startID()}, want ${start}`)

    it2.seek(cellid.prev(it.limitID()))
    equal(it2.startID(), start, `${desc}: it2.seek(${cellid.prev(it.limitID())}) = ${it2.startID()}, want ${start}`)

    // And also for non-empty ranges.
    const nonEmpty2 = new CellIndexRangeIterator(index, true)
    const nonEmptyStart = nonEmpty.startID()
    nonEmpty2.seek(it.startID())
    equal(nonEmpty2.startID(), nonEmptyStart, `${desc}: nonEmpty2.startID() = ${nonEmpty2.startID()}, want ${nonEmptyStart}`)

    nonEmpty2.seek(cellid.prev(it.limitID()))
    equal(nonEmpty2.startID(), nonEmptyStart, `${desc}: nonEmpty2.startID() = ${nonEmpty2.startID()}, want ${nonEmptyStart}`)

    // Test prev() and next().
    if (it2.prev()) {
      equal(it2.startID(), prevStart, `${desc}: it2.startID() = ${it2.startID()}, want ${prevStart}`)
      it2.next()
      equal(it2.startID(), start, `${desc}: it2.startID() = ${it2.startID()}, want ${start}`)
    } else {
      equal(it2.startID(), start, `${desc}: it2.startID() = ${it2.startID()}, want ${start}`)
      equal(prevStart, 0n, `${desc}: prevStart = ${prevStart}, want 0n`)
    }

    // And also for non-empty ranges.
    if (nonEmpty2.prev()) {
      equal(
        nonEmpty2.startID(),
        nonEmptyPrevStart,
        `${desc}: nonEmpty2.startID() = ${nonEmpty2.startID()}, want ${nonEmptyPrevStart}`
      )
      nonEmpty2.next()
      equal(
        nonEmpty2.startID(),
        nonEmptyStart,
        `${desc}: nonEmpty2.startID() = ${nonEmpty2.startID()}, want ${nonEmptyStart}`
      )
    } else {
      equal(
        nonEmpty2.startID(),
        nonEmptyStart,
        `${desc}: nonEmpty2.startID() = ${nonEmpty2.startID()}, want ${nonEmptyStart}`
      )
      equal(nonEmptyPrevStart, 0n, `${desc}: nonEmptyPrevStart = ${nonEmptyPrevStart}, want 0n`)
    }

    // Keep the non-empty iterator synchronized with the regular one.
    if (!it.isEmpty()) {
      equal(it.startID(), nonEmpty.startID(), `${desc}: it.startID() = ${it.startID()}, want ${nonEmpty.startID()}`)
      equal(it.limitID(), nonEmpty.limitID(), `${desc}: it.limitID() = ${it.limitID()}, want ${nonEmpty.limitID()}`)
      ok(!nonEmpty.done(), `${desc}: nonEmpty iterator should not be done but was`)
      nonEmptyPrevStart = nonEmptyStart
      nonEmpty.next()
    }

    prevStart = start
    it.next()
  }

  // Verify that the NonEmptyRangeIterator is also finished.
  ok(nonEmpty.done(), `${desc}: non empty iterator should have also finished`)
}

/**
 * Verifies that RangeIterator and ContentsIterator can be used to determine
 * the exact set of (CellID, label) pairs that contain any leaf cell.
 */
const verifyCellIndexContents = (desc: string, index: CellIndex): void => {
  // Precondition: The index has been built.
  // Under test: The contents iterator returns the correct set of (cellID, label) pairs.
  // Postcondition: All ranges are verified.

  // minCellID is the first CellID that has not been validated yet.
  let minCellID = cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL)
  const r = new CellIndexRangeIterator(index)

  for (r.begin(); !r.done(); r.next()) {
    equal(
      r.startID(),
      minCellID,
      `${desc}: minCellID should match the previous ending cellID. got ${r.startID()}, want ${minCellID}`
    )
    ok(
      minCellID < r.limitID(),
      `${desc}: minCellID should be < the end of the current range. got ${r.limitID()}, want > ${minCellID}`
    )
    ok(cellid.isLeaf(r.limitID()) || r.done(), `${desc}: ending range cell ID should be a leaf or done`)

    minCellID = r.limitID()

    // Build a list of expected (CellID, label) for this range.
    const expected: CellIndexNode[] = []
    for (const x of index.cellTree) {
      // The cell contains the entire range.
      if (cellid.rangeMin(x.cellID) <= r.startID() && cellid.next(cellid.rangeMax(x.cellID)) >= r.limitID()) {
        expected.push(x)
      } else {
        // Verify that the cell does not intersect the range.
        if (cellid.rangeMin(x.cellID) <= cellid.prev(r.limitID()) && cellid.rangeMax(x.cellID) >= r.startID()) {
          ok(
            false,
            `${desc}: CellID does not intersect the current range: ${cellid.rangeMin(x.cellID)} <= ${cellid.prev(r.limitID())} && ${cellid.rangeMax(x.cellID)} >= ${r.startID()}`
          )
        }
      }
    }

    const actual: CellIndexNode[] = []
    const cIter = new CellIndexContentsIterator(index)
    for (cIter.startUnion(r); !cIter.done(); cIter.next()) {
      actual.push({ cellID: cIter.cellID(), label: cIter.label(), parent: -1 })
    }

    ok(
      cellIndexNodesEqual(expected, actual),
      `${desc}: comparing contents iterator contents to this range: got ${stringifyNodes(actual)}, want ${stringifyNodes(expected)}`
    )
  }

  equal(
    minCellID,
    cellid.childEndAtLevel(cellid.fromFace(5), MAX_LEVEL),
    `${desc}: the final cell should be the sentinel value, got ${minCellID}`
  )
}

/**
 * Verifies that the index computes the correct set of (cellID, label) pairs
 * for every possible leaf cell. The running time of this function is
 * quadratic in the size of the index.
 */
const cellIndexQuadraticValidate = (desc: string, index: CellIndex): void => {
  // Precondition: The index has cells added.
  // Under test: The index correctly builds and iterators work.
  // Postcondition: All validations pass.

  index.build()
  verifyCellIndexCellIterator(desc, index)
  verifyCellIndexRangeIterators(desc, index)
  verifyCellIndexContents(desc, index)
}

/**
 * Generates a random CellUnion with the specified number of cells.
 */
const randomCellUnion = (numCells: number): CellUnion => {
  const cu = new CellUnion()
  for (let i = 0; i < numCells; i++) {
    cu.push(randomCellIDForLevel(randomUniformInt(MAX_LEVEL + 1)))
  }
  cu.normalize()
  return cu
}

describe('s2.CellIndex', () => {
  test('empty index', () => {
    // Precondition: An empty CellIndex is created.
    // Under test: The empty index validates correctly.
    // Postcondition: All iterator operations work on an empty index.

    const index = new CellIndex()
    cellIndexQuadraticValidate('Empty', index)
  })

  test('one face cell', () => {
    // Precondition: A CellIndex with a single face cell is created.
    // Under test: The index correctly handles a single face-level cell.
    // Postcondition: The index validates correctly.

    const index = new CellIndex()
    index.add(cellid.fromString('0/'), 0)
    cellIndexQuadraticValidate('One face cell', index)
  })

  test('one leaf cell', () => {
    // Precondition: A CellIndex with a single leaf cell is created.
    // Under test: The index correctly handles a single max-level cell.
    // Postcondition: The index validates correctly.

    const index = new CellIndex()
    index.add(cellid.fromString('1/012301230123012301230123012301'), 12)
    cellIndexQuadraticValidate('One Leaf Cell', index)
  })

  test('duplicate values', () => {
    // Precondition: A CellIndex with duplicate cells and different labels is created.
    // Under test: The index correctly handles duplicate cell entries.
    // Postcondition: The index validates correctly with all duplicates.

    const index = new CellIndex()
    index.add(cellid.fromString('0/'), 0)
    index.add(cellid.fromString('0/'), 0)
    index.add(cellid.fromString('0/'), 1)
    index.add(cellid.fromString('0/'), 17)
    cellIndexQuadraticValidate('Duplicate Values', index)
  })

  test('disjoint cells', () => {
    // Precondition: A CellIndex with non-overlapping cells is created.
    // Under test: The index correctly handles disjoint cells.
    // Postcondition: The index validates correctly.

    const index = new CellIndex()
    index.add(cellid.fromString('0/'), 0)
    index.add(cellid.fromString('3/'), 0)
    cellIndexQuadraticValidate('Disjoint Cells', index)
  })

  test('nested cells', () => {
    // Precondition: A CellIndex with nested cells is created, where some cells have the same RangeMin or RangeMax.
    // Under test: The index correctly handles nested cells with randomly ordered labels.
    // Postcondition: The index validates correctly.

    const index = new CellIndex()
    const inputs: CellIndexTestInput[] = [
      { cellID: '1/', label: 3 },
      { cellID: '1/0', label: 15 },
      { cellID: '1/000', label: 9 },
      { cellID: '1/00000', label: 11 },
      { cellID: '1/012', label: 6 },
      { cellID: '1/01212', label: 5 },
      { cellID: '1/312', label: 17 },
      { cellID: '1/31200', label: 4 },
      { cellID: '1/3120000', label: 10 },
      { cellID: '1/333', label: 20 },
      { cellID: '1/333333', label: 18 },
      { cellID: '5/', label: 3 },
      { cellID: '5/3', label: 31 },
      { cellID: '5/3333', label: 27 }
    ]

    for (const input of inputs) {
      index.add(cellid.fromString(input.cellID), input.label)
    }
    cellIndexQuadraticValidate('Nested Cells', index)
  })

  test('contents iterator suppresses duplicates', () => {
    // Precondition: A CellIndex with nested cells that would cause duplicates is created.
    // Under test: The contents iterator stops reporting values once it reaches a node of the cell tree that was visited by the previous call to begin().
    // Postcondition: The index validates correctly.

    const index = new CellIndex()
    const inputs: CellIndexTestInput[] = [
      { cellID: '2/1', label: 1 },
      { cellID: '2/1', label: 2 },
      { cellID: '2/10', label: 3 },
      { cellID: '2/100', label: 4 },
      { cellID: '2/102', label: 5 },
      { cellID: '2/1023', label: 6 },
      { cellID: '2/31', label: 7 },
      { cellID: '2/313', label: 8 },
      { cellID: '2/3132', label: 9 },
      { cellID: '3/1', label: 10 },
      { cellID: '3/12', label: 11 },
      { cellID: '3/13', label: 12 }
    ]

    for (const input of inputs) {
      index.add(cellid.fromString(input.cellID), input.label)
    }
    cellIndexQuadraticValidate('Contents Iterator Suppresses Duplicates', index)
  })

  test('random cell unions', () => {
    // Precondition: A CellIndex with 100 random CellUnions is created.
    // Under test: The index correctly handles overlapping cell unions with distinct labels.
    // Postcondition: The index validates correctly.

    const index = new CellIndex()
    for (let i = 0; i < 100; i++) {
      index.addCellUnion(randomCellUnion(10), i)
    }
    cellIndexQuadraticValidate('Random Cell Unions', index)
  })
})

