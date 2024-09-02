import type * as geojson from 'geojson'
import * as position from './position'
import { Polyline } from '../s2/Polyline'

/**
 * Returns a geojson MultiLineString geometry given s2 Polylines.
 * @category Constructors
 */
export const marshal = (polylines: Polyline[]): geojson.MultiLineString => {
  return {
    type: 'MultiLineString',
    coordinates: polylines.map((polyline) => polyline.points.map(position.marshal))
  }
}

/**
 * Constructs s2 Polylines given a geojson MultiLineString geometry.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.MultiLineString): Polyline[] => {
  return geometry.coordinates.map((polyline) => new Polyline(polyline.map(position.unmarshal)))
}
