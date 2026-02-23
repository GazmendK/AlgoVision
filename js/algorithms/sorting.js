
"use strict";

function* bubbleSortGen(arr) {
  const a = [...arr];
  const n = a.length;
  const sorted = new Set();
  let cmps = 0, swps = 0;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;

    for (let j = 0; j < n - i - 1; j++) {
      cmps++;
      yield {
        arr: [...a], highlights: { comparing: [j, j + 1] },
        comparisons: cmps, swaps: swps, sorted: [...sorted],
        msg: `Comparing arr[${j}]=${a[j]} and arr[${j + 1}]=${a[j + 1]}`,
        codeTrigger: 'compare'
      };

      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swps++;
        swapped = true;
        yield {
          arr: [...a], highlights: { swapping: [j, j + 1] },
          comparisons: cmps, swaps: swps, sorted: [...sorted],
          msg: `Swapped! arr[${j}]=${a[j]} and arr[${j + 1}]=${a[j + 1]}`,
          codeTrigger: 'swap'
        };
      }
    }
    sorted.add(n - 1 - i);
    if (!swapped) { for (let k = 0; k <= n - 1 - i; k++) sorted.add(k); break; }
  }

  yield {
    arr: [...a], highlights: {}, comparisons: cmps, swaps: swps,
    sorted: Array.from({ length: n }, (_, i) => i),
    msg: '✅ Array is sorted!', codeTrigger: null, done: true
  };
}

function* selectionSortGen(arr) {
  const a = [...arr];
  const n = a.length;
  const sorted = new Set();
  let cmps = 0, swps = 0;

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    yield {
      arr: [...a], highlights: { current: [i], pivot: [minIdx] },
      comparisons: cmps, swaps: swps, sorted: [...sorted],
      msg: `Starting pass ${i + 1}. Looking for minimum in [${i}..${n - 1}]`,
      codeTrigger: 'init'
    };

    for (let j = i + 1; j < n; j++) {
      cmps++;
      yield {
        arr: [...a], highlights: { comparing: [minIdx, j], current: [i] },
        comparisons: cmps, swaps: swps, sorted: [...sorted],
        msg: `Comparing arr[${j}]=${a[j]} with current min arr[${minIdx}]=${a[minIdx]}`,
        codeTrigger: 'compare'
      };
      if (a[j] < a[minIdx]) minIdx = j;
    }

    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      swps++;
      yield {
        arr: [...a], highlights: { swapping: [i, minIdx] },
        comparisons: cmps, swaps: swps, sorted: [...sorted],
        msg: `Placing minimum ${a[i]} at position ${i}`,
        codeTrigger: 'swap'
      };
    }
    sorted.add(i);
  }
  sorted.add(n - 1);

  yield {
    arr: [...a], highlights: {}, comparisons: cmps, swaps: swps,
    sorted: [...sorted], msg: '✅ Array is sorted!', codeTrigger: null, done: true
  };
}

function* insertionSortGen(arr) {
  const a = [...arr];
  const n = a.length;
  let cmps = 0, swps = 0;

  yield {
    arr: [...a], highlights: { sorted: [0] }, comparisons: 0, swaps: 0, sorted: [0],
    msg: 'First element is trivially sorted.', codeTrigger: 'outer'
  };

  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    yield {
      arr: [...a], highlights: { current: [i] },
      comparisons: cmps, swaps: swps,
      sorted: Array.from({ length: i }, (_, k) => k),
      msg: `Picked key = ${key} (index ${i}). Will insert into sorted region.`,
      codeTrigger: 'key'
    };

    while (j >= 0 && a[j] > key) {
      cmps++;
      a[j + 1] = a[j];
      swps++;
      yield {
        arr: [...a], highlights: { comparing: [j, j + 1], current: [i] },
        comparisons: cmps, swaps: swps,
        sorted: Array.from({ length: i }, (_, k) => k),
        msg: `arr[${j}]=${a[j]} > key=${key}, shifting right`,
        codeTrigger: 'shift'
      };
      j--;
    }

    a[j + 1] = key;
    yield {
      arr: [...a], highlights: { swapping: [j + 1] },
      comparisons: cmps, swaps: swps,
      sorted: Array.from({ length: i + 1 }, (_, k) => k),
      msg: `Inserted ${key} at position ${j + 1}`,
      codeTrigger: 'insert'
    };
  }

  yield {
    arr: [...a], highlights: {}, comparisons: cmps, swaps: swps,
    sorted: Array.from({ length: n }, (_, k) => k),
    msg: '✅ Array is sorted!', done: true
  };
}


function* mergeSortGen(arr) {
  const a = [...arr];
  const frames = [];
  let cmps = 0, swps = 0;

  function merge(a, lo, mid, hi) {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    const merging = Array.from({ length: hi - lo + 1 }, (_, x) => lo + x);

    frames.push({
      arr: [...a], highlights: { comparing: merging }, comparisons: cmps, swaps: swps,
      msg: `Merging [${lo}..${mid}] and [${mid + 1}..${hi}]`, codeTrigger: 'merge'
    });

    while (i < left.length && j < right.length) {
      cmps++;
      if (left[i] <= right[j]) a[k++] = left[i++];
      else a[k++] = right[j++];
      swps++;
      frames.push({
        arr: [...a], highlights: { swapping: [k - 1] }, comparisons: cmps, swaps: swps,
        msg: `Placed ${a[k - 1]} at position ${k - 1}`, codeTrigger: 'place'
      });
    }
    while (i < left.length) { a[k++] = left[i++]; swps++; }
    while (j < right.length) { a[k++] = right[j++]; swps++; }

    frames.push({
      arr: [...a],
      highlights: { sorted: Array.from({ length: hi - lo + 1 }, (_, x) => lo + x) },
      comparisons: cmps, swaps: swps,
      msg: `Merged segment [${lo}..${hi}]`, codeTrigger: 'copy'
    });
  }

  function helper(a, lo, hi) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    frames.push({
      arr: [...a], highlights: { comparing: [lo, mid, hi] }, comparisons: cmps, swaps: swps,
      msg: `Dividing [${lo}..${hi}] → [${lo}..${mid}] | [${mid + 1}..${hi}]`,
      codeTrigger: 'divide'
    });
    helper(a, lo, mid);
    helper(a, mid + 1, hi);
    merge(a, lo, mid, hi);
  }

  helper(a, 0, a.length - 1);
  frames.push({
    arr: [...a], highlights: {}, comparisons: cmps, swaps: swps,
    sorted: Array.from({ length: a.length }, (_, k) => k),
    msg: '✅ Array is sorted!', done: true
  });

  for (const f of frames) yield f;
}

function* quickSortGen(arr) {
  const a = [...arr];
  const frames = [];
  let cmps = 0, swps = 0;
  const sortedSet = new Set();

  function partition(a, lo, hi) {
    const pivot = a[hi];
    frames.push({
      arr: [...a], highlights: { pivot: [hi] }, comparisons: cmps, swaps: swps,
      sorted: [...sortedSet], msg: `Pivot selected: ${pivot} at index ${hi}`,
      codeTrigger: 'pivot'
    });

    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      cmps++;
      frames.push({
        arr: [...a], highlights: { comparing: [j, hi], pivot: [hi] },
        comparisons: cmps, swaps: swps, sorted: [...sortedSet],
        msg: `arr[${j}]=${a[j]} vs pivot=${pivot}`, codeTrigger: 'compare'
      });

      if (a[j] <= pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
        swps++;
        frames.push({
          arr: [...a], highlights: { swapping: [i, j], pivot: [hi] },
          comparisons: cmps, swaps: swps, sorted: [...sortedSet],
          msg: `Swapped arr[${i}]=${a[i]} ≤ pivot`, codeTrigger: 'swap'
        });
      }
    }

    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    swps++;
    sortedSet.add(i + 1);
    frames.push({
      arr: [...a], highlights: { swapping: [i + 1, hi] },
      comparisons: cmps, swaps: swps, sorted: [...sortedSet],
      msg: `Pivot ${a[i + 1]} placed at final position ${i + 1}`,
      codeTrigger: 'place'
    });
    return i + 1;
  }

  function qSort(a, lo, hi) {
    if (lo >= hi) { if (lo === hi) sortedSet.add(lo); return; }
    const p = partition(a, lo, hi);
    qSort(a, lo, p - 1);
    qSort(a, p + 1, hi);
  }

  qSort(a, 0, a.length - 1);
  frames.push({
    arr: [...a], highlights: {}, comparisons: cmps, swaps: swps,
    sorted: Array.from({ length: a.length }, (_, k) => k),
    msg: '✅ Array is sorted!', done: true
  });

  for (const f of frames) yield f;
}

function* heapSortGen(arr) {
  const a = [...arr];
  const n = a.length;
  const frames = [];
  let cmps = 0, swps = 0;
  const sorted = new Set();

  function heapify(a, size, i) {
    let largest = i, l = 2 * i + 1, r = 2 * i + 2;
    frames.push({
      arr: [...a], highlights: { comparing: [i, l < size ? l : i, r < size ? r : i] },
      comparisons: cmps, swaps: swps, sorted: [...sorted],
      msg: `Heapify: checking node ${i} (${a[i]}) with children`,
      codeTrigger: 'compare'
    });

    if (l < size) { cmps++; if (a[l] > a[largest]) largest = l; }
    if (r < size) { cmps++; if (a[r] > a[largest]) largest = r; }

    if (largest !== i) {
      [a[i], a[largest]] = [a[largest], a[i]];
      swps++;
      frames.push({
        arr: [...a], highlights: { swapping: [i, largest] },
        comparisons: cmps, swaps: swps, sorted: [...sorted],
        msg: `Swap to maintain max-heap property`, codeTrigger: 'swap'
      });
      heapify(a, size, largest);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    frames.push({
      arr: [...a], highlights: { current: [i] }, comparisons: cmps, swaps: swps, sorted: [...sorted],
      msg: `Building max-heap: heapifying at index ${i}`, codeTrigger: 'build'
    });
    heapify(a, n, i);
  }
  frames.push({ arr: [...a], highlights: {}, comparisons: cmps, swaps: swps, sorted: [...sorted], msg: 'Max-heap built! Root (arr[0]) is the maximum.' });

  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    swps++;
    sorted.add(i);
    frames.push({
      arr: [...a], highlights: { swapping: [0, i] },
      comparisons: cmps, swaps: swps, sorted: [...sorted],
      msg: `Moved max ${a[i]} to position ${i} (sorted)`, codeTrigger: 'swap'
    });
    heapify(a, i, 0);
  }
  sorted.add(0);

  frames.push({
    arr: [...a], highlights: {}, comparisons: cmps, swaps: swps,
    sorted: [...sorted], msg: '✅ Array is sorted!', done: true
  });

  for (const f of frames) yield f;
}
