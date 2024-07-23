import test from 'node:test'
import { equal, ok } from 'node:assert/strict'
import { LatLng } from './LatLng'
import { Point } from './Point'
import * as angle from '../s1/angle'
import { EPSILON } from './predicates'

test('normalized', (t) => {
  const tests = [
    {
      desc: 'Valid lat/lng',
      pos: LatLng.fromDegrees(21.8275043, 151.1979675),
      want: LatLng.fromDegrees(21.8275043, 151.1979675),
    },
    {
      desc: 'Valid lat/lng in the West',
      pos: LatLng.fromDegrees(21.8275043, -151.1979675),
      want: LatLng.fromDegrees(21.8275043, -151.1979675),
    },
    {
      desc: 'Beyond the North pole',
      pos: LatLng.fromDegrees(95, 151.1979675),
      want: LatLng.fromDegrees(90, 151.1979675),
    },
    {
      desc: 'Beyond the South pole',
      pos: LatLng.fromDegrees(-95, 151.1979675),
      want: LatLng.fromDegrees(-90, 151.1979675),
    },
    {
      desc: 'At the date line (from East)',
      pos: LatLng.fromDegrees(21.8275043, 180),
      want: LatLng.fromDegrees(21.8275043, 180),
    },
    {
      desc: 'At the date line (from West)',
      pos: LatLng.fromDegrees(21.8275043, -180),
      want: LatLng.fromDegrees(21.8275043, -180),
    },
    {
      desc: 'Across the date line going East',
      pos: LatLng.fromDegrees(21.8275043, 181.0012),
      want: LatLng.fromDegrees(21.8275043, -178.9988),
    },
    {
      desc: 'Across the date line going West',
      pos: LatLng.fromDegrees(21.8275043, -181.0012),
      want: LatLng.fromDegrees(21.8275043, 178.9988),
    },
    {
      desc: 'All wrong',
      pos: LatLng.fromDegrees(256, 256),
      want: LatLng.fromDegrees(90, -104),
    },
  ]

  tests.forEach((test) => {
    const got = test.pos.normalized()
    ok(got.isValid(), `${test.desc}: A LatLng should be valid after normalization but isn't: ${got}`)
    ok(got.distance(test.want) <= 1e-13, `${test.desc}: ${test.pos}.normalized() = ${got}, want ${test.want}`)
  })
})

test('toString', (t) => {
  const expected = '[1.4142136, -2.2360680]'
  const s = LatLng.fromDegrees(Math.SQRT2, -Math.sqrt(5)).toString()
  equal(s, expected)
})

test('conversion', (t) => {
  const tests = [
    { lat: 0, lng: 0, x: 1, y: 0, z: 0 },
    { lat: 90, lng: 0, x: 6.12323e-17, y: 0, z: 1 },
    { lat: -90, lng: 0, x: 6.12323e-17, y: 0, z: -1 },
    { lat: 0, lng: 180, x: -1, y: 1.22465e-16, z: 0 },
    { lat: 0, lng: -180, x: -1, y: -1.22465e-16, z: 0 },
    { lat: 90, lng: 180, x: -6.12323e-17, y: 7.4988e-33, z: 1 },
    { lat: 90, lng: -180, x: -6.12323e-17, y: -7.4988e-33, z: 1 },
    { lat: -90, lng: 180, x: -6.12323e-17, y: 7.4988e-33, z: -1 },
    { lat: -90, lng: -180, x: -6.12323e-17, y: -7.4988e-33, z: -1 },
    {
      lat: -81.82750430354997,
      lng: 151.19796752929685,
      x: -0.12456788151479525,
      y: 0.0684875268284729,
      z: -0.989844584550441,
    },
  ]

  tests.forEach((test) => {
    const ll = LatLng.fromDegrees(test.lat, test.lng)
    const p = Point.fromLatLng(ll)
    const want = Point.fromCoords(test.x, test.y, test.z)
    ok(p.approxEqual(want))
    const ll2 = LatLng.fromPoint(p)
    const isPolar = test.lat === 90 || test.lat === -90
    equal(angle.degrees(ll2.lat), test.lat)
    if (!isPolar) {
      equal(angle.degrees(ll2.lng), test.lng)
    }
  })
})

test('distance', (t) => {
  const tests = [
    { lat1: 90, lng1: 0, lat2: 90, lng2: 0, want: 0, tolerance: 0 },
    { lat1: -37, lng1: 25, lat2: -66, lng2: -155, want: 77, tolerance: 1e-13 },
    { lat1: 0, lng1: 165, lat2: 0, lng2: -80, want: 115, tolerance: 1e-13 },
    { lat1: 47, lng1: -127, lat2: -47, lng2: 53, want: 180, tolerance: 2e-6 },
  ]

  tests.forEach((test) => {
    const ll1 = LatLng.fromDegrees(test.lat1, test.lng1)
    const ll2 = LatLng.fromDegrees(test.lat2, test.lng2)
    const d = angle.degrees(ll1.distance(ll2))
    ok(Math.abs(d - test.want) <= test.tolerance)
  })
})

test('approxEqual', (t) => {
  const ε = EPSILON / 10

  const tests = [
    { a: LatLng.fromDegrees(30, 50), b: LatLng.fromDegrees(30, 50 + ε), want: true },
    { a: LatLng.fromDegrees(30, 50), b: LatLng.fromDegrees(30 - ε, 50), want: true },
    { a: LatLng.fromDegrees(1, 5), b: LatLng.fromDegrees(2, 3), want: false },
  ]

  tests.forEach((test) => {
    const got = test.a.approxEqual(test.b)
    equal(got, test.want)
  })
})
