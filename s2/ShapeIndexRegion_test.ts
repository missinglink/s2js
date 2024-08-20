import { test, describe } from 'node:test'
import { equal, ok, deepEqual, fail } from 'node:assert/strict'
import type { CellID } from './cellid'
import * as cellid from './cellid'
import { Point } from './Point'
import { faceUVToXYZ } from './stuv'
import { FACE_CLIP_ERROR_UV_COORD, INTERSECTS_RECT_ERROR_UV_DIST } from './edge_clipping'
import { LaxLoop } from './LaxLoop'
import { ShapeIndex } from './ShapeIndex'
import { Cell } from './Cell'
import { CellUnion } from './CellUnion'

const SHAPE_INDEX_CELL_PADDING = 2 * (FACE_CLIP_ERROR_UV_COORD + INTERSECTS_RECT_ERROR_UV_DIST)

export const padCell = (id: CellID, paddingUV: number) => {
  const { f, i, j } = cellid.faceIJOrientation(id)
  const uv = cellid.ijLevelToBoundUV(i, j, cellid.level(id)).expandedByMargin(paddingUV)
  const vertices: Point[] = uv.vertices().map((v) => Point.fromVector(faceUVToXYZ(f, v.x, v.y).normalize()))
  return LaxLoop.fromPoints(vertices)
}

describe('s2.ShapeIndexRegion', () => {
  test('capBound', () => {
    const id = cellid.fromString('3/0123012301230123012301230123')

    const index = new ShapeIndex()
    index.add(padCell(id, -SHAPE_INDEX_CELL_PADDING))

    const cellBound = Cell.fromCellID(id).capBound()
    const indexBound = index.region().capBound()
    ok(indexBound.contains(cellBound), `${indexBound}.contains(${cellBound}) = false, want true`)

    const radiusRatio = 1.00001 * cellBound.radius()
    ok(indexBound.radius() <= radiusRatio, `${index}.capBound.Radius() = ${indexBound.radius()}, want ${radiusRatio}`)
  })

  test('rectBound', () => {
    const id = cellid.fromString('3/0123012301230123012301230123')

    const index = new ShapeIndex()
    index.add(padCell(id, -SHAPE_INDEX_CELL_PADDING))
    const cellBound = Cell.fromCellID(id).rectBound()
    const indexBound = index.region().rectBound()

    // @todo missinglink should be exact equal
    ok(indexBound.approxEqual(cellBound), `${index}.rectBound() = ${indexBound}, want ${cellBound}`)
  })

  test('cellUnionBound multiple faces', () => {
    const have = new CellUnion(cellid.fromString('3/00123'), cellid.fromString('2/11200013'))

    const index = new ShapeIndex()
    for (const id of have) {
      index.add(padCell(id, -SHAPE_INDEX_CELL_PADDING))
    }

    const got = new CellUnion(...index.region().cellUnionBound())

    have.sort()

    ok(have.equals(got), `${index}.cellUnionBound() = ${got}, want ${have}`)
  })

  test('cellUnionBound one face', () => {
    const have = [
      cellid.fromString('5/010'),
      cellid.fromString('5/0211030'),
      cellid.fromString('5/110230123'),
      cellid.fromString('5/11023021133'),
      cellid.fromString('5/311020003003030303'),
      cellid.fromString('5/311020023')
    ]

    const want = new CellUnion(cellid.fromString('5/0'), cellid.fromString('5/110230'), cellid.fromString('5/3110200'))

    const index = new ShapeIndex()
    for (const id of have) {
      index.add(padCell(id, -SHAPE_INDEX_CELL_PADDING))
      index.add(padCell(id, -SHAPE_INDEX_CELL_PADDING))
      index.add(padCell(id, -SHAPE_INDEX_CELL_PADDING))
    }

    have.sort()

    const got = new CellUnion(...index.region().cellUnionBound())
    ok(want.equals(got), `${index}.cellUnionBound() = ${got}, want ${want}`)
  })
})
