import type { angle } from './angle'

// angle units.
export const RADIAN: angle = 1
export const DEGREE: angle = (Math.PI / 180) * RADIAN
export const E5: angle = 1e-5 * DEGREE
export const E6: angle = 1e-6 * DEGREE
export const E7: angle = 1e-7 * DEGREE
