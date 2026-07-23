'use strict';

/**
 * Stub for the graph database — top-level pure functions.
 * Constants are defined inside each function (no module-level variables).
 */

function listAllNodes() {
  const ALL_NODES = [
    'CNHKG','AUMEL','SESTO','FIHEL','USCHI','JNTKO','DEHAM','CNSHA','NLRTM','SEGOT','CNHGH','USNYC','USDAL'
  ];
  return [...ALL_NODES];
}

function getTransitEdge(from, to) {
  const VOYAGE_NUMBERS = ['0100S','0200T','0300A','0301S','0400S'];
  return VOYAGE_NUMBERS[Math.floor(Math.random() * VOYAGE_NUMBERS.length)];
}

module.exports = { listAllNodes, getTransitEdge };
