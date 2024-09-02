import type * as geojson from 'geojson'
import type { CellID } from '../s2/cellid'
import { Cell } from '../s2/Cell'
import * as cellid from '../s2/cellid'
import * as cell from './cell'
import * as loop from './loop'

/**
 * Returns a geojson Polygon given an s2 CellID.
 * @category Constructors
 */
export const marshal = (cid: CellID): geojson.Polygon => {
  return cell.marshal(Cell.fromCellID(cid))
}

/**
 * Constructs the centroid CellID given a geojson Polygon.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.Polygon): CellID => {
  const ring = loop.unmarshal(geometry.coordinates[0], 0)
  return cellid.fromPoint(ring.capBound().centroid())
}
