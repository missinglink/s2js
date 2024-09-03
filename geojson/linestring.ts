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

/**
 * Returns a geojson MultiLineString geometry given s2 Polylines.
 * @category Constructors
 */
export const marshalMulti = (polylines: Polyline[]): geojson.MultiLineString => {
  return {
    type: 'MultiLineString',
    coordinates: polylines.map((polyline) => polyline.points.map(position.marshal))
  }
}

/**
 * Constructs s2 Polylines given a geojson MultiLineString geometry.
 * @category Constructors
 */
export const unmarshalMulti = (geometry: geojson.MultiLineString): Polyline[] => {
  return geometry.coordinates.map((polyline) => new Polyline(polyline.map(position.unmarshal)))
}
