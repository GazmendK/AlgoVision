"use strict";

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

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


  drawGraph(graphData, state = {}) {
    const { ctx, canvas, isDark } = this;
    const { nodes, edges } = graphData;
    const w = canvas.width, h = canvas.height;

    this.clear();
    const toX = n => n.x * w;
    const toY = n => n.y * h;
    const nodeMap = {};
    for (const n of nodes) nodeMap[n.id] = n;

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

      const mx = (toX(from) + toX(to)) / 2;
      const my = (toY(from) + toY(to)) / 2;
      ctx.fillStyle = isPath ? '#bc8cff' : (isDark ? '#484f58' : '#9198a1');
      ctx.font      = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.weight, mx, my - 4);
    }

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

      if (glowColor) {
        ctx.beginPath(); ctx.arc(x, y, R + 4, 0, Math.PI * 2);
        ctx.fillStyle = glowColor; ctx.fill();
      }

      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle   = fill;   ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle    = textColor;
      ctx.font         = 'bold 13px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.id, x, y);

      if (state.dist && state.dist[n.id] !== undefined && state.dist[n.id] !== Infinity) {
        ctx.fillStyle = '#39d0d8';
        ctx.font      = '10px JetBrains Mono, monospace';
        ctx.fillText(state.dist[n.id], x, y + R + 12);
      }
      if (state.g && state.g[n.id] !== undefined && state.g[n.id] !== Infinity) {
        ctx.fillStyle = '#3fb950';
        ctx.font      = '10px JetBrains Mono, monospace';
        ctx.fillText('g:' + state.g[n.id].toFixed(0), x, y + R + 12);
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

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

    const positions = {};
    const assignPos = (node, x, y, gap) => {
      if (!node) return;
      positions[node.val] = { x, y };
      assignPos(node.left,  x - gap, y + 70, gap / 2);
      assignPos(node.right, x + gap, y + 70, gap / 2);
    };
    assignPos(root, canvas.width / 2, 50, canvas.width / 4);

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
}
