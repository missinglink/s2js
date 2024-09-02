import type * as geojson from 'geojson'
import { Cell } from '../s2/Cell'
import { Loop } from '../s2/Loop'
import { Polygon } from '../s2/Polygon'
import * as polygon from './polygon'
import * as loop from './loop'

/**
 * Returns a geojson Polygon given an s2 Cell.
 * @category Constructors
 */
export const marshal = (cell: Cell): geojson.Polygon => {
  const loop = new Loop([cell.vertex(0), cell.vertex(1), cell.vertex(2), cell.vertex(3)])
  return polygon.marshal(new Polygon([loop]))
}

/**
 * Constructs a Cell from the centroid of a geojson Polygon.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.Polygon): Cell => {
  const ring = loop.unmarshal(geometry.coordinates[0], 0)
  return Cell.fromPoint(ring.capBound().centroid())
}
