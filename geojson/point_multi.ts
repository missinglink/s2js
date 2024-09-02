import type * as geojson from 'geojson'
import * as position from './position'
import { Point } from '../s2/Point'

/**
 * Returns a geojson MultiPoint geometry given s2 Points.
 * @category Constructors
 */
export const marshal = (points: Point[]): geojson.MultiPoint => {
  return {
    type: 'MultiPoint',
    coordinates: points.map(position.marshal)
  }
}

/**
 * Constructs s2 Points given a geojson MultiPoint geometry.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.MultiPoint): Point[] => {
  return geometry.coordinates.map(position.unmarshal)
}
