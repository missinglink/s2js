import type * as geojson from 'geojson'
import * as position from './position'
import { Polyline } from '../s2/Polyline'

/**
 * Returns a geojson LineString geometry given an s2 Polyline.
 * @category Constructors
 */
export const marshal = (polyline: Polyline): geojson.LineString => {
  return {
    type: 'LineString',
    coordinates: polyline.points.map(position.marshal)
  }
}

/**
 * Constructs an s2 Polyline given a geojson LineString geometry.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.LineString): Polyline => {
  return new Polyline(geometry.coordinates.map(position.unmarshal))
}
