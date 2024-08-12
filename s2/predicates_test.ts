import { test, describe } from 'node:test'
import { notEqual, equal, ok } from 'node:assert/strict'

import { sign, robustSign, exactSign, stableSign, expensiveSign } from './predicates'
import { CLOCKWISE, COUNTERCLOCKWISE, INDETERMINATE } from './predicates'

import { Point } from './Point'
import { Vector } from '../r3/Vector'
import * as matrix from './matrix3x3.ts'
import { randomFrame } from './testing.ts'

describe('s2.predicates', () => {
  test('sign', () => {
    const tests = [
      { p1: [1, 0, 0], p2: [0, 1, 0], p3: [0, 0, 1], want: true },
      { p1: [0, 1, 0], p2: [0, 0, 1], p3: [1, 0, 0], want: true },
      { p1: [0, 0, 1], p2: [1, 0, 0], p3: [0, 1, 0], want: true },
      { p1: [1, 1, 0], p2: [0, 1, 1], p3: [1, 0, 1], want: true },
      { p1: [-3, -1, 4], p2: [2, -1, -3], p3: [1, -2, 0], want: true },
      { p1: [-3, -1, 0], p2: [-2, 1, 0], p3: [1, -2, 0], want: false },
      { p1: [-6, 3, 3], p2: [-4, 2, -1], p3: [-2, 1, 4], want: false },
      { p1: [0, -1, -1], p2: [0, 1, -2], p3: [0, 2, 1], want: false },
      { p1: [-1, 2, 7], p2: [2, 1, -4], p3: [4, 2, -8], want: false },
      { p1: [-4, -2, 7], p2: [2, 1, -4], p3: [4, 2, -8], want: false },
      { p1: [0, -5, 7], p2: [0, -4, 8], p3: [0, -2, 4], want: false },
      { p1: [-5, -2, 7], p2: [0, 0, -2], p3: [0, 0, -1], want: false },
      { p1: [0, -2, 7], p2: [0, 0, 1], p3: [0, 0, 2], want: false },
    ]

    for (const test of tests) {
      const p1 = new Point(test.p1[0], test.p1[1], test.p1[2])
      const p2 = new Point(test.p2[0], test.p2[1], test.p2[2])
      const p3 = new Point(test.p3[0], test.p3[1], test.p3[2])
      equal(sign(p1, p2, p3), test.want)
      if (test.want) equal(sign(p3, p2, p1), !test.want)
    }
  })

  // Points used in the various robustSign tests.
  const poA = new Point(0.72571927877036835, 0.46058825605889098, 0.51106749730504852)
  const poB = new Point(0.7257192746638208, 0.46058826573818168, 0.51106749441312738)
  const poC = new Point(0.72571927671709457, 0.46058826089853633, 0.51106749585908795)

  const x1 = new Point(0.99999999999999989, 1.4901161193847655e-8, 0)
  const x2 = new Point(1, 1.4901161193847656e-8, 0)
  const x3 = Point.fromVector(new Vector(1, 1, 1).normalize())
  const x4 = Point.fromVector(x3.vector.mul(0.99999999999999989))

  const y0 = new Point(1, 1, 0)
  const y1 = Point.fromVector(y0.vector.normalize())
  const y2 = Point.fromVector(y1.vector.normalize())

  test('robustSign equalities', () => {
    const tests = [
      {
        p1: Point.fromVector(poC.vector.sub(poA.vector)),
        p2: Point.fromVector(poB.vector.sub(poC.vector)),
        want: true,
      },
      { p1: x1, p2: Point.fromVector(x1.vector.normalize()), want: true },
      { p1: x2, p2: Point.fromVector(x2.vector.normalize()), want: true },
      { p1: x3, p2: Point.fromVector(x3.vector.normalize()), want: true },
      { p1: x4, p2: Point.fromVector(x4.vector.normalize()), want: true },
      { p1: x3, p2: x4, want: false },
      { p1: y1, p2: y2, want: false },
      { p1: y2, p2: Point.fromVector(y2.vector.normalize()), want: true },
    ]

    for (const test of tests) {
      equal(test.p1.equals(test.p2), test.want)
    }
  })

  test('robustSign', () => {
    const x = new Point(1, 0, 0)
    const y = new Point(0, 1, 0)
    const z = new Point(0, 0, 1)

    const tests = [
      { p1: x, p2: x, p3: z, want: INDETERMINATE },
      { p1: x, p2: y, p3: y, want: INDETERMINATE },
      { p1: z, p2: x, p3: z, want: INDETERMINATE },
      { p1: x, p2: y, p3: z, want: COUNTERCLOCKWISE },
      { p1: z, p2: y, p3: x, want: CLOCKWISE },
      { p1: poA, p2: poB, p3: poC, want: CLOCKWISE },
      { p1: x1, p2: x2, p3: Point.fromVector(x1.vector.mul(-1.0)), want: COUNTERCLOCKWISE },
      { p1: x3, p2: x4, p3: Point.fromVector(x3.vector.mul(-1.0)), want: CLOCKWISE },
      { p1: y1, p2: y2, p3: Point.fromVector(y1.vector.mul(-1.0)), want: COUNTERCLOCKWISE },
    ]

    for (const test of tests) {
      const result = robustSign(test.p1, test.p2, test.p3)
      equal(result, test.want)

      const rotated = robustSign(test.p2, test.p3, test.p1)
      equal(rotated, result)

      const reversed = robustSign(test.p3, test.p2, test.p1)
      const expectedReversed =
        result === CLOCKWISE ? COUNTERCLOCKWISE : result === COUNTERCLOCKWISE ? CLOCKWISE : INDETERMINATE
      equal(reversed, expectedReversed)
    }

    notEqual(robustSign(poA, poB, poC), INDETERMINATE)
    notEqual(robustSign(x1, x2, Point.fromVector(x1.vector.mul(-1))), INDETERMINATE)
    notEqual(robustSign(x3, x4, Point.fromVector(x3.vector.mul(-1))), INDETERMINATE)
    notEqual(robustSign(y1, y2, Point.fromVector(y1.vector.mul(-1))), INDETERMINATE)
  })

  test('stableSign failure rate', () => {
    // The Earth's mean radius in kilometers (according to NASA).
    const earthRadiusKm = 6371.01

    const iters = 1000
    const want = 0.01
    const spacing = 1.0

    let failureCount = 0
    const m = Math.tan(spacing / earthRadiusKm)
    for (let iter = 0; iter < iters; iter++) {
      const f = randomFrame()
      const a = matrix.col(f, 0)
      const x = matrix.col(f, 1)

      const b = Point.fromVector(a.vector.sub(x.vector.mul(m)).normalize())
      const c = Point.fromVector(a.vector.add(x.vector.mul(m)).normalize())
      const sign = stableSign(a, b, c)
      if (sign !== INDETERMINATE) {
        equal(
          exactSign(a, b, c, true),
          sign,
          `exactSign(${a}, ${b}, ${c}, true) = ${exactSign(a, b, c, true)}, want ${sign}`,
        )
      } else {
        failureCount++
      }
    }

    const rate = failureCount / iters
    ok(rate < want, `stableSign failure rate for spacing ${spacing} km = ${rate}, want ${want}`)
  })

  test('expensiveSign', () => {
    const tests = [
      {
        a: new Point(-3, -1, 0),
        b: new Point(-2, 1, 0),
        c: new Point(1, -2, 0),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(-6, 3, 3),
        b: new Point(-4, 2, -1),
        c: new Point(-2, 1, 4),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(0, -1, -1),
        b: new Point(0, 1, -2),
        c: new Point(0, 2, 1),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(-1, 2, 7),
        b: new Point(2, 1, -4),
        c: new Point(4, 2, -8),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(-4, -2, 7),
        b: new Point(2, 1, -4),
        c: new Point(4, 2, -8),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(0, -5, 7),
        b: new Point(0, -4, 8),
        c: new Point(0, -2, 4),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(-5, -2, 7),
        b: new Point(0, 0, -2),
        c: new Point(0, 0, -1),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(0, -2, 7),
        b: new Point(0, 0, 1),
        c: new Point(0, 0, 2),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(-3, 1, 7),
        b: new Point(-1, -4, 1),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(-6, -4, 7),
        b: new Point(-3, -2, 1),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE,
      },
      {
        a: new Point(0, -4, 7),
        b: new Point(0, -2, 1),
        c: new Point(0, 0, 0),
        want: CLOCKWISE,
      },
      {
        a: new Point(-1, -4, 5),
        b: new Point(0, 0, -3),
        c: new Point(0, 0, 0),
        want: CLOCKWISE,
      },
      {
        a: new Point(0, -4, 5),
        b: new Point(0, 0, -5),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE,
      },
    ]

    for (const test of tests) {
      ok(test.a.vector.cmp(test.b.vector) === -1)
      ok(test.b.vector.cmp(test.c.vector) === -1)
      equal(test.a.vector.dot(test.b.vector.cross(test.c.vector)), 0)
      equal(expensiveSign(test.a, test.b, test.c), test.want)
      equal(expensiveSign(test.b, test.c, test.a), test.want)
      equal(expensiveSign(test.c, test.a, test.b), test.want)
      equal(expensiveSign(test.c, test.b, test.a), -test.want)
      equal(expensiveSign(test.b, test.a, test.c), -test.want)
      equal(expensiveSign(test.a, test.c, test.b), -test.want)
    }
  })
})
