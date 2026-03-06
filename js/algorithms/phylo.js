// ============================================================
// PHYLOGENETIC TREE ALGORITHMS
//
// 1. UPGMA            — Agglomerative distance-based clustering
// 2. Neighbor-Joining — Star decomposition, minimizes tree length
// 3. Maximum Parsimony — Minimum mutations approach
// 4. Maximum Likelihood — Probabilistic Jukes-Cantor model
//
// All generators yield canvas-renderable frames.
// Tree nodes: { id, label, children:[], height, x?, y? }
// ============================================================

"use strict";

// ──────────────────────────────────────────────────────────────
// 1. UPGMA
// Repeatedly merge the two closest clusters, building a
// rooted dendogram with branch heights = distance / 2.
// ──────────────────────────────────────────────────────────────
function* upgmaGen(taxa, distances) {
  const n = taxa.length;
  let dist = distances.map(row => [...row]);
  let nodes = taxa.map((t, i) => ({ id: String(i), label: t, children: [], height: 0, size: 1 }));

  yield {
    type: 'init', nodes: nodes.map(n => ({ ...n })), dist: dist.map(r => [...r]), taxa,
    merge: null,
    msg: `UPGMA initialized with ${n} taxa. Distance matrix loaded.`,
    codeTrigger: 'init'
  };

  let nextId = n;
  while (nodes.length > 1) {
    // Find minimum distance pair
    let minD = Infinity, minI = 0, minJ = 1;
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dist[parseInt(nodes[i].id)][parseInt(nodes[j].id)];
        if (d < minD) { minD = d; minI = i; minJ = j; }
      }

    yield {
      type: 'select', nodes: nodes.map(n => ({ ...n })), dist: dist.map(r => [...r]), taxa,
      mergeI: minI, mergeJ: minJ, minDist: minD,
      msg: `Closest pair: ${nodes[minI].label} ↔ ${nodes[minJ].label} (dist = ${minD.toFixed(3)})`,
      codeTrigger: 'select'
    };

    const nI = nodes[minI], nJ = nodes[minJ];
    const newHeight = minD / 2;
    const newNode = {
      id: String(nextId++),
      label: `(${nI.label},${nJ.label})`,
      children: [nI, nJ],
      height: newHeight,
      size: nI.size + nJ.size
    };

    // Update distance matrix (UPGMA: weighted average)
    const newIdx = parseInt(newNode.id);
    dist[newIdx] = []; dist.forEach((_, k) => { dist[k][newIdx] = 0; });
    for (let k = 0; k < nodes.length; k++) {
      if (k === minI || k === minJ) continue;
      const ki = parseInt(nodes[k].id);
      const newDist = (dist[parseInt(nI.id)][ki] * nI.size + dist[parseInt(nJ.id)][ki] * nJ.size) / newNode.size;
      dist[newIdx][ki] = newDist;
      dist[ki][newIdx] = newDist;
    }
    dist[newIdx][newIdx] = 0;

    const oldNodes = nodes.map(n => ({ ...n }));
    nodes.splice(Math.max(minI, minJ), 1);
    nodes.splice(Math.min(minI, minJ), 1);
    nodes.push(newNode);

    yield {
      type: 'merge', nodes: nodes.map(n => ({ ...n })), dist: dist.map(r => [...r]), taxa,
      newNode: { ...newNode }, mergedA: nI.label, mergedB: nJ.label, height: newHeight,
      msg: `Merged → new node "${newNode.label}" at height ${newHeight.toFixed(3)}`,
      codeTrigger: 'merge'
    };
  }

  yield {
    type: 'done', nodes, root: nodes[0], taxa,
    msg: `✅ UPGMA complete. Root: ${nodes[0].label}`,
    done: true, codeTrigger: 'result'
  };
}

// ──────────────────────────────────────────────────────────────
// 2. NEIGHBOR-JOINING
// Q-matrix method: minimizes total tree length.
// Each step computes Q, picks min, calculates branch lengths,
// creates new node, updates distance matrix.
// ──────────────────────────────────────────────────────────────
function* neighborJoiningGen(taxa, distances) {
  let dist = distances.map(row => [...row]);
  let labels = [...taxa];
  let n = labels.length;
  let treeEdges = []; // { from, to, length }

  yield {
    type: 'init', labels: [...labels], dist: dist.map(r => [...r]), treeEdges: [],
    msg: `NJ initialized with ${n} taxa.`,
    codeTrigger: 'init'
  };

  let nodeCounter = n;

  while (n > 2) {
    // Compute R (row sums)
    const R = new Array(n).fill(0);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) if (i !== j) R[i] += dist[i][j];

    // Compute Q matrix
    const Q = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) if (i !== j)
        Q[i][j] = (n - 2) * dist[i][j] - R[i] - R[j];

    // Find min Q
    let minQ = Infinity, minI = 0, minJ = 1;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (Q[i][j] < minQ) { minQ = Q[i][j]; minI = i; minJ = j; }

    yield {
      type: 'qmatrix', labels: [...labels], dist: dist.map(r => [...r]), Q: Q.map(r => [...r]), R: [...R],
      minI, minJ, treeEdges: [...treeEdges],
      msg: `Q-matrix computed. Minimum Q=${minQ.toFixed(2)} at (${labels[minI]}, ${labels[minJ]})`,
      codeTrigger: 'qmatrix'
    };

    // Branch lengths
    const dIJ = dist[minI][minJ];
    const limbI = dIJ / 2 + (R[minI] - R[minJ]) / (2 * (n - 2));
    const limbJ = dIJ - limbI;
    const newLabel = `u${nodeCounter++}`;

    treeEdges.push({ from: newLabel, to: labels[minI], length: limbI });
    treeEdges.push({ from: newLabel, to: labels[minJ], length: limbJ });

    yield {
      type: 'join', labels: [...labels], dist: dist.map(r => [...r]), treeEdges: [...treeEdges],
      newNode: newLabel, nodeI: labels[minI], nodeJ: labels[minJ], limbI, limbJ,
      msg: `Joining ${labels[minI]} (limb=${limbI.toFixed(3)}) + ${labels[minJ]} (limb=${limbJ.toFixed(3)}) → ${newLabel}`,
      codeTrigger: 'join'
    };

    // New distances to other nodes
    const newDist = [];
    for (let k = 0; k < n; k++) {
      if (k === minI || k === minJ) { newDist.push(0); continue; }
      newDist.push((dist[minI][k] + dist[minJ][k] - dIJ) / 2);
    }

    // Build new distance matrix without minI, minJ, add newLabel
    const keep = [];
    for (let i = 0; i < n; i++) if (i !== minI && i !== minJ) keep.push(i);

    const newD = Array.from({ length: keep.length + 1 }, () => new Array(keep.length + 1).fill(0));
    for (let a = 0; a < keep.length; a++)
      for (let b = 0; b < keep.length; b++)
        newD[a][b] = dist[keep[a]][keep[b]];

    for (let a = 0; a < keep.length; a++) {
      newD[a][keep.length] = newDist[keep[a]];
      newD[keep.length][a] = newDist[keep[a]];
    }

    dist   = newD;
    labels = [...keep.map(i => labels[i]), newLabel];
    n = labels.length;
  }

  // Final two nodes
  if (n === 2) {
    treeEdges.push({ from: labels[0], to: labels[1], length: dist[0][1] });
    yield { type: 'final', labels: [...labels], treeEdges: [...treeEdges], msg: `Final edge: ${labels[0]} ↔ ${labels[1]} (length=${dist[0][1].toFixed(3)})`, codeTrigger: 'final' };
  }

  yield {
    type: 'done', treeEdges, labels,
    msg: `✅ Neighbor-Joining complete. ${treeEdges.length} edges built.`,
    done: true, codeTrigger: 'result'
  };
}

// ──────────────────────────────────────────────────────────────
// 3. MAXIMUM PARSIMONY
// For small taxa sets: enumerate possible unrooted tree topologies,
// score each by Fitch parsimony (counting minimum mutations).
// ──────────────────────────────────────────────────────────────
function* maxParsimonyGen(taxa, sequences) {
  const n = taxa.length;

  // Generate all unrooted binary trees for n taxa (n<=5)
  // For 4 taxa, there are 3 possible topologies
  const topologies = _generateTopologies(taxa);

  yield {
    type: 'init', taxa, sequences, topologies, bestTree: null, bestScore: Infinity,
    msg: `Evaluating ${topologies.length} possible tree topologie(s) for ${n} taxa using Fitch parsimony.`,
    codeTrigger: 'init'
  };

  let bestScore = Infinity, bestTree = null;

  for (let ti = 0; ti < topologies.length; ti++) {
    const tree = topologies[ti];
    let totalScore = 0;

    // Fitch parsimony per site
    const siteScores = [];
    for (let site = 0; site < sequences[0].length; site++) {
      const siteScore = _fitchScore(tree, taxa, sequences, site);
      totalScore += siteScore;
      siteScores.push(siteScore);
    }

    if (totalScore < bestScore) { bestScore = totalScore; bestTree = tree; }

    yield {
      type: 'score', taxa, sequences, topologies, tree, treeIdx: ti,
      score: totalScore, siteScores, bestScore, bestTree,
      isBest: totalScore === bestScore,
      msg: `Tree ${ti + 1}/${topologies.length}: topology ${tree.name} → parsimony score = ${totalScore}${totalScore <= bestScore ? ' ★ best so far' : ''}`,
      codeTrigger: 'score'
    };
  }

  yield {
    type: 'done', taxa, sequences, topologies, bestTree, bestScore,
    msg: `✅ Most parsimonious tree: ${bestTree?.name} with score ${bestScore} (minimum mutations).`,
    done: true, codeTrigger: 'result'
  };
}

function _generateTopologies(taxa) {
  if (taxa.length === 4) {
    const [a, b, c, d] = taxa;
    return [
      { name: `((${a},${b}),(${c},${d}))`, splits: [[0,1],[2,3]] },
      { name: `((${a},${c}),(${b},${d}))`, splits: [[0,2],[1,3]] },
      { name: `((${a},${d}),(${b},${c}))`, splits: [[0,3],[1,2]] }
    ];
  }
  if (taxa.length === 3) {
    const [a, b, c] = taxa;
    return [{ name: `(${a},(${b},${c}))`, splits: [[1,2]] }];
  }
  // Fallback for 5 taxa: generate 15 topologies (simplified to 5 for display)
  const topos = [];
  for (let i = 0; i < taxa.length - 1; i++)
    for (let j = i + 1; j < taxa.length; j++) {
      const remaining = taxa.filter((_, k) => k !== i && k !== j);
      topos.push({ name: `((${taxa[i]},${taxa[j]}),${remaining.join(',')})`, splits: [[i,j]] });
    }
  return topos;
}

function _fitchScore(tree, taxa, sequences, site) {
  // Simplified Fitch: count mismatches across the tree splits
  let mutations = 0;
  for (const split of tree.splits) {
    const [a, b] = split;
    if (sequences[a][site] !== sequences[b][site]) mutations++;
  }
  return mutations;
}

// ──────────────────────────────────────────────────────────────
// 4. MAXIMUM LIKELIHOOD  (Jukes-Cantor model)
// Compute log-likelihood for each candidate tree topology
// under the Jukes-Cantor substitution model.
// P(observed | tree) = ∏_site P(site | topology, branch lengths)
// ──────────────────────────────────────────────────────────────
function* maxLikelihoodGen(taxa, sequences, branchLength = 0.1) {
  const topologies = _generateTopologies(taxa);

  yield {
    type: 'init', taxa, sequences, topologies, branchLength,
    msg: `Maximum Likelihood with Jukes-Cantor model. Branch length = ${branchLength}. Testing ${topologies.length} topologies.`,
    codeTrigger: 'init'
  };

  let bestLL = -Infinity, bestTree = null;
  const results = [];

  for (let ti = 0; ti < topologies.length; ti++) {
    const tree = topologies[ti];
    let logL = 0;
    const siteLLs = [];

    for (let site = 0; site < sequences[0].length; site++) {
      // Jukes-Cantor: P(same) = 0.25 + 0.75*exp(-4t/3), P(diff) = 0.25 - 0.25*exp(-4t/3)
      const t = branchLength;
      const pSame = 0.25 + 0.75 * Math.exp(-4 * t / 3);
      const pDiff = 0.25 - 0.25 * Math.exp(-4 * t / 3);

      let siteL = 1;
      for (const split of tree.splits) {
        const [a, b] = split;
        siteL *= sequences[a][site] === sequences[b][site] ? pSame : pDiff;
      }
      const siteLL = Math.log(Math.max(siteL, 1e-300));
      logL += siteLL;
      siteLLs.push(siteLL);
    }

    if (logL > bestLL) { bestLL = logL; bestTree = tree; }
    results.push({ tree, logL, siteLLs });

    yield {
      type: 'likelihood', taxa, sequences, tree, treeIdx: ti,
      logL, siteLLs, results: results.map(r => ({ ...r })), bestLL, bestTree,
      isBest: logL >= bestLL,
      msg: `Tree ${ti + 1}: ${tree.name} → lnL = ${logL.toFixed(4)}${logL >= bestLL ? ' ★ best' : ''}`,
      codeTrigger: 'likelihood'
    };
  }

  yield {
    type: 'done', taxa, sequences, results, bestTree, bestLL,
    msg: `✅ Best tree: ${bestTree?.name} with lnL = ${bestLL.toFixed(4)}`,
    done: true, codeTrigger: 'result'
  };
}
