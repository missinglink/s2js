/**
 * Module s2 is a library for working with geometry in S² (spherical geometry).
 * 
 * Its related modules, parallel to this one, are s1 (operates on S¹), r1 (operates on ℝ¹),
 * r2 (operates on ℝ²) and r3 (operates on ℝ³).

 * This package provides types and functions for the S2 cell hierarchy and coordinate systems.
 * The S2 cell hierarchy is a hierarchical decomposition of the surface of a unit sphere (S²) into “cells”; it is highly efficient, scales from continental size to under 1 cm² and preserves spatial locality (nearby cells have close IDs).
 * 
 * More information including an in-depth introduction to S2 can be found on the S2 website https://s2geometry.io/
 * @module s2
 */
export * as cellid from './cellid'
export { Cap } from './Cap'
export { Cell } from './Cell'
export { CellUnion } from './CellUnion'
export { Metric } from './Metric'
export { LatLng } from './LatLng'
export { Point } from './Point'
export { Rect } from './Rect'
export { Region } from './Region'
