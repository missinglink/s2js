import type * as geojson from 'geojson'
import * as loop from './loop'
import { Polygon } from '../s2/Polygon'

/**
 * Returns a geojson Polygon geometry given an s2 Polygon.
 * @category Constructors
 */
export const marshal = (polygon: Polygon): geojson.Polygon => {
  return {
    type: 'Polygon',
    coordinates: polygon.loops.map(loop.marshal)
  }
}

/**
 * Constructs an s2 Polygon given a geojson Polygon geometry.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.Polygon): Polygon => {
  return new Polygon(geometry.coordinates.map(loop.unmarshal))
}

/**
 * Returns a geojson MultiPolygon geometry given s2 Polygons.
 * @category Constructors
 */
export const marshalMulti = (polygons: Polygon[]): geojson.MultiPolygon => {
  return {
    type: 'MultiPolygon',
    coordinates: polygons.map((polygon) => polygon.loops.map(loop.marshal))
  }
}

/**
 * Constructs s2 Polygons given a geojson MultiPolygon geometry.
 * @category Constructors
 */
export const unmarshalMulti = (geometry: geojson.MultiPolygon): Polygon[] => {
  return geometry.coordinates.map((coords) => new Polygon(coords.map(loop.unmarshal)))
}
