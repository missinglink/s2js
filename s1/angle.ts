import { DEGREE } from './angle_constants'

/**
 * Angle represents a 1D angle. The internal representation is a double precision value in radians, so conversion to and from radians is exact.
 * Conversions between E5, E6, E7, and Degrees are not always exact.
 *
 * For example, Degrees(3.1) is different from E6(3100000) or E7(31000000).
 *
 * The following conversions between degrees and radians are exact:
 *
 * 	    Degree*180 == Radian*Math.PI
 * 	Degree*(180/n) == Radian*(Math.PI/n)     for n == 0..8
 *
 * These identities hold when the arguments are scaled up or down by any power of 2. Some similar identities are also true, for example,
 *
 * 	Degree*60 == Radian*(Math.PI/3)
 *
 * But be aware that this type of identity does not hold in general.
 * For example:
 *
 * 	Degree*3 != Radian*(Math.PI/60)
 *
 * Similarly, the conversion to radians means that (Angle(x)*Degree).Degrees() does not always equal x.
 * For example:
 *
 * 	(Angle(45*n)*Degree).Degrees() == 45*n     for n == 0..8
 *
 * but
 *
 * 	(60*Degree).Degrees() != 60
 *
 * When testing for equality, you should allow for numerical errors (ApproxEqual)
 * or convert to discrete E5/E6/E7 values first.
 *
 * @module angle
 */
export type angle = number

/**
 * Returns the angle in radians.
 */
export const radians = (a: angle): number => a

/**
 * Returns the angle in degrees.
 */
export const degrees = (a: angle): number => a / DEGREE

/**
 * Returns the value rounded to nearest as an int32.
 * This does not match C++ exactly for the case of x.5.
 */
export const round = (a: angle): number => Math.round(a) || 0

/** Returns an angle larger than any finite angle. */
export const infAngle = (): angle => Infinity

/** Reports whether this Angle is infinite. */
export const isInf = (a: angle): boolean => a == Infinity

/** Returns the angle in hundred thousandths of degrees. */
export const e5 = (a: angle): number => round(degrees(a) * 1e5)

/** Returns the angle in millionths of degrees. */
export const e6 = (a: angle): number => round(degrees(a) * 1e6)

/** Returns the angle in ten millionths of degrees. */
export const e7 = (a: angle): number => round(degrees(a) * 1e7)

/** Returns the absolute value of the angle. */
export const abs = (a: angle): angle => Math.abs(a)

/**
 * Returns an equivalent angle in (-π, π].
 *
 * note: javascript `%` is not equivalent to `ieee754_remainder`.
 * @todo: performance optimization
 * */
export const normalized = (a: angle): angle => {
  if (a > -Math.PI && a <= Math.PI) return a || 0
  while (a > Math.PI) a -= Math.PI * 2
  while (a <= -Math.PI) a += Math.PI * 2
  if (a == -Math.PI) a = Math.PI
  return a || 0
}

/**
 * Generates a human readable string.
 */
export const toString = (a: angle): string => degrees(a).toFixed(7)

/** Reports whether the two angles are the same up to a small tolerance. */
export const approxEqual = (a: angle, oa: angle, epsilon = 1e-15): boolean => Math.abs(a - oa) <= epsilon