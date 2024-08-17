import { test, describe } from 'node:test'
import { ok } from 'node:assert/strict'
import { RectBounder } from './RectBounder'
import { DBL_EPSILON } from './predicates'
import { Interval as R1Interval } from '../r1/Interval'
import { Interval as S1Interval } from '../s1/Interval'
import { Rect } from './Rect'
import { Point } from './Point'
import { float64Eq, randomFloat64, randomPoint, RECT_ERROR_LAT, RECT_ERROR_LNG, rectsApproxEqual } from './testing'
import { float64Near } from '../r1/math'
import { LatLng } from './LatLng'

const rectBoundForPoints = (a: Point, b: Point): Rect => {
  const bounder = new RectBounder()
  bounder.addPoint(a)
  bounder.addPoint(b)
  return bounder.rectBound()
}

describe('s2.RectBounder', () => {
  test('max latitude simple', () => {
    const cubeLat = Math.asin(1 / Math.sqrt(3)) // 35.26 degrees
    const cubeLatRect = new Rect(
      R1Interval.fromPoint(-cubeLat).addPoint(cubeLat),
      S1Interval.fromEndpoints(-Math.PI / 4, Math.PI / 4)
    )

    const tests = [
      {
        a: new Point(1, 1, 1),
        b: new Point(1, -1, -1),
        want: cubeLatRect
      },
      {
        a: new Point(1, -1, 1),
        b: new Point(1, 1, -1),
        want: cubeLatRect
      }
    ]

    tests.forEach((test) => {
      const got = rectBoundForPoints(test.a, test.b)
      ok(
        rectsApproxEqual(got, test.want, RECT_ERROR_LAT, RECT_ERROR_LNG),
        `RectBounder for points (${test.a}, ${test.b}) near max lat failed: got ${got}, want ${test.want}`
      )
    })
  })

  test('max latitude edge interior', () => {
    const tests = [
      {
        got: Math.PI / 4 + 0.5 * RECT_ERROR_LAT,
        want: rectBoundForPoints(new Point(1, 1, 1), new Point(1, -1, 1)).lat.hi
      },
      {
        got: -Math.PI / 4 - 0.5 * RECT_ERROR_LAT,
        want: rectBoundForPoints(new Point(1, -1, -1), new Point(-1, -1, -1)).lat.lo
      },
      {
        got: Math.PI / 4 + 0.5 * RECT_ERROR_LAT,
        want: rectBoundForPoints(new Point(1, -1, 1), new Point(1, 1, 1)).lat.hi
      },
      {
        got: -Math.PI / 4 - 0.5 * RECT_ERROR_LAT,
        want: rectBoundForPoints(new Point(-1, 1, -1), new Point(-1, -1, -1)).lat.lo
      },
      {
        got: Math.PI / 2,
        want: rectBoundForPoints(new Point(0.3, 0.4, 1), new Point(-0.3, -0.4, 1)).lat.hi
      },
      {
        got: -Math.PI / 2,
        want: rectBoundForPoints(new Point(0.3, 0.4, -1), new Point(-0.3, -0.4, -1)).lat.lo
      }
    ]

    tests.forEach((test) => {
      ok(
        float64Eq(test.got, test.want),
        `RectBound for max lat on interior of edge failed; got ${test.got}, want ${test.want}`
      )
    })
  })

  test('max latitude random', () => {
    for (let i = 0; i < 100; i++) {
      let u = randomPoint()
      u.vector.z = DBL_EPSILON * 1e-6 * Math.pow(1e12, randomFloat64())

      u = Point.fromVector(u.vector.normalize())
      const v = Point.fromVector(Point.fromCoords(0, 0, 1).pointCross(u).vector.normalize())
      const w = Point.fromVector(u.pointCross(v).vector.normalize())

      const a = Point.fromVector(u.vector.sub(v.vector.mul(randomFloat64())).normalize())
      const b = Point.fromVector(u.vector.add(v.vector.mul(randomFloat64())).normalize())
      const abBound = rectBoundForPoints(a, b)
      ok(
        float64Near(LatLng.latitude(u), abBound.lat.hi, RECT_ERROR_LAT),
        `bound for line AB not near enough to the latitude of point ${u}. got ${LatLng.latitude(u)}, want ${
          abBound.lat.hi
        }`
      )

      const c = Point.fromVector(w.vector.sub(v.vector.mul(randomFloat64())).normalize())
      const d = Point.fromVector(w.vector.add(v.vector.mul(randomFloat64())).normalize())
      const cdBound = rectBoundForPoints(c, d)
      ok(
        float64Near(LatLng.latitude(w), cdBound.lat.hi, RECT_ERROR_LAT),
        `bound for line CD not near enough to the lat of point ${v}. got ${LatLng.latitude(w)}, want ${cdBound.lat.hi}`
      )
    }
  })

  test('expand for subregions', () => {
    ok(RectBounder.expandForSubregions(Rect.fullRect()).isFull(), 'Subregion Bound of full rect should be full')
    ok(RectBounder.expandForSubregions(Rect.emptyRect()).isEmpty(), 'Subregion Bound of empty rect should be empty')

    const tests = [
      { xLat: 3e-16, xLng: 0, yLat: 1e-14, yLng: Math.PI, wantFull: true },
      { xLat: 9e-16, xLng: 0, yLat: 1e-14, yLng: Math.PI, wantFull: false },
      { xLat: 1e-16, xLng: 7e-16, yLat: 1e-14, yLng: Math.PI, wantFull: true },
      { xLat: 3e-16, xLng: 14e-16, yLat: 1e-14, yLng: Math.PI, wantFull: false },
      { xLat: 1e-100, xLng: 14e-16, yLat: 1e-14, yLng: Math.PI, wantFull: true },
      { xLat: 1e-100, xLng: 22e-16, yLat: 1e-14, yLng: Math.PI, wantFull: false },
      { xLat: -Math.PI / 2, xLng: -1e-15, yLat: Math.PI / 2 - 7e-16, yLng: 0, wantFull: true },
      { xLat: -Math.PI / 2, xLng: -1e-15, yLat: Math.PI / 2 - 30e-16, yLng: 0, wantFull: false },
      { xLat: -Math.PI / 2 + 4e-16, xLng: 0, yLat: Math.PI / 2 - 2e-16, yLng: 1e-7, wantFull: true },
      { xLat: -Math.PI / 2 + 30e-16, xLng: 0, yLat: Math.PI / 2, yLng: 1e-7, wantFull: false },
      { xLat: -Math.PI / 2 + 4e-16, xLng: 0, yLat: Math.PI / 2 - 4e-16, yLng: Math.PI / 2, wantFull: true },
      { xLat: -Math.PI / 2, xLng: 0, yLat: Math.PI / 2 - 30e-16, yLng: Math.PI / 2, wantFull: false },
      { xLat: -Math.PI / 2, xLng: 0, yLat: Math.PI / 2 - 1e-8, yLng: Math.PI - 1e-7, wantFull: true },
      { xLat: -Math.PI / 2, xLng: 0, yLat: Math.PI / 2 - 1e-7, yLng: Math.PI - 1e-7, wantFull: false },
      { xLat: -Math.PI / 2 + 1e-12, xLng: -Math.PI + 1e-4, yLat: Math.PI / 2, yLng: 0, wantFull: true },
      { xLat: -Math.PI / 2 + 1e-11, xLng: -Math.PI + 1e-4, yLat: Math.PI / 2, yLng: 0, wantFull: true }
    ]

    tests.forEach((tc) => {
      let inRect = Rect.fromLatLng(new LatLng(tc.xLat, tc.xLng))
      inRect = inRect.addPoint(new LatLng(tc.yLat, tc.yLng))
      const got = RectBounder.expandForSubregions(inRect)

      ok(
        got.contains(inRect),
        `Subregion bound of (${tc.xLat}, ${tc.xLng}, ${tc.yLat}, ${tc.yLng}) should contain original rect`
      )
      ok(
        !(inRect.lat === Rect.validRectLatRange && inRect.lat.containsInterval(got.lat)),
        `Subregion bound of (${tc.xLat}, ${tc.xLng}, ${tc.yLat}, ${tc.yLng}) shouldn't be contained by original rect`
      )
      ok(
        got.isFull() === tc.wantFull,
        `Subregion Bound of (${tc.xLat}, ${tc.xLng}, ${tc.yLat}, ${tc.yLng}).IsFull should be ${tc.wantFull}`
      )
    })

    const rectTests = [
      {
        xLat: 1.5,
        xLng: -Math.PI / 2,
        yLat: 1.5,
        yLng: Math.PI / 2 - 2e-16,
        wantRect: new Rect(new R1Interval(1.5, 1.5), S1Interval.fullInterval())
      },
      {
        xLat: 1.5,
        xLng: -Math.PI / 2,
        yLat: 1.5,
        yLng: Math.PI / 2 - 7e-16,
        wantRect: new Rect(new R1Interval(1.5, 1.5), S1Interval.fromEndpoints(-Math.PI / 2, Math.PI / 2 - 7e-16))
      },
      {
        xLat: -Math.PI / 2 + 1e-15,
        xLng: 0,
        yLat: -Math.PI / 2 + 1e-15,
        yLng: 0,
        wantRect: new Rect(new R1Interval(-Math.PI / 2, -Math.PI / 2 + 1e-15), S1Interval.fullInterval())
      },
      {
        xLat: Math.PI / 2 - 1e-15,
        xLng: 0,
        yLat: Math.PI / 2 - 1e-15,
        yLng: 0,
        wantRect: new Rect(new R1Interval(Math.PI / 2 - 1e-15, Math.PI / 2), S1Interval.fullInterval())
      }
    ]

    rectTests.forEach((tc) => {
      let inRect = Rect.fromLatLng(new LatLng(tc.xLat, tc.xLng))
      inRect = inRect.addPoint(new LatLng(tc.yLat, tc.yLng))
      const got = RectBounder.expandForSubregions(inRect)
      ok(
        rectsApproxEqual(got, tc.wantRect, RECT_ERROR_LAT, RECT_ERROR_LNG),
        `Subregion Bound of (${tc.xLat}, ${tc.xLng}, ${tc.yLat}, ${tc.yLng}) = (${got}) should be ${tc.wantRect}`
      )
    })
  })
})
