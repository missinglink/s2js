import { test, describe } from 'node:test'
import { equal } from 'node:assert/strict'
import * as cellid from './cellid'
import type { CellID } from '../s2/cellid'
import { randomCellIDForLevel } from '../s2/testing'

describe('geojson', () => {
  test('cellid', (t) => {
    // @todo: test other levels
    const faces: CellID[] = [
      randomCellIDForLevel(30),
      randomCellIDForLevel(30),
      randomCellIDForLevel(30),
      randomCellIDForLevel(30),
      randomCellIDForLevel(30),
      randomCellIDForLevel(30),
      randomCellIDForLevel(30)
    ]

    faces.forEach((cid) => {
      const encoded = cellid.marshal(cid)
      const decoded = cellid.unmarshal(encoded)
      equal(decoded, cid)
    })
  })
})
