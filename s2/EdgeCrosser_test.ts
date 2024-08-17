import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { nextAfter } from '../r1/math'
import { Point } from './Point'
import { CROSS, Crossing, DO_NOT_CROSS, MAYBE_CROSS } from './edge_crossings'
import { EdgeCrosser } from './EdgeCrosser'

test('crossings', () => {
  const NA1 = nextAfter(1, 0)
  const NA2 = nextAfter(1, 2)

  const tests = [
    {
      msg: 'two regular edges that cross',
      a: new Point(1, 2, 1),
      b: new Point(1, -3, 0.5),
      c: new Point(1, -0.5, -3),
      d: new Point(0.1, 0.5, 3),
      robust: CROSS,
      edgeOrVertex: true
    },
    {
      msg: 'two regular edges that intersect antipodal points',
      a: new Point(1, 2, 1),
      b: new Point(1, -3, 0.5),
      c: new Point(-1, 0.5, 3),
      d: new Point(-0.1, -0.5, -3),
      robust: DO_NOT_CROSS,
      edgeOrVertex: false
    },
    {
      msg: 'two edges on the same great circle that start at antipodal points',
      a: new Point(0, 0, -1),
      b: new Point(0, 1, 0),
      c: new Point(0, 0, 1),
      d: new Point(0, 1, 1),
      robust: DO_NOT_CROSS,
      edgeOrVertex: false
    },
    {
      msg: 'two edges that cross where one vertex is the OriginPoint',
      a: new Point(1, 0, 0),
      b: Point.originPoint(),
      c: new Point(1, -0.1, 1),
      d: new Point(1, 1, -0.1),
      robust: CROSS,
      edgeOrVertex: true
    },
    {
      msg: 'two edges that intersect antipodal points where one vertex is the OriginPoint',
      a: new Point(1, 0, 0),
      b: Point.originPoint(),
      c: new Point(1, 0.1, -1),
      d: new Point(1, 1, -0.1),
      robust: DO_NOT_CROSS,
      edgeOrVertex: false
    },
    {
      msg: 'two edges that cross antipodal points',
      a: new Point(1, 0, 0),
      b: new Point(0, 1, 0),
      c: new Point(0, 0, -1),
      d: new Point(-1, -1, 1),
      robust: DO_NOT_CROSS,
      edgeOrVertex: false
    },
    {
      msg: 'two edges that share an endpoint',
      a: new Point(2, 3, 4),
      b: new Point(-1, 2, 5),
      c: new Point(7, -2, 3),
      d: new Point(2, 3, 4),
      robust: MAYBE_CROSS,
      edgeOrVertex: false
    },
    {
      msg: 'two edges that barely cross near the middle of one edge',
      a: new Point(1, 1, 1),
      b: new Point(1, NA1, -1),
      c: new Point(11, -12, -1),
      d: new Point(10, 10, 1),
      robust: CROSS,
      edgeOrVertex: true
    },
    {
      msg: 'two edges that barely cross near the middle separated by a distance of about 1e-15',
      a: new Point(1, 1, 1),
      b: new Point(1, NA2, -1),
      c: new Point(1, -1, 0),
      d: new Point(1, 1, 0),
      robust: DO_NOT_CROSS,
      edgeOrVertex: false
    },
    {
      msg: 'two edges that barely cross each other near the end of both edges',
      a: new Point(0, 0, 1),
      b: new Point(2, -1e-323, 1),
      c: new Point(1, -1, 1),
      d: new Point(1e-323, 0, 1),
      robust: CROSS,
      edgeOrVertex: true
    },
    {
      msg: 'two edges that barely cross each other near the end separated by a distance of about 1e-640',
      a: new Point(0, 0, 1),
      b: new Point(2, 1e-323, 1),
      c: new Point(1, -1, 1),
      d: new Point(1e-323, 0, 1),
      robust: DO_NOT_CROSS,
      edgeOrVertex: false
    },
    {
      msg: 'two edges that barely cross each other near the middle of one edge',
      a: new Point(1, -1e-323, -1e-323),
      b: new Point(1e-323, 1, 1e-323),
      c: new Point(1, -1, 1e-323),
      d: new Point(1, 1, 0),
      robust: CROSS,
      edgeOrVertex: true
    },
    {
      msg: 'two edges that barely cross each other near the middle separated by a distance of about 1e-640',
      a: new Point(1, 1e-323, -1e-323),
      b: new Point(-1e-323, 1, 1e-323),
      c: new Point(1, -1, 1e-323),
      d: new Point(1, 1, 0),
      robust: DO_NOT_CROSS,
      edgeOrVertex: false
    }
  ]

  tests.forEach((test) => {
    const a = Point.fromVector(test.a.vector.normalize())
    const b = Point.fromVector(test.b.vector.normalize())
    const c = Point.fromVector(test.c.vector.normalize())
    const d = Point.fromVector(test.d.vector.normalize())

    testCrossing(test.msg, a, b, c, d, test.robust, test.edgeOrVertex)
    testCrossing(test.msg, b, a, c, d, test.robust, test.edgeOrVertex)
    testCrossing(test.msg, a, b, d, c, test.robust, test.edgeOrVertex)
    testCrossing(test.msg, b, a, d, c, test.robust, test.edgeOrVertex)

    // test degenerate cases
    testCrossing(test.msg, a, a, c, d, DO_NOT_CROSS, false)
    testCrossing(test.msg, a, b, c, c, DO_NOT_CROSS, false)
    testCrossing(test.msg, a, a, c, c, DO_NOT_CROSS, false)

    testCrossing(test.msg, a, b, a, b, MAYBE_CROSS, true)
    testCrossing(test.msg, c, d, a, b, test.robust, test.edgeOrVertex !== (test.robust === MAYBE_CROSS))
  })
})

function testCrossing(msg: string, a: Point, b: Point, c: Point, d: Point, robust: Crossing, edgeOrVertex: boolean) {
  if (a.equals(c) || a.equals(d) || b.equals(c) || b.equals(d)) {
    robust = MAYBE_CROSS
  }

  const input = `${msg}: a: ${a}, b: ${b}, c: ${c}, d: ${d}`

  const crosser = EdgeCrosser.newChainEdgeCrosser(a, b, c)
  assert.equal(crosser.chainCrossingSign(d), robust, `${input}, ChainCrossingSign(d)`)
  assert.equal(crosser.chainCrossingSign(c), robust, `${input}, ChainCrossingSign(c)`)
  assert.equal(crosser.crossingSign(d, c), robust, `${input}, CrossingSign(d, c)`)
  assert.equal(crosser.crossingSign(c, d), robust, `${input}, CrossingSign(c, d)`)

  crosser.restartAt(c)
  assert.equal(crosser.edgeOrVertexChainCrossing(d), edgeOrVertex, `${input}, EdgeOrVertexChainCrossing(d)`)
  assert.equal(crosser.edgeOrVertexChainCrossing(c), edgeOrVertex, `${input}, EdgeOrVertexChainCrossing(c)`)
  assert.equal(crosser.edgeOrVertexCrossing(d, c), edgeOrVertex, `${input}, EdgeOrVertexCrossing(d, c)`)
  assert.equal(crosser.edgeOrVertexCrossing(c, d), edgeOrVertex, `${input}, EdgeOrVertexCrossing(c, d)`)
}
