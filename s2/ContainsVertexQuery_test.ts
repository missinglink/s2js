import { test, describe } from 'node:test'
import { equal } from 'node:assert/strict'
import { ContainsVertexQuery } from './ContainsVertexQuery'
import { parsePoint } from './testing_textformat'

describe('s2.ContainsVertexQuery', () => {
  test('undetermined', () => {
    const q = new ContainsVertexQuery(parsePoint('1:2'))
    q.addEdge(parsePoint('3:4'), 1)
    q.addEdge(parsePoint('3:4'), -1)
    const result = q.containsVertex()
    equal(result, 0, `ContainsVertex() = ${result}, want 0 for vertex with undetermined containment`)
  })

  test('contained with duplicates', () => {
    const q = new ContainsVertexQuery(parsePoint('0:0'))
    q.addEdge(parsePoint('3:-3'), -1)
    q.addEdge(parsePoint('1:-5'), 1)
    q.addEdge(parsePoint('2:-4'), 1)
    q.addEdge(parsePoint('1:-5'), -1)
    const result = q.containsVertex()
    equal(result, 1, `ContainsVertex() = ${result}, want 1 for vertex that is contained`)
  })

  test('not contained with duplicates', () => {
    const q = new ContainsVertexQuery(parsePoint('1:1'))
    q.addEdge(parsePoint('1:-5'), 1)
    q.addEdge(parsePoint('2:-4'), -1)
    q.addEdge(parsePoint('3:-3'), 1)
    q.addEdge(parsePoint('1:-5'), -1)
    const result = q.containsVertex()
    equal(result, -1, `ContainsVertex() = ${result}, want -1 for vertex that is not contained`)
  })

  // test('matches loop containment', () => {
  //   const loop = RegularLoop(parsePoint('89:-179'), 10 * DEGREE, 1000)
  //   for (let i = 1; i <= loop.numVertices(); i++) {
  //     const q = new ContainsVertexQuery(loop.vertex(i))
  //     q.addEdge(loop.vertex(i - 1), -1)
  //     q.addEdge(loop.vertex(i + 1), 1)
  //     const result = q.containsVertex() > 0
  //     const expected = loop.containsPoint(loop.vertex(i))
  //     equal(
  //       result,
  //       expected,
  //       `ContainsVertex() = ${result}, loop.containsPoint(${loop.vertex(i)}) = ${expected}, should be the same`
  //     )
  //   }
  // })
})
