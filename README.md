# AlgoViz - Interactive Algorithm Visualizer

A production-quality, dependency-free algorithm visualizer.  
**15 algorithms. Step-through animation. Dark/light theme. Zero build step.**


## Built With
* [![HTML5][HTML5.org]][HTML5-url]
* [![CSS3][CSS3.org]][CSS3-url]
* [![JavaScript][JavaScript.com]][JavaScript-url]


---

## Project Structure

```
algoviz/
│
├── index.html                  ← Entry point (markup only, no inline JS/CSS)
│
├── css/
│   ├── variables.css           ← Design tokens (colors, spacing, fonts)
│   ├── base.css                ← Reset, body, scrollbar
│   ├── layout.css              ← App shell grid, header, sidebar, info panel
│   ├── components.css          ← Buttons, controls bar, stats, legend, modal
│   ├── visualizations.css      ← Sort bars, canvas, BS cells, Fib/Knapsack tables
│   ├── info-panel.css          ← Tabs, complexity grid, step list, code block
│   └── animations.css          ← Keyframes and animation helpers
│
└── js/
    ├── data/
    │   └── algorithms.js       ← ALGO_META: all algorithm descriptors
    │
    ├── algorithms/
    │   ├── sorting.js          ← Generators: Bubble, Selection, Insertion, Merge, Quick, Heap
    │   ├── graph.js            ← Graph data + Generators: BFS, DFS, Dijkstra, A*
    │   └── other.js            ← Generators: Binary Search, Fibonacci DP, 0/1 Knapsack
    │
    ├── engine/
    │   ├── AnimationEngine.js  ← Frame buffer, play/pause/step/speed
    │   └── trees.js            ← BSTree and AVLTree data structures
    │
    ├── renderers/
    │   ├── SortingVisualizer.js ← DOM bar chart renderer
    │   └── CanvasRenderer.js   ← Canvas renderer for graphs and trees
    │
    └── App.js                  ← Main controller (wires everything together)
```

---

## Architecture

### Separation of concerns

| Layer         | Files                          | Responsibility                                    |
|---------------|--------------------------------|---------------------------------------------------|
| **Data**      | `data/algorithms.js`           | Static metadata: name, complexity, steps, code    |
| **Logic**     | `algorithms/*.js`              | Pure generator functions — algorithm logic only   |
| **Engine**    | `engine/AnimationEngine.js`    | Playback: timing, step/pause/speed, frame buffer  |
| **Structures**| `engine/trees.js`              | BSTree + AVLTree — no DOM/canvas dependencies     |
| **Render**    | `renderers/*.js`               | DOM bars (sorting) + Canvas (graphs, trees)       |
| **Control**   | `App.js`                       | Wires all layers together, owns UI state          |
| **Style**     | `css/*.css`                    | Visual design, fully token-driven via CSS vars    |

### Generator pattern

Each algorithm is a [JavaScript Generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) that `yield`s one animation frame per logical operation:

```js
function* bubbleSortGen(arr) {
  // ...
  yield { arr, highlights: { comparing: [j, j+1] }, msg: '...', codeTrigger: 'compare' };
  // ...
}
```

`AnimationEngine.load(generator)` eagerly collects all frames, then replays them at a configurable speed. This makes step-forward/backward and speed changes trivial.

### Adding a new algorithm

1. Add an entry to `ALGO_META` in `js/data/algorithms.js`
2. Write a generator function in the appropriate `js/algorithms/` file
3. Add a sidebar button in `index.html`
4. Map the generator in `App._loadAlgo()` / the relevant load method

---

## Algorithms

| Category | Algorithm        | Complexity (avg) |
|----------|-----------------|-----------------|
| Sorting  | Bubble Sort      | O(n²)           |
| Sorting  | Selection Sort   | O(n²)           |
| Sorting  | Insertion Sort   | O(n²)           |
| Sorting  | Merge Sort       | O(n log n)      |
| Sorting  | Quick Sort       | O(n log n)      |
| Sorting  | Heap Sort        | O(n log n)      |
| Graph    | BFS              | O(V+E)          |
| Graph    | DFS              | O(V+E)          |
| Graph    | Dijkstra         | O(V²)           |
| Graph    | A* Search        | O(E log V)      |
| Tree     | BST              | O(log n)        |
| Tree     | AVL Tree         | O(log n)        |
| Other    | Binary Search    | O(log n)        |
| Other    | Fibonacci DP     | O(n)            |
| Other    | 0/1 Knapsack     | O(nW)           |

---

## Deployment

Static files — no build step, no dependencies.  
Works with any static host: GitHub Pages, Vercel, Netlify, or just `open index.html`.

```bash
# Local dev server (any of these work)
npx serve .
python -m http.server 8080
php -S localhost:8080
```

<!-- MARKDOWN LINKS & IMAGES -->
[HTML5.org]: https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white
[HTML5-url]: https://developer.mozilla.org/en-US/docs/Web/HTML

[CSS3.org]: https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white
[CSS3-url]: https://developer.mozilla.org/en-US/docs/Web/CSS

[JavaScript.com]: https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[JavaScript-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
