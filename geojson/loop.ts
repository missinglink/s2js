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

  // Loops are not allowed to have any duplicate vertices (whether adjacent or not)
  if (containsDuplicateVertices(ring)) {
    // adjacent duplicates are fixable
    ring = removeAdjacentDuplicateVertices(ring)

    // non-adjacent duplicates are not fixable
    if (containsDuplicateVertices(ring)) return new Loop([])
  }

  return new Loop(ring.map(position.unmarshal))
}

/**
 * Removes *adjacent* duplicate (and near-duplicate) vertices from ring.
 */
export const removeAdjacentDuplicateVertices = (ring: geojson.Position[], epsilon = 1e-8): geojson.Position[] => {
  return ring.filter((p, i) => !i || !position.equal(ring.at(i - 1)!, p, epsilon))
}

/**
 * Returns true IFF ring contains duplicate vertices at any position.
 */
export const containsDuplicateVertices = (ring: geojson.Position[]): boolean => {
  return new Set(ring.map((c) => `${c[0]}|${c[1]}`)).size !== ring.length
}
