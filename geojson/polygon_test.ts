import { test, describe } from 'node:test'
import { ok } from 'node:assert/strict'
import type * as geojson from 'geojson'
import { approxEqual } from './testing'
import * as polygon from './polygon'

describe('geojson', () => {
  test('polygon', (t) => {
    const geometries: geojson.Polygon[] = [
      {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 2],
            [0, 0]
          ]
        ]
      },
      {
        type: 'Polygon',
        coordinates: [
          [
            [100.0, 0.0],
            [101.0, 0.0],
            [101.0, 1.0],
            [100.0, 1.0],
            [100.0, 0.0]
          ]
        ]
      }
    ]

    geometries.forEach((geometry) => {
      const decoded = polygon.unmarshal(geometry)
      const encoded = polygon.marshal(decoded)
      ok(approxEqual(encoded, geometry), JSON.stringify(geometry) + ' -> ' + JSON.stringify(encoded))
    })
  })
})
