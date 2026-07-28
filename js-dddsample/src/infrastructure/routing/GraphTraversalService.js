function nextDate(date) {
  const offset = (24 * 60 + Math.floor(Math.random() * 1000) - 500) * 60 * 1000;
  return new Date(date.getTime() + offset);
}

function randomChunk(allNodes) {
  const shuffled = [...allNodes].sort(() => Math.random() - 0.5);
  const chunk = shuffled.length > 4 ? 1 + Math.floor(Math.random() * 5) : shuffled.length;
  return shuffled.slice(0, chunk);
}

function findShortestPath(listAllNodes, getTransitEdge, originNode, destinationNode, limitations) {
  const allVertices = listAllNodes().filter(n => n !== originNode && n !== destinationNode);
  const candidateCount = 3 + Math.floor(Math.random() * 3);
  const candidates = [];

  for (let i = 0; i < candidateCount; i++) {
    const chunk = randomChunk(allVertices);
    const edges = [];
    let fromNode = originNode;
    let date = new Date();

    for (let j = 0; j <= chunk.length; j++) {
      const toNode = j >= chunk.length ? destinationNode : chunk[j];
      const fromDate = nextDate(date);
      const toDate   = nextDate(fromDate);
      edges.push({ edge: getTransitEdge(fromNode, toNode), fromNode, toNode, fromDate, toDate });
      fromNode = toNode;
      date = nextDate(toDate);
    }
    candidates.push({ transitEdges: edges });
  }
  return candidates;
}

export { findShortestPath };
