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
 *
 * Handles differences between GeoJSON and S2:
 * - GeoJSON rings are oriented CCW for the exterior and CW for holes, in S2 all loops are oriented CCW.
 * - GeoJSON rings duplicate the start/end points, in S2 they do not.
 *
 * S2 Loops require the following properties be met:
 * - Loops are not allowed to have any duplicate vertices (whether adjacent or not).
 * - Non-adjacent edges are not allowed to intersect, and furthermore edges of length 180 degrees are not allowed (i.e., adjacent vertices cannot be antipodal).
 * - Loops must have at least 3 vertices.
 */
export const unmarshal = (ring: geojson.Position[]): Loop => {
  if (ring.length < 3) return new Loop([])

  ring = ring.slice() // make a copy to avoid mutating input
  if (clockwise(ring)) ring.reverse() // all rings must be CCW
  if (position.equal(ring.at(0)!, ring.at(-1)!)) ring.length -= 1 // remove matching start/end points

  // Loops are not allowed to have duplicate vertices (whether adjacent or not)
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

/**
 * Returns true IFF ring is oriented Clockwise.
 */
export const clockwise = (ring: geojson.Position[]): boolean => {
  let sum = 0
  for (let i = 1; i < ring.length; i++) {
    sum += (ring[i][0] - ring[i - 1][0]) * (ring[i][1] + ring[i - 1][1])
  }
  return sum > 0
}
