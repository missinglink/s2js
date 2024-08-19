import { test, describe } from 'node:test'
import { notEqual, equal, ok } from 'node:assert/strict'
import { Point } from './Point'
import { Vector } from '../r3/Vector'
import * as matrix from './matrix3x3.ts'
import { EARTH_RADIUS_KM, randomFrame } from './testing'
import { PreciseVector } from '../r3/PreciseVector'
import {
  sign,
  robustSign,
  exactSign,
  stableSign,
  expensiveSign,
  triageCompareSin2Distances,
  exactCompareDistances,
  symbolicCompareDistances,
  compareDistances,
  triageCompareCosDistances,
  CLOCKWISE,
  COUNTERCLOCKWISE,
  INDETERMINATE
} from './predicates'

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
      { p1: [0, -2, 7], p2: [0, 0, 1], p3: [0, 0, 2], want: false }
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

  // The following points happen to be *exactly collinear* along a line that it
  // approximate tangent to the surface of the unit sphere. In fact, C is the
  // exact midpoint of the line segment AB. All of these points are close
  // enough to unit length to satisfy r3.Vector.IsUnit().
  const poA = new Point(0.72571927877036835, 0.46058825605889098, 0.51106749730504852)
  const poB = new Point(0.7257192746638208, 0.46058826573818168, 0.51106749441312738)
  const poC = new Point(0.72571927671709457, 0.46058826089853633, 0.51106749585908795)

  // The points "x1" and "x2" are exactly proportional, i.e. they both lie
  // on a common line through the origin. Both points are considered to be
  // normalized, and in fact they both satisfy (x == x.Normalize()).
  // Therefore the triangle (x1, x2, -x1) consists of three distinct points
  // that all lie on a common line through the origin.
  const x1 = new Point(0.99999999999999989, 1.4901161193847655e-8, 0)
  const x2 = new Point(1, 1.4901161193847656e-8, 0)

  // Here are two more points that are distinct, exactly proportional, and
  // that satisfy (x == x.Normalize()).
  const x3 = Point.fromVector(new Vector(1, 1, 1).normalize())
  const x4 = Point.fromVector(x3.vector.mul(0.99999999999999989))

  // The following three points demonstrate that Normalize() is not idempotent, i.e.
  // y0.Normalize() != y0.Normalize().Normalize(). Both points are exactly proportional.
  const y0 = new Point(1, 1, 0)
  const y1 = Point.fromVector(y0.vector.normalize())
  const y2 = Point.fromVector(y1.vector.normalize())

  // triageCompareMinusSin2Distance wrapper to invert X for use when angles > 90.
  const triageCompareMinusSin2Distance = (x: Point, a: Point, b: Point): number => {
    return -triageCompareSin2Distances(Point.fromVector(x.vector.mul(-1)), a, b)
  }

  test('robustSign equalities', () => {
    const tests = [
      {
        p1: Point.fromVector(poC.vector.sub(poA.vector)),
        p2: Point.fromVector(poB.vector.sub(poC.vector)),
        want: true
      },
      { p1: x1, p2: Point.fromVector(x1.vector.normalize()), want: true },
      { p1: x2, p2: Point.fromVector(x2.vector.normalize()), want: true },
      { p1: x3, p2: Point.fromVector(x3.vector.normalize()), want: true },
      { p1: x4, p2: Point.fromVector(x4.vector.normalize()), want: true },
      { p1: x3, p2: x4, want: false },
      { p1: y1, p2: y2, want: false },
      { p1: y2, p2: Point.fromVector(y2.vector.normalize()), want: true }
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
      // Simple collinear points test cases.
      // a == b != c
      { p1: x, p2: x, p3: z, want: INDETERMINATE },

      // a != b == c
      { p1: x, p2: y, p3: y, want: INDETERMINATE },

      // c == a != b
      { p1: z, p2: x, p3: z, want: INDETERMINATE },

      // CCW
      { p1: x, p2: y, p3: z, want: COUNTERCLOCKWISE },

      // CW
      { p1: z, p2: y, p3: x, want: CLOCKWISE },

      // Edge cases:
      // The following points happen to be *exactly collinear* along a line that it
      // approximate tangent to the surface of the unit sphere. In fact, C is the
      // exact midpoint of the line segment AB. All of these points are close
      // enough to unit length to satisfy IsUnitLength().
      { p1: poA, p2: poB, p3: poC, want: CLOCKWISE },

      // The points "x1" and "x2" are exactly proportional, i.e. they both lie
      // on a common line through the origin. Both points are considered to be
      // normalized, and in fact they both satisfy (x == x.Normalize()).
      // Therefore the triangle (x1, x2, -x1) consists of three distinct points
      // that all lie on a common line through the origin.
      { p1: x1, p2: x2, p3: Point.fromVector(x1.vector.mul(-1.0)), want: COUNTERCLOCKWISE },

      // Here are two more points that are distinct, exactly proportional, and
      // that satisfy (x == x.Normalize()).
      { p1: x3, p2: x4, p3: Point.fromVector(x3.vector.mul(-1.0)), want: CLOCKWISE },

      // The following points demonstrate that Normalize() is not idempotent,
      // i.e. y0.Normalize() != y0.Normalize().Normalize(). Both points satisfy
      // IsNormalized(), though, and the two points are exactly proportional.
      { p1: y1, p2: y2, p3: Point.fromVector(y1.vector.mul(-1.0)), want: COUNTERCLOCKWISE }
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
    const iters = 1000

    // Verify that stableSign is able to handle most cases where the three
    // points are as collinear as possible. (For reference, triageSign fails
    // almost 100% of the time on this test.)
    //
    // Note that the failure rate *decreases* as the points get closer together,
    // and the decrease is approximately linear. For example, the failure rate
    // is 0.4% for collinear points spaced 1km apart, but only 0.0004% for
    // collinear points spaced 1 meter apart.
    //
    //  1km spacing: <  1% (actual is closer to 0.4%)
    // 10km spacing: < 10% (actual is closer to 4%)
    const want = 0.014 // @todo: missinglink failure rate was at 0.01 for Go port
    const spacing = 1.0

    // Estimate the probability that stableSign will not be able to compute
    // the determinant sign of a triangle A, B, C consisting of three points
    // that are as collinear as possible and spaced the given distance apart
    // by counting up the times it returns Indeterminate.
    let failureCount = 0
    const m = Math.tan(spacing / EARTH_RADIUS_KM)
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
          `exactSign(${a}, ${b}, ${c}, true) = ${exactSign(a, b, c, true)}, want ${sign}`
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
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-6, 3, 3),
        b: new Point(-4, 2, -1),
        c: new Point(-2, 1, 4),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(0, -1, -1),
        b: new Point(0, 1, -2),
        c: new Point(0, 2, 1),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-1, 2, 7),
        b: new Point(2, 1, -4),
        c: new Point(4, 2, -8),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-4, -2, 7),
        b: new Point(2, 1, -4),
        c: new Point(4, 2, -8),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(0, -5, 7),
        b: new Point(0, -4, 8),
        c: new Point(0, -2, 4),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-5, -2, 7),
        b: new Point(0, 0, -2),
        c: new Point(0, 0, -1),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(0, -2, 7),
        b: new Point(0, 0, 1),
        c: new Point(0, 0, 2),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-3, 1, 7),
        b: new Point(-1, -4, 1),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-6, -4, 7),
        b: new Point(-3, -2, 1),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(0, -4, 7),
        b: new Point(0, -2, 1),
        c: new Point(0, 0, 0),
        want: CLOCKWISE
      },
      {
        a: new Point(-1, -4, 5),
        b: new Point(0, 0, -3),
        c: new Point(0, 0, 0),
        want: CLOCKWISE
      },
      {
        a: new Point(0, -4, 5),
        b: new Point(0, 0, -5),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE
      }
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

  test('symbolicallyPerturbedSign', () => {
    const tests = [
      {
        a: new Point(-3, -1, 0),
        b: new Point(-2, 1, 0),
        c: new Point(1, -2, 0),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-6, 3, 3),
        b: new Point(-4, 2, -1),
        c: new Point(-2, 1, 4),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(0, -1, -1),
        b: new Point(0, 1, -2),
        c: new Point(0, 2, 1),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-1, 2, 7),
        b: new Point(2, 1, -4),
        c: new Point(4, 2, -8),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-4, -2, 7),
        b: new Point(2, 1, -4),
        c: new Point(4, 2, -8),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(0, -5, 7),
        b: new Point(0, -4, 8),
        c: new Point(0, -2, 4),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-5, -2, 7),
        b: new Point(0, 0, -2),
        c: new Point(0, 0, -1),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(0, -2, 7),
        b: new Point(0, 0, 1),
        c: new Point(0, 0, 2),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-3, 1, 7),
        b: new Point(-1, -4, 1),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(-6, -4, 7),
        b: new Point(-3, -2, 1),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE
      },
      {
        a: new Point(0, -4, 7),
        b: new Point(0, -2, 1),
        c: new Point(0, 0, 0),
        want: CLOCKWISE
      },
      {
        a: new Point(-1, -4, 5),
        b: new Point(0, 0, -3),
        c: new Point(0, 0, 0),
        want: CLOCKWISE
      },
      {
        a: new Point(0, -4, 5),
        b: new Point(0, 0, -5),
        c: new Point(0, 0, 0),
        want: COUNTERCLOCKWISE
      }
    ]

    tests.forEach(({ a, b, c, want }) => {
      equal(a.vector.cmp(b.vector) < 0, true)
      equal(b.vector.cmp(c.vector) < 0, true)
      equal(Math.abs(a.vector.dot(b.vector.cross(c.vector))) < 1e-15, true)

      equal(expensiveSign(a, b, c), want)
      equal(expensiveSign(b, c, a), want)
      equal(expensiveSign(c, a, b), want)
      equal(expensiveSign(c, b, a), -want)
      equal(expensiveSign(b, a, c), -want)
      equal(expensiveSign(a, c, b), -want)
    })
  })

  test('compareDistances coverage', () => {
    const tests = [
      {
        x: Point.fromCoords(1, 1, 1),
        a: Point.fromCoords(1, 1 - 1e-15, 1),
        b: Point.fromCoords(1, 1, 1 + 2e-15),
        distFunc: triageCompareSin2Distances,
        wantSign: -1,
        wantPrec: 'double'
      },
      {
        x: Point.fromCoords(1, 1, 0),
        a: Point.fromCoords(1, 1 - 1e-15, 1e-21),
        b: Point.fromCoords(1, 1 - 1e-15, 0),
        distFunc: triageCompareSin2Distances,
        wantSign: 1,
        wantPrec: 'double'
      },
      {
        x: new Point(2, 0, 0),
        a: new Point(2, -1, 0),
        b: new Point(2, 1, 1e-100),
        distFunc: triageCompareSin2Distances,
        wantSign: -1,
        wantPrec: 'exact'
      },
      {
        x: Point.fromCoords(1, 0, 0),
        a: Point.fromCoords(1, -1, 0),
        b: Point.fromCoords(1, 1, 0),
        distFunc: triageCompareSin2Distances,
        wantSign: 1,
        wantPrec: 'symbolic'
      },
      {
        x: Point.fromCoords(1, 0, 0),
        a: Point.fromCoords(1, 0, 0),
        b: Point.fromCoords(1, 0, 0),
        distFunc: triageCompareSin2Distances,
        wantSign: 0,
        wantPrec: 'symbolic'
      },
      {
        x: Point.fromCoords(1, 1, 1),
        a: Point.fromCoords(1, -1, 0),
        b: Point.fromCoords(-1, 1, 3e-15),
        distFunc: triageCompareCosDistances,
        wantSign: 1,
        wantPrec: 'double'
      },
      {
        x: Point.fromCoords(1, 0, 0),
        a: Point.fromCoords(1, 1e-30, 0),
        b: Point.fromCoords(-1, 1e-40, 0),
        distFunc: triageCompareCosDistances,
        wantSign: -1,
        wantPrec: 'double'
      },
      {
        x: Point.fromCoords(1, 1, 1),
        a: Point.fromCoords(1, -1, 0),
        b: Point.fromCoords(-1, 1, 1e-100),
        distFunc: triageCompareCosDistances,
        wantSign: 1,
        wantPrec: 'exact'
      },
      {
        x: Point.fromCoords(1, 1, 1),
        a: Point.fromCoords(1, -1, 0),
        b: Point.fromCoords(-1, 1, 0),
        distFunc: triageCompareCosDistances,
        wantSign: -1,
        wantPrec: 'symbolic'
      },
      {
        x: Point.fromCoords(1, 1, 1),
        a: Point.fromCoords(1, -1, 0),
        b: Point.fromCoords(1, -1, 0),
        distFunc: triageCompareCosDistances,
        wantSign: 0,
        wantPrec: 'symbolic'
      },
      {
        x: Point.fromCoords(1, 1, 0),
        a: Point.fromCoords(-1, -1 + 1e-15, 0),
        b: Point.fromCoords(-1, -1, 0),
        distFunc: triageCompareMinusSin2Distance,
        wantSign: -1,
        wantPrec: 'double'
      },
      {
        x: Point.fromCoords(-1, -1, 0),
        a: Point.fromCoords(1, 1 - 1e-15, 0),
        b: Point.fromCoords(1, 1 - 1e-15, 1e-21),
        distFunc: triageCompareMinusSin2Distance,
        wantSign: 1,
        wantPrec: 'double'
      },
      {
        x: Point.fromCoords(-1, -1, 0),
        a: Point.fromCoords(2, 1, 0),
        b: Point.fromCoords(2, 1, 1e-30),
        distFunc: triageCompareMinusSin2Distance,
        wantSign: 1,
        wantPrec: 'exact'
      },
      {
        x: Point.fromCoords(-1, -1, 0),
        a: Point.fromCoords(2, 1, 0),
        b: Point.fromCoords(1, 2, 0),
        distFunc: triageCompareMinusSin2Distance,
        wantSign: -1,
        wantPrec: 'symbolic'
      }
    ]

    tests.forEach(({ x, a, b, distFunc, wantSign, wantPrec }, index) => {
      const normalizedX = !x.vector.isUnit() ? Point.fromVector(x.vector.normalize()) : x
      const normalizedA = !a.vector.isUnit() ? Point.fromVector(a.vector.normalize()) : a
      const normalizedB = !b.vector.isUnit() ? Point.fromVector(b.vector.normalize()) : b

      const sign = distFunc(normalizedX, normalizedA, normalizedB)
      const exactSign = exactCompareDistances(
        PreciseVector.fromVector(normalizedX.vector),
        PreciseVector.fromVector(normalizedA.vector),
        PreciseVector.fromVector(normalizedB.vector)
      )

      let actualSign = exactSign
      if (exactSign === 0) {
        actualSign = symbolicCompareDistances(normalizedX, normalizedA, normalizedB)
      }

      equal(actualSign, wantSign, `${index}. actual sign = ${actualSign}, want ${wantSign}`)

      const actualPrec = sign !== 0 ? 'double' : exactSign !== 0 ? 'exact' : 'symbolic'
      equal(actualPrec, wantPrec, `${index}. got precision ${actualPrec}, want ${wantPrec}`)

      equal(
        compareDistances(normalizedX, normalizedA, normalizedB),
        wantSign,
        `${index}. CompareDistances(${normalizedX}, ${normalizedA}, ${normalizedB})`
      )

      equal(
        compareDistances(normalizedX, normalizedB, normalizedA),
        -wantSign || 0,
        `${index}. CompareDistances(${normalizedX}, ${normalizedB}, ${normalizedA})`
      )
    })
  })
})
