import type * as geojson from 'geojson'
import * as position from './position'
import { Loop } from '../s2/Loop'

/**
 * Returns a geojson Polygon ring given an s2 Loop & ordinal.
 * @category Constructors
 */
export const marshal = (loop: Loop, ordinal: number): geojson.Position[] => {
  const ring = loop.vertices.map(position.marshal)
  if (ordinal > 0) ring.reverse() // outer ring remains CCW, inner rings become CW
  ring.push(ring[0]) // add matching start/end points
  return ring
}

/**
 * Constructs an s2 Loop given a geojson Polygon ring & ordinal.
 * @category Constructors
 */
export const unmarshal = (ring: geojson.Position[], ordinal: number): Loop => {
  ring = ring.slice() // make a copy to avoid mutating input
  ring.length -= 1 // remove matching start/end points
  if (ordinal > 0) ring.reverse() // ensure all rings are CCW
  return new Loop(ring.map(position.unmarshal))
}
