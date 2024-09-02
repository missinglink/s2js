import { test, describe } from 'node:test'
import { deepEqual } from 'node:assert/strict'
import * as cell from './cell'
import { randomCellIDForLevel } from '../s2/testing'
import { Cell } from '../s2/Cell'

describe('geojson', () => {
  test('cell', (t) => {
    // @todo: test other levels
    const faceCells: Cell[] = [
      Cell.fromCellID(randomCellIDForLevel(30)),
      Cell.fromCellID(randomCellIDForLevel(30)),
      Cell.fromCellID(randomCellIDForLevel(30)),
      Cell.fromCellID(randomCellIDForLevel(30)),
      Cell.fromCellID(randomCellIDForLevel(30)),
      Cell.fromCellID(randomCellIDForLevel(30)),
      Cell.fromCellID(randomCellIDForLevel(30))
    ]

    faceCells.forEach((c) => {
      const encoded = cell.marshal(c)
      const decoded = cell.unmarshal(encoded)
      deepEqual(decoded, c)
    })
  })
})
