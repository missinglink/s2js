import type * as geojson from 'geojson'
import { Point } from '../s2/Point'
import { Polyline } from '../s2/Polyline'
import { Polygon } from '../s2/Polygon'
import { Cell } from '../s2/Cell'
import { Rect } from '../s2/Rect'
import * as point from './point'
import * as linestring from './linestring'
import * as polygon from './polygon'
import { Loop } from '../s2/Loop'

export type Decodable = Point | Polyline | Polygon | Point[] | Polyline[] | Polygon[]
export type Encodable = bigint | Cell | Rect | Decodable

/**
 * Returns a geojson Geometry given a s2 shape(s).
 * @category Constructors
 */
export const toGeoJSON = (shape: Encodable): geojson.Geometry => {
  if (typeof shape === 'bigint') shape = Cell.fromCellID(shape)
  if (shape instanceof Cell) shape = Polygon.fromCell(shape)
  else if (shape instanceof Rect) {
    const loop = new Loop(Array(4).map((_, i) => Point.fromLatLng((shape as Rect).vertex(i))))
    shape = Polygon.fromOrientedLoops([loop])
  }

  if (shape instanceof Point) return point.marshal(shape)
  if (shape instanceof Polyline) return linestring.marshal(shape)
  if (shape instanceof Polygon) return polygon.marshal(shape)

  if (Array.isArray(shape) && shape.length) {
    if (shape.every((g: any) => g instanceof Point)) return point.marshalMulti(shape as Point[])
    if (shape.every((g: any) => g instanceof Polyline)) return linestring.marshalMulti(shape as Polyline[])
    if (shape.every((g: any) => g instanceof Polygon)) return polygon.marshalMulti(shape as Polygon[])
  }

  throw new Error(`unsupported: ${shape?.constructor?.name || typeof shape}`)
}

/**
 * Constructs s2 shape(s) given a geojson geometry.
 * @category Constructors
 */
export const fromGeoJSON = (geometry: geojson.Geometry): Decodable => {
  const t = geometry?.type

  if (t === 'Point') return point.unmarshal(geometry as geojson.Point)
  if (t === 'LineString') return linestring.unmarshal(geometry as geojson.LineString)
  if (t === 'Polygon') return polygon.unmarshal(geometry as geojson.Polygon)

  if (t === 'MultiPoint') return point.unmarshalMulti(geometry as geojson.MultiPoint)
  if (t === 'MultiLineString') return linestring.unmarshalMulti(geometry as geojson.MultiLineString)
  if (t === 'MultiPolygon') return polygon.unmarshalMulti(geometry as geojson.MultiPolygon)

  throw new Error(`unsupported: ${t || 'UnknownGeometryType'}`)
}
