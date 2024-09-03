import type * as geojson from 'geojson'
import { test, describe } from 'node:test'
import { ok } from 'node:assert/strict'
import { approxEqual } from './testing'
import * as geometry from './geometry'

describe('geojson', () => {
  test('point', (t) => {
    const points: geojson.Point[] = [
      { type: 'Point', coordinates: [0, 0] },
      { type: 'Point', coordinates: [-180, -90] },
      { type: 'Point', coordinates: [180, 90] },
      { type: 'Point', coordinates: [102.0, 0.5] }
    ]

    points.forEach((point) => {
      const decoded = geometry.fromGeoJSON(point)
      const encoded = geometry.toGeoJSON(decoded)
      ok(approxEqual(encoded, point), JSON.stringify(point) + ' -> ' + JSON.stringify(encoded))
    })
  })

  test('linestring', (t) => {
    const linestrings: geojson.LineString[] = [
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

    linestrings.forEach((linestring) => {
      const decoded = geometry.fromGeoJSON(linestring)
      const encoded = geometry.toGeoJSON(decoded)
      ok(approxEqual(encoded, linestring), JSON.stringify(linestring) + ' -> ' + JSON.stringify(encoded))
    })
  })

  test('polygon', (t) => {
    const polygons: geojson.Polygon[] = [
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

    polygons.forEach((polygon) => {
      const decoded = geometry.fromGeoJSON(polygon)
      const encoded = geometry.toGeoJSON(decoded)
      ok(approxEqual(encoded, polygon), JSON.stringify(polygon) + ' -> ' + JSON.stringify(encoded))
    })
  })
})
