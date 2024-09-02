import type * as geojson from 'geojson'

// default distance threshold for approx equality
const EPSILON = 1e-13

export const approxEqualPosition = (a: geojson.Position, b: geojson.Position, epsilon = EPSILON) => {
  return Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon
}

export const approxEqual = (a: geojson.Geometry, b: geojson.Geometry, epsilon = EPSILON) => {
  if (a?.type !== b?.type) return false
  switch (a.type) {
    case 'Point': {
      const aa = a as geojson.Point
      const bb = b as geojson.Point
      return approxEqualPosition(aa.coordinates, bb.coordinates, epsilon)
    }

    case 'LineString': {
      const aa = a as geojson.LineString
      const bb = b as geojson.LineString
      if (aa.coordinates.length !== bb.coordinates.length) return false
      return aa.coordinates.every((c, i) => approxEqualPosition(c, bb.coordinates[i], epsilon))
    }

    case 'Polygon': {
      const aa = a as geojson.Polygon
      const bb = b as geojson.Polygon
      if (aa.coordinates.length !== bb.coordinates.length) return false
      return aa.coordinates.every((r, ri) => {
        if (r.length !== bb.coordinates[ri].length) return false
        return r.every((c, ci) => approxEqualPosition(c, bb.coordinates[ri][ci], epsilon))
      })
    }

    default:
      throw new Error(`unsupported geometry type: ${a.type}`)
  }
}
