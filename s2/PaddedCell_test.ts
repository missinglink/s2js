import { test, describe } from 'node:test'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { PaddedCell } from './PaddedCell'
import { Point as R2Point } from '../r2/Point'
import { Rect as R2Rect } from '../r2/Rect'
import { Interval as R1Interval } from '../r1/Interval'
import * as cellid from './cellid'
import { oneIn, randomCellID, randomFloat64, randomUniformFloat64, randomUniformInt } from './testing'
import { Cell } from './Cell'

describe('s2.PaddedCell', () => {
  test('methods', () => {
    for (let i = 0; i < 1000; i++) {
      const cid = randomCellID()
      const padding = Math.pow(1e-15, randomFloat64())
      const cell = Cell.fromCellID(cid)
      const pCell = PaddedCell.fromCellID(cid, padding)
      equal(cell.id, pCell.cellID())
      equal(cellid.level(cell.id), pCell.levelValue())
      equal(padding, pCell.paddingValue())
      deepEqual(pCell.boundRect(), cell.boundUV().expandedByMargin(padding))
      const r = R2Rect.fromPoints(cellid.centerUV(cell.id)).expandedByMargin(padding)
      deepEqual(pCell.middleRect(), r)
      deepEqual(cellid.point(cell.id), pCell.center())
      if (cellid.isLeaf(cid)) continue
      const children = cell.children()
      for (let pos = 0; pos < 4; pos++) {
        const [i, j] = pCell.childIJ(pos)
        const cellChild = children[pos]
        const pCellChild = PaddedCell.fromParentIJ(pCell, i, j)
        equal(cellChild.id, pCellChild.cellID())
        equal(cellid.level(cellChild.id), pCellChild.levelValue())
        equal(padding, pCellChild.paddingValue())
        deepEqual(pCellChild.boundRect(), cellChild.boundUV().expandedByMargin(padding))
        const r = R2Rect.fromPoints(cellid.centerUV(cellChild.id)).expandedByMargin(padding)
        ok(r.approxEqual(pCellChild.middleRect()))
        deepEqual(cellid.point(cellChild.id), pCellChild.center())
      }
    }
  })

  test('entry/exit vertices', () => {
    for (let i = 0; i < 1000; i++) {
      const id = randomCellID()
      const unpadded = PaddedCell.fromCellID(id, 0)
      const padded = PaddedCell.fromCellID(id, 0.5)
      deepEqual(unpadded.entryVertex(), padded.entryVertex())
      deepEqual(unpadded.exitVertex(), padded.exitVertex())
      deepEqual(PaddedCell.fromCellID(cellid.nextWrap(id), 0).entryVertex(), unpadded.exitVertex())
      if (!cellid.isLeaf(id)) {
        deepEqual(PaddedCell.fromCellID(cellid.children(id)[0], 0).entryVertex(), unpadded.entryVertex())
        deepEqual(PaddedCell.fromCellID(cellid.children(id)[3], 0).exitVertex(), unpadded.exitVertex())
      }
    }
  })

  test('shrinkToFit', () => {
    for (let iter = 0; iter < 1000; iter++) {
      const result = randomCellID()
      const resultUV = cellid.boundUV(result)
      const sizeUV = resultUV.size()
      const maxPadding = 0.5 * Math.min(sizeUV.x, sizeUV.y)
      const padding = maxPadding * randomFloat64()
      const maxRect = resultUV.expandedByMargin(-padding)
      const a = new R2Point(
        randomUniformFloat64(maxRect.x.lo, maxRect.x.hi),
        randomUniformFloat64(maxRect.y.lo, maxRect.y.hi)
      )
      const b = new R2Point(
        randomUniformFloat64(maxRect.x.lo, maxRect.x.hi),
        randomUniformFloat64(maxRect.y.lo, maxRect.y.hi)
      )
      if (!cellid.isLeaf(result)) {
        const useY = oneIn(2)
        let center = cellid.centerUV(result).x
        if (useY) center = cellid.centerUV(result).y
        const shared = new R1Interval(center - padding, center + padding)
        const intersected = useY ? shared.intersection(maxRect.y) : shared.intersection(maxRect.x)
        const mid = randomUniformFloat64(intersected.lo, intersected.hi)
        if (useY) {
          a.y = randomUniformFloat64(maxRect.y.lo, mid)
          b.y = randomUniformFloat64(mid, maxRect.y.hi)
        } else {
          a.x = randomUniformFloat64(maxRect.x.lo, mid)
          b.x = randomUniformFloat64(mid, maxRect.x.hi)
        }
      }
      const rect = R2Rect.fromPoints(a, b)
      const initialID = cellid.parent(result, randomUniformInt(cellid.level(result) + 1))
      const pCell = PaddedCell.fromCellID(initialID, padding)
      equal(pCell.shrinkToFit(rect), result)
    }
  })
})
