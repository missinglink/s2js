import { test, describe } from 'node:test'
import { equal, notEqual, ok, deepEqual } from 'node:assert/strict'
import { CELL_PADDING, DISJOINT, INDEXED, maxLevelForEdge, ShapeIndex, SUBDIVIDED } from './ShapeIndex'
import { Edge, NilShape } from './Shape'
import { Point } from './Point'
import { ShapeIndexCell } from './ShapeIndexCell'
import { NilShapeIndexClippedShape, ShapeIndexClippedShape } from './ShapeIndexClippedShape'
import { clipToPaddedFace, edgeIntersectsRect, INTERSECTS_RECT_ERROR_UV_DIST } from './edge_clipping'
import { containsBruteForce } from './shapeutil'
import { MAX_LEVEL } from './cellid_constants'
import * as cellid from './cellid'
import { CellUnion } from './CellUnion'
import { makePolyline, makeShapeIndex } from './testing_textformat'
import { EdgeVectorShape } from './EdgeVectorShape'
import { Cell } from './Cell'
import { ITERATOR_END, ShapeIndexIterator } from './ShapeIndexIterator'
import type { CellID } from './cellid'
import { Loop } from './Loop'
import { DEGREE } from '../s1/angle_constants'

describe('s2.ShapeIndex', () => {
  test('basics', () => {
    const index = new ShapeIndex()
    const s = new EdgeVectorShape()

    equal(index.len(), 0)
    index.add(s)
    notEqual(index.len(), 0)
    index.reset()
    equal(index.len(), 0)
  })

  test('comparisons', () => {
    const tests = [
      {
        a: new Edge(Point.fromCoords(-1, 0, 0), Point.fromCoords(0, 0, 0)),
        b: new Edge(Point.fromCoords(0, 0, 0), Point.fromCoords(0, 0, 0)),
        want: -1
      },
      {
        a: new Edge(Point.fromCoords(0, 2, 0), Point.fromCoords(0, 0, 5)),
        b: new Edge(Point.fromCoords(0, 2, 0), Point.fromCoords(0, 0, 5)),
        want: 0
      },
      {
        a: new Edge(Point.fromCoords(1, 0, 0), Point.fromCoords(-6, 7, 8)),
        b: new Edge(Point.fromCoords(0, 0, 0), Point.fromCoords(1, 3, 5)),
        want: 1
      },
      {
        a: new Edge(Point.fromCoords(5, -2, -0.4), Point.fromCoords(-1, 0, 0)),
        b: new Edge(Point.fromCoords(5, -2, -0.4), Point.fromCoords(0, -1, -1)),
        want: -1
      },
      {
        a: new Edge(Point.fromCoords(9, 8, 7), Point.fromCoords(12, 3, -4)),
        b: new Edge(Point.fromCoords(9, 8, 7), Point.fromCoords(12, 3, -4)),
        want: 0
      },
      {
        a: new Edge(Point.fromCoords(-11, 7.2, -4.6), Point.fromCoords(0, 1, 0)),
        b: new Edge(Point.fromCoords(-11, 7.2, -4.6), Point.fromCoords(0, 0, 0.9)),
        want: 1
      }
    ]

    tests.forEach((test) => {
      equal(test.a.cmp(test.b), test.want)
    })
  })

  test('basics', () => {
    const s = new ShapeIndexCell(0)
    equal(s.shapes.length, 0)

    const c1 = new ShapeIndexClippedShape(0, 0)
    s.add(c1)

    const c2 = new ShapeIndexClippedShape(7, 1)
    s.add(c2)

    const c3 = new ShapeIndexClippedShape(0, 0)
    s.add(c3)

    equal(s.shapes[1], c2)
    equal(s.findByShapeID(7), c2)
  })

  function validateEdge(a: Point, b: Point, ci: CellID, hasEdge: boolean) {
    // Expand or shrink the padding slightly to account for errors in the
    // function we use to test for intersection (IntersectsRect).
    let padding = CELL_PADDING
    let sign = 1.0
    if (!hasEdge) {
      sign = -1
    }
    padding += sign * INTERSECTS_RECT_ERROR_UV_DIST
    const bound = cellid.boundUV(ci).expandedByMargin(padding)
    const [aUV, bUV, ok] = clipToPaddedFace(a, b, cellid.face(ci), padding)

    equal(ok && edgeIntersectsRect(aUV!, bUV!, bound), hasEdge)
  }

  function validateInterior(shape, ci, indexContainsCenter) {
    if (shape === null) {
      equal(indexContainsCenter, false)
      return
    }
    equal(containsBruteForce(shape, cellid.point(ci)), indexContainsCenter)
  }

  // quadraticValidate verifies that that every cell of the index contains the correct
  // edges, and that no cells are missing from the index.  The running time of this
  // function is quadratic in the number of edges.
  function quadraticValidate(index: ShapeIndex) {
    // Iterate through a sequence of nonoverlapping cell ids that cover the
    // sphere and include as a subset all the cell ids used in the index.  For
    // each cell id, verify that the expected set of edges is present.
    // "minCellID" is the first CellID that has not been validated yet.
    let minCellID = cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL)
    for (const it = index.iterator(); !it.done(); it.next()) {
      let skipped: CellUnion
      if (!it.done()) {
        const cellID = it.cellID()
        ok(cellID >= minCellID)
        skipped = CellUnion.fromRange(minCellID, cellid.rangeMin(cellID))
        minCellID = cellid.next(cellid.rangeMax(cellID))
      } else {
        skipped = CellUnion.fromRange(minCellID, cellid.childEndAtLevel(cellid.fromFace(5), MAX_LEVEL))
      }

      let shortEdges = 0
      index.shapes.forEach((shape, id) => {
        skipped.forEach((skippedCell) => validateInterior(shape, skippedCell, false))

        let clipped: ShapeIndexClippedShape | NilShapeIndexClippedShape = new NilShapeIndexClippedShape()
        if (!it.done()) {
          clipped = it.indexCell().findByShapeID(id)
          const containsCenter = clipped !== null && clipped.containsCenter
          validateInterior(shape, it.cellID(), containsCenter)
        }

        if (shape instanceof NilShape) {
          ok(clipped instanceof NilShapeIndexClippedShape, 'clipped should be nil when shape is nil')
          return
        }

        for (let e = 0; e < shape.numEdges(); e++) {
          const edge = shape.edge(e)
          skipped.forEach((skippedCell) => validateEdge(edge.v0, edge.v1, skippedCell, false))

          if (!it.done()) {
            const hasEdge = clipped !== null && clipped.containsEdge(e)
            validateEdge(edge.v0, edge.v1, it.cellID(), hasEdge)
            if (hasEdge && cellid.level(it.cellID()) < maxLevelForEdge(edge)) {
              shortEdges++
            }
          }
        }
      })

      ok(shortEdges <= index.maxEdgesPerCell)
    }
  }

  test('no edges', () => {
    const index = new ShapeIndex()
    const iter = index.iterator()
    ok(iter.done())
    testIteratorMethods(index)
  })

  test('one edge', () => {
    const index = new ShapeIndex()
    const e = EdgeVectorShape.fromPoints(Point.fromCoords(1, 0, 0), Point.fromCoords(0, 1, 0))
    equal(index.add(e), 0)
    quadraticValidate(index)
    testIteratorMethods(index)
  })

  test('many identical edges', () => {
    const NUM_EDGES = 100
    const a = Point.fromCoords(0.99, 0.99, 1)
    const b = Point.fromCoords(-0.99, -0.99, 1)

    const index = new ShapeIndex()
    for (let i = 0; i < NUM_EDGES; i++) {
      equal(index.add(EdgeVectorShape.fromPoints(a, b)), i)
    }
    quadraticValidate(index)
    testIteratorMethods(index)

    const it = index.iterator()
    for (; !it.done(); it.next()) {
      equal(cellid.level(it.cellID()), 0)
    }
  })

  test('degenerate edge', () => {
    // This test verifies that degenerate edges are supported.  The following
    // point is a cube face vertex, and so it should be indexed in 3 cells.
    const a = Point.fromCoords(1, 1, 1)
    const shape = EdgeVectorShape.fromPoints(a, a)
    const index = new ShapeIndex()
    index.add(shape)
    quadraticValidate(index)

    // Check that exactly 3 index cells contain the degenerate edge.
    let count = 0
    for (const it = index.iterator(); !it.done(); it.next()) {
      ok(cellid.isLeaf(it.cellID()))
      equal(it.indexCell().shapes.length, 1)
      equal(it.indexCell().shapes[0].edges.length, 1)
      count++
    }
    equal(count, 3)
  })

  test('many tiny edges', () => {
    const a = cellid.point(cellid.fromPoint(Point.fromCoords(1, 0, 0)))
    const b = Point.fromVector(a.vector.add(new Point(0, 1e-12, 0).vector).normalize())
    const shape = new EdgeVectorShape()
    for (let i = 0; i < 100; i++) {
      shape.add(a, b)
    }

    const index = new ShapeIndex()
    index.add(shape)
    quadraticValidate(index)

    const it = index.iterator()
    ok(!it.done())
    ok(cellid.isLeaf(it.cellID()))
    it.next()
    ok(it.done())
  })

  test('shrink to fit optimization', () => {
    const loop = Loop.regularLoop(Point.fromCoords(1, 0.5, 0.5), DEGREE * 89, 100)
    const index = new ShapeIndex()
    index.add(loop)
    quadraticValidate(index)
  })

  test('mixed geometry', () => {
    // This test used to trigger a bug where the presence of a shape with an
    // interior could cause shapes that don't have an interior to suddenly
    // acquire one. This would cause extra ShapeIndex cells to be created
    // that are outside the bounds of the given geometry.
    const index = new ShapeIndex()
    index.add(makePolyline('0:0, 2:1, 0:2, 2:3, 0:4, 2:5, 0:6'))
    index.add(makePolyline('1:0, 3:1, 1:2, 3:3, 1:4, 3:5, 1:6'))
    index.add(makePolyline('2:0, 4:1, 2:2, 4:3, 2:4, 4:5, 2:6'))

    const cid = cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL)
    const loop = Loop.fromCell(Cell.fromCellID(cid))

    index.add(loop)
    const it = index.iterator()

    // No geometry intersects face 1, so there should be no index cells there.
    const c = cellid.fromFace(1)
    equal(it.locateCellID(c), DISJOINT)
  })

  // test('loop apanning three faces', () => {
  //   const NUM_EDGES = 100
  //   const polygon = concentricLoopsPolygon(Point.fromCoords(1, -1, -1), 2, NUM_EDGES)
  //   const index = new ShapeIndex()
  //   polygon.loops.forEach((loop) => index.add(loop))
  //   quadraticValidate(index)
  //   testIteratorMethods(index)
  // })

  test('num edges upto', () => {
    const index = makeShapeIndex('0:0 | 0:1 | 0:2 | 0:3 | 0:4 # 1:0, 1:1 | 1:2, 1:3 | 1:4, 1:5, 1:6 #')
    equal(index.shapes.size, 4)

    const numEdgesTests = [
      { shapeID: 0, want: 5 },
      { shapeID: 1, want: 1 },
      { shapeID: 2, want: 1 },
      { shapeID: 3, want: 2 }
    ]

    numEdgesTests.forEach((test) => {
      equal(index.shape(test.shapeID).numEdges(), test.want)
    })

    equal(index.numEdges(), 9)

    const countTests = [
      { limit: 1, want: 5 },
      { limit: 5, want: 5 },
      { limit: 6, want: 6 },
      { limit: 8, want: 9 }
    ]

    countTests.forEach((test) => {
      equal(index.numEdgesUpTo(test.limit), test.want)
    })
  })
})

function testIteratorMethods(index: ShapeIndex) {
  const it = index.iterator()

  equal(it.prev(), false, 'new iterator should not be able to go backwards')

  it.end()
  equal(it.done(), true, 'iterator positioned at end should report as done')

  const ids: CellID[] = []
  let minCellID = cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL)

  for (it.begin(); !it.done(); it.next()) {
    const ci = it.cellID()
    const skipped = CellUnion.fromRange(minCellID, cellid.rangeMin(ci))

    let it2 = new ShapeIndexIterator(index, ITERATOR_END)
    for (let i = 0; i < skipped.length; i++) {
      equal(
        it2.locatePoint(cellid.point(skipped[i])),
        false,
        `iterator should not have been able to find the cell ${cellid.point(skipped[i])}`
      )

      equal(it2.locateCellID(skipped[i]), DISJOINT, `CellID location should be DISJOINT for non-existent entry`)
      it2.begin()
      it2.seek(skipped[i])
      equal(it2.cellID(), ci, 'seeking the current cell in the skipped list should match the current CellID')
    }

    if (ids.length !== 0) {
      const prevCell = ids[ids.length - 1]
      it2 = it.clone()
      equal(it2.prev(), true, 'should have been able to go back because there are cells')
      equal(
        it2.cellID(),
        prevCell,
        'ShapeIndexIterator should be positioned at the beginning and not equal to last entry'
      )

      it2.next()
      equal(it2.cellID(), ci, 'advancing back one spot should give us the current cell')

      it2.seek(prevCell)
      equal(
        it2.cellID(),
        prevCell,
        `seek from beginning for the first previous cell ${prevCell} should not give us the current cell ${it.cellID()}`
      )
    }

    it2.begin()
    deepEqual(
      cellid.point(ci),
      it.center(),
      'point at center of current position should equal center of the current CellID'
    )

    equal(
      it2.locatePoint(it.center()),
      true,
      'it.LocatePoint(it.Center()) should have been able to locate the point it is currently at'
    )
    equal(it2.cellID(), ci, 'CellID of the Point we just located should be equal')

    it2.begin()
    equal(it2.locateCellID(ci), INDEXED, `it.LocateCellID(${ci}) = ${it2.locateCellID(ci)}, want ${INDEXED}`)
    equal(it2.cellID(), ci, 'CellID of the CellID we just located should match')

    if (!cellid.isFace(ci)) {
      it2.begin()
      equal(
        it2.locateCellID(cellid.immediateParent(ci)),
        SUBDIVIDED,
        `it2.LocateCellID(${cellid.immediateParent(ci)}) = ${it2.locateCellID(
          cellid.immediateParent(ci)
        )}, want ${SUBDIVIDED}`
      )
      ok(it2.cellID() <= ci, 'CellID of the immediate parent should be above the current cell')
      ok(
        it2.cellID() >= cellid.rangeMin(cellid.immediateParent(ci)),
        'CellID of the current position should fall below the RangeMin of the parent'
      )
    }

    if (!cellid.isLeaf(ci)) {
      for (let i = 0; i < 4; i++) {
        it2.begin()
        equal(
          it2.locateCellID(cellid.children(ci)[i]),
          INDEXED,
          `it2.LocateCellID(${ci}.Children[${i}]) = ${it2.locateCellID(cellid.children(ci)[i])}, want ${INDEXED}`
        )
        equal(it2.cellID(), ci, 'it2.CellID() should match the original CellID')
      }
    }

    ids.push(ci)
    minCellID = cellid.next(cellid.rangeMax(ci))
  }
}
