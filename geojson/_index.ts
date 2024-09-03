/**
 * Module geojson implements types and functions for working with GeoJSON.
 * @module geojson
 */
export type { Encodable, Decodable } from './geometry'
export { toGeoJSON, fromGeoJSON } from './geometry'

export type { RegionCovererOptions } from './RegionCoverer'
export { RegionCoverer } from './RegionCoverer'
