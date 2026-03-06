// ============================================================
// ALIGNMENT RENDERER
//
// DOM-based renderer for sequence alignment algorithms.
// Renders a DP matrix as an HTML table with color-coded cells,
// plus the final aligned sequences below.
//
// Supports: NW, SW, Semi-global, Affine Gap, MSA
// ============================================================

"use strict";

class AlignmentRenderer {
  constructor(container) {
    this.container  = container;
    this.table      = null;
    this.cells      = []; // cells[i][j] = <td> element
    this.lastSeq1   = null;
    this.lastSeq2   = null;
    this.variant    = null;
    // For affine: three tables
    this.tableM = null; this.tableX = null; this.tableY = null;
  }

  // ── Render a frame ──────────────────────────────────────────
  render(frame) {
    if (!frame) return;
    const v = frame.variant || 'nw';

    // Rebuild table if sequences changed or variant changed
    if (frame.seq1 !== this.lastSeq1 || frame.seq2 !== this.lastSeq2 || v !== this.variant) {
      this.container.innerHTML = '';
      this.lastSeq1 = frame.seq1;
      this.lastSeq2 = frame.seq2;
      this.variant  = v;
      this._buildTables(frame);
    }

    if (v === 'affine') {
      this._updateAffine(frame);
    } else if (frame.type === 'pairwise' || frame.type === 'phase' || frame.type === 'guidetree' || frame.type === 'msa_align') {
      this._renderMSA(frame);
    } else {
      this._updateMatrix(frame);
    }

    if (frame.type === 'done' && frame.align1) {
      this._renderAlignment(frame.align1, frame.align2, frame.score);
    }
  }

  // ── Build Matrix Table ────────────────────────────────────
  _buildTables(frame) {
    const { seq1, seq2, variant } = frame;
    if (!seq1 || !seq2) return;

    if (variant === 'affine') {
      this._buildAffineLayout(frame);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'align-wrap';

    const title = document.createElement('div');
    title.className = 'align-title';
    title.textContent = this._getTitle(variant);
    wrap.appendChild(title);

    const scoringInfo = document.createElement('div');
    scoringInfo.className = 'align-subtitle';
    const match = variant === 'sw' ? 2 : 1;
    scoringInfo.textContent = `Match: +${match}  Mismatch: -1  Gap: -2`;
    wrap.appendChild(scoringInfo);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'align-table-wrap';
    const { table, cells } = this._makeTable(seq1, seq2, frame.dp);
    this.table = table;
    this.cells = cells;
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    // Alignment result area
    const alignResult = document.createElement('div');
    alignResult.id = 'align-result';
    alignResult.className = 'align-result-area';
    wrap.appendChild(alignResult);

    this.container.appendChild(wrap);
  }

  _buildAffineLayout(frame) {
    const { seq1, seq2 } = frame;
    const wrap = document.createElement('div');
    wrap.className = 'align-wrap';

    const title = document.createElement('div');
    title.className = 'align-title';
    title.textContent = 'Affine Gap Alignment — Three DP Matrices';
    wrap.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'align-subtitle';
    sub.textContent = 'M = match/mismatch  |  Ix = gap in seq1 (deletion)  |  Iy = gap in seq2 (insertion)';
    wrap.appendChild(sub);

    const grids = document.createElement('div');
    grids.className = 'affine-grids';

    const labels = ['M', 'Ix', 'Iy'];
    const dps = [frame.dp || [], frame.dpX || [], frame.dpY || []];
    const tables = [];

    for (let t = 0; t < 3; t++) {
      const col = document.createElement('div');
      col.className = 'affine-col';
      const lbl = document.createElement('div');
      lbl.className = `affine-label affine-label-${labels[t].toLowerCase()}`;
      lbl.textContent = `Matrix ${labels[t]}`;
      col.appendChild(lbl);
      const tw = document.createElement('div');
      tw.className = 'affine-table-wrap';
      const { table, cells } = this._makeTable(seq1, seq2, dps[t], true);
      tables.push({ table, cells });
      tw.appendChild(table);
      col.appendChild(tw);
      grids.appendChild(col);
    }

    this.tableM = tables[0]; this.tableX = tables[1]; this.tableY = tables[2];
    wrap.appendChild(grids);

    const alignResult = document.createElement('div');
    alignResult.id = 'align-result';
    alignResult.className = 'align-result-area';
    wrap.appendChild(alignResult);

    this.container.appendChild(wrap);
  }

  _makeTable(seq1, seq2, dp, compact = false) {
    const table = document.createElement('table');
    table.className = compact ? 'align-matrix compact' : 'align-matrix';
    const cells = [];

    // Header row: ∅, ∅, seq2 chars
    const thead = document.createElement('thead');
    const hr    = document.createElement('tr');
    hr.appendChild(this._th(''));
    hr.appendChild(this._th('∅'));
    for (const c of seq2) hr.appendChild(this._th(c, 'seq-header'));
    thead.appendChild(hr); table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i <= seq1.length; i++) {
      cells[i] = [];
      const tr = document.createElement('tr');
      // Row header
      tr.appendChild(this._th(i === 0 ? '∅' : seq1[i - 1], i === 0 ? '' : 'seq-header'));
      for (let j = 0; j <= seq2.length; j++) {
        const td = document.createElement('td');
        td.className = 'dp-cell' + (i === 0 || j === 0 ? ' dp-border' : '');
        const val = dp && dp[i] ? dp[i][j] : 0;
        td.textContent = val === -Infinity ? '-∞' : val !== undefined ? (Number.isFinite(val) ? val.toFixed(1).replace('.0', '') : val) : '';
        cells[i][j] = td;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return { table, cells };
  }

  _th(text, cls = '') {
    const th = document.createElement('th');
    th.textContent = text;
    if (cls) th.className = cls;
    return th;
  }

  // ── Update matrix cells ────────────────────────────────────
  _updateMatrix(frame) {
    const { dp, i, j, path, type } = frame;
    if (!dp || !this.cells) return;

    const pathSet = new Set((path || []).map(p => `${p.i},${p.j}`));

    for (let r = 0; r <= (this.lastSeq1?.length || 0); r++) {
      for (let c = 0; c <= (this.lastSeq2?.length || 0); c++) {
        const cell = this.cells[r]?.[c];
        if (!cell) continue;
        const val = dp[r]?.[c];
        cell.textContent = val === -Infinity ? '-∞' : val !== undefined && Number.isFinite(val) ? val.toFixed(1).replace('.0', '') : (val ?? '');

        cell.className = 'dp-cell' + (r === 0 || c === 0 ? ' dp-border' : '');
        if (pathSet.has(`${r},${c}`)) cell.classList.add('dp-path');
        else if (type === 'fill' && r === i && c === j) {
          cell.classList.add(frame.isMatch ? 'dp-active-match' : 'dp-active');
          // Scroll into view smoothly
          cell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (type === 'fill' && dp[r][c] !== 0 && r > 0 && c > 0) {
          cell.classList.add('dp-filled');
        }
      }
    }

    // Highlight current max (for SW)
    if (frame.maxI !== undefined && frame.maxJ !== undefined) {
      const mc = this.cells[frame.maxI]?.[frame.maxJ];
      if (mc) mc.classList.add('dp-max');
    }
  }

  _updateAffine(frame) {
    const tables = [
      { t: this.tableM, dp: frame.dp,  active: frame.activeMatrix === 'M'  },
      { t: this.tableX, dp: frame.dpX, active: frame.activeMatrix === 'Ix' },
      { t: this.tableY, dp: frame.dpY, active: frame.activeMatrix === 'Iy' },
    ];

    for (const { t, dp, active } of tables) {
      if (!t || !dp) continue;
      const pathSet = new Set((frame.path || []).map(p => `${p.i},${p.j}`));
      for (let r = 0; r <= (this.lastSeq1?.length || 0); r++) {
        for (let c = 0; c <= (this.lastSeq2?.length || 0); c++) {
          const cell = t.cells[r]?.[c];
          if (!cell) continue;
          const val = dp[r]?.[c];
          cell.textContent = val === -Infinity || !Number.isFinite(val) ? '-∞' : val !== undefined ? val.toFixed(1) : '';
          cell.className = 'dp-cell' + (r === 0 || c === 0 ? ' dp-border' : '');
          if (pathSet.has(`${r},${c}`)) cell.classList.add('dp-path');
          else if (active && frame.type === 'fill' && r === frame.i && c === frame.j) cell.classList.add('dp-active');
          else if (dp[r]?.[c] !== undefined && dp[r][c] !== -Infinity && Number.isFinite(dp[r][c]) && r > 0 && c > 0) cell.classList.add('dp-filled');
        }
      }
      // Highlight active matrix
      const col = t.table.closest('.affine-col');
      if (col) col.classList.toggle('affine-active', active);
    }
    if (frame.type === 'done' && frame.align1) this._renderAlignment(frame.align1, frame.align2, frame.score);
  }

  // ── MSA viz ───────────────────────────────────────────────
  _renderMSA(frame) {
    this.container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'align-wrap';
    wrap.style.gap = '16px';

    const title = document.createElement('div');
    title.className = 'align-title';
    title.textContent = `Multiple Sequence Alignment (Progressive)`;
    wrap.appendChild(title);

    // Phase indicator
    const phaseEl = document.createElement('div');
    phaseEl.className = 'msa-phase';
    const phaseNames = ['', 'Pairwise Distances', 'Guide Tree (UPGMA)', 'Progressive Alignment'];
    phaseEl.textContent = frame.phase ? `Phase ${frame.phase}: ${phaseNames[frame.phase]}` : '';
    wrap.appendChild(phaseEl);

    if (frame.type === 'pairwise' && frame.scores) {
      // Show pairwise score matrix
      const seqs = frame.seqs;
      const table = document.createElement('table');
      table.className = 'align-matrix';
      const tr0 = document.createElement('tr');
      tr0.appendChild(this._th(''));
      for (const s of seqs) tr0.appendChild(this._th(s, 'seq-header'));
      table.appendChild(tr0);
      for (let a = 0; a < seqs.length; a++) {
        const tr = document.createElement('tr');
        tr.appendChild(this._th(seqs[a], 'seq-header'));
        for (let b = 0; b < seqs.length; b++) {
          const td = document.createElement('td');
          td.className = 'dp-cell' + (a === b ? ' dp-border' : '');
          if (a === frame.a && b === frame.b || a === frame.b && b === frame.a) td.classList.add('dp-active-match');
          td.textContent = a === b ? '—' : (frame.scores[a]?.[b] ?? '?');
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      wrap.appendChild(table);
    }

    if (frame.treeEdges && frame.treeEdges.length > 0) {
      const treeDiv = document.createElement('div');
      treeDiv.className = 'msa-tree';
      const treeTitle = document.createElement('div');
      treeTitle.className = 'align-subtitle';
      treeTitle.textContent = 'Guide Tree';
      treeDiv.appendChild(treeTitle);
      for (const e of frame.treeEdges) {
        const edge = document.createElement('div');
        edge.className = 'msa-tree-edge' + (e.toA === frame.mergeA || e.toB === frame.mergeB ? ' msa-edge-active' : '');
        edge.textContent = `${e.toA} ┤ ├ ${e.toB} → merged (d=${e.dist?.toFixed(2) ?? '?'})`;
        treeDiv.appendChild(edge);
      }
      wrap.appendChild(treeDiv);
    }

    this.container.appendChild(wrap);
  }

  // ── Final alignment display ────────────────────────────────
  _renderAlignment(align1, align2, score) {
    const existing = document.getElementById('align-result');
    const target   = existing || this.container;

    const html = this._buildAlignmentHTML(align1, align2, score);
    if (existing) existing.innerHTML = html;
    else {
      const div = document.createElement('div');
      div.className = 'align-result-area';
      div.innerHTML = html;
      this.container.appendChild(div);
    }
  }

  _buildAlignmentHTML(a1, a2, score) {
    const matchLine = a1.split('').map((c, i) => c === a2[i] ? '|' : (c === '-' || a2[i] === '-' ? ' ' : '.')).join('');
    const seqHTML = (seq, cls) => seq.split('').map((c, i) => {
      const state = c === '-' ? 'gap' : (a1[i] === a2[i] ? 'match' : 'mismatch');
      return `<span class="aln-base aln-${state}">${c}</span>`;
    }).join('');

    const identity = a1.split('').filter((c, i) => c === a2[i] && c !== '-').length;
    const pct = ((identity / a1.length) * 100).toFixed(1);

    return `
      <div class="align-result">
        <div class="align-result-title">✅ Optimal Alignment — Score: ${score !== undefined ? (typeof score === 'number' ? score.toFixed(1).replace('.0','') : score) : '?'}</div>
        <div class="align-stats">Identity: ${identity}/${a1.length} (${pct}%)</div>
        <div class="align-seqs">
          <div class="align-seq-row"><span class="seq-label">Seq1</span><div class="seq-bases">${seqHTML(a1)}</div></div>
          <div class="align-seq-row"><span class="seq-label">    </span><div class="seq-match">${matchLine}</div></div>
          <div class="align-seq-row"><span class="seq-label">Seq2</span><div class="seq-bases">${seqHTML(a2)}</div></div>
        </div>
        <div class="align-legend">
          <span class="aln-base aln-match">A</span> Match &nbsp;
          <span class="aln-base aln-mismatch">A</span> Mismatch &nbsp;
          <span class="aln-base aln-gap">-</span> Gap
        </div>
      </div>`;
  }

  _getTitle(variant) {
    return {
      nw: 'Needleman-Wunsch — Global Alignment',
      sw: 'Smith-Waterman — Local Alignment',
      semi: 'Semi-Global Alignment (Overlap)',
      affine: 'Affine Gap Alignment',
      msa: 'Multiple Sequence Alignment',
    }[variant] || 'Sequence Alignment';
  }
}
