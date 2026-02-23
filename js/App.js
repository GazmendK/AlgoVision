












"use strict";

class App {
  constructor() {
    this.currentAlgo = null;

    
    this.engine      = new AnimationEngine();
    this.canvas      = document.getElementById('viz-canvas');
    this.renderer    = new CanvasRenderer(this.canvas);
    this.sortingViz  = new SortingVisualizer(document.getElementById('sort-container'));

    
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

    this.init();
  }

  
  _generateArray(size, min = 5, max = 95) {
    return Array.from({ length: size }, () => Math.floor(Math.random() * (max - min + 1)) + min);
  }

  
  init() {
    
    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', () => this.selectAlgo(btn.dataset.algo));
    });

    
    document.getElementById('btn-play').addEventListener('click',  () => this.togglePlay());
    document.getElementById('btn-step').addEventListener('click',  () => this.stepBack());
    document.getElementById('btn-next').addEventListener('click',  () => this.stepForward());
    document.getElementById('btn-reset').addEventListener('click', () => this.resetAlgo());
    document.getElementById('btn-input').addEventListener('click', () => this.openInputModal());

    
    const speedSlider = document.getElementById('speed-slider');
    speedSlider.addEventListener('input', () => {
      this.engine.speed = parseInt(speedSlider.value);
      document.getElementById('speed-label').textContent = speedSlider.value + 'x';
    });

    
    document.querySelectorAll('.info-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.info-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.info-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    
    document.getElementById('theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('light');
      document.getElementById('theme-toggle').textContent =
        document.body.classList.contains('light') ? '🌙' : '☀';
      if (this.currentAlgo) this._refreshCurrentFrame();
    });

    
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-apply').addEventListener('click',  () => this.applyInput());
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });

    
    document.getElementById('btn-apply-graph').addEventListener('click', () => {
      const start = document.getElementById('start-node-select').value;
      const end   = document.getElementById('end-node-select').value || null;
      if (start) this._startGraphAlgo(this.currentAlgo, start, end);
    });

    
    this.engine.onFrame = (frame, idx) => this._onFrame(frame, idx);
    this.engine.onEnd   = () => this._onEnd();

    
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
  }

  _resizeCanvas() {
    const vizArea   = document.getElementById('viz-area');
    const container = document.getElementById('canvas-container');
    const w = vizArea.clientWidth  - 32;
    const h = vizArea.clientHeight - 32;
    this.renderer.resize(w, h);
    container.style.width  = w + 'px';
    container.style.height = h + 'px';
    if (this.currentAlgo) this._refreshCurrentFrame();
  }

  
  selectAlgo(algo) {
    this.currentAlgo = algo;
    document.querySelectorAll('.algo-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.algo === algo)
    );

    const meta = ALGO_META[algo];
    if (!meta) return;

    
    document.getElementById('algo-title').textContent = meta.name;
    const badge = document.getElementById('complexity-badge');
    badge.textContent  = `Avg: ${meta.complexity.avg}`;
    badge.style.display = '';

    
    this._showCorrectVizPanel(meta.category);
    document.getElementById('stats-bar').style.display =
      meta.category === 'sorting' ? '' : 'none';
    document.getElementById('current-step-msg').style.display = '';
    document.getElementById('current-step-msg').textContent = 'Press ▶ Play or ⏭ Step to begin.';

    
    this._renderInfoPanel(meta);
    this._renderCodePanel(meta);
    this._renderStepsPanel(meta);

    
    ['btn-play','btn-step','btn-next','btn-reset'].forEach(id =>
      document.getElementById(id).disabled = false
    );

    
    const isGraph = ['bfs','dfs','dijkstra','astar'].includes(algo);
    const isTree  = ['bst','avl'].includes(algo);
    document.getElementById('graph-input-bar').style.display = isGraph ? '' : 'none';
    if (isGraph) this._populateGraphDropdowns();
    else if (isTree) this._initTreeViz();

    
    this._setLegend(meta.category);

    
    this._loadAlgo(algo);
  }

  
  _showCorrectVizPanel(category) {
    document.getElementById('sort-container').style.display   = 'none';
    document.getElementById('canvas-container').style.display = 'none';
    document.getElementById('other-container').style.display  = 'none';
    document.getElementById('viz-placeholder').style.display  = 'none';

    if      (category === 'sorting')              document.getElementById('sort-container').style.display   = '';
    else if (category === 'graph' || category === 'tree') {
      document.getElementById('canvas-container').style.display = '';
      this._resizeCanvas();
    } else                                        document.getElementById('other-container').style.display  = 'flex';
  }

  
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

  
  _loadAlgo(algo) {
    const meta = ALGO_META[algo];
    this.engine.reset();

    if      (meta.category === 'sorting') this._loadSortAlgo(algo);
    else if (meta.category === 'graph')   this._startGraphAlgo(algo,
      document.getElementById('start-node-select').value || 'A',
      document.getElementById('end-node-select').value   || null
    );
    else if (meta.category === 'tree') { /* handled interactively */ }
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

  
  _renderBSViz(arr, state) {
    const container = document.getElementById('other-container');
    container.innerHTML = '';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:12px; color:var(--text-muted); margin-bottom:8px;';
    title.textContent = `Target: ${this.bsTarget}`;
    container.appendChild(title);

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
    container.appendChild(row);

    
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
    container.appendChild(ptrs);

    const stats = document.createElement('div');
    stats.style.cssText = 'margin-top:12px; font-size:11px; color:var(--text-muted);';
    stats.textContent = `Comparisons: ${state.cmps || 0}`;
    container.appendChild(stats);
  }

  _renderFibViz(state) {
    const container = document.getElementById('other-container');
    container.innerHTML = '';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:12px; color:var(--text-muted); margin-bottom:12px; text-align:center;';
    title.textContent = `Fibonacci DP Table — Computing fib(${this.fibN})`;
    container.appendChild(title);

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
    container.appendChild(row);

    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top:16px; font-size:11px; color:var(--text-muted); text-align:center;';
    hint.textContent = 'dp[i] = dp[i-1] + dp[i-2]';
    container.appendChild(hint);
  }

  _renderKnapsackViz(state) {
    const container = document.getElementById('other-container');
    container.innerHTML = '';

    
    const itemsDiv = document.createElement('div');
    itemsDiv.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;';
    for (const item of this.knapsackItems) {
      const chip = document.createElement('div');
      chip.style.cssText = 'background:var(--bg-3); border:1px solid var(--border); border-radius:6px; padding:6px 10px; font-size:11px;';
      chip.innerHTML = `<strong style="color:var(--accent-cyan)">${item.name}</strong><br>w=${item.weight} v=${item.value}`;
      itemsDiv.appendChild(chip);
    }
    container.appendChild(itemsDiv);

    
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
    container.appendChild(tableWrap);
  }

  
  _initTreeViz() {
    document.getElementById('other-container').style.display  = 'flex';
    document.getElementById('canvas-container').style.display = '';
    if      (this.currentAlgo === 'bst') this._renderBSTControls();
    else if (this.currentAlgo === 'avl') this._renderAVLControls();
  }

  _renderBSTControls() {
    const other = document.getElementById('other-container');
    other.innerHTML = '';
    other.style.cssText = 'max-height:80px; flex-direction:row; align-items:center; flex-wrap:wrap; gap:8px; padding:8px 16px;';

    const label = document.createElement('span');
    label.style.cssText = 'color:var(--text-muted); font-size:11px;';
    label.textContent = 'BST Operations:';
    other.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number'; input.placeholder = 'Value (1-99)';
    input.className = 'form-input'; input.style.width = '130px';
    other.appendChild(input);

    const insertBtn = document.createElement('button');
    insertBtn.className = 'btn btn-primary'; insertBtn.textContent = '+ Insert';
    insertBtn.onclick = () => {
      const v = parseInt(input.value);
      if (!isNaN(v)) { this.bstTree.insert(v); this.renderer.drawTree(this.bstTree.root); input.value = ''; }
    };
    other.appendChild(insertBtn);

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
    other.appendChild(searchBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn'; clearBtn.textContent = '🗑 Clear';
    clearBtn.onclick = () => { this.bstTree = new BSTree(); this.renderer.drawTree(null); };
    other.appendChild(clearBtn);

    const randomBtn = document.createElement('button');
    randomBtn.className = 'btn'; randomBtn.textContent = '🎲 Random';
    randomBtn.onclick = () => {
      this.bstTree = new BSTree();
      const vals = Array.from({ length: 8 }, () => Math.floor(Math.random() * 80) + 10);
      for (const v of vals) this.bstTree.insert(v);
      this.renderer.drawTree(this.bstTree.root);
    };
    other.appendChild(randomBtn);
  }

  _renderAVLControls() {
    const other = document.getElementById('other-container');
    other.innerHTML = '';
    other.style.cssText = 'max-height:80px; flex-direction:row; align-items:center; flex-wrap:wrap; gap:8px; padding:8px 16px;';

    const label = document.createElement('span');
    label.style.cssText = 'color:var(--text-muted); font-size:11px;';
    label.textContent = 'AVL Operations:';
    other.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number'; input.placeholder = 'Value (1-99)';
    input.className = 'form-input'; input.style.width = '130px';
    other.appendChild(input);

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
    other.appendChild(insertBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn'; clearBtn.textContent = '🗑 Clear';
    clearBtn.onclick = () => { this.avlRoot = null; this.renderer.drawTree(null); };
    other.appendChild(clearBtn);

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
    other.appendChild(randomBtn);
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

  
  _onFrame(frame, idx) {
    const algo = this.currentAlgo;
    const meta = ALGO_META[algo];

    
    if (frame.comparisons !== undefined) document.getElementById('stat-cmp').textContent = frame.comparisons;
    if (frame.swaps !== undefined)       document.getElementById('stat-swp').textContent = frame.swaps;
    document.getElementById('stat-step').textContent = idx + 1;

    
    const msgEl = document.getElementById('current-step-msg');
    if (frame.msg) msgEl.textContent = `Step ${idx + 1}/${this.engine.frames.length}: ${frame.msg}`;

    
    if      (meta.category === 'sorting')     this.sortingViz.render(frame);
    else if (meta.category === 'tree')        this.renderer.drawTree(this.bstTree.root);
    else if (meta.category === 'graph')       this.renderer.drawGraph(this.graphData, frame);
    else if (algo === 'binarysearch')         this._renderBSViz(this.bsArr, frame);
    else if (algo === 'fibonacci')            this._renderFibViz(frame);
    else if (algo === 'knapsack')             this._renderKnapsackViz(frame);

    
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
    }

    this.closeModal();
    this.engine.reset();
    this._loadAlgo(algo);
  }

  closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
}


const app = new App();
