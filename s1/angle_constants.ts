import type { Angle } from './_types'

// angle units.
export const RADIAN: Angle = 1
export const DEGREE: Angle = (Math.PI / 180) * RADIAN
export const E5: Angle = 1e-5 * DEGREE
export const E6: Angle = 1e-6 * DEGREE
export const E7: Angle = 1e-7 * DEGREE
