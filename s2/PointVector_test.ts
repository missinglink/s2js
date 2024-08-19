import { test, describe } from 'node:test'
import { equal, ok } from 'node:assert/strict'
import { PointVector } from './PointVector'
import { PseudoRandom, randomPointSeed } from './testing_pseudo'

describe('s2.PointVector', () => {
  test('empty', () => {
    const shape = new PointVector([])

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 0)
    equal(shape.dimension(), 0)
    ok(shape.isEmpty())
    ok(!shape.isFull())
    ok(!shape.referencePoint().contained)
  })

  test('basics', () => {
    let sr = new PseudoRandom(8675309)

    const NUM_POINTS = 100
    const points = Array.from({ length: NUM_POINTS }, () => randomPointSeed(sr))
    const shape = new PointVector(points)

    equal(shape.numEdges(), NUM_POINTS)
    equal(shape.numChains(), NUM_POINTS)
    equal(shape.dimension(), 0)
    ok(!shape.isEmpty())
    ok(!shape.isFull())

    sr.seed(8675309)
    for (let i = 0; i < NUM_POINTS; i++) {
      equal(shape.chain(i).start, i)
      equal(shape.chain(i).length, 1)
      const edge = shape.edge(i)
      const pt = randomPointSeed(sr)

      ok(pt.approxEqual(edge.v0))
      ok(pt.approxEqual(edge.v1))
    }
  })
})
