import { test, describe } from 'node:test'
import { ok } from 'node:assert/strict'
import type * as geojson from 'geojson'
import { approxEqual } from './testing'
import * as point from './point'

describe('geojson', () => {
  test('point', (t) => {
    const geometries: geojson.Point[] = [
      { type: 'Point', coordinates: [0, 0] },
      { type: 'Point', coordinates: [-180, -90] },
      { type: 'Point', coordinates: [180, 90] },
      { type: 'Point', coordinates: [102.0, 0.5] }
    ]

    geometries.forEach((geometry) => {
      const decoded = point.unmarshal(geometry)
      const encoded = point.marshal(decoded)
      ok(approxEqual(encoded, geometry), JSON.stringify(geometry) + ' -> ' + JSON.stringify(encoded))
    })
  })
})
