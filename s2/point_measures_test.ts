import { test, describe } from 'node:test'
import { equal, ok } from 'node:assert/strict'
import { Point } from './Point'
import { Vector } from '../r3/Vector'
import { LatLng } from './LatLng'
import { angle, girardArea, pointArea, turnAngle } from './point_measures'
import { randomFloat64, randomPoint } from './testing'

const PZ = new Point(0, 0, 1)
const P000 = new Point(1, 0, 0)
const P045 = Point.fromVector(new Vector(1, 1, 0).normalize())
const P090 = new Point(0, 1, 0)
const P180 = new Point(-1, 0, 0)
const PR = new Point(0.257, -0.5723, 0.112)
const PQ = new Point(-0.747, 0.401, 0.2235)

const EPS = 1e-10
const EXP1 = 0.5 * EPS * EPS
const EXP2 = 5.8578643762690495119753e-11
const EPS2 = 1e-14
const epsilon = 1e-15

describe('s2.point_measures', () => {
  test('pointArea', (t) => {
    const tests = [
      { a: P000, b: P090, c: PZ, want: Math.PI / 2.0, nearness: 0 },
      { a: P045, b: PZ, c: P180, want: (3.0 * Math.PI) / 4.0, nearness: 0 },
      {
        a: Point.fromVector(new Vector(EPS, 0, 1).normalize()),
        b: Point.fromVector(new Vector(0, EPS, 1).normalize()),
        c: PZ,
        want: EXP1,
        nearness: 1e-14 * EXP1
      },
      { a: PR, b: PR, c: PR, want: 0.0, nearness: 0 },
      { a: PR, b: PQ, c: PR, want: 0.0, nearness: 1e-15 },
      { a: P000, b: P045, c: P090, want: 0.0, nearness: 0 },
      { a: P000, b: Point.fromVector(new Vector(1, 1, EPS).normalize()), c: P090, want: EXP2, nearness: 1e-9 * EXP2 }
    ]

    for (const [d, test] of tests.entries()) {
      const got = pointArea(test.a, test.b, test.c)
      ok(
        Math.abs(got - test.want) <= test.nearness,
        `${d}, PointArea(${test.a}, ${test.b}, ${test.c}), got ${got} want ${test.want}`
      )
    }

    let maxGirard = 0.0
    for (let i = 0; i < 10000; i++) {
      const p0 = randomPoint()
      const d1 = randomPoint()
      const d2 = randomPoint()
      const p1 = Point.fromVector(p0.vector.add(d1.vector.mul(1e-15)).normalize())
      const p2 = Point.fromVector(p0.vector.add(d2.vector.mul(1e-15)).normalize())
      const got = pointArea(p0, p1, p2)
      ok(got <= 0.7e-30, `PointArea(${p1}, ${p1}, ${p2}) = ${got}, want <= ${0.7e-30}`)
      const a = girardArea(p0, p1, p2)
      if (a > maxGirard) maxGirard = a
    }

    ok(maxGirard <= 1e-14, `maximum GirardArea = ${maxGirard}, want <= 1e-14`)

    const a = Point.fromLatLng(LatLng.fromDegrees(-45, -170))
    const b = Point.fromLatLng(LatLng.fromDegrees(45, -170))
    const c = Point.fromLatLng(LatLng.fromDegrees(0, -170))
    const area = pointArea(a, b, c)
    equal(area, 0.0, `PointArea(${a}, ${b}, ${c}) = ${area}, want 0.0`)
  })

  test('PointArea - quarter hemisphere', (t) => {
    const tests = [
      {
        a: Point.fromCoords(1, 0.1 * EPS2, EPS2),
        b: P000,
        c: P045,
        d: P180,
        e: PZ,
        want: Math.PI
      },
      {
        a: Point.fromCoords(1, 1, EPS2),
        b: P000,
        c: P045,
        d: P180,
        e: PZ,
        want: Math.PI
      }
    ]

    for (const test of tests) {
      const area =
        pointArea(test.a, test.b, test.c) +
        pointArea(test.a, test.c, test.d) +
        pointArea(test.a, test.d, test.e) +
        pointArea(test.a, test.e, test.b)
      ok(
        Math.abs(area - test.want) <= epsilon,
        `Adding up 4 quarter hemispheres with PointArea(), got ${area} want ${test.want}`
      )
    }

    for (let i = 0; i < 100; i++) {
      const lng = 2 * Math.PI * randomFloat64()
      const p2Lng = lng + randomFloat64()
      const p0 = Point.fromLatLng(new LatLng(1e-20, lng).normalized())
      const p1 = Point.fromLatLng(new LatLng(0, lng).normalized())
      const p2 = Point.fromLatLng(new LatLng(0, p2Lng).normalized())
      const p3 = Point.fromLatLng(new LatLng(0, lng + Math.PI).normalized())
      const p4 = Point.fromLatLng(new LatLng(0, lng + 5.0).normalized())
      const area = pointArea(p0, p1, p2) + pointArea(p0, p2, p3) + pointArea(p0, p3, p4) + pointArea(p0, p4, p1)
      ok(
        Math.abs(area - 2 * Math.PI) <= 2e-15,
        `hemisphere area of ${p1}, ${p2}, ${p3}, ${p4}, ${p1} = ${area}, want ${2 * Math.PI}`
      )
    }
  })

  test('angle methods', (t) => {
    const tests = [
      { a: P000, b: PZ, c: P045, wantAngle: Math.PI / 4, wantTurnAngle: (-3 * Math.PI) / 4 },
      { a: P045, b: PZ, c: P180, wantAngle: (3 * Math.PI) / 4, wantTurnAngle: -Math.PI / 4 },
      { a: P000, b: PZ, c: P180, wantAngle: Math.PI, wantTurnAngle: 0 },
      { a: PZ, b: P000, c: P045, wantAngle: Math.PI / 2, wantTurnAngle: Math.PI / 2 },
      { a: PZ, b: P000, c: PZ, wantAngle: 0, wantTurnAngle: -Math.PI }
    ]

    for (const test of tests) {
      const gotAngle = angle(test.a, test.b, test.c)
      ok(
        Math.abs(gotAngle - test.wantAngle) <= epsilon,
        `Angle(${test.a}, ${test.b}, ${test.c}) = ${gotAngle}, want ${test.wantAngle}`
      )
      const gotTurnAngle = turnAngle(test.a, test.b, test.c)
      ok(
        Math.abs(gotTurnAngle - test.wantTurnAngle) <= epsilon,
        `TurnAngle(${test.a}, ${test.b}, ${test.c}) = ${gotTurnAngle}, want ${test.wantTurnAngle}`
      )
    }
  })

  test('pointArea - regression', (t) => {
    const a = new Point(-1.705424004316021258e-1, -8.242696197922716461e-1, 5.399026611737816062e-1)
    const b = new Point(-1.706078905422188652e-1, -8.246067119418969416e-1, 5.393669607095969987e-1)
    const c = new Point(-1.705800600596222294e-1, -8.244634596153025408e-1, 5.395947061167500891e-1)
    const area = pointArea(a, b, c)
    equal(area, 0, `PointArea(${a}, ${b}, ${c}) should have been 0, got ${area}`)
  })
})
