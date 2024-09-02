import type * as geojson from 'geojson'
import * as position from './position'
import { Point } from '../s2/Point'

/**
 * Returns a geojson Point geometry given an s2 Point.
 * @category Constructors
 */
export const marshal = (point: Point): geojson.Point => {
  return {
    type: 'Point',
    coordinates: position.marshal(point)
  }
}

/**
 * Constructs an s2 Point given a geojson Point geometry.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.Point): Point => {
  return position.unmarshal(geometry.coordinates)
}
