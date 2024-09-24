import type * as geojson from 'geojson'
import { test, describe } from 'node:test'
import { ok, deepEqual } from 'node:assert/strict'
import { RegionCoverer } from './RegionCoverer'
import * as cellid from '../s2/cellid'

describe('RegionCoverer', () => {
  test('polygon - incorrect winding + duplicate adjacent vertices', (t) => {
    const polygon: geojson.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-1.599437, 53.803895],
          [-1.598511, 53.803895],
          [-1.595764, 53.803895],
          [-1.593018, 53.803895],
          [-1.593018, 53.802273],
          [-1.590271, 53.802273],
          [-1.587524, 53.802273],
          [-1.585241, 53.802273],
          [-1.584778, 53.802273],
          [-1.582031, 53.802273],
          [-1.582031, 53.801097],
          [-1.582031, 53.800651],
          [-1.579285, 53.800651],
          [-1.576538, 53.800651],
          [-1.576538, 53.799029],
          [-1.576538, 53.797406],
          [-1.577464, 53.797406],
          [-1.577464, 53.797406],
          [-1.581105, 53.797406],
          [-1.581424, 53.795784],
          [-1.584778, 53.795784],
          [-1.584778, 53.794162],
          [-1.584778, 53.794144],
          [-1.587524, 53.792594],
          [-1.587524, 53.790917],
          [-1.587524, 53.790917],
          [-1.592091, 53.790917],
          [-1.592091, 53.790917],
          [-1.593018, 53.790917],
          [-1.593018, 53.792539],
          [-1.595764, 53.792539],
          [-1.596722, 53.794162],
          [-1.596722, 53.794162],
          [-1.595764, 53.795784],
          [-1.595764, 53.797406],
          [-1.595764, 53.799029],
          [-1.595764, 53.800651],
          [-1.598511, 53.800651],
          [-1.599205, 53.801827],
          [-1.599118, 53.802273],
          [-1.599437, 53.803895],
          [-1.599437, 53.803895]
        ]
      ]
    }

    const cov = new RegionCoverer()
    const union = cov.covering(polygon)
    deepEqual(
      [...union.map(cellid.toToken)],
      ['48795eb9', '48795ec4', '48795ed04', '48795ed0c', '48795ed74', '48795edc', '48795ee7c', '48795ee84']
    )
  })

  test('polygon - twisted + contains duplicate vertices', (t) => {
    const mpolygon: geojson.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-122.420357, 37.651333],
            [-122.42047100000001, 37.652073],
            [-122.421204, 37.651173],
            [-122.42038700000001, 37.651276],
            [-122.405418, 37.634312],
            [-122.400352, 37.634029],
            [-122.39450100000001, 37.632862],
            [-122.388313, 37.633675],
            [-122.37602200000001, 37.631088],
            [-122.362549, 37.638908],
            [-122.360283, 37.634068],
            [-122.35611, 37.614025],
            [-122.353706, 37.612396],
            [-122.351601, 37.61134],
            [-122.349411, 37.610287],
            [-122.345123, 37.607704],
            [-122.34137699999999, 37.590256],
            [-122.359131, 37.585941],
            [-122.36784400000001, 37.600216],
            [-122.37653400000001, 37.605061],
            [-122.380539, 37.607029],
            [-122.383797, 37.607666],
            [-122.395447, 37.60276],
            [-122.401848, 37.605137],
            [-122.404831, 37.611164],
            [-122.405632, 37.613293],
            [-122.40589900000001, 37.614941],
            [-122.40582999999999, 37.615002],
            [-122.40129899999999, 37.625465],
            [-122.405418, 37.634312],
            [-122.420357, 37.651333]
          ]
        ]
      ]
    }

    const cov = new RegionCoverer()
    const union = cov.covering(mpolygon)
    deepEqual([...union.map(cellid.toToken)], []) // cannot be fixed, return []
  })

  test('polygon - should not generate global covering', (t) => {
    const polygon: geojson.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-77.053846, 38.906842],
          [-77.053847, 38.90684000000001],
          [-77.053849, 38.906836000000006],
          [-77.053846, 38.906842]
        ]
      ]
    }
    const cov = new RegionCoverer()
    const union = cov.covering(polygon)
    deepEqual([...union.map(cellid.toToken)], [])
  })

  test('multipolygon - should not generate global covering', (t) => {
    const mpolygon: geojson.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-77.053846, 38.906842],
            [-77.053847, 38.90684000000001],
            [-77.053849, 38.906836000000006],
            [-77.053846, 38.906842]
          ]
        ]
      ]
    }
    const cov = new RegionCoverer()
    const union = cov.covering(mpolygon)
    deepEqual([...union.map(cellid.toToken)], [])
  })

  test('multipolygon - second ring is invalid & should be ignored', (t) => {
    const mpolygon: geojson.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-82.463379, 28.07198],
            [-82.468872, 28.07198],
            [-82.468872, 28.07198],
            [-82.474369, 28.07198],
            [-82.473222, 28.070161],
            [-82.469386, 28.057119],
            [-82.470504, 28.055128],
            [-82.474365, 28.054253],
            [-82.475276, 28.054321],
            [-82.479858, 28.052591],
            [-82.481073, 28.052591],
            [-82.485352, 28.047743],
            [-82.485352, 28.047743],
            [-82.485352, 28.047743],
            [-82.489631, 28.042894],
            [-82.490355, 28.042894],
            [-82.493591, 28.044561],
            [-82.497859, 28.043243],
            [-82.502753, 28.037698],
            [-82.507658, 28.035846],
            [-82.508323, 28.0346],
            [-82.508892, 28.032724],
            [-82.509084, 28.030773],
            [-82.508892, 28.028823],
            [-82.508323, 28.026947],
            [-82.507399, 28.025218],
            [-82.506156, 28.023702],
            [-82.50464, 28.022459],
            [-82.502911, 28.021535],
            [-82.501035, 28.020966],
            [-82.499084, 28.020773],
            [-82.497134, 28.020966],
            [-82.495258, 28.021535],
            [-82.493529, 28.022459],
            [-82.492013, 28.023702],
            [-82.49077, 28.025218],
            [-82.490395, 28.025919],
            [-82.490377, 28.025914],
            [-82.490049, 28.025814],
            [-82.488098, 28.025622],
            [-82.486147, 28.025814],
            [-82.484271, 28.026383],
            [-82.482542, 28.027307],
            [-82.481027, 28.028551],
            [-82.479858, 28.029975],
            [-82.47869, 28.028551],
            [-82.478443, 28.028349],
            [-82.468266, 28.028349],
            [-82.466125, 28.033198],
            [-82.466125, 28.034935],
            [-82.463379, 28.038046],
            [-82.463379, 28.038046],
            [-82.463379, 28.041511],
            [-82.463379, 28.042895],
            [-82.463379, 28.047047],
            [-82.463225, 28.047569],
            [-82.460632, 28.046981],
            [-82.454902, 28.04828],
            [-82.45407, 28.050167],
            [-82.455139, 28.052591],
            [-82.455139, 28.057438],
            [-82.45565, 28.058595],
            [-82.46045, 28.061315],
            [-82.45935, 28.070039],
            [-82.458494, 28.07198],
            [-82.463379, 28.07198],
            [-82.463379, 28.07198]
          ]
        ],
        [
          [
            [-82.505951, 28.075921],
            [-82.507902, 28.075729],
            [-82.509778, 28.07516],
            [-82.511507, 28.074236],
            [-82.513022, 28.072993],
            [-82.514266, 28.071477],
            [-82.51519, 28.069748],
            [-82.515759, 28.067872],
            [-82.515951, 28.065921],
            [-82.515759, 28.063971],
            [-82.51519, 28.062095],
            [-82.514644, 28.061074],
            [-82.513285, 28.061074],
            [-82.506411, 28.062632],
            [-82.505495, 28.062286],
            [-82.501831, 28.060902],
            [-82.499539, 28.060036],
            [-82.496338, 28.061591],
            [-82.495524, 28.062513],
            [-82.4957, 28.06471],
            [-82.495524, 28.066905],
            [-82.503457, 28.075897],
            [-82.504578, 28.075786],
            [-82.505951, 28.075921]
          ]
        ]
      ]
    }
    const cov = new RegionCoverer({ maxLevel: 15 })
    const union = cov.covering(mpolygon)
    ok(!union.includes(1152921505680588800n), 'contains null island cellid') // null island
    deepEqual(
      [...union.map(cellid.toToken)],
      ['88c2c08b4', '88c2c08d', '88c2c093', '88c2c095', '88c2c0c1', '88c2c0c3', '88c2c0ec', '88c2c0f4']
    )
  })

  test('linestring - should generate covering', (t) => {
    const linestring: geojson.LineString = {
      type: 'LineString',
      coordinates: [
        [-77.053846, 38.906842],
        [-77.053847, 38.90684000000001],
        [-77.053849, 38.906836000000006]
      ]
    }
    const cov = new RegionCoverer()
    const union = cov.covering(linestring)
    deepEqual(
      [...union.map(cellid.toToken)],
      [
        '89b7b7b50b756d',
        '89b7b7b50b7571',
        '89b7b7b50b75724',
        '89b7b7b50b757b',
        '89b7b7b50b757c04',
        '89b7b7b50b757f',
        '89b7b7b50b9fd35',
        '89b7b7b50b9fd5'
      ]
    )
  })

  test('polygon - should generate global covering', (t) => {
    const polygon: geojson.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-170, 69],
          [170, 70],
          [170, -70],
          [-170, -70],
          [-170, 69]
        ]
      ]
    }
    const cov = new RegionCoverer()
    const union = cov.covering(polygon)
    deepEqual([...union.map(cellid.toToken)], ['1', '3', '5', '7', '9', 'b'])
  })
})