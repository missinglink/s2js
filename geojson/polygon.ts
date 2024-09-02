import type * as geojson from 'geojson'
import * as loop from './loop'
import { Polygon } from '../s2/Polygon'
import { rewindPolygon } from './turf'

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
export const unmarshal = (geometry: geojson.Polygon, rewind = true): Polygon => {
  if (rewind) rewindPolygon(geometry.coordinates, false)
  return new Polygon(geometry.coordinates.map(loop.unmarshal))
}
