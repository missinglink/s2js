import type * as geojson from 'geojson'
import { MAX_LEVEL } from '../s2/cellid_constants'
import { CellUnion } from '../s2/CellUnion'
import * as geometry from './geometry'
import { Polyline } from '../s2/Polyline'
import { Polygon } from '../s2/Polygon'
import type { Region } from '../s2/Region'
import type { RegionCovererOptions as S2RegionCovererOptions } from '../s2/RegionCoverer'
import { RegionCoverer as S2RegionCoverer } from '../s2/RegionCoverer'

/**
 * RegionCovererOptions allows the RegionCoverer to be configured.
 */
export interface RegionCovererOptions extends S2RegionCovererOptions {
  /**
   * the maximum desired number of cells for each member of a multi-member geometry in the approximation.
   * @default Math.max(Math.floor(maxCells / 10), 8)
   */
  memberMaxCells?: number

  /**
   * the maximum size the approximation may reach before a compaction is triggered.
   * used to avoid OOM errors.
   * @default 65536
   */
  compactAt?: number

  /**
   * the maximum area of a shape to be considered for fast covering.
   * used to speed up covering small shapes.
   * area values are between 0 and 4*Pi.
   * @default 1e-6
   */
  smallAreaEpsilon?: number
}

/**
 * RegionCoverer allows arbitrary GeoJSON geometries to be approximated as unions of cells (CellUnion).
 *
 * Typical usage:
 *
 * 	feature = loadGeoJSON()
 * 	rc = new RegionCoverer({ maxCells: 256, memberMaxCells: 64 })
 * 	covering = rc.covering(feature.geometry)
 *
 * @beta unstable API
 */
export class RegionCoverer {
  coverer: S2RegionCoverer
  memberCoverer: S2RegionCoverer
  compactAt: number
  smallAreaEpsilon: number

  /**
   * Returns a new RegionCoverer with the appropriate defaults.
   *
   * @param options - RegionCoverer options
   *
   * @category Constructors
   */
  constructor({
    minLevel = 0,
    maxLevel = MAX_LEVEL,
    levelMod = 1,
    maxCells = 8,
    memberMaxCells = Math.max(Math.floor(maxCells / 10), 8),
    compactAt = 65536,
    smallAreaEpsilon = 1e-6
  }: RegionCovererOptions = {}) {
    this.coverer = new S2RegionCoverer({ minLevel, maxLevel, levelMod, maxCells })
    this.memberCoverer = new S2RegionCoverer({ minLevel, maxLevel, levelMod, maxCells: memberMaxCells })
    this.compactAt = compactAt
    this.smallAreaEpsilon = smallAreaEpsilon
  }

  /** Computes the covering of a multi-member geometry (ie. MultiPoint, MultiLineString, MultiPolygon). */
  private mutliMemberCovering(shapes: Region[]): CellUnion {
    // sort shapes from largest to smallest
    shapes.sort((a: Region, b: Region): number => RegionCoverer.area(b) - RegionCoverer.area(a))

    let union = new CellUnion()
    shapes.forEach((shape: Region) => {
      // optionally elect to use a fast covering method for small areas
      const fast = union.length >= this.memberCoverer.maxCells && RegionCoverer.area(shape) < this.smallAreaEpsilon

      // append covering to union
      union = CellUnion.fromUnion(
        union,
        fast ? this.memberCoverer.fastCovering(shape) : this.memberCoverer.covering(shape)
      )

      // force compact large coverings to avoid OOM errors
      if (union.length >= this.compactAt) union = this.coverer.covering(union)
    })

    // reduce the global covering to maxCells
    if (union.length < this.coverer.maxCells) return union
    return this.coverer.covering(union)
  }

  /** Returns a CellUnion that covers the given GeoJSON geometry and satisfies the various restrictions. */
  covering(geom: geojson.Geometry): CellUnion {
    const shape = geometry.unmarshal(geom)
    if (Array.isArray(shape)) return this.mutliMemberCovering(shape as Region[])
    return this.coverer.covering(shape)
  }

  /** Computes the area of a shape */
  static area(shape: Region): number {
    if (shape instanceof Polygon) return shape.area()
    if (shape instanceof Polyline) shape.capBound().area()
    return 0
  }
}
