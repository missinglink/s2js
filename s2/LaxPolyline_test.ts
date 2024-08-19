import { test, describe } from 'node:test'
import { ok, equal } from 'node:assert/strict'
import { LaxPolyline } from './LaxPolyline'
import { Point } from './Point'
import { parsePoints } from './testing_textformat'

describe('s2.LaxPolyline', () => {
  test('no vertices', () => {
    const shape = new LaxPolyline([])

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 0)
    equal(shape.dimension(), 1)
    equal(shape.isEmpty(), true)
    equal(shape.isFull(), false)
    equal(shape.referencePoint().contained, false)
  })

  test('one vertex', () => {
    const shape = new LaxPolyline([Point.fromCoords(1, 0, 0)])

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 0)
    equal(shape.dimension(), 1)
    equal(shape.isEmpty(), true)
    equal(shape.isFull(), false)
  })

  test('edge access', () => {
    const vertices = parsePoints('0:0, 0:1, 1:1')
    const shape = new LaxPolyline(vertices)

    equal(shape.numEdges(), 2)
    equal(shape.numChains(), 1)
    equal(shape.chain(0).start, 0)
    equal(shape.chain(0).length, 2)
    equal(shape.dimension(), 1)
    equal(shape.isEmpty(), false)
    equal(shape.isFull(), false)

    const edge0 = shape.edge(0)
    ok(edge0.v0.approxEqual(vertices[0]))
    ok(edge0.v1.approxEqual(vertices[1]))

    const edge1 = shape.edge(1)
    ok(edge1.v0.approxEqual(vertices[1]))
    ok(edge1.v1.approxEqual(vertices[2]))
  })
})
