import { test, describe } from 'node:test'
import { equal, ok, deepEqual } from 'node:assert/strict'
import { intersectsLatEdge, intersectsLngEdge, Rect } from './Rect'
import { Interval as R1Interval } from '../r1/Interval'
import { Interval as S1Interval } from '../s1/Interval'
import { Point as R2Point } from '../r2/Point'
import { Point } from './Point'
import { DEGREE } from '../s1/angle_constants'
import { float64Eq, oneIn, randomUniformFloat64, rectsApproxEqual } from './testing'
import { Cell } from './Cell'
import * as cellid from './cellid'
import * as angle from '../s1/angle'
import { LatLng } from './LatLng'
import { EPSILON, sign } from './predicates'
import { remainder } from '../r1/math'
import { Cap } from './Cap'

describe('s2.Rect', () => {
  test('empty and full', () => {
    const tests = [
      { rect: Rect.emptyRect(), valid: true, empty: true, full: false, point: false },
      { rect: Rect.fullRect(), valid: true, empty: false, full: true, point: false }
    ]

    for (const { rect, valid, empty, full, point } of tests) {
      equal(rect.isValid(), valid)
      equal(rect.isEmpty(), empty)
      equal(rect.isFull(), full)
      equal(rect.isPoint(), point)
    }
  })

  test('area', () => {
    const tests = [
      { rect: new Rect(new R1Interval(0, 0), new S1Interval(0, 0)), want: 0 },
      { rect: Rect.fullRect(), want: 4 * Math.PI },
      { rect: new Rect(new R1Interval(0, Math.PI / 2), new S1Interval(0, Math.PI / 2)), want: Math.PI / 2 }
    ]

    for (const { rect, want } of tests) {
      ok(float64Eq(rect.area(), want))
    }
  })

  test('toString', () => {
    const want = '[Lo[-90.0000000, -180.0000000], Hi[90.0000000, 180.0000000]]'
    equal(Rect.fullRect().toString(), want)
  })

  test('fromLatLng', () => {
    const ll = LatLng.fromDegrees(23, 47)
    const got = Rect.fromLatLng(ll)
    deepEqual(got.center(), ll)
    ok(got.isPoint())
  })

  test('fromCenterSize', () => {
    const tests = [
      {
        center: LatLng.fromDegrees(80, 170),
        size: LatLng.fromDegrees(40, 60),
        want: rectFromDegrees(60, 140, 90, -160)
      },
      {
        center: LatLng.fromDegrees(10, 40),
        size: LatLng.fromDegrees(210, 400),
        want: Rect.fullRect()
      },
      {
        center: LatLng.fromDegrees(-90, 180),
        size: LatLng.fromDegrees(20, 50),
        want: rectFromDegrees(-90, 155, -80, -155)
      }
    ]

    for (const { center, size, want } of tests) {
      const got = Rect.fromCenterSize(center, size)
      ok(rectsApproxEqual(got, want, EPSILON, EPSILON))
    }
  })

  test('addPoint', () => {
    const tests = [
      {
        input: new Rect(R1Interval.empty(), S1Interval.emptyInterval()),
        point: LatLng.fromDegrees(0, 0),
        want: rectFromDegrees(0, 0, 0, 0)
      },
      {
        input: rectFromDegrees(0, 0, 0, 0),
        point: new LatLng(0, -Math.PI / 2),
        want: rectFromDegrees(0, -90, 0, 0)
      },
      {
        input: rectFromDegrees(0, -90, 0, 0),
        point: new LatLng(Math.PI / 4, -Math.PI),
        want: rectFromDegrees(0, -180, 45, 0)
      },
      {
        input: rectFromDegrees(0, -180, 45, 0),
        point: new LatLng(Math.PI / 2, 0),
        want: rectFromDegrees(0, -180, 90, 0)
      }
    ]

    for (const { input, point, want } of tests) {
      ok(rectsApproxEqual(input.addPoint(point), want, EPSILON, EPSILON))
    }
  })

  test('vertex', () => {
    const r1 = new Rect(new R1Interval(0, Math.PI / 2), S1Interval.fromEndpoints(-Math.PI, 0))
    const tests = [
      { r: r1, i: 0, want: new LatLng(0, Math.PI) },
      { r: r1, i: 1, want: new LatLng(0, 0) },
      { r: r1, i: 2, want: new LatLng(Math.PI / 2, 0) },
      { r: r1, i: 3, want: new LatLng(Math.PI / 2, Math.PI) }
    ]

    for (const { r, i, want } of tests) {
      deepEqual(r.vertex(i), want)
    }
  })

  test('vertex CCW order', () => {
    for (let i = 0; i < 4; i++) {
      const lat = (Math.PI / 4) * (i - 2)
      const lng = (Math.PI / 2) * (i - 2) + 0.2
      const r = new Rect(
        new R1Interval(lat, lat + Math.PI / 4),
        new S1Interval(remainder(lng, 2 * Math.PI), remainder(lng + Math.PI / 2, 2 * Math.PI))
      )

      for (let k = 0; k < 4; k++) {
        ok(
          sign(
            Point.fromLatLng(r.vertex((k - 1) & 3)),
            Point.fromLatLng(r.vertex(k)),
            Point.fromLatLng(r.vertex((k + 1) & 3))
          )
        )
      }
    }
  })

  test('containsLatLng', () => {
    const tests = [
      {
        input: rectFromDegrees(0, -180, 90, 0),
        ll: LatLng.fromDegrees(30, -45),
        want: true
      },
      {
        input: rectFromDegrees(0, -180, 90, 0),
        ll: LatLng.fromDegrees(30, 45),
        want: false
      },
      {
        input: rectFromDegrees(0, -180, 90, 0),
        ll: LatLng.fromDegrees(0, -180),
        want: true
      },
      {
        input: rectFromDegrees(0, -180, 90, 0),
        ll: LatLng.fromDegrees(90, 0),
        want: true
      }
    ]

    for (const { input, ll, want } of tests) {
      equal(input.containsLatLng(ll), want)
    }
  })

  test('expanded', () => {
    const tests = [
      {
        input: rectFromDegrees(70, 150, 80, 170),
        margin: LatLng.fromDegrees(20, 30),
        want: rectFromDegrees(50, 120, 90, -160)
      },
      {
        input: Rect.emptyRect(),
        margin: LatLng.fromDegrees(20, 30),
        want: Rect.emptyRect()
      },
      {
        input: Rect.fullRect(),
        margin: LatLng.fromDegrees(500, 500),
        want: Rect.fullRect()
      },
      {
        input: rectFromDegrees(-90, 170, 10, 20),
        margin: LatLng.fromDegrees(30, 80),
        want: rectFromDegrees(-90, -180, 40, 180)
      },
      {
        input: rectFromDegrees(10, -50, 60, 70),
        margin: LatLng.fromDegrees(-10, -10),
        want: rectFromDegrees(20, -40, 50, 60)
      },
      {
        input: rectFromDegrees(-20, -180, 20, 180),
        margin: LatLng.fromDegrees(-10, -10),
        want: rectFromDegrees(-10, -180, 10, 180)
      },
      {
        input: rectFromDegrees(-20, -180, 20, 180),
        margin: LatLng.fromDegrees(-30, -30),
        want: Rect.emptyRect()
      },
      {
        input: rectFromDegrees(-90, 10, 90, 11),
        margin: LatLng.fromDegrees(-10, -10),
        want: Rect.emptyRect()
      },
      {
        input: rectFromDegrees(-90, 10, 90, 100),
        margin: LatLng.fromDegrees(-10, -10),
        want: rectFromDegrees(-80, 20, 80, 90)
      },
      {
        input: Rect.emptyRect(),
        margin: LatLng.fromDegrees(-50, -500),
        want: Rect.emptyRect()
      },
      {
        input: Rect.fullRect(),
        margin: LatLng.fromDegrees(-50, -50),
        want: rectFromDegrees(-40, -180, 40, 180)
      },
      {
        input: rectFromDegrees(10, -50, 60, 70),
        margin: LatLng.fromDegrees(-10, 30),
        want: rectFromDegrees(20, -80, 50, 100)
      },
      {
        input: rectFromDegrees(-20, -180, 20, 180),
        margin: LatLng.fromDegrees(10, -500),
        want: rectFromDegrees(-30, -180, 30, 180)
      },
      {
        input: rectFromDegrees(-90, -180, 80, 180),
        margin: LatLng.fromDegrees(-30, 500),
        want: rectFromDegrees(-60, -180, 50, 180)
      },
      {
        input: rectFromDegrees(-80, -100, 80, 150),
        margin: LatLng.fromDegrees(30, -50),
        want: rectFromDegrees(-90, -50, 90, 100)
      },
      {
        input: rectFromDegrees(0, -180, 50, 180),
        margin: LatLng.fromDegrees(-30, 500),
        want: Rect.emptyRect()
      },
      {
        input: rectFromDegrees(-80, 10, 70, 20),
        margin: LatLng.fromDegrees(30, -200),
        want: Rect.emptyRect()
      },
      {
        input: Rect.emptyRect(),
        margin: LatLng.fromDegrees(100, -100),
        want: Rect.emptyRect()
      },
      {
        input: Rect.fullRect(),
        margin: LatLng.fromDegrees(100, -100),
        want: Rect.fullRect()
      }
    ]

    for (const { input, margin, want } of tests) {
      ok(rectsApproxEqual(input.expanded(margin), want, EPSILON, EPSILON))
    }
  })

  test('polarClosure', () => {
    const tests = [
      {
        r: rectFromDegrees(-89, 0, 89, 1),
        want: rectFromDegrees(-89, 0, 89, 1)
      },
      {
        r: rectFromDegrees(-90, -30, -45, 100),
        want: rectFromDegrees(-90, -180, -45, 180)
      },
      {
        r: rectFromDegrees(89, 145, 90, 146),
        want: rectFromDegrees(89, -180, 90, 180)
      },
      {
        r: rectFromDegrees(-90, -145, 90, -144),
        want: Rect.fullRect()
      }
    ]

    for (const { r, want } of tests) {
      ok(rectsApproxEqual(r.polarClosure(), want, EPSILON, EPSILON))
    }
  })

  test('capBound', () => {
    const tests = [
      {
        r: rectFromDegrees(-45, -45, 45, 45),
        want: Cap.fromCenterHeight(Point.fromCoords(1, 0, 0), 0.5)
      },
      {
        r: rectFromDegrees(88, -80, 89, 80),
        want: Cap.fromCenterAngle(Point.fromCoords(0, 0, 1), 2 * DEGREE)
      },
      {
        r: rectFromDegrees(-30, -150, -10, 50),
        want: Cap.fromCenterAngle(Point.fromCoords(0, 0, -1), 80 * DEGREE)
      }
    ]

    for (const { r, want } of tests) {
      ok(want.approxEqual(r.capBound()))
    }
  })

  test('interval ops', () => {
    const rect = rectFromDegrees(0, -180, 90, 0)
    const rectMid = rectFromDegrees(45, -90, 45, -90)
    const rect180 = rectFromDegrees(0, -180, 0, -180)
    const northPole = rectFromDegrees(90, 0, 90, 0)

    const tests = [
      {
        rect: rect,
        other: rectMid,
        contains: true,
        intersects: true,
        union: rect,
        intersection: rectMid
      },
      {
        rect: rect,
        other: rect180,
        contains: true,
        intersects: true,
        union: rect,
        intersection: rect180
      },
      {
        rect: rect,
        other: northPole,
        contains: true,
        intersects: true,
        union: rect,
        intersection: northPole
      },
      {
        rect: rect,
        other: rectFromDegrees(-10, -1, 1, 20),
        contains: false,
        intersects: true,
        union: rectFromDegrees(-10, 180, 90, 20),
        intersection: rectFromDegrees(0, -1, 1, 0)
      },
      {
        rect: rect,
        other: rectFromDegrees(-10, -1, 0, 20),
        contains: false,
        intersects: true,
        union: rectFromDegrees(-10, 180, 90, 20),
        intersection: rectFromDegrees(0, -1, 0, 0)
      },
      {
        rect: rect,
        other: rectFromDegrees(-10, 0, 1, 20),
        contains: false,
        intersects: true,
        union: rectFromDegrees(-10, 180, 90, 20),
        intersection: rectFromDegrees(0, 0, 1, 0)
      },
      {
        rect: rectFromDegrees(-15, -160, -15, -150),
        other: rectFromDegrees(20, 145, 25, 155),
        contains: false,
        intersects: false,
        union: rectFromDegrees(-15, 145, 25, -150),
        intersection: Rect.emptyRect()
      },
      {
        rect: rectFromDegrees(70, -10, 90, -140),
        other: rectFromDegrees(60, 175, 80, 5),
        contains: false,
        intersects: true,
        union: rectFromDegrees(60, -180, 90, 180),
        intersection: rectFromDegrees(70, 175, 80, 5)
      },
      {
        rect: rectFromDegrees(12, 30, 60, 60),
        other: rectFromDegrees(0, 0, 30, 18),
        contains: false,
        intersects: false,
        union: rectFromDegrees(0, 0, 60, 60),
        intersection: Rect.emptyRect()
      },
      {
        rect: rectFromDegrees(0, 0, 18, 42),
        other: rectFromDegrees(30, 12, 42, 60),
        contains: false,
        intersects: false,
        union: rectFromDegrees(0, 0, 42, 60),
        intersection: Rect.emptyRect()
      }
    ]

    for (const { rect, other, contains, intersects, union, intersection } of tests) {
      equal(rect.contains(other), contains)
      equal(rect.intersects(other), intersects)
      ok(rect.union(other).equals(union))
      ok(rect.intersection(other).equals(intersection))
    }
  })

  test('cell ops', () => {
    const cell0 = Cell.fromPoint(Point.fromCoords(1 + 1e-12, 1, 1))
    const v0 = LatLng.fromPoint(cell0.vertex(0))

    const cell202 = Cell.fromCellID(cellid.fromFacePosLevel(2, 0n, 2))
    const bound202 = cell202.rectBound()

    const tests = [
      {
        r: Rect.emptyRect(),
        c: Cell.fromCellID(cellid.fromFacePosLevel(3, 0n, 0)),
        contains: false,
        intersects: false
      },
      {
        r: Rect.fullRect(),
        c: Cell.fromCellID(cellid.fromFacePosLevel(2, 0n, 0)),
        contains: true,
        intersects: true
      },
      {
        r: Rect.fullRect(),
        c: Cell.fromCellID(cellid.fromFacePosLevel(5, 0n, 25)),
        contains: true,
        intersects: true
      },
      {
        r: rectFromDegrees(-45.1, -45.1, 0.1, 0.1),
        c: Cell.fromCellID(cellid.fromFacePosLevel(0, 0n, 0)),
        contains: false,
        intersects: true
      },
      {
        r: rectFromDegrees(-45.1, -45.1, 0.1, 0.1),
        c: Cell.fromCellID(cellid.fromFacePosLevel(0, 0n, 1)),
        contains: true,
        intersects: true
      },
      {
        r: rectFromDegrees(-45.1, -45.1, 0.1, 0.1),
        c: Cell.fromCellID(cellid.fromFacePosLevel(1, 0n, 1)),
        contains: false,
        intersects: false
      },
      {
        r: rectFromDegrees(-10, -45, 10, 0),
        c: Cell.fromCellID(cellid.fromFacePosLevel(0, 0n, 0)),
        contains: false,
        intersects: true
      },
      {
        r: rectFromDegrees(-10, -45, 10, 0),
        c: Cell.fromCellID(cellid.fromFacePosLevel(0, 0n, 1)),
        contains: false,
        intersects: true
      },
      {
        r: rectFromDegrees(-10, -45, 10, 0),
        c: Cell.fromCellID(cellid.fromFacePosLevel(1, 0n, 1)),
        contains: false,
        intersects: false
      },
      {
        r: rectFromDegrees(4, 4, 4, 4),
        c: Cell.fromCellID(cellid.fromFace(0)),
        contains: false,
        intersects: true
      },
      {
        r: rectFromDegrees(41, -87, 42, -79),
        c: Cell.fromCellID(cellid.fromFace(2)),
        contains: false,
        intersects: false
      },
      {
        r: rectFromDegrees(-41, 160, -40, -160),
        c: Cell.fromCellID(cellid.fromFace(5)),
        contains: false,
        intersects: false
      },
      {
        r: rectFromDegrees(
          angle.degrees(v0.lat) - 1e-8,
          angle.degrees(v0.lng) - 1e-8,
          angle.degrees(v0.lat) - 2e-10,
          angle.degrees(v0.lng) + 1e-10
        ),
        c: cell0,
        contains: false,
        intersects: false
      },
      {
        r: rectFromDegrees(-37, -70, -36, -20),
        c: Cell.fromCellID(cellid.fromFace(5)),
        contains: false,
        intersects: true
      },
      {
        r: rectFromDegrees(
          angle.degrees(bound202.lo().lat) + 3,
          angle.degrees(bound202.lo().lng) + 3,
          angle.degrees(bound202.hi().lat) - 3,
          angle.degrees(bound202.hi().lng) - 3
        ),
        c: cell202,
        contains: false,
        intersects: true
      },
      {
        r: rectFromDegrees(34.2572864, 135.2673642, 34.2707907, 135.2995742),
        c: Cell.fromCellID(0x6007500000000000n),
        contains: false,
        intersects: true
      }
    ]

    for (const { r, c, contains, intersects } of tests) {
      equal(r.containsCell(c), contains)
      equal(r.intersectsCell(c), intersects)
    }
  })

  test('containsPoint', () => {
    const r1 = rectFromDegrees(0, -180, 90, 0)

    const tests = [
      { r: r1, p: new Point(0.5, -0.3, 0.1), want: true },
      { r: r1, p: new Point(0.5, 0.2, 0.1), want: false }
    ]

    for (const { r, p, want } of tests) {
      equal(r.containsPoint(p), want)
    }
  })

  test('intersectsLatEdge', () => {
    const tests = [
      {
        a: new Point(-1, -1, 1),
        b: new Point(1, -1, 1),
        lat: 41 * DEGREE,
        lngLo: -87 * DEGREE,
        lngHi: -79 * DEGREE,
        want: false
      },
      {
        a: new Point(-1, -1, 1),
        b: new Point(1, -1, 1),
        lat: 42 * DEGREE,
        lngLo: -87 * DEGREE,
        lngHi: -79 * DEGREE,
        want: false
      },
      {
        a: new Point(-1, -1, -1),
        b: new Point(1, 1, 0),
        lat: -3 * DEGREE,
        lngLo: -1 * DEGREE,
        lngHi: 23 * DEGREE,
        want: false
      },
      {
        a: new Point(1, 0, 1),
        b: new Point(1, -1, 0),
        lat: -28 * DEGREE,
        lngLo: 69 * DEGREE,
        lngHi: 115 * DEGREE,
        want: false
      },
      {
        a: new Point(0, 1, 0),
        b: new Point(1, -1, -1),
        lat: 44 * DEGREE,
        lngLo: 60 * DEGREE,
        lngHi: 177 * DEGREE,
        want: false
      },
      {
        a: new Point(0, 1, 1),
        b: new Point(0, 1, -1),
        lat: -25 * DEGREE,
        lngLo: -74 * DEGREE,
        lngHi: -165 * DEGREE,
        want: true
      },
      {
        a: new Point(1, 0, 0),
        b: new Point(0, 0, -1),
        lat: -4 * DEGREE,
        lngLo: -152 * DEGREE,
        lngHi: 171 * DEGREE,
        want: true
      },
      {
        a: new Point(-0.589375791872893683986945, 0.583248451588733285433364, 0.558978908075738245564423),
        b: new Point(-0.587388131301997518107783, 0.581281455376392863776402, 0.563104832905072516524569),
        lat: 34.2572864 * DEGREE,
        lngLo: angle.radians(2.3608609),
        lngHi: angle.radians(2.361423),
        want: true
      }
    ]

    for (const { a, b, lat, lngLo, lngHi, want } of tests) {
      equal(intersectsLatEdge(a, b, lat, new S1Interval(lngLo, lngHi)), want)
    }
  })

  test('intersectsLngEdge', () => {
    const tests = [
      {
        a: new Point(-1, -1, 1),
        b: new Point(1, -1, 1),
        latLo: 41 * DEGREE,
        latHi: 42 * DEGREE,
        lng: -79 * DEGREE,
        want: false
      },
      {
        a: new Point(-1, -1, 1),
        b: new Point(1, -1, 1),
        latLo: 41 * DEGREE,
        latHi: 42 * DEGREE,
        lng: -87 * DEGREE,
        want: false
      },
      {
        a: new Point(-1, -1, 1),
        b: new Point(1, -1, 1),
        latLo: 42 * DEGREE,
        latHi: 41 * DEGREE,
        lng: 79 * DEGREE,
        want: false
      },
      {
        a: new Point(-1, -1, 1),
        b: new Point(1, -1, 1),
        latLo: 41 * DEGREE,
        latHi: 42 * DEGREE,
        lng: 87 * DEGREE,
        want: false
      },
      {
        a: new Point(0, -1, -1),
        b: new Point(-1, 0, -1),
        latLo: -87 * DEGREE,
        latHi: 13 * DEGREE,
        lng: -143 * DEGREE,
        want: true
      },
      {
        a: new Point(1, 1, -1),
        b: new Point(1, -1, 1),
        latLo: -64 * DEGREE,
        latHi: 13 * DEGREE,
        lng: 40 * DEGREE,
        want: true
      },
      {
        a: new Point(1, 1, 0),
        b: new Point(-1, 0, -1),
        latLo: -64 * DEGREE,
        latHi: 56 * DEGREE,
        lng: 151 * DEGREE,
        want: true
      },
      {
        a: new Point(-1, -1, 0),
        b: new Point(1, -1, -1),
        latLo: -50 * DEGREE,
        latHi: 18 * DEGREE,
        lng: -84 * DEGREE,
        want: true
      }
    ]

    for (const { a, b, latLo, latHi, lng, want } of tests) {
      equal(intersectsLngEdge(a, b, new R1Interval(latLo, latHi), lng), want)
    }
  })

  test('interval operations', () => {
    const rect = rectFromDegrees(0, -180, 90, 0)

    const rectMid = rectFromDegrees(45, -90, 45, -90)
    const rect180 = rectFromDegrees(0, -180, 0, -180)
    const northPole = rectFromDegrees(90, 0, 90, 0)

    const tests = [
      {
        rect,
        other: rectMid,
        contains: true,
        intersects: true,
        union: rect,
        intersection: rectMid
      },
      {
        rect,
        other: rect180,
        contains: true,
        intersects: true,
        union: rect,
        intersection: rect180
      },
      {
        rect,
        other: northPole,
        contains: true,
        intersects: true,
        union: rect,
        intersection: northPole
      },
      {
        rect,
        other: rectFromDegrees(-10, -1, 1, 20),
        contains: false,
        intersects: true,
        union: rectFromDegrees(-10, 180, 90, 20),
        intersection: rectFromDegrees(0, -1, 1, 0)
      },
      {
        rect,
        other: rectFromDegrees(-10, -1, 0, 20),
        contains: false,
        intersects: true,
        union: rectFromDegrees(-10, 180, 90, 20),
        intersection: rectFromDegrees(0, -1, 0, 0)
      },
      {
        rect,
        other: rectFromDegrees(-10, 0, 1, 20),
        contains: false,
        intersects: true,
        union: rectFromDegrees(-10, 180, 90, 20),
        intersection: rectFromDegrees(0, 0, 1, 0)
      },
      {
        rect: rectFromDegrees(-15, -160, -15, -150),
        other: rectFromDegrees(20, 145, 25, 155),
        contains: false,
        intersects: false,
        union: rectFromDegrees(-15, 145, 25, -150),
        intersection: Rect.emptyRect()
      },
      {
        rect: rectFromDegrees(70, -10, 90, -140),
        other: rectFromDegrees(60, 175, 80, 5),
        contains: false,
        intersects: true,
        union: rectFromDegrees(60, -180, 90, 180),
        intersection: rectFromDegrees(70, 175, 80, 5)
      },
      {
        rect: rectFromDegrees(12, 30, 60, 60),
        other: rectFromDegrees(0, 0, 30, 18),
        contains: false,
        intersects: false,
        union: rectFromDegrees(0, 0, 60, 60),
        intersection: Rect.emptyRect()
      },
      {
        rect: rectFromDegrees(0, 0, 18, 42),
        other: rectFromDegrees(30, 12, 42, 60),
        contains: false,
        intersects: false,
        union: rectFromDegrees(0, 0, 42, 60),
        intersection: Rect.emptyRect()
      }
    ]

    for (const { rect, other, contains, intersects, union, intersection } of tests) {
      equal(rect.contains(other), contains)
      equal(rect.intersects(other), intersects)
      equal(rect.union(other).approxEqual(union), true)
      equal(rect.intersection(other).approxEqual(intersection), true)
    }
  })

  test('centroid empty and full', () => {
    equal(Rect.emptyRect().centroid().approxEqual(new Point(0, 0, 0)), true)
    equal(Rect.fullRect().centroid().vector.norm() <= EPSILON, true)
  })

  test('approxEqual', () => {
    const ε = EPSILON / 10
    const tests = [
      { a: Rect.emptyRect(), b: rectFromDegrees(1, 5, 1, 5), want: true },
      { a: rectFromDegrees(1, 5, 1, 5), b: Rect.emptyRect(), want: true },
      { a: rectFromDegrees(1, 5, 1, 5), b: rectFromDegrees(2, 7, 2, 7), want: false },
      { a: rectFromDegrees(1, 5, 1, 5), b: rectFromDegrees(1 + ε, 5 + ε, 1 + ε, 5 + ε), want: true }
    ]

    for (const { a, b, want } of tests) {
      equal(a.approxEqual(b), want)
    }
  })

  // test('directedHausdorffDistance - contained', () => {
  //   const a = rectFromDegrees(-10, 20, -5, 90)
  //   const tests = [
  //     rectFromDegrees(-10, 20, -5, 90),
  //     rectFromDegrees(-10, 19, -5, 91),
  //     rectFromDegrees(-11, 20, -4, 90),
  //     rectFromDegrees(-11, 19, -4, 91)
  //   ]

  //   for (const test of tests) {
  //     equal(a.directedHausdorffDistance(test), s1.Angle.rad(0))
  //   }
  // })

  // test('directedHausdorffDistance - point to rect', () => {
  //   const a1 = LatLng.fromDegrees(5, 8)
  //   const a2 = LatLng.fromDegrees(90, 10) // North pole

  //   const tests = [
  //     { ll: a1, b: rectFromDegrees(-85, -50, -80, 10) },
  //     { ll: a2, b: rectFromDegrees(-85, -50, -80, 10) },
  //     { ll: a1, b: rectFromDegrees(4, -10, 80, 10) },
  //     { ll: a2, b: rectFromDegrees(4, -10, 80, 10) },
  //     { ll: a1, b: rectFromDegrees(70, 170, 80, -170) },
  //     { ll: a2, b: rectFromDegrees(70, 170, 80, -170) }
  //   ]

  //   for (const { ll, b } of tests) {
  //     const a = Rect.fromLatLng(ll)
  //     const got = a.directedHausdorffDistance(b)
  //     const want = b.distanceToLatLng(ll)

  //     equal(float64Eq(got.radians(), want.radians()), true)
  //   }
  // })

  // @todo: missinglink this was 1e-15 in Go
  const CENTROID_EPSILON = 1e-14

  // Helper function for RectCentroidSplitting test
  function testRectCentroidSplitting(r: Rect, leftSplits: number): void {
    // Recursively verify that when a rectangle is split into two pieces, the centroids of the children sum to give the centroid of the parent.
    let child0: Rect, child1: Rect
    if (oneIn(2)) {
      const lat = randomUniformFloat64(r.lat.lo, r.lat.hi)
      child0 = new Rect(new R1Interval(r.lat.lo, lat), r.lng)
      child1 = new Rect(new R1Interval(lat, r.lat.hi), r.lng)
    } else {
      const lng = randomUniformFloat64(r.lng.lo, r.lng.hi)
      child0 = new Rect(r.lat, new S1Interval(r.lng.lo, lng))
      child1 = new Rect(r.lat, new S1Interval(lng, r.lng.hi))
    }

    const centroidDiff = r.centroid().vector.sub(child0.centroid().vector).sub(child1.centroid().vector).norm()
    ok(centroidDiff <= CENTROID_EPSILON, `Centroid difference ${centroidDiff} should be close to 0 ${centroidDiff}`)

    if (leftSplits > 0) {
      testRectCentroidSplitting(child0, leftSplits - 1)
      testRectCentroidSplitting(child1, leftSplits - 1)
    }
  }

  // Test RectCentroidFullRange
  test('centroid full range', () => {
    // Rectangles that cover the full longitude range.
    for (let i = 0; i < 100; i++) {
      const lat1 = randomUniformFloat64(-Math.PI / 2, Math.PI / 2)
      const lat2 = randomUniformFloat64(-Math.PI / 2, Math.PI / 2)
      const r = new Rect(new R1Interval(lat1, lat2), S1Interval.fullInterval())
      const centroid = r.centroid()
      const expectedZ = 0.5 * (Math.sin(lat1) + Math.sin(lat2)) * r.area()

      ok(
        Math.abs(expectedZ - centroid.z) < EPSILON,
        `Z component of ${r.centroid()} was ${centroid.z}, expected ${expectedZ}`
      )
      ok(new R2Point(centroid.x, centroid.y).norm() <= EPSILON, `Norm of ${centroid} should be <= ${EPSILON}`)
    }

    // Rectangles that cover the full latitude range.
    for (let i = 0; i < 100; i++) {
      const lat1 = randomUniformFloat64(-Math.PI, Math.PI)
      const lat2 = randomUniformFloat64(-Math.PI, Math.PI)
      const r = new Rect(new R1Interval(-Math.PI / 2, Math.PI / 2), new S1Interval(lat1, lat2))
      const centroid = r.centroid()

      ok(Math.abs(centroid.z) <= EPSILON, `Z component of ${r.centroid()} should be <= ${EPSILON}`)

      const centroidLng = LatLng.fromPoint(centroid).lng
      ok(
        Math.abs(centroidLng - r.lng.center()) < EPSILON,
        `Longitude of centroid ${centroidLng} should be close to ${r.lng.center()}`
      )

      const alpha = 0.5 * r.lng.length()
      const expectedNorm = ((0.25 * Math.PI * Math.sin(alpha)) / alpha) * r.area()
      ok(
        Math.abs(new R2Point(centroid.x, centroid.y).norm() - expectedNorm) < CENTROID_EPSILON,
        `Norm of ${centroid} should be ~${expectedNorm}`
      )
    }

    // Finally, verify that when a rectangle is recursively split into pieces,
    // the centroids of the pieces add to give the centroid of their parent.
    testRectCentroidSplitting(
      new Rect(new R1Interval(-Math.PI / 2, Math.PI / 2), new S1Interval(-Math.PI, Math.PI)),
      10
    )
  })
})

/**
 * Convenience method to construct a rectangle.
 * This method is intentionally *not* in the S2LatLngRect interface because the
 * argument order is ambiguous, but is fine for the test.
 */
export const rectFromDegrees = (latLo: number, lngLo: number, latHi: number, lngHi: number): Rect => {
  return new Rect(
    new R1Interval(latLo * DEGREE, latHi * DEGREE),
    S1Interval.fromEndpoints(lngLo * DEGREE, lngHi * DEGREE)
  )
}

export const pointsApproxEqual = (a: Point, b: Point): boolean => {
  return float64Eq(a.x, b.x) && float64Eq(a.y, b.y)
}
