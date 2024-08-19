import { Point } from './Point'

// Simple pseudorandom generator, an implementation of Multiply-with-carry
export class PseudoRandom {
  m_w: number = 0
  m_z: number = 987654321
  mask: number = 0xffffffff

  constructor(s: number = 0) {
    this.m_w = s
  }

  seed(s: number) {
    this.m_w = s
    this.m_z = 987654321
  }

  random() {
    this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & this.mask
    this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & this.mask
    let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0
    result /= 4294967296
    return result
  }
}

/**
 * Returns a uniformly distributed value in the range [0,1).
 */
export const randomFloat64Seed = (sr: PseudoRandom): number => sr.random()

/**
 * Returns a uniformly distributed value in the range [min, max).
 */
export const randomUniformFloat64Seed = (sr: PseudoRandom, min: number, max: number): number => {
  return min + randomFloat64Seed(sr) * (max - min)
}

// Returns a random unit-length vector.
export const randomPointSeed = (sr: PseudoRandom): Point => {
  return Point.fromCoords(
    randomUniformFloat64Seed(sr, -1, 1),
    randomUniformFloat64Seed(sr, -1, 1),
    randomUniformFloat64Seed(sr, -1, 1)
  )
}
