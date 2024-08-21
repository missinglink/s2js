import { Rect } from './Rect'
import { Interval as R1Interval } from '../r1/Interval'
import { Interval as S1Interval } from '../s1/Interval'
import { DEGREE } from '../s1/angle_constants'
import { float64Eq } from './testing'
import { Point } from './Point'

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
