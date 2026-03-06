// ============================================================
// CANVAS RENDERER
//
// Draws graph and tree visualizations onto a <canvas> element.
// All state coloring is driven by frame objects yielded from
// the algorithm generators — no algorithm logic lives here.
//
// Public API:
//   renderer.resize(w, h)
//   renderer.drawGraph(graphData, state?)
//   renderer.drawTree(root, highlightVal?, rotationNode?)
// ============================================================

"use strict";

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  // ── Helpers ───────────────────────────────────────────────
  resize(w, h) {
    this.canvas.width  = w;
    this.canvas.height = h;
  }

  get isDark() { return !document.body.classList.contains('light'); }

  clear() {
    const { ctx, canvas, isDark } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDark ? '#0d1117' : '#f6f8fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── Graph ──────────────────────────────────────────────────
  // state shape mirrors the frame objects from graph generators:
  //   { visited?, current?, settled?, closed?, open?, relaxing?,
  //     path?, dist?, g? }
  drawGraph(graphData, state = {}) {
    const { ctx, canvas, isDark } = this;
    const { nodes, edges } = graphData;
    const w = canvas.width, h = canvas.height;

    this.clear();
    const toX = n => n.x * w;
    const toY = n => n.y * h;
    const nodeMap = {};
    for (const n of nodes) nodeMap[n.id] = n;

    // ── Draw edges ──
    for (const e of edges) {
      const from = nodeMap[e.from], to = nodeMap[e.to];
      const isPath = state.path &&
        state.path.includes(e.from) && state.path.includes(e.to) &&
        Math.abs(state.path.indexOf(e.from) - state.path.indexOf(e.to)) === 1;

      ctx.beginPath();
      ctx.moveTo(toX(from), toY(from));
      ctx.lineTo(toX(to),   toY(to));
      ctx.strokeStyle = isPath ? '#bc8cff' : (isDark ? '#30363d' : '#c0c8d0');
      ctx.lineWidth   = isPath ? 3 : 1.5;
      ctx.stroke();

      // Weight label
      const mx = (toX(from) + toX(to)) / 2;
      const my = (toY(from) + toY(to)) / 2;
      ctx.fillStyle = isPath ? '#bc8cff' : (isDark ? '#484f58' : '#9198a1');
      ctx.font      = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.weight, mx, my - 4);
    }

    // ── Draw nodes ──
    const R = 22;
    for (const n of nodes) {
      const x = toX(n), y = toY(n);
      let fill      = isDark ? '#161b22' : '#f6f8fa';
      let stroke    = isDark ? '#30363d' : '#d0d7de';
      let textColor = isDark ? '#8b949e' : '#1f2328';
      let glowColor = null;

      if      (state.path     && state.path.includes(n.id))         { fill = '#2a1a3a'; stroke = '#bc8cff'; glowColor = 'rgba(188,140,255,0.3)'; }
      else if (state.settled  && state.settled.has(n.id))           { fill = '#1a2a3a'; stroke = '#39d0d8'; textColor = '#39d0d8'; }
      else if (state.closed   && state.closed.has(n.id))            { fill = '#1a2a3a'; stroke = '#39d0d8'; textColor = '#39d0d8'; }
      else if (state.relaxing === n.id || (state.open && state.open.has(n.id))) { fill = '#2a2a1a'; stroke = '#d29922'; textColor = '#d29922'; }
      else if (state.current  === n.id)                             { fill = '#1a3a2a'; stroke = '#3fb950'; textColor = '#3fb950'; glowColor = 'rgba(63,185,80,0.3)'; }
      else if (state.visited  && state.visited.has(n.id))           { fill = '#1e3a5f'; stroke = '#58a6ff'; textColor = '#58a6ff'; }

      // Glow halo
      if (glowColor) {
        ctx.beginPath(); ctx.arc(x, y, R + 4, 0, Math.PI * 2);
        ctx.fillStyle = glowColor; ctx.fill();
      }

      // Circle
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle   = fill;   ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();

      // Label
      ctx.fillStyle    = textColor;
      ctx.font         = 'bold 13px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.id, x, y);

      // Distance label (Dijkstra)
      if (state.dist && state.dist[n.id] !== undefined && state.dist[n.id] !== Infinity) {
        ctx.fillStyle = '#39d0d8';
        ctx.font      = '10px JetBrains Mono, monospace';
        ctx.fillText(state.dist[n.id], x, y + R + 12);
      }
      // g-score label (A*)
      if (state.g && state.g[n.id] !== undefined && state.g[n.id] !== Infinity) {
        ctx.fillStyle = '#3fb950';
        ctx.font      = '10px JetBrains Mono, monospace';
        ctx.fillText('g:' + state.g[n.id].toFixed(0), x, y + R + 12);
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  // ── Tree ───────────────────────────────────────────────────
  // highlightVal  — node being inserted / found (green)
  // rotationNode  — node involved in a rotation (orange)
  drawTree(root, highlightVal = null, rotationNode = null) {
    const { ctx, canvas, isDark } = this;
    this.clear();

    if (!root) {
      ctx.fillStyle    = '#484f58';
      ctx.font         = '14px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tree is empty. Insert values above.', canvas.width / 2, canvas.height / 2);
      ctx.textBaseline = 'alphabetic';
      return;
    }

    // Compute node positions recursively
    const positions = {};
    const assignPos = (node, x, y, gap) => {
      if (!node) return;
      positions[node.val] = { x, y };
      assignPos(node.left,  x - gap, y + 70, gap / 2);
      assignPos(node.right, x + gap, y + 70, gap / 2);
    };
    assignPos(root, canvas.width / 2, 50, canvas.width / 4);

    // Draw edges (before nodes so nodes render on top)
    const drawEdges = (node) => {
      if (!node) return;
      const pos = positions[node.val];
      if (node.left) {
        const lpos = positions[node.left.val];
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(lpos.x, lpos.y);
        ctx.strokeStyle = isDark ? '#30363d' : '#d0d7de'; ctx.lineWidth = 1.5; ctx.stroke();
        drawEdges(node.left);
      }
      if (node.right) {
        const rpos = positions[node.right.val];
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(rpos.x, rpos.y);
        ctx.strokeStyle = isDark ? '#30363d' : '#d0d7de'; ctx.lineWidth = 1.5; ctx.stroke();
        drawEdges(node.right);
      }
    };
    drawEdges(root);

    // Draw nodes
    const drawNodes = (node) => {
      if (!node) return;
      const { x, y } = positions[node.val];
      const R = 20;
      const isHighlight = node.val === highlightVal;
      const isRotation  = node.val === rotationNode;

      let fill      = isDark ? '#161b22' : '#f6f8fa';
      let stroke    = isDark ? '#30363d' : '#d0d7de';
      let textColor = isDark ? '#e6edf3' : '#1f2328';
      if (isHighlight) { fill = '#1a3a2a'; stroke = '#3fb950'; textColor = '#3fb950'; }
      if (isRotation)  { fill = '#2a1a1a'; stroke = '#f78166'; textColor = '#f78166'; }

      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle   = fill;   ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle    = textColor;
      ctx.font         = 'bold 12px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.val, x, y);

      // Height label for AVL
      if (node.height !== undefined) {
        ctx.fillStyle = isDark ? '#484f58' : '#9198a1';
        ctx.font      = '9px JetBrains Mono, monospace';
        ctx.fillText(`h=${node.height}`, x, y + R + 10);
      }
      ctx.textBaseline = 'alphabetic';

      drawNodes(node.left);
      drawNodes(node.right);
    };
    drawNodes(root);
  }

  // ── Red-Black Tree ─────────────────────────────────────────
  // Nodes are colored red/black. highlight = newly inserted val.
  drawRBTree(root, highlightVal = null, rotHighlight = null) {
    const { ctx, canvas, isDark } = this;
    this.clear();

    if (!root) {
      ctx.fillStyle    = '#484f58';
      ctx.font         = '14px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tree is empty. Insert values.', canvas.width / 2, canvas.height / 2);
      ctx.textBaseline = 'alphabetic';
      return;
    }

    // Layout
    const positions = {};
    const assignPos = (node, x, y, gap) => {
      if (!node) return;
      positions[node.val] = { x, y };
      assignPos(node.left,  x - gap, y + 70, Math.max(gap / 2, 20));
      assignPos(node.right, x + gap, y + 70, Math.max(gap / 2, 20));
    };
    assignPos(root, canvas.width / 2, 50, canvas.width / 4);

    // Edges
    const drawEdges = (node) => {
      if (!node) return;
      const pos = positions[node.val];
      const draw = (child) => {
        if (!child) return;
        const cp = positions[child.val];
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(cp.x, cp.y);
        ctx.strokeStyle = isDark ? '#30363d' : '#d0d7de'; ctx.lineWidth = 1.5; ctx.stroke();
      };
      draw(node.left); draw(node.right);
      drawEdges(node.left); drawEdges(node.right);
    };
    drawEdges(root);

    // Nodes
    const drawRBNodes = (node) => {
      if (!node) return;
      const { x, y } = positions[node.val];
      const R = 20;
      const isNew = node.val === highlightVal;
      const isRot = node.val === rotHighlight;

      let fill, stroke, textColor;
      if (node.color === 'red') {
        fill      = isRot ? '#3a0a0a' : '#2a0a0a';
        stroke    = isRot ? '#f78166' : '#e5534b';
        textColor = '#ffa198';
      } else {
        fill      = isDark ? '#161b22' : '#f0f0f0';
        stroke    = isDark ? '#3c4149' : '#333';
        textColor = isDark ? '#e6edf3' : '#1f2328';
      }
      if (isNew) { stroke = '#3fb950'; textColor = '#3fb950'; }

      // Glow for red nodes
      if (node.color === 'red') {
        ctx.beginPath(); ctx.arc(x, y, R + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(229,83,75,0.2)'; ctx.fill();
      }
      if (isNew) {
        ctx.beginPath(); ctx.arc(x, y, R + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(63,185,80,0.2)'; ctx.fill();
      }

      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle   = fill;   ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();

      ctx.fillStyle    = textColor;
      ctx.font         = 'bold 12px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.val, x, y);
      ctx.textBaseline = 'alphabetic';

      // Color dot indicator
      const dotColor = node.color === 'red' ? '#e5534b' : '#484f58';
      ctx.beginPath(); ctx.arc(x + R - 4, y - R + 4, 5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor; ctx.fill();

      drawRBNodes(node.left); drawRBNodes(node.right);
    };
    drawRBNodes(root);

    // Legend
    ctx.textBaseline = 'middle';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e5534b'; ctx.fillText('● RED node', 12, 16);
    ctx.fillStyle = isDark ? '#8b949e' : '#666'; ctx.fillText('● BLACK node', 12, 32);
    ctx.textBaseline = 'alphabetic';
  }

  // ── Phylogenetic Dendogram (UPGMA / NJ) ──────────────────────
  drawDendogram(frame) {
    const { ctx, canvas, isDark } = this;
    this.clear();
    if (!frame) return;

    const W = canvas.width, H = canvas.height;
    const PAD = { left: 20, right: 80, top: 30, bottom: 20 };

    // Collect unique leaf labels from tree edges
    const edges = frame.treeEdges || [];
    if (edges.length === 0) {
      ctx.fillStyle = '#484f58'; ctx.font = '13px JetBrains Mono, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const taxa = frame.taxa || frame.labels || [];
      ctx.fillText(`Waiting for merges... Taxa: ${taxa.join(', ')}`, W / 2, H / 2);
      ctx.textBaseline = 'alphabetic';
      return;
    }

    // Build node positions for a cladogram layout
    // Collect all labels
    const allNodes = new Set();
    for (const e of edges) { allNodes.add(e.from); allNodes.add(e.toA || e.to); if (e.toB) allNodes.add(e.toB); }
    const internalNodes = new Set(edges.map(e => e.from));
    const leafNodes = [...allNodes].filter(n => !internalNodes.has(n));
    const leafCount = leafNodes.length;

    if (leafCount === 0) {
      ctx.fillStyle = '#484f58'; ctx.font = '12px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Computing...', W / 2, H / 2); ctx.textBaseline = 'alphabetic'; return;
    }

    const nodeY = {};
    leafNodes.forEach((n, i) => { nodeY[n] = PAD.top + ((H - PAD.top - PAD.bottom) / (leafCount - 1 || 1)) * i; });

    // Compute internal node Y as average of children Y
    const getY = (node) => {
      if (nodeY[node] !== undefined) return nodeY[node];
      const children = edges.filter(e => e.from === node).flatMap(e => [e.toA || e.to, e.toB].filter(Boolean));
      const y = children.reduce((s, c) => s + getY(c), 0) / (children.length || 1);
      nodeY[node] = y;
      return y;
    };
    for (const n of internalNodes) getY(n);

    // Compute internal node X based on depth/height
    const maxDepth = edges.length;
    const nodeX = {};
    leafNodes.forEach(n => { nodeX[n] = W - PAD.right; });
    for (let d = 0; d < edges.length; d++) {
      const e = edges[d];
      nodeX[e.from] = PAD.left + ((W - PAD.left - PAD.right) * d / Math.max(edges.length - 1, 1));
    }

    // Draw edges as L-shaped paths (dendogram style)
    ctx.strokeStyle = isDark ? '#58a6ff' : '#0969da';
    ctx.lineWidth   = 1.5;

    for (const e of edges) {
      const fromX = nodeX[e.from], fromY = getY(e.from);
      const children = [e.toA || e.to, e.toB].filter(Boolean);
      for (const child of children) {
        const toX = nodeX[child] ?? W - PAD.right;
        const toY = getY(child);
        const isActive = e.toA === frame.mergeA || e.toB === frame.mergeA || e.toA === frame.mergeB || e.toB === frame.mergeB;
        ctx.strokeStyle = isActive ? (isDark ? '#3fb950' : '#1a7f37') : (isDark ? '#58a6ff' : '#0969da');
        ctx.lineWidth   = isActive ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(fromX, toY);   // vertical segment
        ctx.lineTo(toX,   toY);   // horizontal to child
        ctx.stroke();
      }
    }

    // Leaf labels
    ctx.fillStyle    = isDark ? '#e6edf3' : '#1f2328';
    ctx.font         = '11px JetBrains Mono, monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    for (const n of leafNodes) ctx.fillText(n, W - PAD.right + 6, getY(n));

    // Internal node dots
    ctx.fillStyle = isDark ? '#39d0d8' : '#0550ae';
    for (const n of internalNodes) {
      ctx.beginPath();
      ctx.arc(nodeX[n] ?? PAD.left, getY(n), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textBaseline = 'alphabetic';
  }

  // ── k-Means Scatter Plot ──────────────────────────────────────
  drawKMeans(frame) {
    const { ctx, canvas, isDark } = this;
    this.clear();
    if (!frame || !frame.points) return;

    const W = canvas.width, H = canvas.height;
    const PAD = 40;
    const toX = v => PAD + v * (W - 2 * PAD);
    const toY = v => PAD + v * (H - 2 * PAD);

    const COLORS = ['#58a6ff','#3fb950','#f78166','#d29922','#bc8cff','#39d0d8','#ffa657'];

    // Draw grid
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 10; i++) {
      const x = PAD + (W - 2 * PAD) * i / 10;
      const y = PAD + (H - 2 * PAD) * i / 10;
      ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, H - PAD); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    }

    // Points
    for (const p of frame.points) {
      const x = toX(p.x), y = toY(p.y);
      const color = p.cluster >= 0 ? COLORS[p.cluster % COLORS.length] : (isDark ? '#484f58' : '#9198a1');
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Centroids as ✦
    for (const c of (frame.centroids || [])) {
      const x = toX(c.x), y = toY(c.y);
      const color = COLORS[c.id % COLORS.length];
      ctx.fillStyle   = color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      // Draw star
      this._drawStar(ctx, x, y, 12, 5);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = isDark ? '#000' : '#fff'; ctx.stroke();
    }

    // Iteration label
    ctx.fillStyle    = isDark ? '#8b949e' : '#666';
    ctx.font         = '12px JetBrains Mono, monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`k=${frame.k}  iter=${frame.iteration || 0}  type: ${frame.type}`, PAD, 6);

    // Legend
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let c = 0; c < (frame.k || 3); c++) {
      ctx.fillStyle = COLORS[c % COLORS.length];
      ctx.fillRect(PAD + c * 80, H - 18, 10, 10);
      ctx.fillStyle = isDark ? '#8b949e' : '#666';
      ctx.fillText(`C${c+1}`, PAD + c * 80 + 14, H - 13);
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawStar(ctx, x, y, r, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle  = (Math.PI / points) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r / 2.5;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // ── Hierarchical Clustering Dendogram ────────────────────────
  drawHierarchical(frame) {
    const { ctx, canvas, isDark } = this;
    this.clear();
    if (!frame || !frame.points) return;

    const W = canvas.width, H = canvas.height;
    const PAD = { left: 16, right: 100, top: 30, bottom: 16 };
    const history = frame.mergeHistory || [];
    const pts     = frame.points;
    const n       = pts.length;

    // Leaf positions (even spacing on right side)
    const leafY = {};
    pts.forEach((p, i) => { leafY[`P${i+1}`] = PAD.top + (H - PAD.top - PAD.bottom) / Math.max(n - 1, 1) * i; });

    // Internal node Y = mean of their leaf Ys
    const nodeY = { ...leafY };
    const nodeDist = {};

    // Max distance for X scaling
    const maxDist = history.reduce((m, h) => Math.max(m, h.dist), 0.001);
    const distToX = d => PAD.left + (d / maxDist) * (W - PAD.left - PAD.right);

    const leafX = W - PAD.right;

    // Get all leaf members of a cluster
    const getLeaves = (id) => {
      const m = history.find(h => h.newId === id);
      if (!m) return [id - n]; // it's a leaf
      return [...getLeaves(m.a < n ? `P${m.a+1}` : m.a), ...getLeaves(m.b < n ? `P${m.b+1}` : m.b)];
    };

    // Draw each merge step
    ctx.lineWidth = 1.5;
    for (const merge of history) {
      const aLabel = merge.aLabel, bLabel = merge.bLabel;
      const aY = nodeY[aLabel] ?? PAD.top;
      const bY = nodeY[bLabel] ?? PAD.top;
      const newY = (aY + bY) / 2;
      const x   = distToX(merge.dist);

      nodeY[merge.newId] = newY;
      nodeDist[merge.newId] = merge.dist;

      const isActive = aLabel === frame.mergeA?.label || bLabel === frame.mergeB?.label
        || aLabel === frame.mergeB?.label || bLabel === frame.mergeA?.label;
      ctx.strokeStyle = isActive ? '#3fb950' : (isDark ? '#58a6ff' : '#0969da');
      ctx.lineWidth   = isActive ? 2.5 : 1.5;

      // Horizontal line at merge point
      ctx.beginPath(); ctx.moveTo(x, aY); ctx.lineTo(x, bY); ctx.stroke();
      // Lines to children
      const aX = nodeDist[aLabel] !== undefined ? distToX(nodeDist[aLabel]) : leafX;
      const bX = nodeDist[bLabel] !== undefined ? distToX(nodeDist[bLabel]) : leafX;
      ctx.beginPath(); ctx.moveTo(x, aY); ctx.lineTo(aX, aY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, bY); ctx.lineTo(bX, bY); ctx.stroke();
    }

    // Leaf labels & dots
    ctx.fillStyle    = isDark ? '#e6edf3' : '#1f2328';
    ctx.font         = '11px JetBrains Mono, monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const lbl = `P${i+1}`;
      const y   = leafY[lbl];
      ctx.fillStyle = isDark ? '#39d0d8' : '#0550ae';
      ctx.beginPath(); ctx.arc(leafX, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isDark ? '#e6edf3' : '#1f2328';
      ctx.fillText(lbl, leafX + 8, y);
    }

    // Axis label
    ctx.fillStyle = isDark ? '#484f58' : '#9198a1';
    ctx.font      = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('← Distance', W / 2, 8);
    ctx.textBaseline = 'alphabetic';
  }

  // ── NJ Unrooted Tree ─────────────────────────────────────────
  drawNJTree(frame) {
    const { ctx, canvas, isDark } = this;
    this.clear();
    if (!frame || !frame.treeEdges || frame.treeEdges.length === 0) {
      ctx.fillStyle = '#484f58'; ctx.font = '12px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Building Q-matrix...', canvas.width / 2, canvas.height / 2);
      ctx.textBaseline = 'alphabetic'; return;
    }

    // Radial layout for unrooted tree
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.35;
    const allNodes  = new Set();
    const nodeEdges = {};
    for (const e of frame.treeEdges) {
      allNodes.add(e.from); allNodes.add(e.to);
      if (!nodeEdges[e.from]) nodeEdges[e.from] = [];
      if (!nodeEdges[e.to])   nodeEdges[e.to]   = [];
      nodeEdges[e.from].push({ to: e.to, length: e.length });
      nodeEdges[e.to].push({ to: e.from, length: e.length });
    }

    const nodesArr = [...allNodes];
    const pos = {};
    nodesArr.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodesArr.length - Math.PI / 2;
      pos[n] = { x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R };
    });

    // Edges
    for (const e of frame.treeEdges) {
      const p1 = pos[e.from], p2 = pos[e.to];
      if (!p1 || !p2) continue;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = isDark ? '#58a6ff' : '#0969da';
      ctx.lineWidth = 1.5; ctx.stroke();
      // Length label at midpoint
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      ctx.fillStyle = isDark ? '#484f58' : '#9198a1';
      ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.length?.toFixed(2) ?? '', mx, my);
    }

    // Nodes
    for (const n of nodesArr) {
      const { x, y } = pos[n];
      const isLeaf = !n.startsWith('u');
      ctx.beginPath(); ctx.arc(x, y, isLeaf ? 16 : 6, 0, Math.PI * 2);
      ctx.fillStyle   = isLeaf ? (isDark ? '#1e3a5f' : '#ddf4ff') : (isDark ? '#30363d' : '#eee');
      ctx.fill();
      ctx.strokeStyle = isDark ? '#58a6ff' : '#0969da'; ctx.lineWidth = 1.5; ctx.stroke();
      if (isLeaf) {
        ctx.fillStyle = isDark ? '#58a6ff' : '#0969da';
        ctx.font = 'bold 10px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(n, x, y);
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  // ── Max Parsimony / Max Likelihood topology grid ──────────────
  drawTopologies(frame) {
    const { ctx, canvas, isDark } = this;
    this.clear();
    if (!frame || !frame.topologies) return;

    const W = canvas.width, H = canvas.height;
    const n = frame.topologies.length;
    const cols = Math.min(n, 3), rows = Math.ceil(n / cols);
    const cellW = W / cols, cellH = H / rows;

    for (let ti = 0; ti < frame.topologies.length; ti++) {
      const tree     = frame.topologies[ti];
      const col      = ti % cols, row = Math.floor(ti / cols);
      const cx       = cellW * col + cellW / 2;
      const cy       = cellH * row + cellH / 2;
      const isCurrent = ti === frame.treeIdx;
      const isBest   = tree === frame.bestTree;

      // Cell background
      if (isCurrent) { ctx.fillStyle = isDark ? 'rgba(88,166,255,0.1)' : 'rgba(9,105,218,0.05)'; ctx.fillRect(cellW*col, cellH*row, cellW, cellH); }
      if (isBest)    { ctx.fillStyle = isDark ? 'rgba(63,185,80,0.1)'  : 'rgba(26,127,55,0.05)';  ctx.fillRect(cellW*col, cellH*row, cellW, cellH); }

      // Simple tree sketch using splits
      const taxa = frame.taxa;
      const r    = Math.min(cellW, cellH) * 0.3;
      const numTaxa = taxa?.length || 4;
      const taxaAngles = taxa?.map((_, i) => ((2 * Math.PI * i) / numTaxa) - Math.PI / 2) || [];

      // Draw leaves in a ring
      for (let li = 0; li < (taxa?.length || 0); li++) {
        const lx = cx + Math.cos(taxaAngles[li]) * r;
        const ly = cy + Math.sin(taxaAngles[li]) * r;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(lx, ly);
        ctx.strokeStyle = isDark ? '#30363d' : '#d0d7de'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle   = isDark ? '#e6edf3' : '#1f2328';
        ctx.font = `9px JetBrains Mono`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(taxa[li], lx + Math.cos(taxaAngles[li]) * 12, ly + Math.sin(taxaAngles[li]) * 12);
      }

      // Score label
      const score = frame.type === 'likelihood'
        ? (frame.results?.[ti]?.logL?.toFixed(2) ?? '?')
        : (frame.score !== undefined && ti === frame.treeIdx ? frame.score : '?');
      const label = frame.type === 'likelihood' ? `lnL=${score}` : `MP=${score}`;
      ctx.fillStyle = isBest ? '#3fb950' : isCurrent ? '#58a6ff' : (isDark ? '#8b949e' : '#666');
      ctx.font = `bold 10px JetBrains Mono`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy + r + 18);

      if (isBest) { ctx.fillText('★ BEST', cx, cy + r + 30); }

      // Tree name
      ctx.font = '8px JetBrains Mono'; ctx.fillStyle = isDark ? '#484f58' : '#9198a1';
      ctx.fillText(tree.name || '', cx, cellH * row + 10);
    }
    ctx.textBaseline = 'alphabetic';
  }
}
