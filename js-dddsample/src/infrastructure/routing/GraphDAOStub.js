'use strict';

const ALL_NODES = [
  'CNHKG','AUMEL','SESTO','FIHEL','USCHI','JNTKO','DEHAM','CNSHA','NLRTM','SEGOT','CNHGH','USNYC','USDAL'
];
const VOYAGE_NUMBERS = ['0100S','0200T','0300A','0301S','0400S'];

class GraphDAOStub {
  listAllNodes() {
    return [...ALL_NODES];
  }

  getTransitEdge(from, to) {
    const i = Math.floor(Math.random() * VOYAGE_NUMBERS.length);
    return VOYAGE_NUMBERS[i];
  }
}

module.exports = GraphDAOStub;
