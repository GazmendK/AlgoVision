"use strict";


function createDefaultGraph() {
  const nodes = [
    { id: 'A', x: 0.15, y: 0.5 },
    { id: 'B', x: 0.35, y: 0.2 },
    { id: 'C', x: 0.35, y: 0.8 },
    { id: 'D', x: 0.55, y: 0.4 },
    { id: 'E', x: 0.55, y: 0.7 },
    { id: 'F', x: 0.75, y: 0.25 },
    { id: 'G', x: 0.75, y: 0.6 },
    { id: 'H', x: 0.88, y: 0.45 },
  ];
  const edges = [
    { from: 'A', to: 'B', weight: 4 },
    { from: 'A', to: 'C', weight: 2 },
    { from: 'B', to: 'D', weight: 3 },
    { from: 'B', to: 'F', weight: 6 },
    { from: 'C', to: 'E', weight: 5 },
    { from: 'D', to: 'G', weight: 2 },
    { from: 'D', to: 'F', weight: 1 },
    { from: 'E', to: 'G', weight: 3 },
    { from: 'F', to: 'H', weight: 2 },
    { from: 'G', to: 'H', weight: 4 },
    { from: 'C', to: 'D', weight: 2 },
  ];
  return { nodes, edges };
}



function* bfsGen(graphData, startId, endId) {
  const { nodes, edges } = graphData;
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) { adj[e.from].push(e.to); adj[e.to].push(e.from); }

  const visited = new Set([startId]);
  const queue = [startId];
  const parent = { [startId]: null };
  const state = { visited: new Set([startId]), current: null, queue: [startId], path: [] };

  yield { ...state, msg: `BFS Start: Enqueue ${startId}. Queue: [${queue}]`, codeTrigger: 'init' };

  while (queue.length) {
    const node = queue.shift();
    state.current = node;

    yield { ...state, current: node, msg: `Dequeued: ${node}. Exploring neighbors...`, codeTrigger: 'dequeue' };

    if (endId && node === endId) {
      let p = node, path = [];
      while (p !== null) { path.unshift(p); p = parent[p]; }
      yield { ...state, current: node, path, msg: `✅ Reached ${endId}! Path: ${path.join(' → ')}`, done: true, codeTrigger: 'check' };
      return;
    }

    for (const neighbor of adj[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent[neighbor] = node;
        queue.push(neighbor);
        state.queue = [...queue];
        state.visited = new Set(visited);
        yield { ...state, current: node, msg: `Visited ${neighbor} from ${node}. Queue: [${queue}]`, codeTrigger: 'enqueue' };
      }
    }
  }

  yield { ...state, msg: '✅ BFS complete! All reachable nodes visited.', done: true };
}



function* dfsGen(graphData, startId, endId) {
  const { nodes, edges } = graphData;
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) { adj[e.from].push(e.to); adj[e.to].push(e.from); }

  const visited = new Set();
  const stack = [startId];
  const parent = { [startId]: null };
  const state = { visited: new Set(), current: null, stack: [startId], path: [] };

  yield { ...state, msg: `DFS Start: Push ${startId} onto stack.`, codeTrigger: 'init' };

  while (stack.length) {
    const node = stack.pop();
    if (visited.has(node)) continue;
    visited.add(node);
    state.visited = new Set(visited);
    state.current = node;

    yield { ...state, msg: `Popped and visited: ${node}`, codeTrigger: 'visit' };

    if (endId && node === endId) {
      let p = node, path = [];
      while (p != null) { path.unshift(p); p = parent[p]; }
      yield { ...state, path, msg: `✅ Reached ${endId}! Path: ${path.join(' → ')}`, done: true };
      return;
    }

    for (const neighbor of [...adj[node]].reverse()) {
      if (!visited.has(neighbor)) {
        if (parent[neighbor] === undefined) parent[neighbor] = node;
        stack.push(neighbor);
        state.stack = [...stack];
        yield { ...state, msg: `Pushing neighbor ${neighbor} onto stack.`, codeTrigger: 'push' };
      }
    }
  }

  yield { ...state, msg: '✅ DFS complete!', done: true };
}



function* dijkstraGen(graphData, startId, endId) {
  const { nodes, edges } = graphData;
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) {
    adj[e.from].push({ to: e.to, weight: e.weight });
    adj[e.to].push({ to: e.from, weight: e.weight });
  }

  const dist = {};
  for (const n of nodes) dist[n.id] = Infinity;
  dist[startId] = 0;

  const settled = new Set();
  const parent = { [startId]: null };
  const pq = nodes.map(n => ({ id: n.id }));

  const getMin = () => {
    let minNode = null;
    for (const n of pq) {
      if (!settled.has(n.id) && (minNode === null || dist[n.id] < dist[minNode.id]))
        minNode = n;
    }
    return minNode;
  };

  yield { dist: { ...dist }, settled: new Set(), current: null, path: [], msg: `Dijkstra start. dist[${startId}]=0, all others=∞`, codeTrigger: 'init' };

  while (true) {
    const minNode = getMin();
    if (!minNode || dist[minNode.id] === Infinity) break;
    const u = minNode.id;
    settled.add(u);

    yield { dist: { ...dist }, settled: new Set(settled), current: u, path: [], msg: `Settled node ${u} with dist=${dist[u]}`, codeTrigger: 'extract' };

    if (endId && u === endId) {
      let p = u, path = [];
      while (p != null) { path.unshift(p); p = parent[p]; }
      yield { dist: { ...dist }, settled: new Set(settled), current: u, path, msg: `✅ Shortest path to ${u}: ${path.join(' → ')} (cost=${dist[u]})`, done: true };
      return;
    }

    for (const { to: v, weight: w } of adj[u]) {
      if (!settled.has(v) && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parent[v] = u;
        yield { dist: { ...dist }, settled: new Set(settled), current: u, relaxing: v, path: [], msg: `Relaxed: dist[${v}] = dist[${u}] + ${w} = ${dist[v]}`, codeTrigger: 'update' };
      }
    }
  }

  yield { dist: { ...dist }, settled: new Set(settled), current: null, path: [], msg: '✅ Dijkstra complete! All reachable nodes settled.', done: true };
}


function* astarGen(graphData, startId, endId) {
  const { nodes, edges } = graphData;
  const nodeMap = {};
  for (const n of nodes) nodeMap[n.id] = n;

  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) {
    adj[e.from].push({ to: e.to, weight: e.weight });
    adj[e.to].push({ to: e.from, weight: e.weight });
  }

  const heuristic = (a, b) => {
    const na = nodeMap[a], nb = nodeMap[b];
    return Math.sqrt((na.x - nb.x) ** 2 + (na.y - nb.y) ** 2) * 8;
  };

  if (!endId) endId = nodes[nodes.length - 1].id;

  const g = {}, f = {}, parent = {};
  for (const n of nodes) { g[n.id] = Infinity; f[n.id] = Infinity; }
  g[startId] = 0;
  f[startId] = heuristic(startId, endId);
  const open = new Set([startId]);
  const closed = new Set();
  parent[startId] = null;

  yield { g: { ...g }, f: { ...f }, open: new Set(open), closed: new Set(), current: null, path: [], msg: `A* start. g[${startId}]=0, f[${startId}]=${f[startId].toFixed(1)}`, codeTrigger: 'init' };

  while (open.size > 0) {
    let current = null;
    for (const n of open) {
      if (current === null || f[n] < f[current]) current = n;
    }

    if (current === endId) {
      let p = current, path = [];
      while (p != null) { path.unshift(p); p = parent[p]; }
      yield { g: { ...g }, f: { ...f }, open: new Set(open), closed: new Set(closed), current, path, msg: `✅ A* found path: ${path.join(' → ')} (cost=${g[endId].toFixed(1)})`, done: true };
      return;
    }

    open.delete(current);
    closed.add(current);

    yield { g: { ...g }, f: { ...f }, open: new Set(open), closed: new Set(closed), current, path: [], msg: `Expanding ${current}: g=${g[current].toFixed(1)}, f=${f[current].toFixed(1)}`, codeTrigger: 'extract' };

    for (const { to: neighbor, weight: w } of adj[current]) {
      if (closed.has(neighbor)) continue;
      const tentative_g = g[current] + w;

      if (tentative_g < g[neighbor]) {
        parent[neighbor] = current;
        g[neighbor] = tentative_g;
        f[neighbor] = tentative_g + heuristic(neighbor, endId);
        open.add(neighbor);
        yield {
          g: { ...g }, f: { ...f }, open: new Set(open), closed: new Set(closed),
          current, relaxing: neighbor, path: [],
          msg: `Updated ${neighbor}: g=${g[neighbor].toFixed(1)}, h=${heuristic(neighbor, endId).toFixed(1)}, f=${f[neighbor].toFixed(1)}`,
          codeTrigger: 'update'
        };
      }
    }
  }

  yield { g: { ...g }, f: { ...f }, open: new Set(), closed: new Set(closed), current: null, path: [], msg: '❌ No path found!', done: true };
}
