import type * as geojson from 'geojson'
import * as angle from '../s1/angle'
import { Point } from '../s2/Point'
import { LatLng } from '../s2/LatLng'

/**
 * Returns a geojson Position given an s2 Point.
 * @category Constructors
 */
export const marshal = (point: Point): geojson.Position => {
  const ll = LatLng.fromPoint(point)
  return [angle.degrees(ll.lng), angle.degrees(ll.lat)]
}

/**
 * Constructs an s2 Point given a geojson Position.
 * @category Constructors
 */
export const unmarshal = (position: geojson.Position): Point => {
  return Point.fromLatLng(LatLng.fromDegrees(position[1], position[0]))
}
