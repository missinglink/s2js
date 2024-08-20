import { test, describe } from 'node:test'
import { equal, deepEqual } from 'node:assert/strict'
import { LaxLoop } from './LaxLoop'
import { parsePoints } from './testing_textformat'
import { Point } from './Point'
import { Loop } from './Loop'

describe('s2.LaxLoop', () => {
  test('empty loop', () => {
    const shape = LaxLoop.fromLoop(Loop.emptyLoop())

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 0)
    equal(shape.dimension(), 2)
    equal(shape.isEmpty(), true)
    equal(shape.isFull(), false)
    equal(shape.referencePoint().contained, false)
  })

  test('non-empty loop', () => {
    const vertices: Point[] = parsePoints('0:0, 0:1, 1:1, 1:0')
    const shape = LaxLoop.fromPoints(vertices)

    equal(shape.vertices.length, vertices.length)
    equal(shape.numEdges(), vertices.length)
    equal(shape.numChains(), 1)
    equal(shape.chain(0).start, 0)
    equal(shape.chain(0).length, vertices.length)

    for (let i = 0; i < vertices.length; i++) {
      deepEqual(shape.vertex(i), vertices[i])
      const edge = shape.edge(i)
      deepEqual(edge.v0, vertices[i])
      deepEqual(edge.v1, vertices[(i + 1) % vertices.length])
    }

    equal(shape.dimension(), 2)
    equal(shape.isEmpty(), false)
    equal(shape.isFull(), false)
    equal(shape.referencePoint().contained, false)
  })
})
