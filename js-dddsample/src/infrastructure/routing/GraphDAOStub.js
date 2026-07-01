'use strict';

const ALL_NODES = [
  'CNHKG','AUMEL','SESTO','FIHEL','USCHI','JNTKO','DEHAM','CNSHA','NLRTM','SEGOT','CNHGH','USNYC','USDAL'
];
const VOYAGE_NUMBERS = ['0100S','0200T','0300A','0301S','0400S'];

/**
 * Stub for the graph database — top-level pure functions, no factory wrapper.
 * Returns hardcoded nodes and random voyage numbers.
 */

function listAllNodes() {
  return [...ALL_NODES];
}

function getTransitEdge(from, to) {
  return VOYAGE_NUMBERS[Math.floor(Math.random() * VOYAGE_NUMBERS.length)];
}

module.exports = { listAllNodes, getTransitEdge };
