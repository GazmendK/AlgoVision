// ============================================================
// APP CONTROLLER
//
// The central orchestrator. Wires together:
//   - Algorithm selection (sidebar)
//   - AnimationEngine (playback)
//   - SortingVisualizer, CanvasRenderer (rendering)
//   - BSTree, AVLTree (interactive tree viz)
//   - Info panel (description / steps / code tabs)
//   - Custom input modal
//   - Theme toggle
// ============================================================

"use strict";

class App {
  constructor() {
    this.currentAlgo = null;

    // Core systems
    this.engine      = new AnimationEngine();
    this.canvas      = document.getElementById('viz-canvas');
    this.renderer    = new CanvasRenderer(this.canvas);
    this.sortingViz  = new SortingVisualizer(document.getElementById('sort-container'));

    // Data
    this.graphData      = createDefaultGraph();
    this.bstTree        = new BSTree();
    this.avlTree        = new AVLTree();
    this.avlRoot        = null;
    this.customArray    = this._generateArray(30);
    this.bsArr          = [];
    this.bsTarget       = 42;
    this.fibN           = 10;
    this.knapsackItems  = [
      { name: 'Gold',   weight: 2, value: 6  },
      { name: 'Silver', weight: 3, value: 10 },
      { name: 'Bronze', weight: 4, value: 12 },
      { name: 'Gem',    weight: 1, value: 3  },
    ];
    this.knapsackW = 5;

    // ── Sequence Alignment ──────────────────────────────────
    this.alignSeq1   = 'GATTACA';
    this.alignSeq2   = 'GCATGCU';

    // ── Database Search ─────────────────────────────────────
    this.blastQuery  = 'ATGCAT';
    this.blastDb     = ['TGCATGCATG', 'ATGATGATGC', 'GCATGCTAGT', 'AATGCATGCC'];
    this.fastaQuery  = 'ATGCAT';
    this.fastaDb     = ['TGCATGCATG', 'ATGATGATGC', 'GCATGCTAGT', 'AATGCATGCC'];

    // ── Phylogenetics ────────────────────────────────────────
    this.phyloTaxa      = ['Human', 'Chimp', 'Gorilla', 'Orangutan'];
    this.phyloDistances = [
      [0,    0.11, 0.17, 0.32],
      [0.11, 0,    0.16, 0.31],
      [0.17, 0.16, 0,    0.30],
      [0.32, 0.31, 0.30, 0   ]
    ];
    this.phyloSequences = ['ACGTACG', 'ACGTTCG', 'ACGTCCG', 'TCGTACG'];

    // ── Clustering ───────────────────────────────────────────
    this.clusterPoints    = generateClusterPoints(40, 3);
    this.kmeansK          = 3;
    this.hierPoints       = generateClusterPoints(14, 3, 0.12);

    // ── Red-Black Tree ────────────────────────────────────────
    this.rbTree           = new RBTree();

    // ── Renderers ────────────────────────────────────────────
    this.alignRenderer    = new AlignmentRenderer(document.getElementById('other-container'));

    this.init();
  }

  // ── Random Array Helper ───────────────────────────────────
  _generateArray(size, min = 5, max = 95) {
    return Array.from({ length: size }, () => Math.floor(Math.random() * (max - min + 1)) + min);
  }

  // ── Bootstrap ─────────────────────────────────────────────
  init() {
    // Sidebar algo buttons
    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', () => this.selectAlgo(btn.dataset.algo));
    });

    // Playback controls
    document.getElementById('btn-play').addEventListener('click',  () => this.togglePlay());
    document.getElementById('btn-step').addEventListener('click',  () => this.stepBack());
    document.getElementById('btn-next').addEventListener('click',  () => this.stepForward());
    document.getElementById('btn-reset').addEventListener('click', () => this.resetAlgo());
    document.getElementById('btn-input').addEventListener('click', () => this.openInputModal());

    // Speed slider
    const speedSlider = document.getElementById('speed-slider');
    speedSlider.addEventListener('input', () => {
      this.engine.speed = parseInt(speedSlider.value);
      document.getElementById('speed-label').textContent = speedSlider.value + 'x';
    });

    // Info panel tabs
    document.querySelectorAll('.info-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.info-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.info-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('light');
      document.getElementById('theme-toggle').textContent =
        document.body.classList.contains('light') ? '🌙' : '☀';
      if (this.currentAlgo) this._refreshCurrentFrame();
    });

    // Modal
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-apply').addEventListener('click',  () => this.applyInput());
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });

    // Graph controls
    document.getElementById('btn-apply-graph').addEventListener('click', () => {
      const start = document.getElementById('start-node-select').value;
      const end   = document.getElementById('end-node-select').value || null;
      if (start) this._startGraphAlgo(this.currentAlgo, start, end);
    });

    // Engine callbacks
    this.engine.onFrame = (frame, idx) => this._onFrame(frame, idx);
    this.engine.onEnd   = () => this._onEnd();

    // Canvas sizing
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    // k-Means: click on canvas to add a data point
    document.getElementById('viz-canvas').addEventListener('click', e => {
      if (this.currentAlgo !== 'kmeans') return;
      const canvas = e.currentTarget;
      const rect   = canvas.getBoundingClientRect();
      const PAD    = 40;
      // Convert pixel → normalised [0,1] using same formula as drawKMeans
      const nx = (e.clientX - rect.left  - PAD) / (canvas.width  - 2 * PAD);
      const ny = (e.clientY - rect.top   - PAD) / (canvas.height - 2 * PAD);
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
      // Add point (unassigned cluster = -1) and reload the algorithm
      this.clusterPoints.push({ x: parseFloat(nx.toFixed(3)), y: parseFloat(ny.toFixed(3)) });
      this.engine.stop();
      this._loadClusteringAlgo('kmeans');
      document.getElementById('current-step-msg').textContent =
        `Point added — ${this.clusterPoints.length} total. Press ▶ Play to run k-Means.`;
    });
  }

  // ── Canvas resize ─────────────────────────────────────────
  _resizeCanvas() {
    // Use rAF so the layout engine has applied display:block before we measure.
    requestAnimationFrame(() => {
      const container = document.getElementById('canvas-container');
      const w = Math.max(100, container.clientWidth);
      const h = Math.max(100, container.clientHeight);
      if (w > 0 && h > 0) {
        this.renderer.resize(w, h);
        if (this.currentAlgo) this._refreshCurrentFrame();
      }
    });
  }

  // ── Algorithm Selection ───────────────────────────────────
  selectAlgo(algo) {
    this.currentAlgo = algo;
    document.querySelectorAll('.algo-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.algo === algo)
    );

    const meta = ALGO_META[algo];
    if (!meta) return;

    // Header
    document.getElementById('algo-title').textContent = meta.name;
    const badge = document.getElementById('complexity-badge');
    badge.textContent  = `Avg: ${meta.complexity.avg}`;
    badge.style.display = '';

    // Show correct viz panel
    this._showCorrectVizPanel(meta.category);
    document.getElementById('stats-bar').style.display =
      meta.category === 'sorting' ? '' : 'none';
    document.getElementById('current-step-msg').style.display = '';
    document.getElementById('current-step-msg').textContent = 'Press ▶ Play or ⏭ Step to begin.';

    // Info panel
    this._renderInfoPanel(meta);
    this._renderCodePanel(meta);
    this._renderStepsPanel(meta);

    // Enable controls
    ['btn-play','btn-step','btn-next','btn-reset'].forEach(id =>
      document.getElementById(id).disabled = false
    );

    // k-Means crosshair cursor
    document.body.classList.toggle('kmeans-active', algo === 'kmeans');

    // Graph / tree setup
    const isGraph    = ['bfs','dfs','dijkstra','astar'].includes(algo);
    const isTree     = ['bst','avl'].includes(algo);
    const isRBTree   = algo === 'rbtree';
    const isPhylo    = ['upgma','neighborjoining','maxparsimony','maxlikelihood'].includes(algo);
    const isClustering = ['kmeans','hierarchicalclustering'].includes(algo);
    document.getElementById('graph-input-bar').style.display = isGraph ? '' : 'none';
    if (isGraph)   this._populateGraphDropdowns();
    else if (isTree)   this._initTreeViz();
    else if (isRBTree) this._initRBTreeViz();
    else if (isPhylo && !['maxparsimony','maxlikelihood'].includes(algo)) { /* canvas shown by panel */ }
    // Reset alignment renderer when switching away from alignment
    if (meta.category !== 'alignment') { this.alignRenderer.lastSeq1 = null; this.alignRenderer.lastSeq2 = null; }

    // Legend
    this._setLegend(meta.category);

    // Load algorithm
    this._loadAlgo(algo);
  }

  // ── Panel visibility ──────────────────────────────────────
  _showCorrectVizPanel(category) {
    // Hide everything first
    document.getElementById('sort-container').style.display    = 'none';
    document.getElementById('canvas-container').style.display  = 'none';
    document.getElementById('canvas-container').classList.remove('has-tree-ctrl');
    document.getElementById('tree-ctrl-bar').style.display     = 'none';
    document.getElementById('tree-ctrl-bar').innerHTML         = '';
    document.getElementById('viz-placeholder').style.display   = 'none';

    // other-container: remove ALL inline styles (clears any leftover cssText),
    // then hide via inline display so CSS rule's display:none doesn't fight JS.
    const oc = document.getElementById('other-container');
    oc.removeAttribute('style');
    oc.style.display = 'none';

    if (category === 'sorting') {
      document.getElementById('sort-container').style.display = 'flex';
    } else if (['graph', 'tree', 'phylo', 'clustering', 'rbtree'].includes(category)) {
      document.getElementById('canvas-container').style.display = 'block';
      this._resizeCanvas();
    } else if (category === 'alignment' || category === 'database') {
      oc.style.display = 'flex';
      this.alignRenderer.container = oc;
    } else {
      // BS, Fib, Knapsack, etc.
      oc.style.display = 'flex';
    }
  }

  // ── Legend ────────────────────────────────────────────────
  _setLegend(category) {
    const legend = document.getElementById('legend');
    const legendData = {
      sorting: [
        { color: '#58a6ff', label: 'Unsorted'   },
        { color: '#d29922', label: 'Comparing'  },
        { color: '#f78166', label: 'Swapping'   },
        { color: '#bc8cff', label: 'Pivot'      },
        { color: '#3fb950', label: 'Sorted'     },
      ],
      graph: [
        { color: '#8b949e', label: 'Unvisited'       },
        { color: '#58a6ff', label: 'Visited/Queue'   },
        { color: '#3fb950', label: 'Current'         },
        { color: '#39d0d8', label: 'Settled/Closed'  },
        { color: '#bc8cff', label: 'Path'            },
      ],
      tree: [
        { color: '#8b949e', label: 'Node'            },
        { color: '#3fb950', label: 'Inserted/Found'  },
        { color: '#f78166', label: 'Rotation'        },
      ],
      alignment: [
        { color: '#39d0d8', label: 'Current Cell' },
        { color: '#3fb950', label: 'Match'        },
        { color: '#bc8cff', label: 'Backtrace Path' },
        { color: '#f78166', label: 'Gap / Mismatch' },
      ],
      database: [
        { color: '#39d0d8', label: 'Seed Hit'  },
        { color: '#bc8cff', label: 'Extension' },
        { color: '#3fb950', label: 'Best HSP'  },
      ],
      phylo: [
        { color: '#58a6ff', label: 'Tree Edge'     },
        { color: '#3fb950', label: 'Current Merge' },
        { color: '#39d0d8', label: 'Internal Node' },
      ],
      clustering: [
        { color: '#58a6ff', label: 'Cluster 1'  },
        { color: '#3fb950', label: 'Cluster 2'  },
        { color: '#f78166', label: 'Cluster 3'  },
        { color: '#bc8cff', label: 'Centroid ✦' },
      ],
      rbtree: [
        { color: '#e5534b', label: 'Red Node'   },
        { color: '#3c4149', label: 'Black Node' },
        { color: '#3fb950', label: 'Inserted'   },
        { color: '#f78166', label: 'Rotation'   },
      ],
    };
    const items = legendData[category] || [];
    legend.style.display = items.length ? '' : 'none';
    legend.innerHTML = items.map(item =>
      `<div class="legend-item">
        <div class="legend-dot" style="background:${item.color}"></div>
        ${item.label}
       </div>`
    ).join('');
  }

  // ── Algorithm Loading ─────────────────────────────────────
  _loadAlgo(algo) {
    const meta = ALGO_META[algo];
    this.engine.reset();

    if      (meta.category === 'sorting')    this._loadSortAlgo(algo);
    else if (meta.category === 'graph')      this._startGraphAlgo(algo,
      document.getElementById('start-node-select').value || 'A',
      document.getElementById('end-node-select').value   || null
    );
    else if (meta.category === 'tree')       { /* interactive */ }
    else if (meta.category === 'alignment')  this._loadAlignmentAlgo(algo);
    else if (meta.category === 'database')   this._loadDatabaseAlgo(algo);
    else if (meta.category === 'phylo')      this._loadPhyloAlgo(algo);
    else if (meta.category === 'clustering') this._loadClusteringAlgo(algo);
    else if (meta.category === 'rbtree')     { /* interactive */ }
    else this._loadOtherAlgo(algo);
  }

  _loadSortAlgo(algo) {
    const arr = [...this.customArray];
    this.sortingViz.init(arr);
    document.getElementById('stat-size').textContent = arr.length;
    this._resetStats();

    const generators = {
      bubble:    () => bubbleSortGen(arr),
      selection: () => selectionSortGen(arr),
      insertion: () => insertionSortGen(arr),
      merge:     () => mergeSortGen(arr),
      quick:     () => quickSortGen(arr),
      heap:      () => heapSortGen(arr),
    };
    const count = this.engine.load(generators[algo]());
    document.getElementById('current-step-msg').textContent =
      `${count} animation frames loaded. Press ▶ Play or ⏭ Step.`;
  }

  _startGraphAlgo(algo, start, end) {
    const generators = {
      bfs:      () => bfsGen(this.graphData, start, end),
      dfs:      () => dfsGen(this.graphData, start, end),
      dijkstra: () => dijkstraGen(this.graphData, start, end),
      astar:    () => astarGen(this.graphData, start, end),
    };
    if (!generators[algo]) return;
    this.engine.reset();
    const count = this.engine.load(generators[algo]());
    this.renderer.drawGraph(this.graphData);
    document.getElementById('current-step-msg').textContent =
      `${count} frames. Start: ${start}${end ? ' → End: ' + end : ''}. Press ▶ Play.`;
  }

  _loadOtherAlgo(algo) {
    const otherContainer = document.getElementById('other-container');
    otherContainer.innerHTML = '';

    if (algo === 'binarysearch') {
      const sortedArr = [...this.customArray].sort((a, b) => a - b).slice(0, 20);
      const target    = this.bsTarget || sortedArr[Math.floor(Math.random() * sortedArr.length)];
      this.bsTarget   = target;
      this.bsArr      = sortedArr;
      this._renderBSViz(sortedArr, {});
      const count = this.engine.load(binarySearchGen(sortedArr, target));
      document.getElementById('current-step-msg').textContent =
        `Searching for ${target} in sorted array of ${sortedArr.length} elements.`;

    } else if (algo === 'fibonacci') {
      this._renderFibViz({ dp: new Array(this.fibN + 1).fill(-1), active: -1 });
      const count = this.engine.load(fibonacciGen(this.fibN));
      document.getElementById('current-step-msg').textContent =
        `Computing Fibonacci(${this.fibN}) using Dynamic Programming.`;

    } else if (algo === 'knapsack') {
      this._renderKnapsackViz({
        dp: Array(this.knapsackItems.length + 1).fill(null).map(() => Array(this.knapsackW + 1).fill(0)),
        active: null
      });
      const count = this.engine.load(knapsackGen(this.knapsackItems, this.knapsackW));
      document.getElementById('current-step-msg').textContent =
        `Knapsack: ${this.knapsackItems.length} items, capacity W=${this.knapsackW}.`;
    }
  }

  // ── Alignment ─────────────────────────────────────────────
  _loadAlignmentAlgo(algo) {
    const generators = {
      needlemanwunsch: () => needlemanWunschGen(this.alignSeq1, this.alignSeq2),
      smithwaterman:   () => smithWatermanGen(this.alignSeq1, this.alignSeq2),
      affinegap:       () => affineGapGen(this.alignSeq1, this.alignSeq2),
      msa:             () => msaGen([this.alignSeq1, this.alignSeq2, 'GCATGCU', 'GCTTACA']),
      semiglobal:      () => semiGlobalGen(this.alignSeq1, this.alignSeq2),
    };
    const gen = generators[algo];
    if (!gen) return;
    this.alignRenderer.container = document.getElementById('other-container');
    this.alignRenderer.lastSeq1 = null; // force rebuild
    const count = this.engine.load(gen());
    document.getElementById('current-step-msg').textContent =
      `Aligning "${this.alignSeq1}" vs "${this.alignSeq2}" — ${count} steps. Press ▶ Play.`;
  }

  // ── Stub for database search (not in this task) ────────────
  _loadDatabaseAlgo(algo) {
    document.getElementById('current-step-msg').textContent = 'Database search demo not included.';
  }

  // ── Phylogenetics ─────────────────────────────────────────
  _loadPhyloAlgo(algo) {
    this.renderer.clear();
    const generators = {
      upgma:           () => upgmaGen(this.phyloTaxa, this.phyloDistances),
      neighborjoining: () => neighborJoiningGen(this.phyloTaxa, this.phyloDistances),
      maxparsimony:    () => maxParsimonyGen(this.phyloTaxa, this.phyloSequences),
      maxlikelihood:   () => maxLikelihoodGen(this.phyloTaxa, this.phyloSequences),
    };
    const gen = generators[algo];
    if (!gen) return;
    const count = this.engine.load(gen());
    document.getElementById('current-step-msg').textContent =
      `${count} steps — Taxa: ${this.phyloTaxa.join(', ')}. Press ▶ Play.`;
  }

  // Helper: build UPGMA treeEdges from frames 0..idx
  _getUPGMAEdges(upToIdx) {
    const edges = [];
    for (let i = 0; i <= upToIdx && i < this.engine.frames.length; i++) {
      const f = this.engine.frames[i];
      if (f && f.type === 'merge' && f.newNode)
        edges.push({ from: f.newNode.label, toA: f.mergedA, toB: f.mergedB });
    }
    return edges;
  }

  // ── Clustering ────────────────────────────────────────────
  _loadClusteringAlgo(algo) {
    this.renderer.clear();
    const generators = {
      kmeans:                 () => kMeansGen(this.clusterPoints, this.kmeansK),
      hierarchicalclustering: () => hierarchicalClusteringGen(this.hierPoints),
    };
    const gen = generators[algo];
    if (!gen) return;
    const count = this.engine.load(gen());
    document.getElementById('current-step-msg').textContent =
      algo === 'kmeans'
        ? `${count} steps — k=${this.kmeansK}, ${this.clusterPoints.length} points. Click canvas to add points. Press ▶ Play.`
        : `${count} steps — ${this.hierPoints.length} points. Press ▶ Play.`;
  }

  // ── Red-Black Tree interactive ────────────────────────────
  _initRBTreeViz() {
    document.getElementById('canvas-container').style.display = 'block';
    document.getElementById('canvas-container').classList.add('has-tree-ctrl');
    document.getElementById('tree-ctrl-bar').style.display = 'flex';
    const bar = document.getElementById('tree-ctrl-bar');
    bar.innerHTML = '';

    const lbl = document.createElement('span');
    lbl.style.cssText = 'color:var(--text-muted); font-size:11px;';
    lbl.textContent = 'Red-Black Tree:';
    bar.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'number'; input.placeholder = 'Value (1-99)';
    input.className = 'form-input'; input.style.width = '130px';
    bar.appendChild(input);

    const doInsert = () => {
      const v = parseInt(input.value);
      if (isNaN(v) || v < 1 || v > 99) return;
      const frames = this.rbTree.insert(v);
      let i = 0;
      const show = () => {
        if (i < frames.length) {
          document.getElementById('current-step-msg').textContent = frames[i].msg;
          this.renderer.drawRBTree(this.rbTree.snapshot(), v, frames[i].action === 'rotate' ? v : null);
          i++;
          setTimeout(show, 450);
        } else {
          this.renderer.drawRBTree(this.rbTree.snapshot(), v);
        }
      };
      show();
      input.value = '';
    };

    const ins = document.createElement('button');
    ins.className = 'btn btn-primary'; ins.textContent = '+ Insert';
    ins.onclick = doInsert;
    bar.appendChild(ins);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doInsert(); });

    const clr = document.createElement('button');
    clr.className = 'btn'; clr.textContent = '🗑 Clear';
    clr.onclick = () => { this.rbTree = new RBTree(); this.renderer.drawRBTree(null); };
    bar.appendChild(clr);

    const rnd = document.createElement('button');
    rnd.className = 'btn'; rnd.textContent = '🎲 Auto-Demo';
    rnd.onclick = () => {
      this.rbTree = new RBTree();
      const vals = [10, 20, 30, 15, 25, 5, 35, 28, 40, 22];
      let i = 0;
      const go = () => {
        if (i < vals.length) {
          this.rbTree.insert(vals[i]);
          this.renderer.drawRBTree(this.rbTree.snapshot(), vals[i]);
          document.getElementById('current-step-msg').textContent =
            `Inserted ${vals[i]} — Red-Black properties auto-maintained.`;
          i++;
          setTimeout(go, 650);
        }
      };
      go();
    };
    bar.appendChild(rnd);

    ['btn-play','btn-step','btn-next','btn-reset'].forEach(id =>
      document.getElementById(id).disabled = true
    );
    this.renderer.drawRBTree(this.rbTree.snapshot());
  }

  // ── Specialized Renderers ─────────────────────────────────
  _renderBSViz(arr, state) {
    const container = document.getElementById('other-container');
    container.innerHTML = '';
    // Use a flex scroll wrapper so content fills the absolute container properly
    const wrap = document.createElement('div');
    wrap.className = 'other-scroll-wrap';
    container.appendChild(wrap);

    const title = document.createElement('div');
    title.style.cssText = 'font-size:12px; color:var(--text-muted); margin-bottom:8px;';
    title.textContent = `Target: ${this.bsTarget}`;
    wrap.appendChild(title);

    const row = document.createElement('div');
    row.className = 'bs-array';
    for (let i = 0; i < arr.length; i++) {
      const cell = document.createElement('div');
      cell.className = 'bs-cell';
      cell.textContent = arr[i];
      if      (state.eliminated && state.eliminated.includes(i)) cell.classList.add('eliminated');
      else if (state.found === i)  cell.classList.add('found');
      else if (state.mid   === i)  cell.classList.add('mid');
      row.appendChild(cell);
    }
    wrap.appendChild(row);

    // Pointer row (L / M / R labels)
    const ptrs = document.createElement('div');
    ptrs.style.cssText = 'display:flex; gap:4px; flex-wrap:wrap; justify-content:center; margin-top:4px;';
    for (let i = 0; i < arr.length; i++) {
      const p = document.createElement('div');
      p.style.cssText = 'width:44px; font-size:9px; text-align:center; color:var(--text-muted);';
      const labels = [];
      if (state.left  === i) labels.push('L');
      if (state.mid   === i) labels.push('M');
      if (state.right === i) labels.push('R');
      p.textContent = labels.join('/');
      if (labels.includes('L')) p.style.color = '#3fb950';
      if (labels.includes('M')) p.style.color = '#39d0d8';
      if (labels.includes('R')) p.style.color = '#f78166';
      ptrs.appendChild(p);
    }
    wrap.appendChild(ptrs);

    const stats = document.createElement('div');
    stats.style.cssText = 'font-size:11px; color:var(--text-muted);';
    stats.textContent = `Comparisons: ${state.cmps || 0}`;
    wrap.appendChild(stats);
  }

  _renderFibViz(state) {
    const container = document.getElementById('other-container');
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'other-scroll-wrap';
    container.appendChild(wrap);

    const title = document.createElement('div');
    title.style.cssText = 'font-size:12px; color:var(--text-muted); text-align:center;';
    title.textContent = `Fibonacci DP Table — Computing fib(${this.fibN})`;
    wrap.appendChild(title);

    const row = document.createElement('div');
    row.className = 'fib-cells';
    for (let i = 0; i <= this.fibN; i++) {
      const cell = document.createElement('div');
      cell.className = 'fib-cell';
      if      (i === state.active)              cell.classList.add('active');
      else if (state.dp && state.dp[i] >= 0)    cell.classList.add('computed');
      cell.innerHTML = `<div class="fib-label">fib(${i})</div>
                        <div class="fib-value">${state.dp && state.dp[i] >= 0 ? state.dp[i] : '?'}</div>`;
      row.appendChild(cell);
    }
    wrap.appendChild(row);

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px; color:var(--text-muted); text-align:center;';
    hint.textContent = 'dp[i] = dp[i-1] + dp[i-2]';
    wrap.appendChild(hint);
  }

  _renderKnapsackViz(state) {
    const container = document.getElementById('other-container');
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'other-scroll-wrap';
    container.appendChild(wrap);

    // Item chips
    const itemsDiv = document.createElement('div');
    itemsDiv.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap;';
    for (const item of this.knapsackItems) {
      const chip = document.createElement('div');
      chip.style.cssText = 'background:var(--bg-3); border:1px solid var(--border); border-radius:6px; padding:6px 10px; font-size:11px;';
      chip.innerHTML = `<strong style="color:var(--accent-cyan)">${item.name}</strong><br>w=${item.weight} v=${item.value}`;
      itemsDiv.appendChild(chip);
    }
    wrap.appendChild(itemsDiv);

    // DP table
    const tableWrap = document.createElement('div');
    tableWrap.className = 'knapsack-table-wrap';
    const table = document.createElement('table');
    table.className = 'dp-table';

    const thead = document.createElement('thead');
    const hr    = document.createElement('tr');
    hr.appendChild(Object.assign(document.createElement('th'), { textContent: 'Item \\ Cap' }));
    for (let w = 0; w <= this.knapsackW; w++) {
      const th = document.createElement('th'); th.textContent = w; hr.appendChild(th);
    }
    thead.appendChild(hr); table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i <= this.knapsackItems.length; i++) {
      const tr    = document.createElement('tr');
      const label = document.createElement('td');
      label.style.cssText = 'background:var(--bg-3); color:var(--text-secondary); font-weight:700;';
      label.textContent = i === 0 ? '∅' : `${i}: ${this.knapsackItems[i - 1].name}`;
      tr.appendChild(label);
      for (let w = 0; w <= this.knapsackW; w++) {
        const td        = document.createElement('td');
        const isActive  = state.active && state.active.i === i && state.active.w === w;
        const isComputed = state.dp && state.dp[i] && state.dp[i][w] > 0 && !isActive;
        td.textContent  = state.dp ? state.dp[i][w] : 0;
        if (isActive)   td.classList.add('active-cell');
        else if (isComputed) td.classList.add('computed-cell');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
  }

  // ── Tree Interactive Controls ─────────────────────────────
  _initTreeViz() {
    // Show canvas; add modifier class so canvas leaves room for the control strip
    document.getElementById('canvas-container').style.display = 'block';
    document.getElementById('canvas-container').classList.add('has-tree-ctrl');
    document.getElementById('tree-ctrl-bar').style.display = 'flex';
    if      (this.currentAlgo === 'bst') this._renderBSTControls();
    else if (this.currentAlgo === 'avl') this._renderAVLControls();
  }

  _renderBSTControls() {
    const bar = document.getElementById('tree-ctrl-bar');
    bar.innerHTML = '';

    const label = document.createElement('span');
    label.style.cssText = 'color:var(--text-muted); font-size:11px;';
    label.textContent = 'BST Operations:';
    bar.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number'; input.placeholder = 'Value (1-99)';
    input.className = 'form-input'; input.style.width = '130px';
    bar.appendChild(input);

    const insertBtn = document.createElement('button');
    insertBtn.className = 'btn btn-primary'; insertBtn.textContent = '+ Insert';
    insertBtn.onclick = () => {
      const v = parseInt(input.value);
      if (!isNaN(v)) { this.bstTree.insert(v); this.renderer.drawTree(this.bstTree.root); input.value = ''; }
    };
    bar.appendChild(insertBtn);

    const searchBtn = document.createElement('button');
    searchBtn.className = 'btn'; searchBtn.textContent = '🔍 Search';
    searchBtn.onclick = () => {
      const v = parseInt(input.value);
      if (!isNaN(v)) {
        const frames = this.bstTree.search(v);
        let i = 0;
        const show = () => {
          if (i < frames.length) {
            document.getElementById('current-step-msg').textContent = frames[i].msg;
            i++;
            setTimeout(show, 600);
          }
        };
        show();
      }
    };
    bar.appendChild(searchBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn'; clearBtn.textContent = '🗑 Clear';
    clearBtn.onclick = () => { this.bstTree = new BSTree(); this.renderer.drawTree(null); };
    bar.appendChild(clearBtn);

    const randomBtn = document.createElement('button');
    randomBtn.className = 'btn'; randomBtn.textContent = '🎲 Random';
    randomBtn.onclick = () => {
      this.bstTree = new BSTree();
      const vals = Array.from({ length: 8 }, () => Math.floor(Math.random() * 80) + 10);
      for (const v of vals) this.bstTree.insert(v);
      this.renderer.drawTree(this.bstTree.root);
    };
    bar.appendChild(randomBtn);
  }

  _renderAVLControls() {
    const bar = document.getElementById('tree-ctrl-bar');
    bar.innerHTML = '';

    const label = document.createElement('span');
    label.style.cssText = 'color:var(--text-muted); font-size:11px;';
    label.textContent = 'AVL Operations:';
    bar.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number'; input.placeholder = 'Value (1-99)';
    input.className = 'form-input'; input.style.width = '130px';
    bar.appendChild(input);

    const insertBtn = document.createElement('button');
    insertBtn.className = 'btn btn-primary'; insertBtn.textContent = '+ Insert (Auto-balance)';
    insertBtn.onclick = () => {
      const v = parseInt(input.value);
      if (!isNaN(v)) {
        const frames = [];
        this.avlRoot = this.avlTree.insert(this.avlRoot, v, frames);
        let i = 0;
        const show = () => {
          if (i < frames.length) {
            const f = frames[i];
            document.getElementById('current-step-msg').textContent = f.msg;
            this.renderer.drawTree(this.avlRoot, v, f.codeTrigger === 'rotate' ? v : null);
            i++;
            setTimeout(show, 400);
          } else {
            this.renderer.drawTree(this.avlRoot, v);
          }
        };
        show();
        input.value = '';
      }
    };
    bar.appendChild(insertBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn'; clearBtn.textContent = '🗑 Clear';
    clearBtn.onclick = () => { this.avlRoot = null; this.renderer.drawTree(null); };
    bar.appendChild(clearBtn);

    const randomBtn = document.createElement('button');
    randomBtn.className = 'btn'; randomBtn.textContent = '🎲 Random';
    randomBtn.onclick = () => {
      this.avlRoot = null;
      const vals = [10, 20, 30, 40, 50, 25, 15, 35, 5, 45];
      let i = 0;
      const insert = () => {
        if (i < vals.length) {
          this.avlRoot = this.avlTree.insert(this.avlRoot, vals[i], []);
          this.renderer.drawTree(this.avlRoot, vals[i]);
          document.getElementById('current-step-msg').textContent =
            `Inserted ${vals[i]}. Balance maintained via rotations.`;
          i++;
          setTimeout(insert, 700);
        }
      };
      insert();
    };
    bar.appendChild(randomBtn);
  }

  _populateGraphDropdowns() {
    const nodes    = this.graphData.nodes;
    const startSel = document.getElementById('start-node-select');
    const endSel   = document.getElementById('end-node-select');
    startSel.innerHTML = nodes.map(n => `<option value="${n.id}">${n.id}</option>`).join('');
    endSel.innerHTML   = '<option value="">— None —</option>' +
      nodes.map(n => `<option value="${n.id}">${n.id}</option>`).join('');
    startSel.value = 'A';
    endSel.value   = 'H';
  }

  // ── Frame Handler ─────────────────────────────────────────
  _onFrame(frame, idx) {
    const algo = this.currentAlgo;
    const meta = ALGO_META[algo];

    // Stats
    if (frame.comparisons !== undefined) document.getElementById('stat-cmp').textContent = frame.comparisons;
    if (frame.swaps !== undefined)       document.getElementById('stat-swp').textContent = frame.swaps;
    document.getElementById('stat-step').textContent = idx + 1;

    // Step message
    const msgEl = document.getElementById('current-step-msg');
    if (frame.msg) msgEl.textContent = `Step ${idx + 1}/${this.engine.frames.length}: ${frame.msg}`;

    // Visualization
    if      (meta.category === 'sorting')     this.sortingViz.render(frame);
    else if (meta.category === 'tree')        this.renderer.drawTree(this.bstTree.root);
    else if (meta.category === 'graph')       this.renderer.drawGraph(this.graphData, frame);
    else if (meta.category === 'alignment')   this.alignRenderer.render(frame);
    else if (algo === 'upgma')                this.renderer.drawDendogram({ ...frame, treeEdges: this._getUPGMAEdges(idx), mergeA: frame.mergedA, mergeB: frame.mergedB });
    else if (algo === 'neighborjoining')      this.renderer.drawNJTree(frame);
    else if (algo === 'maxparsimony')         this.renderer.drawTopologies(frame);
    else if (algo === 'maxlikelihood')        this.renderer.drawTopologies(frame);
    else if (algo === 'kmeans')               this.renderer.drawKMeans(frame);
    else if (algo === 'hierarchicalclustering') this.renderer.drawHierarchical(frame);
    else if (algo === 'binarysearch')         this._renderBSViz(this.bsArr, frame);
    else if (algo === 'fibonacci')            this._renderFibViz(frame);
    else if (algo === 'knapsack')             this._renderKnapsackViz(frame);

    // Code / step highlighting
    if (frame.codeTrigger) this._highlightCode(meta, frame.codeTrigger);
  }

  _onEnd() {
    this._updatePlayBtn(false);
    const last = this.engine.frames[this.engine.frames.length - 1];
    if (last?.msg) document.getElementById('current-step-msg').textContent = last.msg;
  }

  _refreshCurrentFrame() {
    if (this.engine.currentFrame) {
      this._onFrame(this.engine.currentFrame, this.engine.currentIdx);
    } else if (['graph','tree'].includes(ALGO_META[this.currentAlgo]?.category)) {
      if (ALGO_META[this.currentAlgo]?.category === 'graph') this.renderer.drawGraph(this.graphData);
      else this.renderer.drawTree(this.bstTree.root);
    }
  }

  // ── Playback Controls ─────────────────────────────────────
  togglePlay() {
    if (this.engine.isPlaying) {
      this.engine.pause();
      this._updatePlayBtn(false);
    } else {
      if (this.engine.currentIdx >= this.engine.frames.length - 1) this._loadAlgo(this.currentAlgo);
      this.engine.play();
      this._updatePlayBtn(true);
    }
  }

  stepForward() {
    this.engine.pause();
    this._updatePlayBtn(false);
    this.engine.step();
  }

  stepBack() {
    this.engine.pause();
    this._updatePlayBtn(false);
    this.engine.stepBack();
  }

  resetAlgo() {
    this.engine.reset();
    this._updatePlayBtn(false);
    this._loadAlgo(this.currentAlgo);
    this._resetStats();
  }

  _updatePlayBtn(isPlaying) {
    const btn = document.getElementById('btn-play');
    btn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
    btn.classList.toggle('btn-primary', !isPlaying);
  }

  _resetStats() {
    document.getElementById('stat-cmp').textContent  = '0';
    document.getElementById('stat-swp').textContent  = '0';
    document.getElementById('stat-step').textContent = '0';
  }

  // ── Info Panel ────────────────────────────────────────────
  _renderInfoPanel(meta) {
    document.getElementById('tab-info').innerHTML = `
      <div class="info-section">
        <div class="info-section-title">📌 Description</div>
        <div class="info-text">${meta.description}</div>
      </div>
      <div class="info-section">
        <div class="info-section-title">⏱ Complexity</div>
        <div class="complexity-grid">
          <div class="complexity-item">
            <div class="label">Best Case</div>
            <div class="value ${meta.complexityClass.best}">${meta.complexity.best}</div>
          </div>
          <div class="complexity-item">
            <div class="label">Average Case</div>
            <div class="value ${meta.complexityClass.avg}">${meta.complexity.avg}</div>
          </div>
          <div class="complexity-item">
            <div class="label">Worst Case</div>
            <div class="value ${meta.complexityClass.worst}">${meta.complexity.worst}</div>
          </div>
          <div class="complexity-item">
            <div class="label">Space</div>
            <div class="value ${meta.complexityClass.space}">${meta.complexity.space}</div>
          </div>
        </div>
      </div>
      <div class="info-section">
        <div class="info-section-title">🧩 Use Cases</div>
        <div class="use-cases">
          ${meta.useCases.map(u => `<span class="use-case-chip">${u}</span>`).join('')}
        </div>
      </div>
    `;
  }

  _renderStepsPanel(meta) {
    document.getElementById('steps-list').innerHTML = meta.steps.map((s, i) => `
      <div class="step-item" data-step="${i}">
        <div class="step-num">${i + 1}</div>
        <div class="step-text"><strong style="color:var(--text-primary)">${s.title}:</strong> ${s.text}</div>
      </div>
    `).join('');
  }

  _renderCodePanel(meta) {
    document.getElementById('code-block').innerHTML = meta.code.map(l =>
      `<div class="code-line" data-line="${l.line}">${this._syntaxHighlight(l.text)}</div>`
    ).join('');
  }

  _syntaxHighlight(code) {
    return code
      .replace(/\b(function|const|let|var|if|else|while|for|return|of|new|class|break|null|true|false|undefined|Infinity)\b/g,
        '<span class="kw">$1</span>')
      .replace(/\b(Math|Array|Set|Object)\b/g, '<span class="fn">$1</span>')
      .replace(/\/\/ .*/g,  '<span class="cm">$&</span>')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  }

  _highlightCode(meta, trigger) {
    document.querySelectorAll('#code-block .code-line').forEach(l => l.classList.remove('highlight'));
    if (!trigger) return;
    const triggerLines = meta.code.filter(c => c.trigger === trigger).map(c => c.line);
    for (const line of triggerLines) {
      const el = document.querySelector(`#code-block [data-line="${line}"]`);
      if (el) { el.classList.add('highlight'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  }

  // ── Custom Input Modal ────────────────────────────────────
  openInputModal() {
    const algo = this.currentAlgo;
    if (!algo) return;
    const meta = ALGO_META[algo];
    if (!meta) return;

    const modal = document.getElementById('modal-overlay');
    const body  = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = 'Custom Input';

    if (meta.category === 'sorting') {
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Array (comma-separated numbers, max 60)</label>
          <input class="form-input" id="input-array" placeholder="e.g. 64,25,12,22,11"
            value="${this.customArray.join(',')}">
        </div>
        <div class="form-group">
          <label class="form-label">Or generate random array</label>
          <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
            <input class="form-input" id="input-size" type="number" min="5" max="60"
              value="${this.customArray.length}" style="width:80px;">
            <button class="btn" id="gen-random-btn">Generate</button>
          </div>
        </div>`;
      document.getElementById('gen-random-btn').onclick = () => {
        const size = Math.min(60, Math.max(5, parseInt(document.getElementById('input-size').value) || 20));
        document.getElementById('input-array').value = this._generateArray(size).join(',');
      };

    } else if (algo === 'binarysearch') {
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Sorted Array (comma-separated, max 20)</label>
          <input class="form-input" id="input-array" value="${this.bsArr.join(',')}">
        </div>
        <div class="form-group">
          <label class="form-label">Search Target</label>
          <input class="form-input" id="input-target" type="number" value="${this.bsTarget}">
        </div>`;

    } else if (algo === 'fibonacci') {
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">n (compute fib(n), max 25)</label>
          <input class="form-input" id="input-fib-n" type="number" min="2" max="25" value="${this.fibN}">
        </div>`;

    } else if (algo === 'knapsack') {
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Knapsack Capacity (W)</label>
          <input class="form-input" id="input-capacity" type="number" min="1" max="15" value="${this.knapsackW}">
        </div>
        <div class="form-group">
          <label class="form-label">Items (name:weight:value, one per line)</label>
          <textarea class="form-input" id="input-items" style="height:100px; resize:vertical;">${
            this.knapsackItems.map(i => `${i.name}:${i.weight}:${i.value}`).join('\n')
          }</textarea>
        </div>`;

    } else if (meta.category === 'alignment') {
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Sequence 1 (DNA/protein, max 20 chars)</label>
          <input class="form-input" id="input-seq1" value="${this.alignSeq1}" placeholder="e.g. GATTACA" style="font-family:monospace; letter-spacing:2px;">
        </div>
        <div class="form-group">
          <label class="form-label">Sequence 2 (DNA/protein, max 20 chars)</label>
          <input class="form-input" id="input-seq2" value="${this.alignSeq2}" placeholder="e.g. GCATGCU" style="font-family:monospace; letter-spacing:2px;">
        </div>`;

    } else if (algo === 'kmeans') {
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Number of clusters k (2–6)</label>
          <input class="form-input" id="input-k" type="number" min="2" max="6" value="${this.kmeansK}" style="width:80px;">
        </div>
        <div class="form-group">
          <label class="form-label">Number of points (10–80)</label>
          <input class="form-input" id="input-pts" type="number" min="10" max="80" value="${this.clusterPoints.length}" style="width:80px;">
        </div>`;

    } else {
      body.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:16px 0;">
        This algorithm uses a fixed demo dataset.</div>`;
    }

    modal.classList.add('open');
  }

  applyInput() {
    const algo = this.currentAlgo;
    const meta = ALGO_META[algo];
    if (!meta) { this.closeModal(); return; }

    if (meta.category === 'sorting') {
      const val = document.getElementById('input-array')?.value || '';
      const arr = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0).slice(0, 60);
      if (arr.length >= 2) this.customArray = arr;

    } else if (algo === 'binarysearch') {
      const arrVal = document.getElementById('input-array')?.value || '';
      const arr    = arrVal.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)).slice(0, 20).sort((a, b) => a - b);
      if (arr.length >= 2) this.bsArr = arr;
      const target = parseInt(document.getElementById('input-target')?.value);
      if (!isNaN(target)) this.bsTarget = target;

    } else if (algo === 'fibonacci') {
      const n = parseInt(document.getElementById('input-fib-n')?.value);
      if (!isNaN(n) && n >= 2 && n <= 25) this.fibN = n;

    } else if (algo === 'knapsack') {
      const W = parseInt(document.getElementById('input-capacity')?.value);
      if (!isNaN(W) && W > 0) this.knapsackW = Math.min(15, W);
      const lines = document.getElementById('input-items')?.value.split('\n') || [];
      const items = lines.map(l => {
        const [name, w, v] = l.split(':');
        return { name: name?.trim(), weight: parseInt(w), value: parseInt(v) };
      }).filter(i => i.name && !isNaN(i.weight) && !isNaN(i.value) && i.weight > 0 && i.value > 0).slice(0, 8);
      if (items.length > 0) this.knapsackItems = items;
    } else if (meta.category === 'alignment') {
      const s1 = (document.getElementById('input-seq1')?.value || '').trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,20);
      const s2 = (document.getElementById('input-seq2')?.value || '').trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,20);
      if (s1.length >= 2) this.alignSeq1 = s1;
      if (s2.length >= 2) this.alignSeq2 = s2;

    } else if (algo === 'kmeans') {
      const k = parseInt(document.getElementById('input-k')?.value);
      const n = parseInt(document.getElementById('input-pts')?.value);
      if (!isNaN(k) && k >= 2 && k <= 6) this.kmeansK = k;
      if (!isNaN(n) && n >= 10 && n <= 80) this.clusterPoints = generateClusterPoints(n, this.kmeansK);
    }
    this.engine.reset();
    this._loadAlgo(algo);
  }

  closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
}

// ── Boot ──────────────────────────────────────────────────────
const app = new App();
