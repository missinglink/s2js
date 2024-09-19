import type * as geojson from 'geojson'
import * as position from './position'

// default distance threshold for approx equality
const EPSILON = 1e-13

export const approxEqual = (a: geojson.Geometry, b: geojson.Geometry, epsilon = EPSILON) => {
  if (a?.type !== b?.type) return false
  switch (a.type) {
    case 'Point': {
      const aa = a as geojson.Point
      const bb = b as geojson.Point
      return position.equal(aa.coordinates, bb.coordinates, epsilon)
    }

    case 'LineString': {
      const aa = a as geojson.LineString
      const bb = b as geojson.LineString
      if (aa.coordinates.length !== bb.coordinates.length) return false
      return aa.coordinates.every((c, i) => position.equal(c, bb.coordinates[i], epsilon))
    }

    case 'Polygon': {
      const aa = a as geojson.Polygon
      const bb = b as geojson.Polygon
      if (aa.coordinates.length !== bb.coordinates.length) return false
      return aa.coordinates.every((r, ri) => {
        if (r.length !== bb.coordinates[ri].length) return false
        return r.every((c, ci) => position.equal(c, bb.coordinates[ri][ci], epsilon))
      })
    }

    default:
      throw new Error(`unsupported geometry type: ${a.type}`)
  }
}
