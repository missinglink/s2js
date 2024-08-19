import { test, describe } from 'node:test'
import { equal } from 'node:assert/strict'
import { Point } from './Point'
import {
  WEDGE_EQUALS,
  WEDGE_IS_DISJOINT,
  WEDGE_IS_PROPERLY_CONTAINED,
  WEDGE_PROPERLY_CONTAINS,
  WEDGE_PROPERLY_OVERLAPS,
  wedgeContains,
  wedgeIntersects,
  wedgeRelation
} from './wedge_relations'

describe('s2.wedge_relations', () => {
  test('relations', (t) => {
    // For simplicity, all of these tests use an origin of (0, 0, 1).
    // This shouldn't matter as long as the lower-level primitives are implemented correctly.
    const AB1 = Point.fromVector(new Point(0, 0, 1).vector.normalize())

    const TEST_CASES = [
      {
        desc: 'Intersection in one wedge',
        a0: new Point(-1, 0, 10),
        a1: new Point(1, 2, 10),
        b0: new Point(0, 1, 10),
        b1: new Point(1, -2, 10),
        contains: false,
        intersects: true,
        relation: WEDGE_PROPERLY_OVERLAPS
      },
      {
        desc: 'Intersection in two wedges',
        a0: new Point(-1, -1, 10),
        a1: new Point(1, -1, 10),
        b0: new Point(1, 0, 10),
        b1: new Point(-1, 1, 10),
        contains: false,
        intersects: true,
        relation: WEDGE_PROPERLY_OVERLAPS
      },
      {
        desc: 'Normal containment',
        a0: new Point(-1, -1, 10),
        a1: new Point(1, -1, 10),
        b0: new Point(-1, 0, 10),
        b1: new Point(1, 0, 10),
        contains: true,
        intersects: true,
        relation: WEDGE_PROPERLY_CONTAINS
      },
      {
        desc: 'Containment with equality on one side',
        a0: new Point(2, 1, 10),
        a1: new Point(-1, -1, 10),
        b0: new Point(2, 1, 10),
        b1: new Point(1, -5, 10),
        contains: true,
        intersects: true,
        relation: WEDGE_PROPERLY_CONTAINS
      },
      {
        desc: 'Containment with equality on the other side',
        a0: new Point(2, 1, 10),
        a1: new Point(-1, -1, 10),
        b0: new Point(1, -2, 10),
        b1: new Point(-1, -1, 10),
        contains: true,
        intersects: true,
        relation: WEDGE_PROPERLY_CONTAINS
      },
      {
        desc: 'Containment with equality on both sides',
        a0: new Point(-2, 3, 10),
        a1: new Point(4, -5, 10),
        b0: new Point(-2, 3, 10),
        b1: new Point(4, -5, 10),
        contains: true,
        intersects: true,
        relation: WEDGE_EQUALS
      },
      {
        desc: 'Disjoint with equality on one side',
        a0: new Point(-2, 3, 10),
        a1: new Point(4, -5, 10),
        b0: new Point(4, -5, 10),
        b1: new Point(-2, -3, 10),
        contains: false,
        intersects: false,
        relation: WEDGE_IS_DISJOINT
      },
      {
        desc: 'Disjoint with equality on the other side',
        a0: new Point(-2, 3, 10),
        a1: new Point(0, 5, 10),
        b0: new Point(4, -5, 10),
        b1: new Point(-2, 3, 10),
        contains: false,
        intersects: false,
        relation: WEDGE_IS_DISJOINT
      },
      {
        desc: 'Disjoint with equality on both sides',
        a0: new Point(-2, 3, 10),
        a1: new Point(4, -5, 10),
        b0: new Point(4, -5, 10),
        b1: new Point(-2, 3, 10),
        contains: false,
        intersects: false,
        relation: WEDGE_IS_DISJOINT
      },
      {
        desc: 'B contains A with equality on one side',
        a0: new Point(2, 1, 10),
        a1: new Point(1, -5, 10),
        b0: new Point(2, 1, 10),
        b1: new Point(-1, -1, 10),
        contains: false,
        intersects: true,
        relation: WEDGE_IS_PROPERLY_CONTAINED
      },
      {
        desc: 'B contains A with equality on the other side',
        a0: new Point(2, 1, 10),
        a1: new Point(1, -5, 10),
        b0: new Point(-2, 1, 10),
        b1: new Point(1, -5, 10),
        contains: false,
        intersects: true,
        relation: WEDGE_IS_PROPERLY_CONTAINED
      }
    ]

    for (const testCase of TEST_CASES) {
      const a0 = Point.fromVector(testCase.a0.vector.normalize())
      const a1 = Point.fromVector(testCase.a1.vector.normalize())
      const b0 = Point.fromVector(testCase.b0.vector.normalize())
      const b1 = Point.fromVector(testCase.b1.vector.normalize())

      equal(
        wedgeContains(a0, AB1, a1, b0, b1),
        testCase.contains,
        `${testCase.desc}: WedgeContains(${a0}, ${AB1}, ${a1}, ${b0}, ${b1}) = ${testCase.contains}`
      )

      equal(
        wedgeIntersects(a0, AB1, a1, b0, b1),
        testCase.intersects,
        `${testCase.desc}: WedgeIntersects(${a0}, ${AB1}, ${a1}, ${b0}, ${b1}) = ${testCase.intersects}`
      )

      equal(
        wedgeRelation(a0, AB1, a1, b0, b1),
        testCase.relation,
        `${testCase.desc}: WedgeRelation(${a0}, ${AB1}, ${a1}, ${b0}, ${b1}) = ${testCase.relation}`
      )
    }
  })
})
