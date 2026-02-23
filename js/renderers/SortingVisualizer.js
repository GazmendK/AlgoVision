"use strict";

class SortingVisualizer {
  constructor(container) {
    this.container = container;
    this.barEls    = [];
  }

  init(arr) {
    this.container.innerHTML = '';
    this.barEls = [];
    const maxVal = Math.max(...arr);

    for (let i = 0; i < arr.length; i++) {
      const bar = document.createElement('div');
      bar.className = 'sort-bar';
      bar.style.height = `${(arr[i] / maxVal) * 90}%`;
      bar.setAttribute('data-val', arr.length <= 30 ? arr[i] : '');
      this.container.appendChild(bar);
      this.barEls.push(bar);
    }
  }

  render(frame) {
    const { arr, highlights = {}, sorted = [] } = frame;
    const maxVal     = Math.max(...arr);
    const sortedSet  = new Set(sorted);
    const comparing  = new Set(highlights.comparing || []);
    const swapping   = new Set(highlights.swapping  || []);
    const pivot      = new Set(highlights.pivot     || []);
    const current    = new Set(highlights.current   || []);

    for (let i = 0; i < arr.length; i++) {
      const bar = this.barEls[i];
      if (!bar) continue;

      bar.style.height = `${(arr[i] / maxVal) * 90}%`;
      bar.setAttribute('data-val', arr.length <= 30 ? arr[i] : '');

      bar.className = 'sort-bar';
      if (sortedSet.has(i))  bar.classList.add('sorted');
      else if (swapping.has(i))  bar.classList.add('swapping');
      else if (comparing.has(i)) bar.classList.add('comparing');
      else if (pivot.has(i))     bar.classList.add('pivot');
      else if (current.has(i))   bar.classList.add('current');
    }
  }
}
