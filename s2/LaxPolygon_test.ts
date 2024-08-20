import { test, describe } from 'node:test'
import { equal, ok, deepEqual } from 'node:assert/strict'
import { LaxPolygon } from './LaxPolygon'
import { Point } from './Point'
import { parsePoints } from './testing_textformat'
import { containsBruteForce } from './shapeutil'

describe('s2.LaxPolygon', () => {
  // test('shape empty polygon', () => {
  //   const shape = LaxPolygon.fromPolygon(new Polygon())
  //   equal(shape.numLoops, 0)
  //   equal(shape.numVertices(), 0)
  //   equal(shape.numEdges(), 0)
  //   equal(shape.numChains(), 0)
  //   equal(shape.dimension(), 2)
  //   ok(shape.isEmpty())
  //   ok(!shape.isFull())
  //   ok(!shape.referencePoint().contained)
  // })

  // test('full', () => {
  //   const shape = LaxPolygon.fromPolygon(Polygon.polygonFromLoops([makeLoop('full')]))
  //   equal(shape.numLoops, 1)
  //   equal(shape.numVertices(), 0)
  //   equal(shape.numEdges(), 0)
  //   equal(shape.numChains(), 1)
  //   equal(shape.dimension(), 2)
  //   ok(!shape.isEmpty())
  //   ok(shape.isFull())
  //   ok(shape.referencePoint().contained)
  // })

  // test('single vertex polygon', () => {
  //   const loops: Point[][] = [parsePoints('0:0')]

  //   const shape = LaxPolygon.fromPoints(loops)
  //   equal(shape.numLoops, 1)
  //   equal(shape.numVertices(), 1)
  //   equal(shape.numEdges(), 1)
  //   equal(shape.numChains(), 1)
  //   equal(shape.chain(0).start, 0)
  //   equal(shape.chain(0).length, 1)

  //   const edge = shape.edge(0)
  //   equal(edge.v0, loops[0][0])
  //   equal(edge.v1, loops[0][0])
  //   deepEqual(edge, shape.chainEdge(0, 0))
  //   equal(shape.dimension(), 2)
  //   ok(!shape.isEmpty())
  //   ok(!shape.isFull())
  //   ok(!shape.referencePoint().contained)
  // })

  // test('shape single loop polygon', () => {
  //   const vertices = parsePoints('0:0, 0:1, 1:1, 1:0')
  //   const lenVerts = vertices.length
  //   const shape = LaxPolygon.fromPolygon(Polygon.polygonFromLoops([Loop.loopFromPoints(vertices)]))

  //   equal(shape.numLoops, 1)
  //   equal(shape.numVertices(), lenVerts)
  //   equal(shape.numLoopVertices(0), lenVerts)
  //   equal(shape.numEdges(), lenVerts)
  //   equal(shape.numChains(), 1)
  //   equal(shape.chain(0).start, 0)
  //   equal(shape.chain(0).length, lenVerts)

  //   for (let i = 0; i < lenVerts; i++) {
  //     equal(shape.loopVertex(0, i), vertices[i])

  //     const edge = shape.edge(i)
  //     equal(edge.v0, vertices[i])
  //     equal(edge.v1, vertices[(i + 1) % lenVerts])
  //     equal(shape.chainEdge(0, i).v0, edge.v0)
  //     equal(shape.chainEdge(0, i).v1, edge.v1)
  //   }
  //   equal(shape.dimension(), 2)
  //   ok(!shape.isEmpty())
  //   ok(!shape.isFull())
  //   ok(!containsBruteForce(shape, Point.originPoint()))
  // })

  test('shape multi loop polygon', () => {
    const loops: Point[][] = [
      parsePoints('0:0, 0:3, 3:3'), // CCW
      parsePoints('1:1, 2:2, 1:2') // CW
    ]
    const lenLoops = loops.length
    const shape = LaxPolygon.fromPoints(loops)

    equal(shape.numLoops, lenLoops)
    equal(shape.numChains(), lenLoops)

    let numVertices = 0
    for (let i = 0; i < lenLoops; i++) {
      const loop = loops[i]
      equal(shape.numLoopVertices(i), loop.length)
      equal(shape.chain(i).start, numVertices)
      equal(shape.chain(i).length, loop.length)
      for (let j = 0; j < loop.length; j++) {
        equal(shape.loopVertex(i, j), loop[j])
        const edge = shape.edge(numVertices + j)
        equal(edge.v0, loop[j])
        equal(edge.v1, loop[(j + 1) % loop.length])
      }
      numVertices += loop.length
    }

    equal(shape.numVertices(), numVertices)
    equal(shape.numEdges(), numVertices)
    equal(shape.dimension(), 2)
    ok(!shape.isEmpty())
    ok(!shape.isFull())
    ok(!containsBruteForce(shape, Point.originPoint()))
  })

  test('shape degenerate loops', () => {
    const loops: Point[][] = [
      parsePoints('1:1, 1:2, 2:2, 1:2, 1:3, 1:2, 1:1'),
      parsePoints('0:0, 0:3, 0:6, 0:9, 0:6, 0:3, 0:0'),
      parsePoints('5:5, 6:6')
    ]

    const shape = LaxPolygon.fromPoints(loops)
    ok(!shape.referencePoint().contained)
  })

  test('shape inverted loops', () => {
    const loops: Point[][] = [parsePoints('1:2, 1:1, 2:2'), parsePoints('3:4, 3:3, 4:4')]
    const shape = LaxPolygon.fromPoints(loops)

    ok(containsBruteForce(shape, Point.originPoint()))
  })
})
