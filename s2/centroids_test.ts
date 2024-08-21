import { test, describe } from 'node:test'
import { equal, ok } from 'node:assert/strict'
import { Point } from './Point'
import { edgeTrueCentroid, planarCentroid, trueCentroid } from './centroids'
import { randomFrame, randomFrameAtPoint, randomPoint } from './testing'
import * as matrix from './matrix3x3'

describe('s2.centroids', () => {
  test('planarCentroid', () => {
    const tests = [
      {
        name: 'xyz axis',
        p0: new Point(0, 0, 1),
        p1: new Point(0, 1, 0),
        p2: new Point(1, 0, 0),
        want: new Point(1 / 3, 1 / 3, 1 / 3)
      },
      {
        name: 'Same point',
        p0: new Point(1, 0, 0),
        p1: new Point(1, 0, 0),
        p2: new Point(1, 0, 0),
        want: new Point(1, 0, 0)
      }
    ]

    for (const { name, p0, p1, p2, want } of tests) {
      const got = planarCentroid(p0, p1, p2)
      ok(got.approxEqual(want), `${name}: PlanarCentroid(${p0}, ${p1}, ${p2}) = ${got}, want ${want}`)
    }
  })

  test('trueCentroid', () => {
    for (let i = 0; i < 100; i++) {
      const f = randomFrame()
      const p = matrix.col(f, 0)
      const x = matrix.col(f, 1)
      const y = matrix.col(f, 2)
      const d = 1e-4 * Math.pow(1e-4, Math.random())

      let p0 = Point.fromVector(p.vector.sub(x.vector.mul(d)).normalize())
      let p1 = Point.fromVector(p.vector.add(x.vector.mul(d)).normalize())
      let p2 = Point.fromVector(p.vector.add(y.vector.mul(d * 3)).normalize())
      let want = Point.fromVector(p.vector.add(y.vector.mul(d)).normalize())

      let got = trueCentroid(p0, p1, p2).vector.normalize()
      ok(got.distance(want.vector) < 2e-8, `TrueCentroid(${p0}, ${p1}, ${p2}).Normalize() = ${got}, want ${want}`)

      p0 = Point.fromVector(p.vector)
      p1 = Point.fromVector(p.vector.add(x.vector.mul(d * 3)).normalize())
      p2 = Point.fromVector(p.vector.add(y.vector.mul(d * 6)).normalize())
      want = Point.fromVector(p.vector.add(x.vector.add(y.vector.mul(2)).mul(d)).normalize())

      got = trueCentroid(p0, p1, p2).vector.normalize()
      ok(got.distance(want.vector) < 2e-8, `TrueCentroid(${p0}, ${p1}, ${p2}).Normalize() = ${got}, want ${want}`)
    }
  })

  test('edgeTrueCentroid semi-circles', () => {
    const a = Point.fromCoords(0, -1, 0)
    const b = Point.fromCoords(1, 0, 0)
    const c = Point.fromCoords(0, 1, 0)
    const centroid = Point.fromVector(edgeTrueCentroid(a, b).vector.add(edgeTrueCentroid(b, c).vector))

    ok(
      b.approxEqual(Point.fromVector(centroid.vector.normalize())),
      `EdgeTrueCentroid(${a}, ${b}) + EdgeTrueCentroid(${b}, ${c}) = ${centroid}, want ${b}`
    )
    equal(centroid.vector.norm(), 2.0, `${centroid}.Norm() = ${centroid.vector.norm()}, want 2.0`)
  })

  test('edgeTrueCentroid great-circles', () => {
    for (let iter = 0; iter < 100; iter++) {
      const f = randomFrameAtPoint(randomPoint())
      const x = matrix.col(f, 0)
      const y = matrix.col(f, 1)

      let centroid = new Point(0, 0, 0)

      let v0 = x
      for (let theta = 0.0; theta < 2 * Math.PI; theta += Math.pow(Math.random(), 10)) {
        const v1 = Point.fromVector(x.vector.mul(Math.cos(theta)).add(y.vector.mul(Math.sin(theta))))
        centroid = Point.fromVector(centroid.vector.add(edgeTrueCentroid(v0, v1).vector))
        v0 = v1
      }

      centroid = Point.fromVector(centroid.vector.add(edgeTrueCentroid(v0, x).vector))
      ok(centroid.vector.norm() <= 2e-14, `${centroid}.Norm() = ${centroid.vector.norm()}, want <= 2e-14`)
    }
  })
})
