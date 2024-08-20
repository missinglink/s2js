import { test, describe } from 'node:test'
import { equal, deepEqual } from 'node:assert/strict'
import { EdgeVectorShape } from './EdgeVectorShape'
import { Point } from './Point'

describe('s2.EdgeVectorShape', () => {
  test('empty', () => {
    const shape = new EdgeVectorShape()

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 0)
    equal(shape.dimension(), 1)
    equal(shape.isEmpty(), true)
    equal(shape.isFull(), false)
    equal(shape.referencePoint().contained, false)
  })

  test('singleton constructor', () => {
    const a = Point.fromCoords(1, 0, 0)
    const b = Point.fromCoords(0, 1, 0)

    const shape = EdgeVectorShape.fromPoints(a, b)

    equal(shape.numEdges(), 1)
    equal(shape.numChains(), 1)

    const edge = shape.edge(0)
    deepEqual(edge.v0, a)
    deepEqual(edge.v1, b)
    equal(shape.isEmpty(), false)
    equal(shape.isFull(), false)
  })
})
