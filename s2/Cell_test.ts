import type { ChordAngle } from '../s1/chordangle'
import { test, describe } from 'node:test'
import { ok, equal } from 'node:assert/strict'
import { Cell } from './Cell'
import { Point } from './Point'
import { Point as R2Point } from '../r2/Point'
import * as cellid from './cellid'
import { SWAP_MASK } from './lookupIJ'
import { float64Eq, randomCellID, randomPoint, samplePointFromCap } from './testing'
import { DBL_EPSILON } from './predicates'
import { LatLng } from './LatLng'
import { float64Near } from '../r1/math'
import { updateMaxDistance, updateMinDistance } from './edge_distances'
import * as chordangle from '../s1/chordangle'
import { Cap } from './Cap'
import { NEGATIVE_CHORDANGLE, STRAIGHT_CHORDANGLE } from '../s1/chordangle_constants'
import { deepEqual } from 'node:assert'

describe('s2.Cell', () => {
  test('Faces', () => {
    const edgeCounts: Map<string, number> = new Map()
    const vertexCounts: Map<string, number> = new Map()

    for (let face = 0; face < 6; face++) {
      const id = cellid.fromFace(face)
      const cell = Cell.fromCellID(id)

      equal(cell.id, id)
      equal(cell.face, face)
      equal(cell.level, 0)

      // Top-level faces have alternating orientations to get RHS coordinates.
      equal(cell.orientation, face & SWAP_MASK)

      ok(!cell.isLeaf())

      for (let k = 0; k < 4; k++) {
        const edge = cell.edge(k)
        const vertex = cell.vertex(k)

        edgeCounts.set(edge.toString(), (edgeCounts.get(edge.toString()) || 0) + 1)
        vertexCounts.set(vertex.toString(), (vertexCounts.get(vertex.toString()) || 0) + 1)

        const dotProduct1 = cell.vertex(k).vector.dot(cell.edge(k).vector)
        ok(float64Eq(0.0, dotProduct1))

        const dotProduct2 = cell.vertex((k + 1) & 3).vector.dot(cell.edge(k).vector)
        ok(float64Eq(0.0, dotProduct2))

        const crossProduct = cell
          .vertex(k)
          .vector.cross(cell.vertex((k + 1) & 3).vector)
          .normalize()
          .dot(cell.edge(k).vector)
        ok(float64Eq(1.0, crossProduct))
      }
    }

    // Check that edges have multiplicity 2 and vertices have multiplicity 3.
    for (const [key, value] of edgeCounts) {
      equal(value, 2, `edge ${key} counts wrong, got ${value}, want 2`)
    }
    for (const [key, value] of vertexCounts) {
      equal(value, 3, `vertex ${key} counts wrong, got ${value}, want 3`)
    }
  })

  test('Children', () => {
    testCellChildren(Cell.fromCellID(cellid.fromFace(0)))
    // testCellChildren(Cell.fromCellID(cellid.fromFace(3)))
    // testCellChildren(Cell.fromCellID(cellid.fromFace(5)))
  })

  function testCellChildren(cell: Cell) {
    const children = cell.children()
    if (cell.isLeaf() && children.length === 0) return
    ok(!cell.isLeaf(), `leaf cells should not be able to return children. cell ${cell.id}`)
    ok(children.length > 0, `unable to get children for ${cell.id}`)

    let childID = cellid.childBegin(cell.id)
    children.forEach((ci, i) => {
      // Check that the child geometry is consistent with its cell ID.
      equal(childID, ci.id)

      const direct = Cell.fromCellID(childID)
      ok(ci.center().approxEqual(cellid.point(childID)))
      equal(ci.face, direct.face)
      equal(ci.level, direct.level)

      equal(ci.orientation, direct.orientation)
      ok(ci.center().approxEqual(direct.center()))

      for (let k = 0; k < 4; k++) {
        ok(ci.vertex(k).approxEqual(direct.vertex(k)))
        deepEqual(ci.edge(k), direct.edge(k))
      }

      ok(cell.containsCell(ci))
      ok(cell.intersectsCell(ci))
      ok(!ci.containsCell(cell))
      ok(cell.containsPoint(ci.center()))
      for (let j = 0; j < 4; j++) {
        ok(cell.containsPoint(ci.vertex(j)))
        if (j !== i) {
          ok(!ci.containsPoint(children[j].center()))
          ok(!ci.intersectsCell(children[j]))
        }
      }

      const parentCap = cell.capBound()
      const parentRect = cell.rectBound()

      const point1 = Point.fromCoords(0, 0, 1)
      const point2 = Point.fromCoords(0, 0, -1)

      if (cell.containsPoint(point1) || cell.containsPoint(point2)) {
        ok(parentRect.lng.isFull())
      }

      const childCap = ci.capBound()
      const childRect = ci.rectBound()

      ok(childCap.containsPoint(ci.center()))
      ok(childRect.containsPoint(ci.center()))
      ok(parentCap.containsPoint(ci.center()))
      ok(parentRect.containsPoint(ci.center()))

      for (let j = 0; j < 4; j++) {
        ok(childCap.containsPoint(ci.vertex(j)))
        ok(childRect.containsPoint(ci.vertex(j)))
        ok(parentCap.containsPoint(ci.vertex(j)))
        ok(parentRect.containsPoint(ci.vertex(j)))

        if (j !== i) {
          let capCount = 0
          let rectCount = 0

          for (let k = 0; k < 4; k++) {
            if (childCap.containsPoint(children[j].vertex(k))) {
              capCount++
            }
            if (childRect.containsPoint(children[j].vertex(k))) {
              rectCount++
            }
          }

          ok(capCount <= 2, `child's bounding cap should contain no more than 2 points, got ${capCount}`)

          if (childRect.lat.lo > -Math.PI / 2 && childRect.lat.hi < Math.PI / 2) {
            ok(rectCount <= 2, `child's bounding rect should contain no more than 2 points, got ${rectCount}`)
          }
        }
      }

      let forceSubdivide = false
      const maxSizeUV = 0.3964182625366691
      const specialUV = [
        new R2Point(DBL_EPSILON, DBL_EPSILON),
        new R2Point(DBL_EPSILON, 1),
        new R2Point(1, 1),
        new R2Point(maxSizeUV, maxSizeUV),
        new R2Point(DBL_EPSILON, maxSizeUV),
      ]

      for (const uv of specialUV) {
        if (ci.boundUV().containsPoint(uv)) {
          forceSubdivide = true
        }
      }

      if (forceSubdivide || cell.level < 5) {
        testCellChildren(ci)
      }

      childID = cellid.next(childID)
    })
  }

  // test('Areas', () => {
  //   const exactError = Math.log(1 + 1e-6)
  //   const approxError = Math.log(1.03)
  //   const avgError = Math.log(1 + 1e-15)

  //   const LEVEL_1_CELL = 0x1000000000000000n
  //   const WANT_AREA = (4 * Math.PI) / 6

  //   let cell = Cell.fromCellID(LEVEL_1_CELL)
  //   let area = cell.exactArea()
  //   ok(float64Eq(area, WANT_AREA))

  //   let childIndex = 1
  //   for (let cellID = LEVEL_1_CELL; cellid.level(cellID) < 21; cellID = cell.children()[childIndex].id) {
  //     let exactArea = 0
  //     let approxArea = 0
  //     let avgArea = 0

  //     for (const child of cell.children()) {
  //       exactArea += child.exactArea()
  //       approxArea += child.approxArea()
  //       avgArea += child.averageArea()
  //     }

  //     area = cell.exactArea()
  //     ok(float64Eq(exactArea, area))

  //     childIndex = (childIndex + 1) % 4

  //     const logExact = Math.abs(Math.log(exactArea / area))
  //     ok(logExact <= exactError)

  //     const logApprox = Math.abs(Math.log(approxArea / cell.approxArea()))
  //     ok(logApprox <= approxError)

  //     const logAvg = Math.abs(Math.log(avgArea / cell.averageArea()))
  //     ok(logAvg <= avgError)
  //   }
  // })

  test('IntersectsCell', () => {
    const tests = [
      {
        c: Cell.fromCellID(cellid.childBeginAtLevel(cellid.fromFace(0), 2)),
        oc: Cell.fromCellID(cellid.childBeginAtLevel(cellid.fromFace(0), 2)),
        want: true,
      },
      {
        c: Cell.fromCellID(cellid.childBeginAtLevel(cellid.fromFace(0), 2)),
        oc: Cell.fromCellID(cellid.childBeginAtLevel(cellid.childBeginAtLevel(cellid.fromFace(0), 2), 5)),
        want: true,
      },
      {
        c: Cell.fromCellID(cellid.childBeginAtLevel(cellid.fromFace(0), 2)),
        oc: Cell.fromCellID(cellid.next(cellid.childBeginAtLevel(cellid.fromFace(0), 2))),
        want: false,
      },
    ]

    for (const test of tests) {
      equal(test.c.intersectsCell(test.oc), test.want)
    }
  })

  test('ContainsCell', () => {
    const ci = cellid.childBeginAtLevel(cellid.fromFace(0), 2)
    const tests = [
      {
        c: Cell.fromCellID(ci),
        oc: Cell.fromCellID(ci),
        want: true,
      },
      {
        c: Cell.fromCellID(ci),
        oc: Cell.fromCellID(cellid.childBeginAtLevel(ci, 5)),
        want: true,
      },
      {
        c: Cell.fromCellID(cellid.childBeginAtLevel(ci, 5)),
        oc: Cell.fromCellID(ci),
        want: false,
      },
      {
        c: Cell.fromCellID(cellid.next(ci)),
        oc: Cell.fromCellID(ci),
        want: false,
      },
      {
        c: Cell.fromCellID(ci),
        oc: Cell.fromCellID(cellid.next(ci)),
        want: false,
      },
    ]

    for (const test of tests) {
      equal(test.c.containsCell(test.oc), test.want)
    }
  })

  test('RectBound', () => {
    const tests = [
      { lat: 50, lng: 50 },
      { lat: -50, lng: 50 },
      { lat: 50, lng: -50 },
      { lat: -50, lng: -50 },
      { lat: 0, lng: 0 },
      { lat: 0, lng: 180 },
      { lat: 0, lng: -179 },
    ]

    for (const test of tests) {
      const c = Cell.fromLatLng(LatLng.fromDegrees(test.lat, test.lng))
      const rect = c.rectBound()
      for (let i = 0; i < 4; i++) {
        ok(rect.containsLatLng(LatLng.fromPoint(c.vertex(i))))
      }
    }
  })

  test('RectBoundAroundPoleMinLat', () => {
    const tests = [
      {
        cellID: cellid.fromFacePosLevel(2, 0n, 0),
        latLng: LatLng.fromDegrees(3, 0),
        wantContains: false,
      },
      {
        cellID: cellid.fromFacePosLevel(2, 0n, 0),
        latLng: LatLng.fromDegrees(50, 0),
        wantContains: true,
      },
      {
        cellID: cellid.fromFacePosLevel(5, 0n, 0),
        latLng: LatLng.fromDegrees(-3, 0),
        wantContains: false,
      },
      {
        cellID: cellid.fromFacePosLevel(5, 0n, 0),
        latLng: LatLng.fromDegrees(-50, 0),
        wantContains: true,
      },
    ]

    for (const test of tests) {
      const got = Cell.fromCellID(test.cellID).rectBound().containsLatLng(test.latLng)
      equal(got, test.wantContains)
    }
  })

  test('CapBound', () => {
    const c = Cell.fromCellID(cellid.childBeginAtLevel(cellid.fromFace(0), 20))
    const s2Cap = c.capBound()
    for (let i = 0; i < 4; i++) {
      ok(s2Cap.containsPoint(c.vertex(i)))
    }
  })

  test('ContainsPoint', () => {
    const ci = cellid.childBeginAtLevel(cellid.fromFace(0), 2)
    const tests = [
      {
        c: Cell.fromCellID(ci),
        p: Cell.fromCellID(cellid.childBeginAtLevel(ci, 5)).vertex(1),
        want: true,
      },
      {
        c: Cell.fromCellID(ci),
        p: Cell.fromCellID(ci).vertex(1),
        want: true,
      },
      {
        c: Cell.fromCellID(cellid.childBeginAtLevel(ci, 5)),
        p: Cell.fromCellID(cellid.childBeginAtLevel(cellid.next(ci), 5)).vertex(1),
        want: false,
      },
    ]

    for (const test of tests) {
      equal(test.c.containsPoint(test.p), test.want)
    }
  })

  // test('ContainsPointConsistentWithS2CellIDFromPoint', () => {
  //   for (let iter = 0; iter < 1000; iter++) {
  //     const cell = Cell.fromCellID(randomCellID())
  //     const i1 = Math.floor(Math.random() * 4)
  //     const i2 = (i1 + 1) & 3
  //     const v1 = cell.vertex(i1)
  //     const v2 = samplePointFromCap(Cap.fromCenterAngle(cell.vertex(i2), EPSILON))
  //     const p = Interpolate(Math.random(), v1, v2)
  //     ok(Cell.fromCellID(cellid.fromPoint(p)).containsPoint(p))
  //   }
  // })

  test('ContainsPointContainsAmbiguousPoint', () => {
    const p = Point.fromLatLng(LatLng.fromDegrees(-2, 90))
    const cell = Cell.fromCellID(cellid.parent(cellid.fromPoint(p), 1))
    ok(cell.containsPoint(p))
  })

  test('Distance', () => {
    for (let iter = 0; iter < 1000; iter++) {
      const cell = Cell.fromCellID(randomCellID())
      const target = randomPoint()

      const expectedToBoundary = chordangle.angle(minDistanceToPointBruteForce(cell, target))

      let expectedToInterior = expectedToBoundary
      if (cell.containsPoint(target)) {
        expectedToInterior = 0
      }

      const expectedMax = chordangle.angle(maxDistanceToPointBruteForce(cell, target))

      const actualToBoundary = chordangle.angle(cell.boundaryDistance(target))
      const actualToInterior = chordangle.angle(cell.distance(target))
      const actualMax = chordangle.angle(cell.maxDistance(target))
      ok(float64Near(expectedToBoundary, actualToBoundary, 1e-12))
      ok(float64Near(expectedToInterior, actualToInterior, 1e-12))
      ok(float64Near(expectedMax, actualMax, 1e-12))

      if (expectedToBoundary <= Math.PI / 3) {
        ok(float64Near(expectedToBoundary, actualToBoundary, 1e-15))
        ok(float64Near(expectedToInterior, actualToInterior, 1e-15))
      }

      if (expectedMax <= Math.PI / 3) {
        ok(float64Near(expectedMax, actualMax, 1e-15))
      }
    }
  })

  function chooseEdgeNearCell(cell: Cell): [Point, Point] {
    const c = cell.capBound()
    let a: Point, b: Point

    if (Math.random() < 0.2) {
      a = randomPoint()
    } else {
      a = samplePointFromCap(Cap.fromCenterChordAngle(c.center, 1.5 * c.rad))
    }

    const maxLength = Math.min(100 * Math.pow(1e-4, Math.random()) * c.radius(), Math.PI / 2)
    b = samplePointFromCap(Cap.fromCenterAngle(a, maxLength))

    if (Math.random() < 0.05) {
      a = Point.fromVector(a.vector.mul(-1))
      b = Point.fromVector(b.vector.mul(-1))
    }

    return [a, b]
  }

  function minDistanceToPointBruteForce(cell: Cell, target: Point): ChordAngle {
    let minDistance = chordangle.infChordAngle()
    for (let i = 0; i < 4; i++) {
      minDistance = updateMinDistance(target, cell.vertex(i), cell.vertex((i + 1) % 4), minDistance).dist
    }
    return minDistance
  }

  function maxDistanceToPointBruteForce(cell: Cell, target: Point): ChordAngle {
    if (cell.containsPoint(Point.fromVector(target.vector.mul(-1)))) {
      return STRAIGHT_CHORDANGLE
    }
    let maxDistance = NEGATIVE_CHORDANGLE
    for (let i = 0; i < 4; i++) {
      maxDistance = updateMaxDistance(target, cell.vertex(i), cell.vertex((i + 1) % 4), maxDistance).dist
    }
    return maxDistance
  }

  // function minDistanceToEdgeBruteForce(cell: Cell, a: Point, b: Point): ChordAngle {
  //   if (cell.containsPoint(a) || cell.containsPoint(b)) return 0

  //   let minDist = chordangle.infChordAngle()
  //   for (let i = 0; i < 4; i++) {
  //     const v0 = cell.vertex(i)
  //     const v1 = cell.vertex((i + 1) % 4)

  //     if (Cell.crossingSign(a, b, v0, v1) !== Cell.DoNotCross) return 0

  //     minDist = updateMinDistance(a, v0, v1, minDist)[0]
  //     minDist = updateMinDistance(b, v0, v1, minDist)[0]
  //     minDist = updateMinDistance(v0, a, b, minDist)[0]
  //   }
  //   return minDist
  // }

  // function maxDistanceToEdgeBruteForce(cell: Cell, a: Point, b: Point): ChordAngle {
  //   if (
  //     cell.containsPoint(Point.fromVector(a.vector.mul(-1))) ||
  //     cell.containsPoint(Point.fromVector(b.vector.mul(-1)))
  //   ) {
  //     return STRAIGHT_CHORDANGLE
  //   }

  //   let maxDist = NEGATIVE_CHORDANGLE
  //   for (let i = 0; i < 4; i++) {
  //     const v0 = cell.vertex(i)
  //     const v1 = cell.vertex((i + 1) % 4)

  //     if (Cell.crossingSign(a.mul(-1), b.mul(-1), v0, v1) !== Cell.DoNotCross) {
  //       return STRAIGHT_CHORDANGLE
  //     }

  //     maxDist = updateMaxDistance(a, v0, v1, maxDist)[0]
  //     maxDist = updateMaxDistance(b, v0, v1, maxDist)[0]
  //     maxDist = updateMaxDistance(v0, a, b, maxDist)[0]
  //   }
  //   return maxDist
  // }

  // test('DistanceToEdge', () => {
  //   for (let iter = 0; iter < 1000; iter++) {
  //     const cell = Cell.fromCellID(randomCellID())

  //     const [a, b] = chooseEdgeNearCell(cell)
  //     const expectedMin = minDistanceToEdgeBruteForce(cell, a, b).angle()
  //     const expectedMax = maxDistanceToEdgeBruteForce(cell, a, b).angle()
  //     const actualMin = cell.distanceToEdge(a, b).angle()
  //     const actualMax = cell.maxDistanceToEdge(a, b).angle()

  //     let expectedError = 1e-12
  //     if (expectedMin > Math.PI / 2) {
  //       expectedError = 2e-8
  //     } else if (expectedMin <= Math.PI / 3) {
  //       expectedError = 1e-15
  //     }

  //     ok(float64Near(expectedMin, actualMin, expectedError))
  //     ok(float64Near(expectedMax, actualMax, 1e-12))

  //     if (expectedMax <= Math.PI / 3) {
  //       ok(float64Near(expectedMax, actualMax, 1e-15))
  //     }
  //   }
  // })

  // test('MaxDistanceToEdge', () => {
  //   const cell = Cell.fromCellID(cellid.fromFacePosLevel(0, 0, 20))
  //   const a = Point.fromInterpolate(2.0, cell.center(), cell.vertex(0)).mul(-1)
  //   const b = Point.fromInterpolate(2.0, cell.center(), cell.vertex(2)).mul(-1)

  //   const actual = cell.maxDistanceToEdge(a, b)
  //   const expected = maxDistanceToEdgeBruteForce(cell, a, b)

  //   ok(float64Near(expected.angle(), STRAIGHT_CHORDANGLE.angle(), 1e-15))
  //   ok(float64Near(actual.angle(), STRAIGHT_CHORDANGLE.angle(), 1e-15))
  // })

  // test('MaxDistanceToCellAntipodal', () => {
  //   const p = parsePoint('0:0')
  //   const cell = Cell.fromPoint(p)
  //   const antipodalCell = Cell.fromPoint(p.mul(-1))
  //   const dist = cell.maxDistanceToCell(antipodalCell)

  //   equal(dist, STRAIGHT_CHORDANGLE)
  // })

  // test('MaxDistanceToCell', () => {
  //   for (let i = 0; i < 1000; i++) {
  //     const cell = Cell.fromCellID(randomCellID())
  //     const testCell = Cell.fromCellID(randomCellID())
  //     const antipodalLeafID = cellid.fromPoint(testCell.center().mul(-1))
  //     const antipodalTestCell = Cell.fromCellID(antipodalLeafID.parent(testCell.level()))

  //     const distFromMin = STRAIGHT_CHORDANGLE - cell.distanceToCell(antipodalTestCell)
  //     const distFromMax = cell.maxDistanceToCell(testCell)

  //     ok(float64Near(distFromMin.angle(), distFromMax.angle(), 1e-8))
  //   }
  // })
})
