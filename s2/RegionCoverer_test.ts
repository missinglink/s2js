import { test, describe } from 'node:test'
import { equal, deepEqual, fail } from 'node:assert/strict'
import { RegionCoverer, simpleRegionCovering } from './RegionCoverer'
import { randomCap, randomCellID, randomPoint, randomUniformInt, skewedInt } from './testing'
import { Cell } from './Cell'
import { Region } from './Region'
import { CellUnion } from './CellUnion'
import * as cellid from './cellid'
import type { CellID } from './cellid'
import { MAX_LEVEL } from './cellid_constants'
import { AvgAreaMetric } from './Metric_constants'

describe('s2.RegionCoverer', () => {
  test('random cells', () => {
    const rc = new RegionCoverer({ maxCells: 1 })

    for (let i = 0; i < 10000; i++) {
      const id = randomCellID()
      const covering = rc.covering(Cell.fromCellID(id))
      equal(covering.length, 1)
      equal(covering[0], id)
    }
  })

  function checkCovering(rc: RegionCoverer, r: Region, covering: CellUnion, interior: boolean) {
    const minLevelCells = new Map<CellID, number>()

    let tempCover = new CellUnion()

    covering.forEach((ci) => {
      const level = cellid.level(ci)
      if (level < rc.minLevel) {
        fail(`CellID(${cellid.toToken(ci)}).Level() = ${level}, want >= ${rc.minLevel}`)
      }
      if (level > rc.maxLevel) {
        fail(`CellID(${cellid.toToken(ci)}).Level() = ${level}, want <= ${rc.maxLevel}`)
      }
      if ((level - rc.minLevel) % rc.levelMod !== 0) {
        fail(
          `(CellID(${cellid.toToken(ci)}).Level() - minLevel) mod LevelMod = ${
            (level - rc.minLevel) % rc.levelMod
          }, want = 0`
        )
      }
      tempCover.push(ci)
      const parent = cellid.parent(ci, rc.minLevel)
      minLevelCells.set(parent, (minLevelCells.get(parent) || 0) + 1)
    })

    if (covering.length > rc.maxCells) {
      for (const ci in minLevelCells) {
        if (minLevelCells[ci] > 1) {
          fail(`Min level CellID ${ci}, count = ${minLevelCells[ci]}, want = 1`)
        }
      }
    }

    if (interior) {
      covering.forEach((ci) => {
        if (!r.containsCell(Cell.fromCellID(ci))) {
          fail(`Region(${r}).ContainsCell(${Cell.fromCellID(ci)}) = false, want = true`)
        }
      })
    } else {
      tempCover.normalize()
      checkCoveringTight(r, tempCover, true, 0n)
    }
  }

  function checkCoveringTight(r: Region, cover: CellUnion, checkTight: boolean, id: CellID) {
    if (!cellid.valid(id)) {
      for (let f = 0; f < 6; f++) {
        checkCoveringTight(r, cover, checkTight, cellid.fromFace(f))
      }
      return
    }

    if (!r.intersectsCell(Cell.fromCellID(id))) {
      if (checkTight && cover.intersectsCellID(id)) {
        fail(`CellUnion(${cover}).IntersectsCellID(${cellid.toToken(id)}) = true, want = false`)
      }
    } else if (!cover.containsCellID(id)) {
      if (r.containsCell(Cell.fromCellID(id))) {
        fail(`Region(${r}).ContainsCell(${Cell.fromCellID(id)}) = true, want = false`)
      }
      if (cellid.isLeaf(id)) {
        fail(`CellID(${cellid.toToken(id)}).IsLeaf() = true, want = false`)
      }

      for (let child = cellid.childBegin(id); child !== cellid.childEnd(id); child = cellid.next(child)) {
        checkCoveringTight(r, cover, checkTight, child)
      }
    }
  }

  test('random caps', () => {
    const rc = new RegionCoverer({ maxCells: 1 })
    for (let i = 0; i < 1000; i++) {
      rc.minLevel = randomUniformInt(rc.maxLevel + 1)
      rc.maxLevel = randomUniformInt(rc.maxLevel + 1)
      while (rc.minLevel > rc.maxLevel) {
        rc.minLevel = randomUniformInt(rc.maxLevel + 1)
        rc.maxLevel = randomUniformInt(rc.maxLevel + 1)
      }
      rc.levelMod = 1 + randomUniformInt(3)
      rc.maxCells = skewedInt(10)

      const maxArea = Math.min(4 * Math.PI, (3 * rc.maxCells + 1) * AvgAreaMetric.value(rc.minLevel))
      const r = randomCap(0.1 * AvgAreaMetric.value(MAX_LEVEL), maxArea)

      const covering = rc.covering(r)
      checkCovering(rc, r, covering, false)
      const interior = rc.interiorCovering(r)
      checkCovering(rc, r, interior, true)

      const covering2 = rc.covering(r)
      deepEqual(covering, covering2)

      covering.denormalize(rc.minLevel, rc.levelMod)
      checkCovering(rc, r, covering, false)
    }
  })

  test('interiorCovering', () => {
    const LEVEL = 12
    const smallCell = cellid.parent(cellid.fromPoint(randomPoint()), LEVEL + 2)
    const largeCell = cellid.parent(smallCell, LEVEL)

    const smallCellUnion = new CellUnion(...[smallCell])
    const largeCellUnion = new CellUnion(...[largeCell])
    const diff = CellUnion.fromDifference(largeCellUnion, smallCellUnion)

    const coverer = new RegionCoverer({ minLevel: LEVEL, maxLevel: LEVEL + 3, maxCells: 3 })

    const interior = coverer.interiorCovering(diff)
    equal(interior.length, 3)
    for (let i = 0; i < 3; i++) {
      equal(cellid.level(interior[i]), LEVEL + 1)
    }
  })

  test('simpleRegionCovering', () => {
    for (let i = 0; i < 100; i++) {
      const level = randomUniformInt(MAX_LEVEL + 1)
      const maxArea = Math.min(4 * Math.PI, 1000.0 * AvgAreaMetric.value(level))
      const c = randomCap(0.1 * AvgAreaMetric.value(MAX_LEVEL), maxArea)
      const covering = new CellUnion(...simpleRegionCovering(c, c.center, level))
      const rc = new RegionCoverer({ minLevel: level, maxLevel: level, maxCells: Number.MAX_SAFE_INTEGER })
      checkCovering(rc, c, covering, false)
    }
  })

  test('isCanonical', () => {
    const tests = [
      { cells: ['1/'], cov: new RegionCoverer(), want: true },
      { cells: ['invalid'], cov: new RegionCoverer(), want: false },
      { cells: ['1/1', '1/3'], cov: new RegionCoverer(), want: true },
      { cells: ['1/3', '1/1'], cov: new RegionCoverer(), want: false },
      { cells: ['1/2', '1/33'], cov: new RegionCoverer(), want: true },
      { cells: ['1/3', '1/33'], cov: new RegionCoverer(), want: false },
      {
        cells: ['1/31'],
        cov: new RegionCoverer({ minLevel: 2 }),
        want: true
      },
      {
        cells: ['1/3'],
        cov: new RegionCoverer({ minLevel: 2 }),
        want: false
      },
      {
        cells: ['1/31'],
        cov: new RegionCoverer({ maxLevel: 2 }),
        want: true
      },
      {
        cells: ['1/312'],
        cov: new RegionCoverer({ maxLevel: 2 }),
        want: false
      },
      {
        cells: ['1/31'],
        cov: new RegionCoverer({ levelMod: 2 }),
        want: true
      },
      {
        cells: ['1/312'],
        cov: new RegionCoverer({ levelMod: 2 }),
        want: false
      },
      {
        cells: ['1/1', '1/3'],
        cov: new RegionCoverer({ maxCells: 2 }),
        want: true
      },
      {
        cells: ['1/1', '1/3', '2/'],
        cov: new RegionCoverer({ maxCells: 2 }),
        want: false
      },
      {
        cells: ['1/123', '2/1', '3/0122'],
        cov: new RegionCoverer({ maxCells: 2 }),
        want: true
      },
      {
        cells: ['1/01', '1/02', '1/03', '1/10', '1/11'],
        cov: new RegionCoverer(),
        want: true
      },
      {
        cells: ['1/00', '1/01', '1/02', '1/03', '1/10'],
        cov: new RegionCoverer(),
        want: false
      },
      {
        cells: ['0/22', '1/01', '1/02', '1/03', '1/10'],
        cov: new RegionCoverer(),
        want: true
      },
      {
        cells: ['0/22', '1/00', '1/01', '1/02', '1/03'],
        cov: new RegionCoverer(),
        want: false
      },
      {
        cells: [
          '1/1101',
          '1/1102',
          '1/1103',
          '1/1110',
          '1/1111',
          '1/1112',
          '1/1113',
          '1/1120',
          '1/1121',
          '1/1122',
          '1/1123',
          '1/1130',
          '1/1131',
          '1/1132',
          '1/1133',
          '1/1200'
        ],
        cov: new RegionCoverer({ levelMod: 2, maxCells: 20 }),
        want: true
      },
      {
        cells: [
          '1/1100',
          '1/1101',
          '1/1102',
          '1/1103',
          '1/1110',
          '1/1111',
          '1/1112',
          '1/1113',
          '1/1120',
          '1/1121',
          '1/1122',
          '1/1123',
          '1/1130',
          '1/1131',
          '1/1132',
          '1/1133'
        ],
        cov: new RegionCoverer({ levelMod: 2, maxCells: 20 }),
        want: false
      }
    ]

    tests.forEach((test) => {
      const cu = new CellUnion(...test.cells.map(cellid.fromString))
      const got = test.cov.isCanonical(cu)
      equal(got, test.want)
    })
  })
})
