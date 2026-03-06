// ============================================================
// CLUSTERING ALGORITHMS
//
// 1. k-Means            — Iterative centroid-based partitioning
// 2. Hierarchical       — Agglomerative single/complete/average link
//
// k-Means yields canvas scatter-plot frames.
// Hierarchical yields canvas dendogram + heatmap frames.
// ============================================================

"use strict";

function _dist2D(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

// ──────────────────────────────────────────────────────────────
// 1. K-MEANS
// Frame: { type, points, centroids, k, iteration, changed, msg }
// points: [{ x, y, cluster }]
// centroids: [{ x, y, id }]
// ──────────────────────────────────────────────────────────────
function* kMeansGen(points, k, maxIter = 30) {
  const pts = points.map((p, i) => ({ ...p, cluster: -1, id: i }));

  // ── Random centroid initialization (k-means++ style) ──
  const centroids = [];
  // Pick first centroid randomly
  centroids.push({ ...pts[Math.floor(Math.random() * pts.length)], id: 0 });

  for (let c = 1; c < k; c++) {
    // Pick next: probability proportional to squared distance to nearest centroid
    const weights = pts.map(p => Math.min(...centroids.map(c => _dist2D(p, c) ** 2)));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let chosen = 0;
    for (let i = 0; i < pts.length; i++) { r -= weights[i]; if (r <= 0) { chosen = i; break; } }
    centroids.push({ ...pts[chosen], id: c });
  }

  yield {
    type: 'init', points: pts.map(p => ({ ...p })), centroids: centroids.map(c => ({ ...c })), k, iteration: 0,
    msg: `Initialized ${k} centroids using k-means++ seeding.`,
    codeTrigger: 'init'
  };

  for (let iter = 0; iter < maxIter; iter++) {
    // ── Assign step ──
    let changed = false;
    for (const p of pts) {
      const nearest = centroids.reduce((best, c) => _dist2D(p, c) < _dist2D(p, best) ? c : best, centroids[0]);
      if (nearest.id !== p.cluster) { p.cluster = nearest.id; changed = true; }
    }

    yield {
      type: 'assign', points: pts.map(p => ({ ...p })), centroids: centroids.map(c => ({ ...c })),
      k, iteration: iter + 1, changed,
      msg: `Iter ${iter + 1}: Assigned all points to nearest centroid. ${changed ? 'Assignments changed.' : 'No changes (converged).'} `,
      codeTrigger: 'assign'
    };

    if (!changed) {
      yield {
        type: 'done', points: pts.map(p => ({ ...p })), centroids: centroids.map(c => ({ ...c })),
        k, iteration: iter + 1, changed: false,
        msg: `✅ Converged after ${iter + 1} iteration(s). ${k} stable clusters found.`,
        done: true, codeTrigger: 'result'
      };
      return;
    }

    // ── Update step ──
    for (let c = 0; c < k; c++) {
      const members = pts.filter(p => p.cluster === c);
      if (members.length === 0) continue;
      centroids[c].x = members.reduce((s, p) => s + p.x, 0) / members.length;
      centroids[c].y = members.reduce((s, p) => s + p.y, 0) / members.length;
    }

    yield {
      type: 'update', points: pts.map(p => ({ ...p })), centroids: centroids.map(c => ({ ...c })),
      k, iteration: iter + 1,
      msg: `Iter ${iter + 1}: Updated centroid positions to cluster means.`,
      codeTrigger: 'update'
    };
  }

  yield {
    type: 'done', points: pts.map(p => ({ ...p })), centroids: centroids.map(c => ({ ...c })),
    k, iteration: maxIter,
    msg: `Reached max iterations (${maxIter}). Final clustering shown.`,
    done: true, codeTrigger: 'result'
  };
}

// ──────────────────────────────────────────────────────────────
// 2. HIERARCHICAL AGGLOMERATIVE CLUSTERING
// Single-linkage (nearest neighbor).
// Frame: { type, clusters, dist, mergeA, mergeB, tree, msg }
// ──────────────────────────────────────────────────────────────
function* hierarchicalClusteringGen(points, linkage = 'average') {
  const n = points.length;
  const pts = points.map((p, i) => ({ ...p, id: i, label: `P${i + 1}` }));

  // Initial distance matrix
  const dist = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 0 : _dist2D(pts[i], pts[j]))
  );

  let clusters = pts.map((p, i) => ({ id: i, label: p.label, members: [i], x: p.x, y: p.y }));
  const mergeHistory = []; // [{ a, b, dist, newId }]
  let nextId = n;

  yield {
    type: 'init', clusters: clusters.map(c => ({ ...c })), dist: dist.map(r => [...r]), points: pts, mergeHistory: [],
    msg: `Hierarchical clustering (${linkage} linkage) initialized with ${n} points.`,
    codeTrigger: 'init'
  };

  while (clusters.length > 1) {
    // Find minimum distance between clusters
    let minD = Infinity, minA = 0, minB = 1;
    for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        let d;
        if (linkage === 'single') {
          // Single: minimum of all pairs
          d = Math.min(...clusters[a].members.flatMap(m1 =>
            clusters[b].members.map(m2 => dist[m1][m2])
          ));
        } else if (linkage === 'complete') {
          // Complete: maximum of all pairs
          d = Math.max(...clusters[a].members.flatMap(m1 =>
            clusters[b].members.map(m2 => dist[m1][m2])
          ));
        } else {
          // Average: mean of all pairs
          const pairs = clusters[a].members.flatMap(m1 => clusters[b].members.map(m2 => dist[m1][m2]));
          d = pairs.reduce((s, v) => s + v, 0) / pairs.length;
        }
        if (d < minD) { minD = d; minA = a; minB = b; }
      }
    }

    const cA = clusters[minA], cB = clusters[minB];
    const newCluster = {
      id: nextId++,
      label: `(${cA.label},${cB.label})`,
      members: [...cA.members, ...cB.members],
      x: (cA.x * cA.members.length + cB.x * cB.members.length) / (cA.members.length + cB.members.length),
      y: (cA.y * cA.members.length + cB.y * cB.members.length) / (cA.members.length + cB.members.length),
    };

    mergeHistory.push({ a: cA.id, b: cB.id, aLabel: cA.label, bLabel: cB.label, dist: minD, newId: newCluster.id });

    yield {
      type: 'merge', clusters: clusters.map(c => ({ ...c })), mergeA: cA, mergeB: cB,
      newCluster, mergeHistory: mergeHistory.map(m => ({ ...m })), dist: minD, points: pts,
      msg: `Merging "${cA.label}" + "${cB.label}" (distance = ${minD.toFixed(3)})`,
      codeTrigger: 'merge'
    };

    clusters.splice(Math.max(minA, minB), 1);
    clusters.splice(Math.min(minA, minB), 1);
    clusters.push(newCluster);
  }

  yield {
    type: 'done', clusters, mergeHistory, points: pts,
    msg: `✅ Hierarchical clustering complete. All ${n} points merged.`,
    done: true, codeTrigger: 'result'
  };
}

// ── Random point generator (for App.js default data) ──────────
function generateClusterPoints(n = 40, k = 3, spread = 0.15) {
  const centers = Array.from({ length: k }, () => ({
    x: 0.15 + Math.random() * 0.7,
    y: 0.15 + Math.random() * 0.7
  }));
  return Array.from({ length: n }, (_, i) => {
    const c = centers[i % k];
    return {
      x: Math.min(0.95, Math.max(0.05, c.x + (Math.random() - 0.5) * spread * 2)),
      y: Math.min(0.95, Math.max(0.05, c.y + (Math.random() - 0.5) * spread * 2))
    };
  });
}
