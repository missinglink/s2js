import { test, describe } from 'node:test'
import { ok } from 'node:assert/strict'
import type * as geojson from 'geojson'
import { approxEqual } from './testing'
import * as linestring from './linestring'

describe('geojson', () => {
  test('linestring', (t) => {
    const geometries: geojson.LineString[] = [
      {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [2, 2],
          [-180, -90],
          [180, 90]
        ]
      },
      {
        type: 'LineString',
        coordinates: [
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 4],
          [5, 5]
        ]
      },
      {
        type: 'LineString',
        coordinates: [
          [102.0, 0.0],
          [103.0, 1.0],
          [104.0, 0.0],
          [105.0, 1.0]
        ]
      }
    ]

    geometries.forEach((geometry) => {
      const decoded = linestring.unmarshal(geometry)
      const encoded = linestring.marshal(decoded)
      ok(approxEqual(encoded, geometry), JSON.stringify(geometry) + ' -> ' + JSON.stringify(encoded))
    })
  })
})
