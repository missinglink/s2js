import { test, describe } from 'node:test'
import { equal, ok, notEqual } from 'node:assert/strict'

import { Point } from './Point'
import { Cap } from './Cap'
import { Vector } from '../r3/Vector'

import * as angle from '../s1/angle'
import * as chordangle from '../s1/chordangle'
import * as cellid from './cellid'
import { LatLng } from './LatLng'
import { DBL_EPSILON, EPSILON } from './predicates'
import { DEGREE } from '../s1/angle_constants'

import { float64Eq, pointsNear, randomPoint, randomUniformFloat64 } from './testing'
import { float64Near } from '../r1/math'
import { MinWidthMetric } from './Metric_constants'
import { Cell } from './Cell'
import { faceUVToXYZ, unitNorm } from './stuv'

const TINY_RAD = 1e-10

const EMPTY_CAP = Cap.emptyCap()
const FULL_CAP = Cap.fullCap()
const DEFAULT_CAP = Cap.emptyCap()

const ZERO_HEIGHT = 0.0
const FULL_HEIGHT = 2.0
const EMPTY_HEIGHT = -1.0

const X_AXIS_PT = new Point(1, 0, 0)
const Y_AXIS_PT = new Point(0, 1, 0)

const xAxis = Cap.fromPoint(X_AXIS_PT)
const yAxis = Cap.fromPoint(Y_AXIS_PT)

const xComp = xAxis.complement()

const hemi = Cap.fromCenterHeight(Point.fromCoords(1, 0, 1), 1)
const tiny = Cap.fromCenterAngle(Point.fromCoords(1, 2, 3), TINY_RAD)

// A concave cap. Note that the error bounds for point containment tests
// increase with the cap angle, so we need to use a larger error bound
const concaveCenter = Point.fromLatLng(LatLng.fromDegrees(80, 10))
const concaveRadius = chordangle.fromAngle(150 * DEGREE)
const maxCapError = chordangle.maxPointError(concaveRadius) + chordangle.maxAngleError(concaveRadius) + 3 * DBL_EPSILON
const concave = Cap.fromCenterChordAngle(concaveCenter, concaveRadius)
const concaveMin = Cap.fromCenterChordAngle(concaveCenter, chordangle.expanded(concaveRadius, -maxCapError))
const concaveMax = Cap.fromCenterChordAngle(concaveCenter, chordangle.expanded(concaveRadius, maxCapError))

describe('s2.Cap', () => {
  test('basic empty/full/valid', () => {
    const tests = [
      { got: new Cap(new Point(0, 0, 0), 0), empty: false, full: false, valid: false }, // ?
      { got: EMPTY_CAP, empty: true, full: false, valid: true },
      { got: EMPTY_CAP.complement(), empty: false, full: true, valid: true },
      { got: FULL_CAP, empty: false, full: true, valid: true },
      { got: FULL_CAP.complement(), empty: true, full: false, valid: true },
      { got: DEFAULT_CAP, empty: true, full: false, valid: true },
      { got: xComp, empty: false, full: true, valid: true },
      { got: xComp.complement(), empty: true, full: false, valid: true },
      { got: tiny, empty: false, full: false, valid: true },
      { got: concave, empty: false, full: false, valid: true },
      { got: hemi, empty: false, full: false, valid: true },
      { got: tiny, empty: false, full: false, valid: true }
    ]

    for (const test of tests) {
      equal(test.got.isEmpty(), test.empty, `${test.got}.isEmpty() = ${test.got.isEmpty()}; want ${test.empty}`)
      equal(test.got.isFull(), test.full, `${test.got}.isFull() = ${test.got.isFull()}; want ${test.full}`)
      equal(test.got.isValid(), test.valid, `${test.got}.isValid() = ${test.got.isValid()}; want ${test.valid}`)
    }
  })

  test('center height radius', () => {
    notEqual(
      xAxis,
      xAxis.complement().complement(),
      `the complement of the complement is not the original. ${xAxis} == ${xAxis.complement().complement()}`
    )
    equal(FULL_CAP.height(), FULL_HEIGHT, 'full Caps should be full height')
    equal(angle.degrees(FULL_CAP.radius()), 180.0, 'radius of x-axis cap should be 180 degrees')
    equal(EMPTY_CAP.center, DEFAULT_CAP.center, 'empty Caps should have the same center as the default')
    equal(EMPTY_CAP.height(), DEFAULT_CAP.height(), 'empty Caps should have the same height as the default')
    equal(yAxis.height(), ZERO_HEIGHT, 'y-axis cap should not be empty height')
    equal(xAxis.height(), ZERO_HEIGHT, 'x-axis cap should not be empty height')
    equal(angle.radians(xAxis.radius()), ZERO_HEIGHT)
    const hc = Point.fromVector(hemi.center.vector.mul(-1.0))
    ok(pointsNear(hc, hemi.complement().center))
    equal(hemi.height(), 1.0, 'hemi cap should be 1.0 in height')
  })

  test('contains', () => {
    const tests = [
      { c1: EMPTY_CAP, c2: EMPTY_CAP, want: true },
      { c1: FULL_CAP, c2: EMPTY_CAP, want: true },
      { c1: FULL_CAP, c2: FULL_CAP, want: true },
      { c1: EMPTY_CAP, c2: xAxis, want: false },
      { c1: FULL_CAP, c2: xAxis, want: true },
      { c1: xAxis, c2: FULL_CAP, want: false },
      { c1: xAxis, c2: xAxis, want: true },
      { c1: xAxis, c2: EMPTY_CAP, want: true },
      { c1: hemi, c2: tiny, want: true },
      { c1: hemi, c2: Cap.fromCenterAngle(X_AXIS_PT, Math.PI / 4 - EPSILON), want: true },
      { c1: hemi, c2: Cap.fromCenterAngle(X_AXIS_PT, Math.PI / 4 + EPSILON), want: false },
      { c1: concave, c2: hemi, want: true },
      { c1: concave, c2: Cap.fromCenterHeight(Point.fromVector(concave.center.vector.mul(-1.0)), 0.1), want: false }
    ]

    for (const test of tests) {
      equal(
        test.c1.contains(test.c2),
        test.want,
        `${test.c1}.contains(${test.c2}) = ${test.c1.contains(test.c2)}; want ${test.want}`
      )
    }
  })

  test('containsPoint', () => {
    const tangent = tiny.center.vector.cross(new Vector(3, 2, 1)).normalize()
    const tests = [
      { c: xAxis, p: X_AXIS_PT, want: true },
      { c: xAxis, p: new Point(1, 1e-20, 0), want: false },
      { c: yAxis, p: xAxis.center, want: false },
      { c: xComp, p: xAxis.center, want: true },
      { c: xComp.complement(), p: xAxis.center, want: false },
      { c: tiny, p: Point.fromVector(tiny.center.vector.add(tangent.mul(TINY_RAD * 0.99))), want: true },
      { c: tiny, p: Point.fromVector(tiny.center.vector.add(tangent.mul(TINY_RAD * 1.01))), want: false },
      { c: hemi, p: Point.fromCoords(1, 0, -(1 - EPSILON)), want: true },
      { c: hemi, p: X_AXIS_PT, want: true },
      { c: hemi.complement(), p: X_AXIS_PT, want: false },
      { c: concaveMax, p: Point.fromLatLng(LatLng.fromDegrees(-70 * (1 - EPSILON), 10)), want: true },
      { c: concaveMin, p: Point.fromLatLng(LatLng.fromDegrees(-70 * (1 + EPSILON), 10)), want: false },
      { c: concaveMax, p: Point.fromLatLng(LatLng.fromDegrees(-50 * (1 - EPSILON), -170)), want: true },
      { c: concaveMin, p: Point.fromLatLng(LatLng.fromDegrees(-50 * (1 + EPSILON), -170)), want: false }
    ]

    for (const test of tests) {
      equal(test.c.containsPoint(test.p), test.want)
    }
  })

  test('interiorIntersects', () => {
    const tests = [
      { c1: EMPTY_CAP, c2: EMPTY_CAP, want: false },
      { c1: EMPTY_CAP, c2: xAxis, want: false },
      { c1: FULL_CAP, c2: EMPTY_CAP, want: false },
      { c1: FULL_CAP, c2: FULL_CAP, want: true },
      { c1: FULL_CAP, c2: xAxis, want: true },
      { c1: xAxis, c2: FULL_CAP, want: false },
      { c1: xAxis, c2: xAxis, want: false },
      { c1: xAxis, c2: EMPTY_CAP, want: false },
      { c1: concave, c2: hemi.complement(), want: true }
    ]

    for (const test of tests) {
      equal(
        test.c1.interiorIntersects(test.c2),
        test.want,
        `${test.c1}.interiorIntersects(${test.c2}) = ${test.c1.interiorIntersects(test.c2)}; want ${test.want}`
      )
    }
  })

  test('interiorContains', () => {
    equal(hemi.interiorContainsPoint(new Point(1, 0, -(1 + EPSILON))), false)
  })

  test('cellUnionBound level 1 radius', () => {
    // Check that a cap whose radius is approximately the width of a level 1
    // Cell can be covered by only 3 faces.
    const c = Cap.fromCenterAngle(Point.fromCoords(1, 1, 1), MinWidthMetric.value(1))
    const covering = c.cellUnionBound()
    equal(
      covering.length,
      3,
      `a cap with radius of a level 1 cell should be covered by 3 faces, got ${covering.length}`
    )
  })

  test('expanded', () => {
    const cap50 = Cap.fromCenterAngle(X_AXIS_PT, 50.0 * DEGREE)
    const cap51 = Cap.fromCenterAngle(X_AXIS_PT, 51.0 * DEGREE)

    ok(EMPTY_CAP.expanded(FULL_HEIGHT).isEmpty(), 'Expanding empty cap should return an empty cap')
    ok(FULL_CAP.expanded(FULL_HEIGHT).isFull(), 'Expanding a full cap should return an full cap')
    ok(cap50.expanded(0).approxEqual(cap50), 'Expanding a cap by 0° should be equal to the original')
    ok(cap50.expanded(1 * DEGREE).approxEqual(cap51), 'Expanding 50° by 1° should equal the 51° cap')
    ok(!cap50.expanded(129.99 * DEGREE).isFull(), 'Expanding 50° by 129.99° should not give a full cap')
    ok(cap50.expanded(130.01 * DEGREE).isFull(), 'Expanding 50° by 130.01° should give a full cap')
  })

  test('radiusToHeight', () => {
    const tests = [
      // Above/below boundary checks.
      { got: -0.5, want: EMPTY_HEIGHT },
      { got: 0, want: 0 },
      { got: Math.PI, want: FULL_HEIGHT },
      { got: 2 * Math.PI, want: FULL_HEIGHT },
      // Degree tests.
      { got: -7.0 * DEGREE, want: EMPTY_HEIGHT },
      { got: 0.0 * DEGREE, want: 0 },
      { got: 12.0 * DEGREE, want: 0.0218523992661943 },
      { got: 30.0 * DEGREE, want: 0.1339745962155613 },
      { got: 45.0 * DEGREE, want: 0.2928932188134525 },
      { got: 90.0 * DEGREE, want: 0.9999999999999998 },
      { got: 179.99 * DEGREE, want: 1.9999999847691292 },
      { got: 180.0 * DEGREE, want: FULL_HEIGHT },
      { got: 270.0 * DEGREE, want: FULL_HEIGHT },
      // Radians tests.
      { got: -1.0, want: EMPTY_HEIGHT },
      { got: 0.0, want: 0 },
      { got: 1.0, want: 0.45969769413186 },
      { got: Math.PI / 2.0, want: 1.0 },
      { got: 2.0, want: 1.4161468365471424 },
      { got: 3.0, want: 1.9899924966004454 },
      { got: Math.PI, want: FULL_HEIGHT },
      { got: 4.0, want: FULL_HEIGHT }
    ]

    for (const test of tests) {
      const actual = Cap.radiusToHeight(test.got)
      ok(float64Near(actual, test.want, EPSILON), `${actual} != ${test.want}`)
    }
  })

  test('rectBound', () => {
    const epsilon = 1e-13
    const tests = [
      {
        desc: 'Cap that includes South Pole.',
        have: Cap.fromCenterAngle(Point.fromLatLng(LatLng.fromDegrees(-45, 57)), 50 * DEGREE),
        latLoDeg: -90,
        latHiDeg: 5,
        lngLoDeg: -180,
        lngHiDeg: 180,
        isFull: true
      },
      {
        desc: 'Cap that is tangent to the North Pole.',
        have: Cap.fromCenterAngle(Point.fromCoords(1, 0, 1), Math.PI / 4.0 + 1e-16),
        latLoDeg: 0,
        latHiDeg: 90,
        lngLoDeg: -180,
        lngHiDeg: 180,
        isFull: true
      },
      {
        desc: 'Cap that at 45 degree center that goes from equator to the pole.',
        have: Cap.fromCenterAngle(Point.fromCoords(1, 0, 1), (45 + 5e-15) * DEGREE),
        latLoDeg: 0,
        latHiDeg: 90,
        lngLoDeg: -180,
        lngHiDeg: 180,
        isFull: true
      },
      {
        desc: 'The eastern hemisphere.',
        have: Cap.fromCenterAngle(new Point(0, 1, 0), Math.PI / 2 + 2e-16),
        latLoDeg: -90,
        latHiDeg: 90,
        lngLoDeg: -180,
        lngHiDeg: 180,
        isFull: true
      },
      {
        desc: 'A cap centered on the equator.',
        have: Cap.fromCenterAngle(Point.fromLatLng(LatLng.fromDegrees(0, 50)), 20 * DEGREE),
        latLoDeg: -20,
        latHiDeg: 20,
        lngLoDeg: 30,
        lngHiDeg: 70,
        isFull: false
      },
      {
        desc: 'A cap centered on the North Pole.',
        have: Cap.fromCenterAngle(Point.fromLatLng(LatLng.fromDegrees(90, 123)), 10 * DEGREE),
        latLoDeg: 80,
        latHiDeg: 90,
        lngLoDeg: -180,
        lngHiDeg: 180,
        isFull: true
      }
    ]

    for (const test of tests) {
      const r = test.have.rectBound()
      ok(float64Near(angle.degrees(r.lat.lo), test.latLoDeg, epsilon))
      ok(float64Near(angle.degrees(r.lat.hi), test.latHiDeg, epsilon))
      ok(float64Near(angle.degrees(r.lng.lo), test.lngLoDeg, epsilon))
      ok(float64Near(angle.degrees(r.lng.hi), test.lngHiDeg, epsilon))
      equal(r.lng.isFull(), test.isFull)
    }

    // Empty and full caps.
    ok(Cap.emptyCap().rectBound().isEmpty(), 'rectBound() on EMPTY_CAP should be empty.')
    ok(Cap.fullCap().rectBound().isFull(), 'rectBound() on FULL_CAP should be full.')
  })

  test('addPoint', () => {
    const tests = [
      { have: xAxis, p: X_AXIS_PT, want: xAxis },
      { have: yAxis, p: Y_AXIS_PT, want: yAxis },
      { have: xAxis, p: new Point(-1, 0, 0), want: FULL_CAP },
      { have: yAxis, p: new Point(0, -1, 0), want: FULL_CAP },
      { have: xAxis, p: new Point(0, 0, 1), want: Cap.fromCenterAngle(X_AXIS_PT, Math.PI / 2.0) },
      { have: xAxis, p: new Point(0, 0, -1), want: Cap.fromCenterAngle(X_AXIS_PT, Math.PI / 2.0) },
      {
        have: hemi,
        p: Point.fromCoords(0, 1, -1),
        want: Cap.fromCenterAngle(new Point(1, 0, 1), 120.0 * DEGREE)
      },
      {
        have: hemi,
        p: Point.fromCoords(0, -1, -1),
        want: Cap.fromCenterAngle(new Point(1, 0, 1), 120.0 * DEGREE)
      },
      {
        have: hemi,
        p: Point.fromCoords(-1, -1, -1),
        want: Cap.fromCenterAngle(new Point(1, 0, 1), Math.acos(-Math.sqrt(2.0 / 3.0)))
      },
      { have: hemi, p: new Point(0, 1, 1), want: hemi },
      { have: hemi, p: new Point(1, 0, 0), want: hemi }
    ]

    for (const test of tests) {
      const got = Cap.fromCap(test.have).addPoint(test.p)
      ok(got.approxEqual(test.want), `${test.have}.addPoint(${test.p}) = ${got}, want ${test.want}`)
      ok(got.containsPoint(test.p), `${test.have}.addPoint(${test.p}) did not contain added point`)
    }
  })

  test('addCap', () => {
    const tests = [
      { have: EMPTY_CAP, other: EMPTY_CAP, want: EMPTY_CAP },
      { have: FULL_CAP, other: FULL_CAP, want: FULL_CAP },
      { have: FULL_CAP, other: EMPTY_CAP, want: FULL_CAP },
      { have: EMPTY_CAP, other: FULL_CAP, want: FULL_CAP },
      { have: xAxis, other: EMPTY_CAP, want: xAxis },
      { have: EMPTY_CAP, other: xAxis, want: xAxis },
      { have: yAxis, other: EMPTY_CAP, want: yAxis },
      { have: EMPTY_CAP, other: yAxis, want: yAxis },
      { have: xAxis, other: xComp, want: FULL_CAP },
      { have: xAxis, other: yAxis, want: Cap.fromCenterAngle(X_AXIS_PT, Math.PI / 2.0) }
    ]

    for (const test of tests) {
      const got = Cap.fromCap(test.have).addCap(test.other)
      ok(got.approxEqual(test.want), `${test.have}.addCap(${test.other}) = ${got}, want ${test.want}`)
    }
  })

  test('containsCell', () => {
    const faceRadius = Math.atan(Math.sqrt(2))
    for (let face = 0; face < 6; face++) {
      const rootCell = Cell.fromCellID(cellid.fromFace(face))
      const edgeCell = Cell.fromPoint(Point.fromVector(faceUVToXYZ(face, 0, 1 - EPSILON)))
      const cornerCell = Cell.fromPoint(Point.fromVector(faceUVToXYZ(face, 1 - EPSILON, 1 - EPSILON)))

      ok(FULL_CAP.containsCell(rootCell), `Cap(${FULL_CAP}).containsCell(${rootCell}) = false, want true`)

      const first = cellid.advance(cornerCell.id, -3n)
      const last = cellid.advance(cornerCell.id, 4n)
      for (let id = first; id < last; id = cellid.next(id)) {
        const c = Cell.fromCellID(id).capBound()
        equal(
          c.containsCell(cornerCell),
          id === cornerCell.id,
          `Cap(${c}).containsCell(${cornerCell}) = ${c.containsCell(cornerCell)}, want ${id === cornerCell.id}`
        )
      }

      for (let capFace = 0; capFace < 6; capFace++) {
        const center = Point.fromVector(unitNorm(capFace))
        const covering = Cap.fromCenterAngle(center, faceRadius + EPSILON)
        equal(
          covering.containsCell(rootCell),
          capFace === face,
          `Cap(${covering}).containsCell(${rootCell}) = ${covering.containsCell(rootCell)}, want ${capFace === face}`
        )
        equal(
          covering.containsCell(edgeCell),
          center.vector.dot(cellid.point(edgeCell.id).vector) > 0.1,
          `Cap(${covering}).containsCell(${edgeCell}) = ${covering.containsCell(edgeCell)}, want ${
            center.vector.dot(cellid.point(edgeCell.id).vector) > 0.1
          }`
        )
        equal(
          covering.containsCell(edgeCell),
          covering.intersectsCell(edgeCell),
          `Cap(${covering}).containsCell(${edgeCell}) = ${covering.containsCell(
            edgeCell
          )}, want ${covering.intersectsCell(edgeCell)}`
        )
        equal(
          covering.containsCell(cornerCell),
          capFace === face,
          `Cap(${covering}).containsCell(${cornerCell}) = ${covering.containsCell(cornerCell)}, want ${
            capFace === face
          }`
        )

        const bulging = Cap.fromCenterAngle(center, Math.PI / 4 + EPSILON)
        ok(!bulging.containsCell(rootCell), `Cap(${bulging}).containsCell(${rootCell}) = true, want false`)
        equal(
          bulging.containsCell(edgeCell),
          capFace === face,
          `Cap(${bulging}).containsCell(${edgeCell}) = ${bulging.containsCell(edgeCell)}, want ${capFace === face}`
        )
        ok(!bulging.containsCell(cornerCell), `Cap(${bulging}).containsCell(${cornerCell}) = true, want false`)
      }
    }
  })

  test('intersectsCell', () => {
    const faceRadius = Math.atan(Math.sqrt(2))
    for (let face = 0; face < 6; face++) {
      const rootCell = Cell.fromCellID(cellid.fromFace(face))
      const edgeCell = Cell.fromPoint(Point.fromVector(faceUVToXYZ(face, 0, 1 - EPSILON)))
      const cornerCell = Cell.fromPoint(Point.fromVector(faceUVToXYZ(face, 1 - EPSILON, 1 - EPSILON)))

      ok(!EMPTY_CAP.intersectsCell(rootCell), `Cap(${EMPTY_CAP}).intersectsCell(${rootCell}) = true, want false`)

      const first = cellid.advance(cornerCell.id, -3n)
      const last = cellid.advance(cornerCell.id, 4n)
      for (let id = first; id < last; id = cellid.next(id)) {
        const c = Cell.fromCellID(id).capBound()
        equal(c.intersectsCell(cornerCell), cellid.contains(cellid.immediateParent(id), cornerCell.id))
      }

      const antiFace = (face + 3) % 6
      for (let capFace = 0; capFace < 6; capFace++) {
        const center = Point.fromVector(unitNorm(capFace))
        const covering = Cap.fromCenterAngle(center, faceRadius + EPSILON)
        equal(
          covering.intersectsCell(rootCell),
          capFace !== antiFace,
          `Cap(${covering}).intersectsCell(${rootCell}) = ${covering.intersectsCell(rootCell)}, want ${
            capFace !== antiFace
          }`
        )
        equal(
          covering.intersectsCell(edgeCell),
          covering.containsCell(edgeCell),
          `Cap(${covering}).intersectsCell(${edgeCell}) = ${covering.intersectsCell(
            edgeCell
          )}, want ${covering.containsCell(edgeCell)}`
        )
        equal(
          covering.intersectsCell(cornerCell),
          center.vector.dot(cellid.point(cornerCell.id).vector) > 0,
          `Cap(${covering}).intersectsCell(${cornerCell}) = ${covering.intersectsCell(cornerCell)}, want ${
            center.vector.dot(cellid.point(cornerCell.id).vector) > 0
          }`
        )

        const bulging = Cap.fromCenterAngle(center, Math.PI / 4 + EPSILON)
        equal(
          bulging.intersectsCell(rootCell),
          capFace !== antiFace,
          `Cap(${bulging}).intersectsCell(${rootCell}) = ${bulging.intersectsCell(rootCell)}, want ${
            capFace !== antiFace
          }`
        )
        equal(
          bulging.intersectsCell(edgeCell),
          center.vector.dot(cellid.point(edgeCell.id).vector) > 0.1,
          `Cap(${bulging}).intersectsCell(${edgeCell}) = ${bulging.intersectsCell(edgeCell)}, want ${
            center.vector.dot(cellid.point(edgeCell.id).vector) > 0.1
          }`
        )
        ok(!bulging.intersectsCell(cornerCell), `Cap(${bulging}).intersectsCell(${cornerCell}) = true, want false`)

        const singleton = Cap.fromCenterAngle(center, 0)
        equal(
          singleton.intersectsCell(rootCell),
          capFace === face,
          `Cap(${singleton}).intersectsCell(${rootCell}) = ${singleton.intersectsCell(rootCell)}, want ${
            capFace === face
          }`
        )
        ok(!singleton.intersectsCell(edgeCell), `Cap(${singleton}).intersectsCell(${edgeCell}) = true, want false`)
        ok(!singleton.intersectsCell(cornerCell), `Cap(${singleton}).intersectsCell(${cornerCell}) = true, want false`)
      }
    }
  })

  test('centroid', () => {
    ok(Cap.emptyCap().centroid().approxEqual(new Point(0, 0, 0)))
    ok(Cap.fullCap().centroid().vector.norm() <= 1e-15)

    for (let i = 0; i < 100; i++) {
      const center = randomPoint()
      const height = randomUniformFloat64(0.0, 2.0)
      const c = Cap.fromCenterHeight(center, height)
      const got = c.centroid()
      const want = center.vector.mul((1.0 - height / 2.0) * c.area())
      ok(got.vector.sub(want).norm() <= 1e-15)
    }
  })

  test('union', () => {
    const a = Cap.fromCenterAngle(Point.fromLatLng(LatLng.fromDegrees(50.0, 10.0)), 0.2 * DEGREE)
    const b = Cap.fromCenterAngle(Point.fromLatLng(LatLng.fromDegrees(50.0, 10.0)), 0.3 * DEGREE)
    ok(b.contains(a), `${b}.contains(${a}) = false, want true`)
    ok(b.approxEqual(a.union(b)), `${b}.approxEqual(${a.union(b)}) = false, want true`)

    ok(a.union(Cap.fullCap()).isFull(), `${a}.union(${Cap.fullCap()}).isFull() = false, want true`)

    ok(a.union(Cap.emptyCap()).approxEqual(a), `${a}.union(Cap.emptyCap()) = ${a.union(Cap.emptyCap())}, want ${a}`)

    const c = Cap.fromCenterAngle(Point.fromLatLng(LatLng.fromDegrees(51.0, 11.0)), 1.5 * DEGREE)
    ok(c.contains(a), `${c}.contains(${a}) = false, want true`)
    ok(a.union(c).center.approxEqual(c.center), `${a}.union(${c}).center = ${a.union(c).center}, want ${c.center}`)
    ok(
      float64Eq(a.union(c).radius(), c.radius()),
      `${a}.union(${c}).radius = ${a.union(c).radius()}, want ${c.radius()}`
    )

    const d = Cap.fromCenterAngle(Point.fromLatLng(LatLng.fromDegrees(51.0, 11.0)), 0.1 * DEGREE)
    ok(!d.contains(a), `${d}.contains(${a}) = true, want false`)
    ok(!d.intersects(a), `${d}.intersects(${a}) = true, want false`)

    ok(a.union(d).approxEqual(d.union(a)), `${a}.union(${d}).approxEqual(${d.union(a)}) = false, want true`)
    ok(
      float64Near(angle.degrees(LatLng.fromPoint(a.union(d).center).lat), 50.4588, 0.001),
      `${a.union(d)}.center.lat = ${angle.degrees(LatLng.fromPoint(a.union(d).center).lat)}, want 50.4588`
    )
    ok(
      float64Near(angle.degrees(LatLng.fromPoint(a.union(d).center).lng), 10.4525, 0.001),
      `${a.union(d)}.center.lng = ${angle.degrees(LatLng.fromPoint(a.union(d).center).lng)}, want 10.4525`
    )
    ok(
      float64Near(angle.degrees(a.union(d).radius()), 0.7425, 0.001),
      `${a.union(d)}.radius = ${angle.degrees(a.union(d).radius())}, want 0.7425`
    )

    const e = Cap.fromCenterAngle(Point.fromLatLng(LatLng.fromDegrees(50.3, 10.3)), 0.2 * DEGREE)
    ok(!e.contains(a), `${e}.contains(${a}) = false, want true`)
    ok(e.intersects(a), `${e}.intersects(${a}) = false, want true`)
    ok(a.union(e).approxEqual(e.union(a)), `${a}.union(${e}).approxEqual(${e.union(a)}) = false, want true`)
    ok(
      float64Near(angle.degrees(LatLng.fromPoint(a.union(e).center).lat), 50.15, 0.001),
      `${a.union(e)}.center.lat = ${angle.degrees(LatLng.fromPoint(a.union(e).center).lat)}, want 50.1500`
    )
    ok(
      float64Near(angle.degrees(LatLng.fromPoint(a.union(e).center).lng), 10.1495, 0.001),
      `${a.union(e)}.center.lng = ${angle.degrees(LatLng.fromPoint(a.union(e).center).lng)}, want 10.1495`
    )
    ok(
      float64Near(angle.degrees(a.union(e).radius()), 0.3781, 0.001),
      `${a.union(e)}.radius = ${angle.degrees(a.union(e).radius())}, want 0.3781`
    )

    const p1 = new Point(0, 0, 1)
    const p2 = new Point(0, 1, 0)
    const f = Cap.fromCenterAngle(p1, 150 * DEGREE)
    const g = Cap.fromCenterAngle(p2, 150 * DEGREE)
    ok(f.union(g).isFull(), `${f}.union(${g}).isFull() = false, want true`)

    const hemi = Cap.fromCenterHeight(p1, 1)
    ok(hemi.union(hemi.complement()).isFull(), `${hemi}.union(${hemi.complement()}).isFull() = false, want true`)
  })

  test('equal', () => {
    const tests = [
      { a: Cap.emptyCap(), b: Cap.emptyCap(), want: true },
      { a: Cap.emptyCap(), b: Cap.fullCap(), want: false },
      { a: Cap.fullCap(), b: Cap.fullCap(), want: true },
      {
        a: Cap.fromCenterAngle(Point.fromCoords(0, 0, 1), 150 * DEGREE),
        b: Cap.fromCenterAngle(Point.fromCoords(0, 0, 1), 151 * DEGREE),
        want: false
      },
      { a: xAxis, b: xAxis, want: true },
      { a: xAxis, b: yAxis, want: false },
      { a: xComp, b: xAxis.complement(), want: true }
    ]

    for (const test of tests) {
      equal(test.a.equals(test.b), test.want)
    }
  })
})
