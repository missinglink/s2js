import { test, describe } from 'node:test'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { CellUnion } from './CellUnion'
import { Point } from './Point'
import type { CellID } from './cellid'
import * as cellid from './cellid'
import { Rect } from './Rect'
import { Cell } from './Cell'
import { oneIn, randomCellIDForLevel, rectsApproxEqual } from './testing'
import { MAX_LEVEL } from './cellid_constants'
import { Interval as R1Interval } from '../r1/Interval'
import { Interval as S1Interval } from '../s1/Interval'
import { DEGREE } from '../s1/angle_constants'
import { EPSILON } from './predicates'

describe('s2.CellUnion', () => {
  test('duplicate cells not valid', () => {
    const id = cellid.fromPoint(Point.fromCoords(1, 0, 0))
    const cu = new CellUnion(id, id)
    equal(cu.isValid(), false)
  })

  test('unsorted cells not valid', () => {
    const id = cellid.parent(cellid.fromPoint(Point.fromCoords(1, 0, 0)), 10)
    const cu = new CellUnion(id, cellid.prev(id))
    equal(cu.isValid(), false)
  })

  test('isNormalized', () => {
    const id = cellid.parent(cellid.fromPoint(Point.fromCoords(1, 0, 0)), 10)
    const children = cellid.children(id)
    const cu = new CellUnion(children[0], children[1], children[2], children[3])
    equal(cu.isValid(), true)
    equal(cu.isNormalized(), false)
  })

  test('invalid cellID not valid', () => {
    const cu = new CellUnion(0n)
    equal(cu.isValid(), false)
  })

  test('areSiblings', () => {
    const id = cellid.parent(cellid.fromPoint(Point.fromCoords(1, 0, 0)), 10)
    const children = cellid.children(id)
    ok(CellUnion.areSiblings(children[0], children[1], children[2], children[3]))
    equal(CellUnion.areSiblings(id, children[1], children[2], children[3]), false)
  })

  test('normalize', () => {
    const cu = new CellUnion(
      0x80855c0000000000n, // A: a cell over Pittsburg CA
      0x80855d0000000000n, // B, a child of A
      0x8085634000000000n, // first child of X, disjoint from A
      0x808563c000000000n, // second child of X
      0x80855dc000000000n, // a child of B
      0x808562c000000000n, // third child of X
      0x8085624000000000n, // fourth child of X
      0x80855d0000000000n // B again
    )
    const exp = new CellUnion(
      0x80855c0000000000n, // A
      0x8085630000000000n // X
    )
    cu.normalize()
    deepEqual(cu, exp)
  })

  test('basic', () => {
    const empty = new CellUnion()
    empty.normalize()
    equal(empty.length, 0)

    const face1ID = cellid.fromFace(1)
    const face1Cell = Cell.fromCellID(face1ID)
    const face1Union = new CellUnion(face1ID)
    face1Union.normalize()
    equal(face1Union.length, 1)
    equal(face1Union[0], face1ID)
    ok(face1Union.containsCell(face1Cell))

    const face2ID = cellid.fromFace(2)
    const face2Cell = Cell.fromCellID(face2ID)
    const face2Union = new CellUnion(face2ID)
    face2Union.normalize()
    equal(face2Union.length, 1)
    equal(face2Union[0], face2ID)

    equal(face1Union.containsCell(face2Cell), false)
  })

  test('tests', () => {
    const tests = [
      {
        cells: [0x89c25c0000000000n],
        contained: [cellid.childBegin(0x89c25c0000000000n), cellid.childBeginAtLevel(0x89c25c0000000000n, 28)],
        overlaps: [cellid.immediateParent(0x89c25c0000000000n), cellid.fromFace(cellid.face(0x89c25c0000000000n))],
        disjoint: [
          cellid.next(0x89c25c0000000000n),
          cellid.childBeginAtLevel(cellid.next(0x89c25c0000000000n), 28),
          0x89c2700000000000n,
          0x89e9000000000000n,
          0x89c1000000000000n
        ]
      },
      {
        cells: [
          0x89c25b0000000000n,
          0x89c2590000000000n,
          0x89c2f70000000000n,
          0x89c2f50000000000n,
          0x8085870000000000n,
          0x8085810000000000n,
          0x808f7d0000000000n,
          0x808f7f0000000000n
        ],
        contained: [
          0x808f7ef300000000n,
          0x808f7e5cf0000000n,
          0x808587f000000000n,
          0x89c25ac000000000n,
          0x89c259a400000000n,
          0x89c258fa10000000n,
          0x89c258f174007000n
        ],
        overlaps: [0x808c000000000000n, 0x89c4000000000000n],
        disjoint: [
          0x89c15a4fcb1bb000n,
          0x89c15a4e4aa95000n,
          0x8094000000000000n,
          0x8096f10000000000n,
          0x87c0000000000000n
        ]
      }
    ]

    for (const test of tests) {
      const union = new CellUnion(...test.cells)
      union.normalize()

      for (const id of test.cells) {
        ok(union.intersectsCellID(id))
        ok(union.containsCellID(id))
      }
      for (const id of test.contained) {
        ok(union.intersectsCellID(id))
        ok(union.containsCellID(id))
      }
      for (const id of test.overlaps) {
        ok(union.intersectsCellID(id))
        equal(union.containsCellID(id), false)
      }
      for (const id of test.disjoint) {
        equal(union.intersectsCellID(id), false)
        equal(union.containsCellID(id), false)
      }
    }
  })

  test('capBound precision', () => {
    const tests = [
      { union: new CellUnion(2810246167479189504n, 12465963768561532928n), cellid: 12465963768561532928n },
      {
        union: new CellUnion(
          2990460521318187008n,
          2992360477410983936n,
          4251398048237748224n,
          9511602413006487552n,
          13042424520864956416n
        ),
        cellid: 4251398048237748224n
      }
    ]

    tests.forEach((test) => {
      // console.error('---')
      // test.union.forEach((ci) => {
      //   console.error(ci.toString(2).padStart(64, '0'))
      // })
      const cb = test.union.capBound()
      // console.error('cap', cb.toString())
      // console.error('cap center', cb.center)
      const c = Cell.fromCellID(test.cellid)
      ok(cb.containsCell(c), `${cb.toString()} containsCell ${c.toString()}`)
    })
  })

  test('normalize pseudo random', () => {
    let inSum = 0
    let outSum = 0
    const iters = 2000

    for (let i = 0; i < iters; i++) {
      const input = []
      const expected = []
      addCells(0n, false, input, expected)

      inSum += input.length
      outSum += expected.length

      const cellunion = new CellUnion(...input)
      cellunion.normalize()

      equal(cellunion.length, expected.length)

      // Test CapBound().
      const cb = cellunion.capBound()
      for (const ci of cellunion) {
        ok(cb.containsCell(Cell.fromCellID(ci)), `${cb} contains ${ci}`)
      }

      for (const j of input) {
        ok(cellunion.containsCellID(j))
        ok(cellunion.intersectsCellID(j))

        if (!cellid.isFace(j)) {
          ok(cellunion.intersectsCellID(cellid.immediateParent(j)))
          if (cellid.level(j) > 1) {
            ok(cellunion.intersectsCellID(cellid.immediateParent(cellid.immediateParent(j))))
            ok(cellunion.intersectsCellID(cellid.parent(j, 0)))
          }
        }

        if (!cellid.isLeaf(j)) {
          ok(cellunion.containsCellID(cellid.childBegin(j)))
          ok(cellunion.intersectsCellID(cellid.childBegin(j)))
          ok(cellunion.containsCellID(cellid.prev(cellid.childEnd(j))))
          ok(cellunion.intersectsCellID(cellid.prev(cellid.childEnd(j))))
          ok(cellunion.containsCellID(cellid.childBeginAtLevel(j, MAX_LEVEL)))
          ok(cellunion.intersectsCellID(cellid.childBeginAtLevel(j, MAX_LEVEL)))
        }
      }

      for (const exp of expected) {
        if (!cellid.isFace(exp)) {
          equal(cellunion.containsCellID(cellid.parent(exp, cellid.level(exp) - 1)), false)
          equal(cellunion.containsCellID(cellid.parent(exp, 0)), false)
        }
      }

      const test = []
      const dummy = []
      addCells(0n, false, test, dummy)
      for (const j of test) {
        let intersects = false
        let contains = false
        for (const k of expected) {
          if (cellid.contains(k, j)) contains = true
          if (cellid.intersects(k, j)) intersects = true
        }
        equal(cellunion.containsCellID(j), contains)
        equal(cellunion.intersectsCellID(j), intersects)
      }
    }
  })

  test('denormalize', () => {
    const tests = [
      {
        name: 'not expanded, level mod == 1',
        minL: 10,
        lMod: 1,
        cu: new CellUnion(
          cellid.childBeginAtLevel(cellid.fromFace(2), 11),
          cellid.childBeginAtLevel(cellid.fromFace(2), 11),
          cellid.childBeginAtLevel(cellid.fromFace(3), 14),
          cellid.childBeginAtLevel(cellid.fromFace(0), 10)
        ),
        exp: new CellUnion(
          cellid.childBeginAtLevel(cellid.fromFace(2), 11),
          cellid.childBeginAtLevel(cellid.fromFace(2), 11),
          cellid.childBeginAtLevel(cellid.fromFace(3), 14),
          cellid.childBeginAtLevel(cellid.fromFace(0), 10)
        )
      },
      {
        name: 'not expanded, level mod > 1',
        minL: 10,
        lMod: 2,
        cu: new CellUnion(
          cellid.childBeginAtLevel(cellid.fromFace(2), 12),
          cellid.childBeginAtLevel(cellid.fromFace(2), 12),
          cellid.childBeginAtLevel(cellid.fromFace(3), 14),
          cellid.childBeginAtLevel(cellid.fromFace(0), 10)
        ),
        exp: new CellUnion(
          cellid.childBeginAtLevel(cellid.fromFace(2), 12),
          cellid.childBeginAtLevel(cellid.fromFace(2), 12),
          cellid.childBeginAtLevel(cellid.fromFace(3), 14),
          cellid.childBeginAtLevel(cellid.fromFace(0), 10)
        )
      },
      {
        name: 'expended, (level - min_level) is not multiple of level mod',
        minL: 10,
        lMod: 3,
        cu: new CellUnion(
          cellid.childBeginAtLevel(cellid.fromFace(2), 12),
          cellid.childBeginAtLevel(cellid.fromFace(5), 11)
        ),
        exp: new CellUnion(
          ...cellid.children(cellid.childBeginAtLevel(cellid.fromFace(2), 12)),
          ...cellid.children(cellid.childBeginAtLevel(cellid.fromFace(5), 11)).flatMap((c) => cellid.children(c))
        )
      },
      {
        name: 'expended, level < min_level',
        minL: 10,
        lMod: 3,
        cu: new CellUnion(cellid.childBeginAtLevel(cellid.fromFace(2), 9)),
        exp: new CellUnion(...cellid.children(cellid.childBeginAtLevel(cellid.fromFace(2), 9)))
      }
    ]

    for (const test of tests) {
      test.cu.denormalize(test.minL, test.lMod)
      deepEqual(test.cu, test.exp)
    }
  })

  test('rectBound', () => {
    const tests = [
      { cu: new CellUnion(), want: Rect.emptyRect() },
      {
        cu: new CellUnion(cellid.fromFace(1)),
        want: new Rect(new R1Interval(-Math.PI / 4, Math.PI / 4), new S1Interval(Math.PI / 4, (3 * Math.PI) / 4))
      },
      {
        cu: new CellUnion(0x808c000000000000n), // Big SFO
        want: new Rect(
          new R1Interval(DEGREE * 34.644220547108482, DEGREE * 38.011928357226651),
          new S1Interval(DEGREE * -124.508522987668428, DEGREE * -121.628309835221216)
        )
      },
      {
        cu: new CellUnion(0x89c4000000000000n), // Big NYC
        want: new Rect(
          new R1Interval(DEGREE * 38.794595155857657, DEGREE * 41.747046884651063),
          new S1Interval(DEGREE * -76.456308667788633, DEGREE * -73.465162142654819)
        )
      },
      {
        cu: new CellUnion(0x89c4000000000000n, 0x808c000000000000n), // Big NYC, Big SFO
        want: new Rect(
          new R1Interval(DEGREE * 34.644220547108482, DEGREE * 41.747046884651063),
          new S1Interval(DEGREE * -124.508522987668428, DEGREE * -73.465162142654819)
        )
      }
    ]

    for (const { cu, want } of tests) {
      const got = cu.rectBound()
      ok(rectsApproxEqual(got, want, EPSILON, EPSILON))
    }
  })

  test('leafCellsCovered', () => {
    const fiveFaces = new CellUnion(cellid.fromFace(0))
    fiveFaces.expandAtLevel(0)

    const wholeWorld = new CellUnion(cellid.fromFace(0))
    wholeWorld.expandAtLevel(0)
    wholeWorld.expandAtLevel(0)

    const tests = [
      { have: [], want: 0n },
      { have: [cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL)], want: 1n },
      {
        have: [cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL), cellid.fromFace(0)],
        want: 1n << 60n
      },
      { have: fiveFaces, want: 5n << 60n },
      { have: wholeWorld, want: 6n << 60n },
      {
        have: [
          cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL),
          cellid.fromFace(0),
          cellid.childBeginAtLevel(cellid.fromFace(1), 1),
          cellid.childBeginAtLevel(cellid.fromFace(2), 2),
          cellid.prev(cellid.childEndAtLevel(cellid.fromFace(2), 2)),
          cellid.childBeginAtLevel(cellid.fromFace(3), 14),
          cellid.childBeginAtLevel(cellid.fromFace(4), 27),
          cellid.prev(cellid.childEndAtLevel(cellid.fromFace(4), 15)),
          cellid.childBeginAtLevel(cellid.fromFace(5), 30)
        ],
        want: 1n + (1n << 6n) + (1n << 30n) + (1n << 32n) + (2n << 56n) + (1n << 58n) + (1n << 60n)
      }
    ]

    for (const { have, want } of tests) {
      const cu = new CellUnion(...have)
      cu.normalize()
      equal(cu.leafCellsCovered(), want)
    }
  })

  test('fromRange', () => {
    for (let iter = 0; iter < 2000; iter++) {
      let min = randomCellIDForLevel(MAX_LEVEL)
      let max = randomCellIDForLevel(MAX_LEVEL)
      if (min > max) [min, max] = [max, min]

      const cu = CellUnion.fromRange(min, cellid.next(max))
      ok(cu.length > 0)
      equal(cellid.rangeMin(cu[0]), min)
      equal(cellid.rangeMax(cu[cu.length - 1]), max)

      for (let i = 1; i < cu.length; i++) {
        equal(cellid.rangeMin(cu[i]), cellid.next(cellid.rangeMax(cu[i - 1])))
      }
    }

    // Focus on test cases that generate an empty or full range.

    // Test an empty range before the minimum CellID.
    const idBegin = cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL)
    let cu = CellUnion.fromRange(idBegin, idBegin)
    equal(cu.length, 0)

    // Test an empty range after the maximum CellID.
    const idEnd = cellid.childEndAtLevel(cellid.fromFace(5), MAX_LEVEL)
    cu = CellUnion.fromRange(idEnd, idEnd)
    equal(cu.length, 0)

    // Test the full sphere.
    cu = CellUnion.fromRange(idBegin, idEnd)
    equal(cu.length, 6)

    for (let i = 0; i < cu.length; i++) {
      ok(cellid.isFace(cu[i]))
    }
  })

  test('from union diff intersection', () => {
    const iters = 2000

    for (let i = 0; i < iters; i++) {
      const input = []
      const expected = []
      addCells(0n, false, input, expected)

      let x = []
      let y = []
      let xOrY = []
      let xAndY: CellID[] = []

      for (const id of input) {
        const inX = oneIn(2)
        const inY = oneIn(2)

        if (inX) x.push(id)
        if (inY) y.push(id)
        if (inX || inY) xOrY.push(id)
      }

      const xCells = new CellUnion(...x)
      xCells.normalize()
      const yCells = new CellUnion(...y)
      yCells.normalize()
      const xOrYExpected = new CellUnion(...xOrY)
      xOrYExpected.normalize()

      const xOrYCells = CellUnion.fromUnion(xCells, yCells)
      deepEqual(xOrYCells, xOrYExpected)

      for (const yid of yCells) {
        const u = CellUnion.fromIntersectionWithCellID(xCells, yid)
        for (const xid of xCells) {
          if (cellid.contains(xid, yid)) {
            equal(u.length, 1)
            equal(u[0], yid)
          } else if (cellid.contains(yid, xid)) {
            ok(u.containsCellID(xid))
          }
        }
        for (const uCellID of u) {
          ok(xCells.containsCellID(uCellID))
          ok(cellid.contains(yid, uCellID))
        }
        xAndY.push(...u)
      }

      const xAndYExpected = new CellUnion(...xAndY)
      xAndYExpected.normalize()

      const xAndYCells = CellUnion.fromIntersection(xCells, yCells)
      deepEqual(xAndYCells, xAndYExpected)

      const xMinusYCells = CellUnion.fromDifference(xCells, yCells)
      const yMinusXCells = CellUnion.fromDifference(yCells, xCells)
      ok(xCells.contains(xMinusYCells))
      equal(xMinusYCells.intersects(yCells), false)
      ok(yCells.contains(yMinusXCells))
      equal(yMinusXCells.intersects(xCells), false)
      equal(xMinusYCells.intersects(yMinusXCells), false)

      const diffUnion = CellUnion.fromUnion(xMinusYCells, yMinusXCells)
      const diffIntersectionUnion = CellUnion.fromUnion(diffUnion, xAndYCells)
      deepEqual(diffIntersectionUnion, xOrYCells)
    }
  })

  // test('Expand', () => {
  //   for (let i = 0; i < 5000; i++) {
  //     const rndCap = randomCap(AvgAreaMetric.value(MAX_LEVEL), 4 * Math.PI)
  //     const expandedCap = Cap.fromCenterHeight(
  //       rndCap.center,
  //       Math.min(2.0, Math.pow(1e2, randomFloat64()) * rndCap.height())
  //     )

  //     const radius = expandedCap.radius()
  //     const maxLevelDiff = randomUniformInt(8)

  //     const coverer = new RegionCoverer({
  //       maxLevel: MAX_LEVEL,
  //       maxCells: 1 + skewedInt(10),
  //       levelMod: 1,
  //     })

  //     const covering = coverer.cellUnion(rndCap)
  //     checkCellUnionCovering(rndCap, covering, true, 0)
  //     const coveringRadius = cellUnionDistanceFromAxis(covering, rndCap.center)

  //     let minLevel = MAX_LEVEL
  //     for (const cid of covering) {
  //       minLevel = Math.min(minLevel, cid.level())
  //     }
  //     const expandLevel = Math.min(minLevel + maxLevelDiff, minWidthMetric.maxLevel(radius))

  //     covering.expandByRadius(radius, maxLevelDiff)
  //     checkCellUnionCovering(expandedCap, covering, false, 0)
  //     const expandedCoveringRadius = cellUnionDistanceFromAxis(covering, rndCap.center)

  //     ok(expandedCoveringRadius - coveringRadius < 2 * maxDiagMetric.value(expandLevel))
  //   }
  // })

  test('empty', () => {
    const empty = new CellUnion()

    empty.normalize()
    equal(empty.length, 0)

    empty.denormalize(0, 2)
    equal(empty.length, 0)

    const face1ID = cellid.fromFace(1)

    equal(empty.containsCellID(face1ID), false)
    ok(empty.contains(empty))

    equal(empty.intersectsCellID(face1ID), false)
    equal(empty.intersects(empty), false)

    let cellUnion = CellUnion.fromUnion(empty, empty)
    equal(cellUnion.length, 0)

    let intersection = CellUnion.fromIntersectionWithCellID(empty, face1ID)
    equal(intersection.length, 0)

    intersection = CellUnion.fromIntersection(empty, empty)
    equal(intersection.length, 0)

    empty.expandByRadius(1, 20)
    equal(empty.length, 0)

    empty.expandAtLevel(10)
    equal(empty.length, 0)
  })
})
/**
 * Recursively adds cells to the input and expected arrays based on selection criteria.
 * If `selected` is true, the region covered by `id` must be added to the test case
 * (either by adding `id` itself, or some combination of its descendants, or both).
 * The corresponding expected result after simplification is added to `expected`.
 */
export const addCells = (id: CellID, selected: boolean, input: CellID[], expected: CellID[]) => {
  if (id === 0n) {
    // Initial call: decide whether to add cell(s) from each face.
    for (let face = 0; face < 6; face++) {
      addCells(cellid.fromFace(face), false, input, expected)
    }
    return
  }

  if (cellid.isLeaf(id)) {
    // The oneIn() call below ensures that the parent of a leaf cell will always be selected.
    equal(selected, true, 'Leaf cell selected but not marked as selected')
    input.push(id)
    return
  }

  // Ensures that the probability of selecting a cell at each level is approximately the same.
  if (!selected && oneIn(MAX_LEVEL - cellid.level(id))) {
    expected.push(id)
    selected = true
  }

  let added = false
  if (selected && !oneIn(6)) {
    input.push(id)
    added = true
  }

  let numChildren = 0
  for (let child = cellid.childBegin(id); child !== cellid.childEnd(id); child = cellid.next(child)) {
    // If the cell is selected, on average we recurse on 4/12 = 1/3 child.
    // If the cell is not selected, on average we recurse on one child.
    let recurse = false
    if (selected) {
      recurse = oneIn(12)
    } else {
      recurse = oneIn(4)
    }
    if (recurse && numChildren < 3) {
      addCells(child, selected, input, expected)
      numChildren++
    }

    // Ensure that all 4 children (or some combination of their descendants) are added if needed.
    if (selected && !added) {
      addCells(child, selected, input, expected)
    }
  }
}
