import type * as geojson from 'geojson'
import { Rect } from '../s2/Rect'
import { Interval as R1Interval } from '../r1/Interval'
import { Interval as S1Interval } from '../s1/Interval'
import { Point } from '../s2/Point'
import * as point from './point'

/**
 * Returns a pair of transverse geojson Points given an s2 Rect.
 * @category Constructors
 */
export const marshal = (rect: Rect): [geojson.Point, geojson.Point] => {
  return [point.marshal(Point.fromLatLng(rect.vertex(0))), point.marshal(Point.fromLatLng(rect.vertex(2)))]
}

/**
 * Constructs an s2 Rect given a pair of transverse geojson Points.
 * @category Constructors
 */
export const unmarshal = (a: geojson.Point, b: geojson.Point): Rect => {
  const latLo = Math.min(a.coordinates[1], b.coordinates[1])
  const latHi = Math.max(a.coordinates[1], b.coordinates[1])
  const lngLo = Math.min(a.coordinates[0], b.coordinates[0])
  const lngHi = Math.max(a.coordinates[0], b.coordinates[0])
  const DEGREE = Math.PI / 180

  return new Rect(
    new R1Interval(latLo * DEGREE, latHi * DEGREE),
    S1Interval.fromEndpoints(lngLo * DEGREE, lngHi * DEGREE)
  )
}
