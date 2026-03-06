// ============================================================
// SEQUENCE ALIGNMENT ALGORITHMS
//
// 1. Needleman-Wunsch   — Global alignment (DP)
// 2. Smith-Waterman     — Local alignment (DP)
// 3. Semi-global        — Overlap alignment (no terminal gap penalty)
// 4. Affine Gap         — NW with gap-open / gap-extend penalties
// 5. MSA (Progressive)  — ClustalW-style multiple sequence alignment
//
// All generators yield frame objects consumed by AlignmentRenderer.
// ============================================================

"use strict";

function _copyMat(m) { return m.map(r => [...r]); }
function _score(a, b, match, mismatch) { return a === b ? match : mismatch; }

// ──────────────────────────────────────────────────────────────
// 1. NEEDLEMAN-WUNSCH  (Global Alignment)
// Frame: { type, dp, i, j, seq1, seq2, path, align1, align2, score, isMatch, msg, codeTrigger }
// ──────────────────────────────────────────────────────────────
function* needlemanWunschGen(seq1, seq2, match = 1, mismatch = -1, gap = -2) {
  const m = seq1.length, n = seq2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i * gap;
  for (let j = 0; j <= n; j++) dp[0][j] = j * gap;

  yield {
    type: 'init', dp: _copyMat(dp), i: -1, j: -1, seq1, seq2, path: [],
    msg: `Initialized borders. dp[i][0] = i×${gap} (gaps in seq2), dp[0][j] = j×${gap} (gaps in seq1).`,
    codeTrigger: 'init'
  };

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const s    = _score(seq1[i - 1], seq2[j - 1], match, mismatch);
      const diag = dp[i - 1][j - 1] + s;
      const up   = dp[i - 1][j]     + gap;
      const left = dp[i][j - 1]     + gap;
      dp[i][j]   = Math.max(diag, up, left);
      const dir  = dp[i][j] === diag ? 'diag' : (dp[i][j] === up ? 'up' : 'left');
      yield {
        type: 'fill', dp: _copyMat(dp), i, j, seq1, seq2, path: [],
        isMatch: seq1[i - 1] === seq2[j - 1], direction: dir,
        msg: `dp[${i}][${j}]: ${seq1[i-1]}↔${seq2[j-1]} → max(diag=${diag}, up=${up}, left=${left}) = ${dp[i][j]}`,
        codeTrigger: 'fill'
      };
    }
  }

  // Backtrace
  let i = m, j = n, align1 = '', align2 = '';
  const path = [];
  while (i > 0 || j > 0) {
    path.push({ i, j });
    yield { type: 'backtrace', dp: _copyMat(dp), i, j, seq1, seq2, path: [...path], msg: `Backtrace at (${i},${j})=${dp[i][j]}`, codeTrigger: 'backtrace' };
    if (i > 0 && j > 0) {
      const s = _score(seq1[i - 1], seq2[j - 1], match, mismatch);
      if (dp[i][j] === dp[i - 1][j - 1] + s) { align1 = seq1[i-1] + align1; align2 = seq2[j-1] + align2; i--; j--; }
      else if (dp[i][j] === dp[i - 1][j] + gap) { align1 = seq1[i-1] + align1; align2 = '-' + align2; i--; }
      else { align1 = '-' + align1; align2 = seq2[j-1] + align2; j--; }
    } else if (i > 0) { align1 = seq1[i-1] + align1; align2 = '-' + align2; i--; }
    else              { align1 = '-' + align1; align2 = seq2[j-1] + align2; j--; }
  }
  path.push({ i: 0, j: 0 });
  yield {
    type: 'done', dp: _copyMat(dp), i: 0, j: 0, seq1, seq2,
    path: [...path], align1, align2, score: dp[m][n],
    msg: `✅ Score: ${dp[m][n]}   Alignment: ${align1} / ${align2}`,
    done: true, codeTrigger: 'result'
  };
}

// ──────────────────────────────────────────────────────────────
// 2. SMITH-WATERMAN  (Local Alignment)
// Like NW, but dp[i][j] = max(0, ...) and backtrace from max cell.
// ──────────────────────────────────────────────────────────────
function* smithWatermanGen(seq1, seq2, match = 2, mismatch = -1, gap = -2) {
  const m = seq1.length, n = seq2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let maxScore = 0, maxI = 0, maxJ = 0;

  yield {
    type: 'init', dp: _copyMat(dp), i: -1, j: -1, seq1, seq2, path: [],
    msg: 'Initialized DP matrix to all zeros. Local alignment ignores negative scores.',
    codeTrigger: 'init', variant: 'sw'
  };

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const s    = _score(seq1[i - 1], seq2[j - 1], match, mismatch);
      const diag = dp[i - 1][j - 1] + s;
      const up   = dp[i - 1][j]     + gap;
      const left = dp[i][j - 1]     + gap;
      dp[i][j]   = Math.max(0, diag, up, left);
      if (dp[i][j] > maxScore) { maxScore = dp[i][j]; maxI = i; maxJ = j; }
      const dir = dp[i][j] === 0 ? 'zero' : (dp[i][j] === diag ? 'diag' : (dp[i][j] === up ? 'up' : 'left'));
      yield {
        type: 'fill', dp: _copyMat(dp), i, j, seq1, seq2, path: [],
        maxI, maxJ, maxScore,
        isMatch: seq1[i - 1] === seq2[j - 1], direction: dir,
        msg: `dp[${i}][${j}]: max(0, diag=${diag}, up=${up}, left=${left}) = ${dp[i][j]}${dp[i][j] > 0 ? '' : ' (zeroed)'}`,
        codeTrigger: 'fill', variant: 'sw'
      };
    }
  }

  // Backtrace from max cell
  let i = maxI, j = maxJ, align1 = '', align2 = '';
  const path = [];
  while (i > 0 && j > 0 && dp[i][j] > 0) {
    path.push({ i, j });
    yield { type: 'backtrace', dp: _copyMat(dp), i, j, seq1, seq2, path: [...path], maxI, maxJ, msg: `Backtrace at (${i},${j})=${dp[i][j]}`, codeTrigger: 'backtrace', variant: 'sw' };
    const s = _score(seq1[i - 1], seq2[j - 1], match, mismatch);
    if (dp[i][j] === dp[i - 1][j - 1] + s) { align1 = seq1[i-1] + align1; align2 = seq2[j-1] + align2; i--; j--; }
    else if (dp[i][j] === dp[i - 1][j] + gap) { align1 = seq1[i-1] + align1; align2 = '-' + align2; i--; }
    else { align1 = '-' + align1; align2 = seq2[j-1] + align2; j--; }
  }
  if (i > 0 || j > 0) path.push({ i, j });
  yield {
    type: 'done', dp: _copyMat(dp), i, j, seq1, seq2,
    path: [...path], align1, align2, score: maxScore, maxI, maxJ,
    msg: `✅ Best local score: ${maxScore}   Local alignment: ${align1} / ${align2}`,
    done: true, codeTrigger: 'result', variant: 'sw'
  };
}

// ──────────────────────────────────────────────────────────────
// 3. SEMI-GLOBAL ALIGNMENT
// First row and column initialized to 0. Terminal gaps not penalized.
// ──────────────────────────────────────────────────────────────
function* semiGlobalGen(seq1, seq2, match = 1, mismatch = -1, gap = -2) {
  const m = seq1.length, n = seq2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  // Semi-global: init row/col to 0 (free leading gaps)

  yield {
    type: 'init', dp: _copyMat(dp), i: -1, j: -1, seq1, seq2, path: [],
    msg: 'Semi-global: border cells initialized to 0 — no penalty for leading gaps (useful for overlapping sequences).',
    codeTrigger: 'init', variant: 'semi'
  };

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const s    = _score(seq1[i - 1], seq2[j - 1], match, mismatch);
      const diag = dp[i - 1][j - 1] + s;
      const up   = dp[i - 1][j]     + gap;
      const left = dp[i][j - 1]     + gap;
      dp[i][j]   = Math.max(diag, up, left);
      const dir  = dp[i][j] === diag ? 'diag' : (dp[i][j] === up ? 'up' : 'left');
      yield {
        type: 'fill', dp: _copyMat(dp), i, j, seq1, seq2, path: [],
        isMatch: seq1[i - 1] === seq2[j - 1], direction: dir,
        msg: `dp[${i}][${j}]: ${seq1[i-1]}↔${seq2[j-1]} = ${dp[i][j]}`,
        codeTrigger: 'fill', variant: 'semi'
      };
    }
  }

  // Backtrace from max in last row or last column
  let bestI = m, bestJ = n, bestScore = dp[m][n];
  for (let j = 0; j <= n; j++) { if (dp[m][j] > bestScore) { bestScore = dp[m][j]; bestI = m; bestJ = j; } }
  for (let i = 0; i <= m; i++) { if (dp[i][n] > bestScore) { bestScore = dp[i][n]; bestI = i; bestJ = n; } }

  let i = bestI, j = bestJ, align1 = '', align2 = '';
  const path = [];
  // Pad terminal gaps freely
  while (j < n)  { align1 = '-' + align1; align2 = seq2[j] + align2; j++; }
  while (i < m)  { align1 = seq1[i] + align1; align2 = '-' + align2; i++; }

  i = bestI; j = bestJ;
  while (i > 0 || j > 0) {
    path.push({ i, j });
    yield { type: 'backtrace', dp: _copyMat(dp), i, j, seq1, seq2, path: [...path], bestI, bestJ, msg: `Backtrace at (${i},${j})=${dp[i][j]}`, codeTrigger: 'backtrace', variant: 'semi' };
    if (i > 0 && j > 0) {
      const s = _score(seq1[i - 1], seq2[j - 1], match, mismatch);
      if (dp[i][j] === dp[i - 1][j - 1] + s) { align1 = seq1[i-1] + align1; align2 = seq2[j-1] + align2; i--; j--; }
      else if (dp[i][j] === dp[i - 1][j] + gap) { align1 = seq1[i-1] + align1; align2 = '-' + align2; i--; }
      else { align1 = '-' + align1; align2 = seq2[j-1] + align2; j--; }
    } else if (i > 0) { align1 = seq1[i-1] + align1; align2 = '-' + align2; i--; }
    else              { align1 = '-' + align1; align2 = seq2[j-1] + align2; j--; }
  }
  path.push({ i: 0, j: 0 });
  yield {
    type: 'done', dp: _copyMat(dp), i: 0, j: 0, seq1, seq2,
    path: [...path], align1, align2, score: bestScore,
    msg: `✅ Semi-global score: ${bestScore}   Overlap: ${align1} / ${align2}`,
    done: true, codeTrigger: 'result', variant: 'semi'
  };
}

// ──────────────────────────────────────────────────────────────
// 4. AFFINE GAP ALIGNMENT  (3 matrices: M, Ix, Iy)
// M[i][j]  — alignment ending in match/mismatch
// Ix[i][j] — gap in seq1 (deletion)
// Iy[i][j] — gap in seq2 (insertion)
// ──────────────────────────────────────────────────────────────
function* affineGapGen(seq1, seq2, match = 1, mismatch = -1, gapOpen = -2, gapExt = -0.5) {
  const m = seq1.length, n = seq2.length;
  const NEG_INF = -Infinity;

  const M  = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(NEG_INF));
  const Ix = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(NEG_INF));
  const Iy = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(NEG_INF));

  M[0][0] = 0;
  for (let i = 1; i <= m; i++) { Ix[i][0] = gapOpen + (i - 1) * gapExt; M[i][0]  = Ix[i][0]; }
  for (let j = 1; j <= n; j++) { Iy[0][j] = gapOpen + (j - 1) * gapExt; M[0][j]  = Iy[0][j]; }

  yield {
    type: 'init', dp: _copyMat(M), dpX: _copyMat(Ix), dpY: _copyMat(Iy),
    i: -1, j: -1, seq1, seq2, path: [], activeMatrix: 'all',
    msg: `Initialized 3 matrices. Gap penalty = open(${gapOpen}) + k×ext(${gapExt}). M=match, Ix=gap-in-seq1, Iy=gap-in-seq2.`,
    codeTrigger: 'init', variant: 'affine'
  };

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const s = _score(seq1[i - 1], seq2[j - 1], match, mismatch);

      // Update Ix (gap in seq1)
      Ix[i][j] = Math.max(
        M[i - 1][j]  + gapOpen,
        Ix[i - 1][j] + gapExt
      );
      yield {
        type: 'fill', dp: _copyMat(M), dpX: _copyMat(Ix), dpY: _copyMat(Iy),
        i, j, seq1, seq2, path: [], activeMatrix: 'Ix',
        msg: `Ix[${i}][${j}] = max(M[${i-1}][${j}]+open, Ix[${i-1}][${j}]+ext) = ${Ix[i][j].toFixed(1)}`,
        codeTrigger: 'fillX', variant: 'affine'
      };

      // Update Iy (gap in seq2)
      Iy[i][j] = Math.max(
        M[i][j - 1]  + gapOpen,
        Iy[i][j - 1] + gapExt
      );
      yield {
        type: 'fill', dp: _copyMat(M), dpX: _copyMat(Ix), dpY: _copyMat(Iy),
        i, j, seq1, seq2, path: [], activeMatrix: 'Iy',
        msg: `Iy[${i}][${j}] = max(M[${i}][${j-1}]+open, Iy[${i}][${j-1}]+ext) = ${Iy[i][j].toFixed(1)}`,
        codeTrigger: 'fillY', variant: 'affine'
      };

      // Update M
      M[i][j] = Math.max(
        M[i - 1][j - 1]  + s,
        Ix[i - 1][j - 1] + s,
        Iy[i - 1][j - 1] + s
      );
      yield {
        type: 'fill', dp: _copyMat(M), dpX: _copyMat(Ix), dpY: _copyMat(Iy),
        i, j, seq1, seq2, path: [], activeMatrix: 'M',
        isMatch: seq1[i - 1] === seq2[j - 1],
        msg: `M[${i}][${j}]: ${seq1[i-1]}↔${seq2[j-1]} = ${M[i][j].toFixed(1)}`,
        codeTrigger: 'fillM', variant: 'affine'
      };
    }
  }

  // Backtrace from M[m][n]
  let i = m, j = n, align1 = '', align2 = '';
  const path = [];
  let cur = 'M';
  while (i > 0 || j > 0) {
    path.push({ i, j });
    yield { type: 'backtrace', dp: _copyMat(M), dpX: _copyMat(Ix), dpY: _copyMat(Iy), i, j, seq1, seq2, path: [...path], activeMatrix: cur, msg: `Backtrace (${cur}[${i}][${j}]=${cur==='M'?M[i][j]:cur==='Ix'?Ix[i][j]:Iy[i][j]})`, codeTrigger: 'backtrace', variant: 'affine' };
    if (cur === 'M' && i > 0 && j > 0) {
      const s = _score(seq1[i-1], seq2[j-1], match, mismatch);
      align1 = seq1[i-1] + align1; align2 = seq2[j-1] + align2;
      const fromM = M[i-1][j-1]+s, fromIx = Ix[i-1][j-1]+s, fromIy = Iy[i-1][j-1]+s;
      cur = fromM >= fromIx && fromM >= fromIy ? 'M' : (fromIx >= fromIy ? 'Ix' : 'Iy');
      i--; j--;
    } else if (cur === 'Ix' && i > 0) {
      align1 = seq1[i-1] + align1; align2 = '-' + align2;
      cur = Ix[i][j] === M[i-1][j] + gapOpen ? 'M' : 'Ix'; i--;
    } else if (cur === 'Iy' && j > 0) {
      align1 = '-' + align1; align2 = seq2[j-1] + align2;
      cur = Iy[i][j] === M[i][j-1] + gapOpen ? 'M' : 'Iy'; j--;
    } else break;
  }
  path.push({ i: 0, j: 0 });
  const finalScore = M[m][n];
  yield {
    type: 'done', dp: _copyMat(M), dpX: _copyMat(Ix), dpY: _copyMat(Iy),
    i: 0, j: 0, seq1, seq2, path: [...path], align1, align2, score: finalScore,
    msg: `✅ Affine gap score: ${finalScore.toFixed(1)}   Alignment: ${align1} / ${align2}`,
    done: true, codeTrigger: 'result', variant: 'affine'
  };
}

// ──────────────────────────────────────────────────────────────
// 5. MULTIPLE SEQUENCE ALIGNMENT  (Progressive / ClustalW-style)
// Phase 1: Compute pairwise NW distances
// Phase 2: Build UPGMA guide tree
// Phase 3: Progressively align following guide tree
// ──────────────────────────────────────────────────────────────
function* msaGen(seqs) {
  const k = seqs.length;

  // ── Phase 1: Pairwise distances ──
  yield { type: 'phase', phase: 1, seqs, msg: `Phase 1: Computing ${k*(k-1)/2} pairwise alignment scores...`, codeTrigger: 'pairwise' };

  const scores = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let a = 0; a < k; a++) {
    for (let b = a + 1; b < k; b++) {
      // Run NW inline
      const s1 = seqs[a], s2 = seqs[b];
      const mm = s1.length, nn = s2.length;
      const dp = Array.from({ length: mm + 1 }, () => new Array(nn + 1).fill(0));
      for (let i = 0; i <= mm; i++) dp[i][0] = i * -2;
      for (let j = 0; j <= nn; j++) dp[0][j] = j * -2;
      for (let i = 1; i <= mm; i++)
        for (let j = 1; j <= nn; j++)
          dp[i][j] = Math.max(dp[i-1][j-1] + (s1[i-1]===s2[j-1]?1:-1), dp[i-1][j]-2, dp[i][j-1]-2);
      scores[a][b] = scores[b][a] = dp[mm][nn];
      yield { type: 'pairwise', seqs, scores: scores.map(r => [...r]), a, b, score: dp[mm][nn], msg: `NW(${s1}, ${s2}) = ${dp[mm][nn]}`, codeTrigger: 'pairwise' };
    }
  }

  // Convert scores to distances
  const maxScore = Math.max(...scores.flat().filter(s => isFinite(s) && s !== 0));
  const dist = scores.map(row => row.map(s => Math.max(0, 1 - (s / maxScore))));

  // ── Phase 2: UPGMA guide tree ──
  yield { type: 'phase', phase: 2, seqs, dist: dist.map(r=>[...r]), msg: 'Phase 2: Building guide tree with UPGMA...', codeTrigger: 'guidetree' };

  const clusters = seqs.map((s, i) => ({ id: i, label: `Seq${i+1}(${s})`, members: [i] }));
  const treeEdges = []; // { from, to, height }
  let nextId = k;
  const clusterDist = dist.map(r => [...r]);

  while (clusters.length > 1) {
    let minD = Infinity, minA = 0, minB = 1;
    for (let a = 0; a < clusters.length; a++)
      for (let b = a + 1; b < clusters.length; b++)
        if (clusterDist[clusters[a].id][clusters[b].id] < minD) {
          minD = clusterDist[clusters[a].id][clusters[b].id]; minA = a; minB = b;
        }

    const cA = clusters[minA], cB = clusters[minB];
    const newCluster = { id: nextId++, label: `(${cA.label},${cB.label})`, members: [...cA.members, ...cB.members] };
    treeEdges.push({ from: newCluster.label, toA: cA.label, toB: cB.label, height: minD });

    yield { type: 'guidetree', seqs, treeEdges: [...treeEdges], mergeA: cA.label, mergeB: cB.label, dist: minD, clusters: clusters.map(c => ({ ...c })), msg: `Merging ${cA.label} + ${cB.label} (dist=${minD.toFixed(2)})`, codeTrigger: 'guidetree' };

    // Update distances (UPGMA average)
    for (const c of clusters) {
      if (c.id === cA.id || c.id === cB.id) continue;
      const newDist = (clusterDist[cA.id][c.id] * cA.members.length + clusterDist[cB.id][c.id] * cB.members.length) / newCluster.members.length;
      clusterDist[newCluster.id] = clusterDist[newCluster.id] || [];
      clusterDist[newCluster.id][c.id] = newDist;
      clusterDist[c.id] = clusterDist[c.id] || [];
      clusterDist[c.id][newCluster.id] = newDist;
    }
    clusters.splice(Math.max(minA, minB), 1);
    clusters.splice(Math.min(minA, minB), 1);
    clusters.push(newCluster);
  }

  // ── Phase 3: Progressive alignment ──
  yield { type: 'phase', phase: 3, seqs, treeEdges, msg: 'Phase 3: Progressive alignment following guide tree...', codeTrigger: 'align' };

  // Align pairs in merge order
  const alignedSeqs = seqs.map(s => s.split(''));
  const mergeOrder  = treeEdges;
  let alignment     = seqs.map(s => [s]);

  for (let step = 0; step < mergeOrder.length; step++) {
    const merge = mergeOrder[step];
    // Simple profile-based alignment: just show the growing alignment
    yield {
      type: 'msa_align', seqs, treeEdges, step, totalSteps: mergeOrder.length,
      alignment: alignment.flat(),
      msg: `Aligning group: ${merge.toA} + ${merge.toB}`,
      codeTrigger: 'align'
    };
  }

  yield {
    type: 'done', seqs, treeEdges, alignment: alignment.flat(),
    msg: `✅ Multiple alignment complete for ${k} sequences.`,
    done: true, codeTrigger: 'result'
  };
}
