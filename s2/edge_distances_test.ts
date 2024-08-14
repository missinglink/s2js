import { test, describe } from 'node:test'
import { ok, equal } from 'node:assert/strict'
import { Point } from './Point'
import { LatLng } from './LatLng'
import { Vector } from '../r3/Vector'
import { NEGATIVE_CHORDANGLE, STRAIGHT_CHORDANGLE } from '../s1/chordangle_constants'
import * as chordangle from '../s1/chordangle'
import { pointsApproxEqual, randomPoint } from './testing'
import { float64Near } from '../r1/math'
import {
  distanceFromSegment,
  interpolate,
  minUpdateDistanceMaxError,
  project,
  updateMaxDistance,
  updateMinDistance
} from './edge_distances'

describe('s2.edge_distances', () => {
  test('check distance', (t) => {
    const tests = [
      {
        x: new Vector(1, 0, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: 0,
        want: new Vector(1, 0, 0)
      },
      {
        x: new Vector(0, 1, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: 0,
        want: new Vector(0, 1, 0)
      },
      {
        x: new Vector(1, 3, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: 0,
        want: new Vector(1, 3, 0)
      },
      {
        x: new Vector(0, 0, 1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.PI / 2,
        want: new Vector(1, 0, 0)
      },
      {
        x: new Vector(0, 0, -1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.PI / 2,
        want: new Vector(1, 0, 0)
      },
      {
        x: new Vector(-1, -1, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: 0.75 * Math.PI,
        want: new Vector(1, 0, 0)
      },
      {
        x: new Vector(0, 1, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(1, 1, 0),
        distRad: Math.PI / 4,
        want: new Vector(1, 1, 0)
      },
      {
        x: new Vector(0, -1, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(1, 1, 0),
        distRad: Math.PI / 2,
        want: new Vector(1, 0, 0)
      },
      {
        x: new Vector(0, -1, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(-1, 1, 0),
        distRad: Math.PI / 2,
        want: new Vector(1, 0, 0)
      },
      {
        x: new Vector(-1, -1, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(-1, 1, 0),
        distRad: Math.PI / 2,
        want: new Vector(-1, 1, 0)
      },
      {
        x: new Vector(1, 1, 1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.asin(Math.sqrt(1.0 / 3.0)),
        want: new Vector(1, 1, 0)
      },
      {
        x: new Vector(1, 1, -1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.asin(Math.sqrt(1.0 / 3.0)),
        want: new Vector(1, 1, 0)
      },
      {
        x: new Vector(-1, 0, 0),
        a: new Vector(1, 1, 0),
        b: new Vector(1, 1, 0),
        distRad: 0.75 * Math.PI,
        want: new Vector(1, 1, 0)
      },
      {
        x: new Vector(0, 0, -1),
        a: new Vector(1, 1, 0),
        b: new Vector(1, 1, 0),
        distRad: Math.PI / 2,
        want: new Vector(1, 1, 0)
      },
      {
        x: new Vector(-1, 0, 0),
        a: new Vector(1, 0, 0),
        b: new Vector(1, 0, 0),
        distRad: Math.PI,
        want: new Vector(1, 0, 0)
      }
    ]

    tests.forEach((test) => {
      const x = Point.fromVector(test.x.normalize())
      const a = Point.fromVector(test.a.normalize())
      const b = Point.fromVector(test.b.normalize())
      const want = Point.fromVector(test.want.normalize())

      const d = distanceFromSegment(x, a, b)
      ok(float64Near(d, test.distRad, 1e-15), `distanceFromSegment(${x}, ${a}, ${b}) = ${d}, want ${test.distRad}`)

      const closest = project(x, a, b)
      ok(closest.approxEqual(want), `ClosestPoint(${x}, ${a}, ${b}) = ${closest}, want ${want}`)

      const { dist: minDistance1, less: ok1 } = updateMinDistance(x, a, b, 0)
      ok(!ok1, `UpdateMinDistance(${x}, ${a}, ${b}, 0) = ${minDistance1}, want ${0}`)

      const { dist: minDistance2, less: ok2 } = updateMinDistance(x, a, b, chordangle.infChordAngle())
      ok(
        ok2,
        `UpdateMinDistance(${x}, ${a}, ${b}, ${chordangle.infChordAngle()}) = ${minDistance2}, want ${chordangle.infChordAngle()}`
      )

      ok(
        float64Near(test.distRad, chordangle.angle(minDistance2), 1e-15),
        `MinDistance between ${x} and ${a}, ${b} = ${chordangle.angle(minDistance2)}, want ${
          test.distRad
        } within ${1e-15}`
      )
    })
  })

  test('update min interior distance lower bound optimization is conservative', (t) => {
    const x = Point.fromCoords(-0.017952729194524016, -0.30232422079175203, 0.95303607751077712)
    const a = Point.fromCoords(-0.017894725505830295, -0.30229974986194175, 0.95304493075220664)
    const b = Point.fromCoords(-0.017986591360900289, -0.30233851195954353, 0.95303090543659963)

    let { dist: minDistance1, less: ok1 } = updateMinDistance(x, a, b, chordangle.infChordAngle())
    ok(
      ok1,
      `UpdateMinDistance(${x}, ${a}, ${b}, ${chordangle.infChordAngle()}) = ${minDistance1}, want ${chordangle.infChordAngle()}`
    )

    minDistance1 = chordangle.successor(minDistance1)
    const { dist: minDistance2, less: ok2 } = updateMinDistance(x, a, b, minDistance1)
    ok(ok2, `UpdateMinDistance(${x}, ${a}, ${b}, ${minDistance2}) = ${minDistance2}, want ${minDistance2}`)
  })

  test('update min interior distance rejection test is conservative', (t) => {
    const minDist = chordangle.fromSquaredLength(6.3897233584120815e-26)

    const tests = [
      {
        x: new Point(1, -4.6547732744037044e-11, -5.6374428459823598e-89),
        a: new Point(1, -8.9031850507928352e-11, 0),
        b: new Point(-0.99999999999996347, 2.7030110029169596e-7, 1.555092348806121e-99),
        minDist
      },
      {
        x: new Point(1, -4.7617930898495072e-13, 0),
        a: new Point(-1, -1.6065916409055676e-10, 0),
        b: new Point(1, 0, 9.9964883247706732e-35),
        minDist
      },
      {
        x: new Point(1, 0, 0),
        a: new Point(1, -8.4965026896454536e-11, 0),
        b: new Point(-0.99999999999966138, 8.2297529603339328e-7, 9.6070344113320997e-21),
        minDist
      }
    ]

    tests.forEach((test) => {
      const { less } = updateMinDistance(test.x, test.a, test.b, test.minDist)
      ok(less, `UpdateMinDistance(${test.x}, ${test.a}, ${test.b}, ${test.minDist}) = ${less}, want ${true}`)
    })
  })

  test('check max distance', (t) => {
    const tests = [
      {
        x: new Vector(1, 0, 1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.PI / 2
      },
      {
        x: new Vector(1, 0, -1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.PI / 2
      },
      {
        x: new Vector(0, 1, 1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.PI / 2
      },
      {
        x: new Vector(0, 1, -1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.PI / 2
      },
      {
        x: new Vector(1, 1, 1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.asin(Math.sqrt(2 / 3))
      },
      {
        x: new Vector(1, 1, -1),
        a: new Vector(1, 0, 0),
        b: new Vector(0, 1, 0),
        distRad: Math.asin(Math.sqrt(2 / 3))
      },
      {
        x: new Vector(1, 0, 0),
        a: new Vector(1, 1, 0),
        b: new Vector(1, -1, 0),
        distRad: Math.PI / 4
      },
      {
        x: new Vector(0, 1, 0),
        a: new Vector(1, 1, 0),
        b: new Vector(1, 1, 0),
        distRad: Math.PI / 4
      },
      {
        x: new Vector(0, 0, 1),
        a: new Vector(0, 1, 1),
        b: new Vector(0, -1, 1),
        distRad: Math.PI / 4
      },
      {
        x: new Vector(0, 0, 1),
        a: new Vector(1, 0, 0),
        b: new Vector(1, 0, -1),
        distRad: (3 * Math.PI) / 4
      },
      {
        x: new Vector(0, 0, 1),
        a: new Vector(1, 0, 0),
        b: new Vector(1, 1, -Math.SQRT2),
        distRad: (3 * Math.PI) / 4
      },
      {
        x: new Vector(0, 0, 1),
        a: new Vector(0, 0, -1),
        b: new Vector(0, 0, -1),
        distRad: Math.PI
      }
    ]

    tests.forEach((test) => {
      const x = Point.fromVector(test.x.normalize())
      const a = Point.fromVector(test.a.normalize())
      const b = Point.fromVector(test.b.normalize())

      const { dist: maxDistance1, less: ok1 } = updateMaxDistance(x, a, b, STRAIGHT_CHORDANGLE)
      ok(
        !ok1,
        `UpdateMaxDistance(${x}, ${a}, ${b}, ${STRAIGHT_CHORDANGLE}) = ${maxDistance1}, want ${STRAIGHT_CHORDANGLE}`
      )

      const { dist: maxDistance2, less: ok2 } = updateMaxDistance(x, a, b, NEGATIVE_CHORDANGLE)
      ok(
        ok2,
        `UpdateMaxDistance(${x}, ${a}, ${b}, ${NEGATIVE_CHORDANGLE}) = ${maxDistance2}, want > ${NEGATIVE_CHORDANGLE}`
      )

      ok(
        float64Near(test.distRad, chordangle.angle(maxDistance2), 1e-15),
        `MaxDistance between ${x} and ${a}, ${b} = ${chordangle.angle(maxDistance2)}, want ${
          test.distRad
        } within ${1e-15}`
      )
    })
  })

  test('interpolate', (t) => {
    const p1 = Point.fromCoords(0.1, 1e-30, 0.3)
    const p2 = Point.fromCoords(-0.7, -0.55, -1e30)
    const i = Point.fromCoords(1, 0, 0)
    const j = Point.fromCoords(0, 1, 0)

    const p = interpolate(0.001, i, j)

    const tests = [
      { a: p1, b: p1, dist: 0, want: p1 },
      { a: p1, b: p1, dist: 1, want: p1 },
      { a: p1, b: p2, dist: 0, want: p1 },
      { a: p1, b: p2, dist: 1, want: p2 },
      { a: p1, b: p2, dist: 0.5, want: Point.fromVector(p1.vector.add(p2.vector).mul(0.5)) },
      { a: new Point(1, 0, 0), b: new Point(0, 1, 0), dist: 1.0 / 3.0, want: new Point(Math.sqrt(3), 1, 0) },
      { a: new Point(1, 0, 0), b: new Point(0, 1, 0), dist: 2.0 / 3.0, want: new Point(1, Math.sqrt(3), 0) },
      { a: i, b: j, dist: 0, want: new Point(1, 0, 0) },
      { a: i, b: j, dist: 1, want: new Point(0, 1, 0) },
      { a: i, b: j, dist: 1.5, want: new Point(-1, 1, 0) },
      { a: i, b: j, dist: 2, want: new Point(-1, 0, 0) },
      { a: i, b: j, dist: 3, want: new Point(0, -1, 0) },
      { a: i, b: j, dist: 4, want: new Point(1, 0, 0) },
      { a: i, b: j, dist: -1, want: new Point(0, -1, 0) },
      { a: i, b: j, dist: -2, want: new Point(-1, 0, 0) },
      { a: i, b: j, dist: -3, want: new Point(0, 1, 0) },
      { a: i, b: j, dist: -4, want: new Point(1, 0, 0) },
      { a: i, b: new Point(1, 1, 0), dist: 2, want: new Point(0, 1, 0) },
      { a: i, b: new Point(1, 1, 0), dist: 3, want: new Point(-1, 1, 0) },
      { a: i, b: new Point(1, 1, 0), dist: 4, want: new Point(-1, 0, 0) },
      { a: i, b: new Point(-1, 1, 0), dist: 2, want: new Point(0, -1, 0) },
      { a: i, b: p, dist: 1000, want: j }
    ]

    tests.forEach((test) => {
      test.a = Point.fromVector(test.a.vector.normalize())
      test.b = Point.fromVector(test.b.vector.normalize())
      test.want = Point.fromVector(test.want.vector.normalize())

      const got = interpolate(test.dist, test.a, test.b)
      ok(
        pointsApproxEqual(got, test.want, 3e-15),
        `Interpolate(${test.dist}, ${test.a}, ${test.b}) = ${got}, want ${test.want}`
      )
    })
  })

  test('interpolate over long edge', (t) => {
    const lng = Math.PI - 1e-2
    const a = Point.fromVector(Point.fromLatLng(new LatLng(0, 0)).vector.normalize())
    const b = Point.fromVector(Point.fromLatLng(new LatLng(0, lng)).vector.normalize())

    for (let f = 0.4; f > 1e-15; f *= 0.1) {
      const want = Point.fromVector(Point.fromLatLng(new LatLng(0, f * lng)).vector.normalize())
      let got = interpolate(f, a, b)
      ok(pointsApproxEqual(got, want, 3e-15), `long edge Interpolate(${f}, ${a}, ${b}) = ${got}, want ${want}`)

      const wantRem = Point.fromVector(Point.fromLatLng(new LatLng(0, (1 - f) * lng)).vector.normalize())
      got = interpolate(1 - f, a, b)
      ok(
        pointsApproxEqual(got, wantRem, 3e-15),
        `long edge Interpolate(${1 - f}, ${a}, ${b}) = ${got}, want ${wantRem}`
      )
    }
  })

  test('interpolate antipodal', (t) => {
    const p1 = Point.fromCoords(0.1, 1e-30, 0.3)

    for (let dist = 0; dist <= 1; dist += 0.125) {
      const actual = interpolate(dist, p1, Point.fromVector(p1.vector.mul(-1)))
      ok(
        float64Near(actual.distance(p1), dist * Math.PI, 3e-15),
        `antipodal points Interpolate(${dist}, ${p1}, ${Point.fromVector(p1.vector.mul(-1))}) = ${actual}, want ${
          dist * Math.PI
        }`
      )
    }
  })

  test('repeated interpolation', (t) => {
    for (let i = 0; i < 100; i++) {
      let a = randomPoint()
      let b = randomPoint()
      for (let j = 0; j < 1000; j++) {
        a = interpolate(0.01, a, b)
      }
      ok(a.vector.isUnit(), `repeated Interpolate(0.01, ${a}, ${b}) calls did not stay unit length`)
    }
  })

  test('edge distance min update distance max error', (t) => {
    const tests = [
      { actual: 0, maxErr: 1.5e-15 },
      { actual: 1e-8, maxErr: 1e-15 },
      { actual: 1e-5, maxErr: 1e-15 },
      { actual: 0.05, maxErr: 1e-15 },
      { actual: Math.PI / 2 - 1e-8, maxErr: 2e-15 },
      { actual: Math.PI / 2, maxErr: 2e-15 },
      { actual: Math.PI / 2 + 1e-8, maxErr: 2e-15 },
      { actual: Math.PI - 1e-5, maxErr: 2e-10 },
      { actual: Math.PI, maxErr: 0 }
    ]

    tests.forEach((test) => {
      const ca = chordangle.fromAngle(test.actual)
      const bound = chordangle.angle(chordangle.expanded(ca, minUpdateDistanceMaxError(ca)))

      const got = bound - test.actual
      ok(got <= test.maxErr, `minUpdateDistanceMaxError(${ca})-${got} = ${got}> ${test.actual}, want <= ${test.maxErr}`)
    })
  })

  // test('edge pair min distance', (t) => {
  //   const zero = new Point(0, 0, 0)
  //   const tests = [
  //     {
  //       a0: Point.fromCoords(1, 0, 1),
  //       a1: Point.fromCoords(1, 0, 1),
  //       b0: Point.fromCoords(1, -1, 0),
  //       b1: Point.fromCoords(1, 1, 0),
  //       distRads: Math.PI / 4,
  //       wantA: Point.fromCoords(1, 0, 1),
  //       wantB: Point.fromCoords(1, 0, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(1, -1, 0),
  //       a1: Point.fromCoords(1, 1, 0),
  //       b0: Point.fromCoords(1, 0, 1),
  //       b1: Point.fromCoords(1, 0, 1),
  //       distRads: Math.PI / 4,
  //       wantA: Point.fromCoords(1, 0, 0),
  //       wantB: Point.fromCoords(1, 0, 1),
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(0, 1, 0),
  //       b1: Point.fromCoords(0, 1, 0),
  //       distRads: Math.PI / 2,
  //       wantA: Point.fromCoords(1, 0, 0),
  //       wantB: Point.fromCoords(0, 1, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(-1, 0, 0),
  //       b1: Point.fromCoords(-1, 0, 0),
  //       distRads: Math.PI,
  //       wantA: Point.fromCoords(1, 0, 0),
  //       wantB: Point.fromCoords(-1, 0, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(0, 1, 0),
  //       b0: Point.fromCoords(1, 0, 0),
  //       b1: Point.fromCoords(0, 1, 0),
  //       distRads: 0,
  //       wantA: zero,
  //       wantB: zero,
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(1, 0, 0),
  //       b1: Point.fromCoords(1, 0, 0),
  //       distRads: 0,
  //       wantA: Point.fromCoords(
  //         1,

  //         0,
  //         0
  //       ),
  //       wantB: Point.fromCoords(1, 0, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(0, 1, 0),
  //       b0: Point.fromCoords(0, 1, 0),
  //       b1: Point.fromCoords(0, 1, 1),
  //       distRads: 0,
  //       wantA: Point.fromCoords(0, 1, 0),
  //       wantB: Point.fromCoords(0, 1, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(0, 1, 0),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(0, 1, 0),
  //       b1: Point.fromCoords(0, 1, 1),
  //       distRads: 0,
  //       wantA: Point.fromCoords(0, 1, 0),
  //       wantB: Point.fromCoords(0, 1, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(0, 1, 0),
  //       b0: Point.fromCoords(0, 1, 1),
  //       b1: Point.fromCoords(0, 1, 0),
  //       distRads: 0,
  //       wantA: Point.fromCoords(0, 1, 0),
  //       wantB: Point.fromCoords(0, 1, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(0, 1, 0),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(0, 1, 1),
  //       b1: Point.fromCoords(0, 1, 0),
  //       distRads: 0,
  //       wantA: Point.fromCoords(0, 1, 0),
  //       wantB: Point.fromCoords(0, 1, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(1, -1, 0),
  //       a1: Point.fromCoords(1, 1, 0),
  //       b0: Point.fromCoords(1, 0, -1),
  //       b1: Point.fromCoords(1, 0, 1),
  //       distRads: 0,
  //       wantA: Point.fromCoords(1, 0, 0),
  //       wantB: Point.fromCoords(1, 0, 0),
  //     },
  //     {
  //       a0: Point.fromCoords(1, -1, 0),
  //       a1: Point.fromCoords(1, 1, 0),
  //       b0: Point.fromCoords(-1, 0, 0),
  //       b1: Point.fromCoords(-1, 0, 1),
  //       distRads: Math.acos(-0.5),
  //       wantA: zero,
  //       wantB: Point.fromCoords(-1, 0, 1),
  //     },
  //     {
  //       a0: Point.fromCoords(-1, 0, 0),
  //       a1: Point.fromCoords(-1, 0, 1),
  //       b0: Point.fromCoords(1, -1, 0),
  //       b1: Point.fromCoords(1, 1, 0),
  //       distRads: Math.acos(-0.5),
  //       wantA: Point.fromCoords(-1, 0, 1),
  //       wantB: zero,
  //     },
  //     {
  //       a0: Point.fromCoords(1, -1, 0),
  //       a1: Point.fromCoords(1, 1, 0),
  //       b0: Point.fromCoords(-1, 0, -1),
  //       b1: Point.fromCoords(-1, 0, 1),
  //       distRads: Math.acos(-0.5),
  //       wantA: zero,
  //       wantB: zero,
  //     },
  //   ]

  //   tests.forEach((test) => {
  //     const [actualA, actualB] = edgePairClosestPoints(test.a0, test.a1, test.b0, test.b1)

  //     if (test.wantA === zero) {
  //       ok(
  //         actualA.equals(test.a0) || actualA.equals(test.a1),
  //         `EdgePairClosestPoints(${test.a0}, ${test.a1}, ${test.b0}, ${test.b1}) = ${actualA}, want ${test.a0} or ${test.a1}`
  //       )
  //     } else {
  //       ok(
  //         actualA.approxEqual(test.wantA),
  //         `EdgePairClosestPoints(${test.a0}, ${test.a1}, ${test.b0}, ${test.b1}) = ${actualA}, want ${test.wantA}`
  //       )
  //     }

  //     if (test.wantB === zero) {
  //       ok(
  //         actualB.equals(test.b0) || actualB.equals(test.b1),
  //         `EdgePairClosestPoints(${test.a0}, ${test.a1}, ${test.b0}, ${test.b1}) = ${actualB}, want ${test.b0} or ${test.b1}`
  //       )
  //     } else {
  //       ok(
  //         actualB.approxEqual(test.wantB),
  //         `EdgePairClosestPoints(${test.a0}, ${test.a1}, ${test.b0}, ${test.b1}) = ${actualB}, want ${test.wantB}`
  //       )
  //     }

  //     let [minDist, ok] = updateEdgePairMinDistance(test.a0, test.a1, test.b0, test.b1, 0)
  //     ok(
  //       !ok,
  //       `updateEdgePairMinDistance(${test.a0}, ${test.a1}, ${test.b0}, ${
  //         test.b1
  //       }, ${0}) = ${minDist}, want updated to be false`
  //     )

  //     minDist = chordangle.infChordAngle()
  //     ;[minDist, ok] = updateEdgePairMinDistance(test.a0, test.a1, test.b0, test.b1, minDist)
  //     ok(
  //       ok,
  //       `updateEdgePairMinDistance(${test.a0}, ${test.a1}, ${test.b0}, ${
  //         test.b1
  //       }, ${chordangle.infChordAngle()}) = ${minDist}, want updated to be true`
  //     )

  //     ok(
  //       float64Near(test.distRads, minDist.angle(), EPSILON),
  //       `minDist ${test.distRads} - ${minDist.angle()} = ${test.distRads - minDist.angle()}, want < ${EPSILON}`
  //     )
  //   })
  // })

  // test('edge pair max distance', (t) => {
  //   const tests = [
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(0, 1, 0),
  //       b0: Point.fromCoords(1, 1, 0),
  //       b1: Point.fromCoords(1, 1, 1),
  //       distRads: Math.acos(1 / Math.sqrt(3)),
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 1),
  //       a1: Point.fromCoords(1, 0, 1),
  //       b0: Point.fromCoords(1, -1, 0),
  //       b1: Point.fromCoords(1, 1, 0),
  //       distRads: Math.acos(0.5),
  //     },
  //     {
  //       a0: Point.fromCoords(1, -1, 0),
  //       a1: Point.fromCoords(1, 1, 0),
  //       b0: Point.fromCoords(1, 0, 1),
  //       b1: Point.fromCoords(1, 0, 1),
  //       distRads: Math.acos(0.5),
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(0, 1, 0),
  //       b1: Point.fromCoords(0, 1, 0),
  //       distRads: Math.PI / 2,
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(-1, 0, 0),
  //       b1: Point.fromCoords(-1, 0, 0),
  //       distRads: Math.PI,
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(0, 1, 0),
  //       b0: Point.fromCoords(1, 0, 0),
  //       b1: Point.fromCoords(0, 1, 0),
  //       distRads: Math.PI / 2,
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 0),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(1, 0, 0),
  //       b1: Point.fromCoords(1, 0, 0),
  //       distRads: 0,
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 1),
  //       a1: Point.fromCoords(1, 0, -1),
  //       b0: Point.fromCoords(-1, -1, 0),
  //       b1: Point.fromCoords(-1, 1, 0),
  //       distRads: Math.PI,
  //     },
  //     {
  //       a0: Point.fromCoords(1, 0, 1),
  //       a1: Point.fromCoords(1, 0, 0),
  //       b0: Point.fromCoords(-1, -1, 0),
  //       b1: Point.fromCoords(-1, 1, 0),
  //       distRads: Math.PI,
  //     },
  //   ]

  //   tests.forEach((test) => {
  //     let [maxDist, ok] = updateEdgePairMaxDistance(test.a0, test.a1, test.b0, test.b1, STRAIGHT_CHORDANGLE)
  //     ok(
  //       !ok,
  //       `updateEdgePairMaxDistance(${test.a0}, ${test.a1}, ${test.b0}, ${test.b1}, ${STRAIGHT_CHORDANGLE}) = ${maxDist}, want updated to be false`
  //     )
  //     ;[maxDist, ok] = updateEdgePairMaxDistance(test.a0, test.a1, test.b0, test.b1, NEGATIVE_CHORDANGLE)
  //     ok(
  //       ok,
  //       `updateEdgePairMaxDistance(${test.a0}, ${test.a1}, ${test.b0}, ${test.b1}, ${NEGATIVE_CHORDANGLE}) = ${maxDist}, want updated to be false`
  //     )

  //     ok(
  //       float64Near(test.distRads, maxDist.angle(), EPSILON),
  //       `maxDist ${test.distRads} - ${maxDist.angle()} = ${test.distRads - maxDist.angle()}, want < ${EPSILON}`
  //     )
  //   })
  // })
})
