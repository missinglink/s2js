import { test, describe } from 'node:test'
import { ok } from 'node:assert/strict'
import type * as geojson from 'geojson'
import { approxEqual } from './testing'
import * as rect from './rect'

describe('geojson', () => {
  test('rect', (t) => {
    const geometries: geojson.Point[][] = [
      [
        { type: 'Point', coordinates: [0, 0] },
        { type: 'Point', coordinates: [1, 1] }
      ]
    ]

    geometries.forEach((geometry) => {
      const decoded = rect.unmarshal(geometry[0], geometry[1])
      const encoded = rect.marshal(decoded)

      ok(approxEqual(encoded[0], geometry[0]), JSON.stringify(geometry[0]) + ' -> ' + JSON.stringify(encoded[0]))
      ok(approxEqual(encoded[1], geometry[1]), JSON.stringify(geometry[1]) + ' -> ' + JSON.stringify(encoded[1]))
    })
  })
})
