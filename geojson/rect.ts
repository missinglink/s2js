import type * as geojson from 'geojson'
import { Rect } from '../s2/Rect'
import { Interval as R1Interval } from '../r1/Interval'
import { Interval as S1Interval } from '../s1/Interval'
import { Point } from '../s2/Point'
import { Loop } from '../s2/Loop'
import { Polygon } from '../s2/Polygon'
import * as polygon from './polygon'
import { DEGREE } from '../s1/angle_constants'

/**
 * Returns a geojson Polygon geometry given an s2 Rect.
 * @category Constructors
 */
export const marshal = (rect: Rect): geojson.Polygon => {
  const loop = new Loop(Array.from({ length: 4 }, (_, i) => Point.fromLatLng(rect.vertex(i))))
  return polygon.marshal(Polygon.fromOrientedLoops([loop]))
}

/**
 * Constructs an s2 Rect given a geojson Polygon geometry.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.Polygon): Rect => {
  const ring = geometry.coordinates[0]
  const lngLo = Math.min(ring[0][0], ring[2][0])
  const lngHi = Math.max(ring[0][0], ring[2][0])
  const latLo = Math.min(ring[0][1], ring[2][1])
  const latHi = Math.max(ring[0][1], ring[2][1])

  return new Rect(
    new R1Interval(latLo * DEGREE, latHi * DEGREE),
    S1Interval.fromEndpoints(lngLo * DEGREE, lngHi * DEGREE)
  )
}

/**
 * Returns true iff the geojson Polygon represents a valid Rect.
 * @category Constructors
 */
export const valid = (geometry: geojson.Polygon): boolean => {
  if (geometry?.type !== 'Polygon') return false
  if (geometry?.coordinates.length !== 1) return false
  const ring = geometry.coordinates[0]
  if (ring.length !== 5) return false
  if (!pointsEqual(ring[0], ring[4])) return false
  if (!lngEqual(ring[0], ring[3])) return false
  if (!lngEqual(ring[1], ring[2])) return false
  if (!latEqual(ring[0], ring[1])) return false
  if (!latEqual(ring[2], ring[3])) return false
  return true
}

const lngEqual = (a: geojson.Position, b: geojson.Position) => a[0] === b[0]
const latEqual = (a: geojson.Position, b: geojson.Position) => a[1] === b[1]
const pointsEqual = (a: geojson.Position, b: geojson.Position) => lngEqual(a, b) && latEqual(a, b)
