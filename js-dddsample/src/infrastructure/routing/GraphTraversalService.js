'use strict';

/**
 * Pathfinder graph traversal service — generates transit paths.
 * Mirrors com.pathfinder.internal.GraphTraversalServiceImpl.
 */
class GraphTraversalService {
  /** @param {import('./GraphDAOStub')} dao */
  constructor(dao) {
    this._dao = dao;
  }

  /**
   * @param {string} originNode
   * @param {string} destinationNode
   * @param {object} [limitations]
   * @returns {{transitEdges: {edge:string, fromNode:string, toNode:string, fromDate:Date, toDate:Date}[]}[]}
   */
  findShortestPath(originNode, destinationNode, limitations) {
    let allVertices = this._dao.listAllNodes().filter(n => n !== originNode && n !== destinationNode);

    const candidateCount = 3 + Math.floor(Math.random() * 3);
    const candidates = [];

    for (let i = 0; i < candidateCount; i++) {
      const chunk = this._randomChunk(allVertices);
      const edges = [];
      let fromNode = originNode;
      let date = new Date();

      for (let j = 0; j <= chunk.length; j++) {
        const toNode = j >= chunk.length ? destinationNode : chunk[j];
        const fromDate = this._nextDate(date);
        const toDate = this._nextDate(fromDate);
        edges.push({
          edge: this._dao.getTransitEdge(fromNode, toNode),
          fromNode,
          toNode,
          fromDate,
          toDate,
        });
        fromNode = toNode;
        date = this._nextDate(toDate);
      }
      candidates.push({ transitEdges: edges });
    }

    return candidates;
  }

  _nextDate(date) {
    const offset = (24 * 60 + Math.floor(Math.random() * 1000) - 500) * 60 * 1000;
    return new Date(date.getTime() + offset);
  }

  _randomChunk(allNodes) {
    const shuffled = [...allNodes].sort(() => Math.random() - 0.5);
    const total = shuffled.length;
    const chunk = total > 4 ? 1 + Math.floor(Math.random() * 5) : total;
    return shuffled.slice(0, chunk);
  }
}

module.exports = GraphTraversalService;
