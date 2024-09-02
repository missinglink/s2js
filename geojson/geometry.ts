import type * as geojson from 'geojson'
import { Point } from '../s2/Point'
import { Polyline } from '../s2/Polyline'
import { Polygon } from '../s2/Polygon'
import * as point from './point'
import * as linestring from './linestring'
import * as polygon from './polygon'
import * as point_multi from './point_multi'
import * as linestring_multi from './linestring_multi'
import * as polygon_multi from './polygon_multi'

type Geometry = Point | Polyline | Polygon | Geometry[]

/**
 * Returns a geojson Geometry given a s2 shape(s).
 * @category Constructors
 */
export const marshal = (shape: Geometry): geojson.Geometry => {
  if (shape instanceof Point) return point.marshal(shape)
  if (shape instanceof Polyline) return linestring.marshal(shape)
  if (shape instanceof Polygon) return polygon.marshal(shape)

  if (Array.isArray(shape) && shape.length) {
    if (shape.every((g) => g instanceof Point)) return point_multi.marshal(shape as Point[])
    if (shape.every((g) => g instanceof Polyline)) return linestring_multi.marshal(shape as Polyline[])
    if (shape.every((g) => g instanceof Polygon)) return polygon_multi.marshal(shape as Polygon[])
  }

  throw new Error(`unsupported: ${shape?.constructor?.name || 'UnknownShape'}`)
}

/**
 * Constructs s2 shape(s) given a geojson geometry.
 * @category Constructors
 */
export const unmarshal = (geometry: geojson.Geometry): Geometry => {
  const t = geometry?.type

  if (t === 'Point') return point.unmarshal(geometry as geojson.Point)
  if (t === 'LineString') return linestring.unmarshal(geometry as geojson.LineString)
  if (t === 'Polygon') return polygon.unmarshal(geometry as geojson.Polygon)

  if (t === 'MultiPoint') return point_multi.unmarshal(geometry as geojson.MultiPoint)
  if (t === 'MultiLineString') return linestring_multi.unmarshal(geometry as geojson.MultiLineString)
  if (t === 'MultiPolygon') return polygon_multi.unmarshal(geometry as geojson.MultiPolygon)

  throw new Error(`unsupported: ${t || 'UnknownGeometryType'}`)
}
