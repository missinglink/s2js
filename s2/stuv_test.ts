import { test, describe } from 'node:test'
import { equal, ok } from 'node:assert/strict'
import { randomCellIDForLevel, randomUint32, randomUniformFloat64, randomUniformInt } from './testing'
import { Vector } from '../r3/Vector'
import { Point } from './Point'
import { MAX_LEVEL, NUM_FACES } from './cellid_constants'
import * as cellid from './cellid'
import {
  stToUV,
  uvToST,
  face,
  faceUVToXYZ,
  unitNorm,
  uNorm,
  vNorm,
  faceXYZToUV,
  faceXYZtoUVW,
  faceSiTiToXYZ,
  xyzToFaceSiTi,
  uAxis,
  vAxis,
  uvwAxis,
  stToSiTi,
  siTiToST,
  uvwFace,
  MAX_SiTi,
} from './stuv'

// Define epsilon for floating point comparisons
const EPSILON = 1e-14

describe('s2.stuv', () => {
  test('transformations', () => {
    equal(stToUV(uvToST(0.125)), 0.125)
    equal(uvToST(stToUV(0.125)), 0.125)
  })

  test('UV norms', () => {
    const step = 1 / 1024.0
    for (let face = 0; face < 6; face++) {
      for (let x = -1.0; x <= 1; x += step) {
        ok(
          Math.abs(
            faceUVToXYZ(face, x, -1)
              .cross(faceUVToXYZ(face, x, 1))
              .angle(uNorm(face, x)),
          ) < EPSILON,
        )
        ok(
          Math.abs(
            faceUVToXYZ(face, -1, x)
              .cross(faceUVToXYZ(face, 1, x))
              .angle(vNorm(face, x)),
          ) < EPSILON,
        )
      }
    }
  })

  test('face UV to XYZ', () => {
    let sum = new Vector(0, 0, 0)
    for (let face = 0; face < 6; face++) {
      const center = faceUVToXYZ(face, 0, 0)
      ok(center.approxEqual(unitNorm(face).vector))
      switch (center.largestComponent()) {
        case Vector.X_AXIS:
          equal(Math.abs(center.x), 1)
          break
        case Vector.Y_AXIS:
          equal(Math.abs(center.y), 1)
          break
        default:
          equal(Math.abs(center.z), 1)
      }
      sum = sum.add(center.abs())

      // Check that each face has a right-handed coordinate system.
      equal(uAxis(face).vector.cross(vAxis(face).vector).dot(unitNorm(face).vector), 1)

      // Check that the Hilbert curves on each face combine to form a continuous curve over the entire cube.
      const sign = face & 1 ? -1 : 1
      ok(faceUVToXYZ(face, sign, -sign).equals(faceUVToXYZ((face + 1) % 6, -1, -1)))
    }
    ok(sum.approxEqual(new Vector(2, 2, 2)))
  })

  test('face XYZ to UV', () => {
    const point = new Point(1.1, 1.2, 1.3)
    const pointNeg = new Point(-1.1, -1.2, -1.3)

    const tests = [
      { face: 0, point: point, u: 1 + 1.0 / 11, v: 1 + 2.0 / 11, ok: true },
      { face: 0, point: pointNeg, u: 0, v: 0, ok: false },
      { face: 1, point: point, u: -11.0 / 12, v: 1 + 1.0 / 12, ok: true },
      { face: 1, point: pointNeg, u: 0, v: 0, ok: false },
      { face: 2, point: point, u: -11.0 / 13, v: -12.0 / 13, ok: true },
      { face: 2, point: pointNeg, u: 0, v: 0, ok: false },
      { face: 3, point: point, u: 0, v: 0, ok: false },
      { face: 3, point: pointNeg, u: 1 + 2.0 / 11, v: 1 + 1.0 / 11, ok: true },
      { face: 4, point: point, u: 0, v: 0, ok: false },
      { face: 4, point: pointNeg, u: 1 + 1.0 / 12, v: -(11.0 / 12), ok: true },
      { face: 5, point: point, u: 0, v: 0, ok: false },
      { face: 5, point: pointNeg, u: -12.0 / 13, v: -11.0 / 13, ok: true },
    ]

    for (const test of tests) {
      const [u, v, isOK] = faceXYZToUV(test.face, test.point)
      ok(Math.abs(u - test.u) < EPSILON && Math.abs(v - test.v) < EPSILON && isOK === test.ok)
    }
  })

  test('face XYZ to UVW', () => {
    const origin = new Point(0, 0, 0)
    const posX = new Point(1, 0, 0)
    const negX = new Point(-1, 0, 0)
    const posY = new Point(0, 1, 0)
    const negY = new Point(0, -1, 0)
    const posZ = new Point(0, 0, 1)
    const negZ = new Point(0, 0, -1)

    for (let face = 0; face < 6; face++) {
      ok(faceXYZtoUVW(face, origin).equals(origin))
      ok(faceXYZtoUVW(face, uAxis(face)).equals(posX))
      ok(faceXYZtoUVW(face, Point.fromVector(uAxis(face).vector.mul(-1))).equals(negX))
      ok(faceXYZtoUVW(face, vAxis(face)).equals(posY))
      ok(faceXYZtoUVW(face, Point.fromVector(vAxis(face).vector.mul(-1))).equals(negY))
      ok(faceXYZtoUVW(face, unitNorm(face)).equals(posZ))
      ok(faceXYZtoUVW(face, Point.fromVector(unitNorm(face).vector.mul(-1))).equals(negZ))
    }
  })

  test('UVW axis', () => {
    for (let face = 0; face < 6; face++) {
      ok(
        faceUVToXYZ(face, 1, 0)
          .sub(faceUVToXYZ(face, 0, 0))
          .equals(uAxis(face).vector),
      )
      ok(
        faceUVToXYZ(face, 0, 1)
          .sub(faceUVToXYZ(face, 0, 0))
          .equals(vAxis(face).vector),
      )
      ok(faceUVToXYZ(face, 0, 0).equals(unitNorm(face).vector))
      equal(uAxis(face).vector.cross(vAxis(face).vector).dot(unitNorm(face).vector), 1)
      ok(uAxis(face).equals(uvwAxis(face, 0)))
      ok(vAxis(face).equals(uvwAxis(face, 1)))
      ok(unitNorm(face).equals(uvwAxis(face, 2)))
    }
  })

  test('SiTi to ST roundtrip', () => {
    for (let i = 0; i < 1000; i++) {
      const si = randomUniformInt(MAX_SiTi)
      equal(stToSiTi(siTiToST(si)), si)
    }
    for (let i = 0; i < 1000; i++) {
      const st = randomUniformFloat64(0, 1.0)
      ok(Math.abs(siTiToST(stToSiTi(st)) - st) < 1e-8)
    }
  })

  test('UVW face', () => {
    for (let f = 0; f < 6; f++) {
      for (let axis = 0; axis < 3; axis++) {
        equal(face(uvwAxis(f, axis).vector.mul(-1)), uvwFace(f, axis, 0))
        equal(face(uvwAxis(f, axis).vector), uvwFace(f, axis, 1))
      }
    }
  })

  test('XYZ to face SiTi', () => {
    for (let level = 0; level < MAX_LEVEL; level++) {
      for (let i = 0; i < 1000; i++) {
        const ci = randomCellIDForLevel(level)
        equal(cellid.level(ci), level)
        ok(cellid.valid(ci))

        const [f, si, ti, gotLevel] = xyzToFaceSiTi(cellid.point(ci))
        equal(gotLevel, level, `level of CellID ${ci} = ${gotLevel}, want ${level}`)
        const gotID = cellid.parent(cellid.fromFaceIJ(f, si / 2, ti / 2), level)
        equal(gotID, ci, `CellID = ${gotID.toString(2)}, want ${ci.toString(2)}`)

        const pMoved = cellid.point(ci).vector.add(new Vector(1e-13, 1e-13, 1e-13))
        const [fMoved, siMoved, tiMoved, gotLevelMoved] = xyzToFaceSiTi(Point.fromVector(pMoved))
        equal(gotLevelMoved, -1, `level of ${pMoved} = ${gotLevelMoved}, want -1`)
        equal(f, fMoved, `face of ${pMoved} = ${fMoved}, want ${f}`)
        equal(si, siMoved, `si of ${pMoved} = ${siMoved}, want ${si}`)
        equal(ti, tiMoved, `ti of ${pMoved} = ${tiMoved}, want ${ti}`)

        const faceRandom = randomUniformInt(NUM_FACES)
        const mask = (-1 << (MAX_LEVEL - level)) >>> 0
        let siRandom = (randomUint32() & mask) >>> 0
        let tiRandom = (randomUint32() & mask) >>> 0
        while (siRandom > MAX_SiTi || tiRandom > MAX_SiTi) {
          siRandom = (randomUint32() & mask) >>> 0
          tiRandom = (randomUint32() & mask) >>> 0
        }

        const pRandom = faceSiTiToXYZ(faceRandom, siRandom, tiRandom)
        const [fRand, siRand, tiRand, gotLevelRand] = xyzToFaceSiTi(pRandom)

        // The chosen point is on the edge of a top-level face cell.
        if (fRand !== faceRandom) {
          equal(gotLevelRand, -1)
          ok(siRand == 0 || siRand == MAX_SiTi || tiRand == 0 || tiRand == MAX_SiTi)
          continue
        }
        equal(siRandom, siRand, `${level}|${i} / ${siRand}|${tiRand}`)
        equal(tiRandom, tiRand, `${level}|${i} / ${siRand}|${tiRand}`)
        if (gotLevelRand >= 0) {
          const got = cellid.point(cellid.parent(cellid.fromFaceIJ(fRand, siRand / 2, tiRand / 2), gotLevelRand))
          ok(pRandom.approxEqual(got))
        }
      }
    }
  })

  test('XYZ face SiTi roundtrip', () => {
    for (let level = 0; level < MAX_LEVEL; level++) {
      for (let i = 0; i < 1000; i++) {
        const ci = randomCellIDForLevel(level)
        const [f, si, ti] = xyzToFaceSiTi(cellid.point(ci))
        const op = faceSiTiToXYZ(f, si, ti)
        ok(cellid.point(ci).approxEqual(op))
      }
    }
  })

  test('STUV face', () => {
    const tests = [
      { v: new Vector(-1, -1, -1), want: 5 },
      { v: new Vector(-1, -1, 0), want: 4 },
      { v: new Vector(-1, -1, 1), want: 2 },
      { v: new Vector(-1, 0, -1), want: 5 },
      { v: new Vector(-1, 0, 0), want: 3 },
      { v: new Vector(-1, 0, 1), want: 2 },
      { v: new Vector(-1, 1, -1), want: 5 },
      { v: new Vector(-1, 1, 0), want: 1 },
      { v: new Vector(-1, 1, 1), want: 2 },
      { v: new Vector(0, -1, -1), want: 5 },
      { v: new Vector(0, -1, 0), want: 4 },
      { v: new Vector(0, -1, 1), want: 2 },
      { v: new Vector(0, 0, -1), want: 5 },
      { v: new Vector(0, 0, 0), want: 2 },
      { v: new Vector(0, 0, 1), want: 2 },
      { v: new Vector(0, 1, -1), want: 5 },
      { v: new Vector(0, 1, 0), want: 1 },
      { v: new Vector(0, 1, 1), want: 2 },
      { v: new Vector(1, -1, -1), want: 5 },
      { v: new Vector(1, -1, 0), want: 4 },
      { v: new Vector(1, -1, 1), want: 2 },
      { v: new Vector(1, 0, -1), want: 5 },
      { v: new Vector(1, 0, 0), want: 0 },
      { v: new Vector(1, 0, 1), want: 2 },
      { v: new Vector(1, 1, -1), want: 5 },
      { v: new Vector(1, 1, 0), want: 1 },
      { v: new Vector(1, 1, 1), want: 2 },
    ]

    for (const test of tests) {
      equal(face(test.v), test.want)
    }
  })
})
