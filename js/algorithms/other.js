
"use strict";

function* binarySearchGen(arr, target) {
  let left = 0, right = arr.length - 1;
  let cmps = 0;

  yield {
    left, right, mid: -1, found: -1, eliminated: [], arr, cmps,
    msg: `Searching for ${target} in sorted array. left=${left}, right=${right}`,
    codeTrigger: 'init'
  };

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    cmps++;

    yield {
      left, right, mid, found: -1, eliminated: [], arr, cmps,
      msg: `mid = floor((${left}+${right})/2) = ${mid}. arr[mid] = ${arr[mid]}`,
      codeTrigger: 'mid'
    };

    if (arr[mid] === target) {
      yield {
        left, right, mid, found: mid, eliminated: [], arr, cmps,
        msg: `✅ Found ${target} at index ${mid}!`,
        codeTrigger: 'found', done: true
      };
      return;
    } else if (arr[mid] < target) {
      yield {
        left, right, mid, found: -1,
        eliminated: Array.from({ length: mid - left + 1 }, (_, k) => left + k),
        arr, cmps,
        msg: `arr[mid]=${arr[mid]} < ${target} → search RIGHT half. New left = ${mid + 1}`,
        codeTrigger: 'right'
      };
      left = mid + 1;
    } else {
      yield {
        left, right, mid, found: -1,
        eliminated: Array.from({ length: right - mid + 1 }, (_, k) => mid + k),
        arr, cmps,
        msg: `arr[mid]=${arr[mid]} > ${target} → search LEFT half. New right = ${mid - 1}`,
        codeTrigger: 'left'
      };
      right = mid - 1;
    }
  }

  yield {
    left, right, mid: -1, found: -1,
    eliminated: Array.from({ length: arr.length }, (_, k) => k),
    arr, cmps,
    msg: `❌ ${target} not found in array!`, done: true
  };
}

function* fibonacciGen(n) {
  const dp = new Array(n + 1).fill(-1);
  dp[0] = 0;

  yield { dp: [...dp], active: 0, msg: 'Base case: dp[0] = 0', codeTrigger: 'base' };

  if (n >= 1) {
    dp[1] = 1;
    yield { dp: [...dp], active: 1, msg: 'Base case: dp[1] = 1', codeTrigger: 'base' };
  }

  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
    yield {
      dp: [...dp], active: i,
      msg: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]}`,
      codeTrigger: 'fill'
    };
  }

  yield {
    dp: [...dp], active: n,
    msg: `✅ fib(${n}) = ${dp[n]}`,
    done: true, codeTrigger: 'result'
  };
}


function* knapsackGen(items, W) {
  const n = items.length;
  const dp = Array(n + 1).fill(null).map(() => Array(W + 1).fill(0));

  yield {
    dp: dp.map(r => [...r]), active: null, n, W, items,
    msg: 'Initialized DP table. dp[i][w] = max value using first i items with capacity w.',
    codeTrigger: 'init'
  };

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      const item = items[i - 1];

      if (item.weight > w) {
        dp[i][w] = dp[i - 1][w];
        yield {
          dp: dp.map(r => [...r]), active: { i, w }, n, W, items,
          msg: `Item ${i} (w=${item.weight}) > capacity ${w} → dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i][w]}`,
          codeTrigger: 'skip'
        };
      } else {
        const withItem = dp[i - 1][w - item.weight] + item.value;
        const withoutItem = dp[i - 1][w];
        dp[i][w] = Math.max(withoutItem, withItem);
        yield {
          dp: dp.map(r => [...r]), active: { i, w }, n, W, items,
          msg: `Item ${i}: take=${withItem} vs skip=${withoutItem} → choose ${dp[i][w]}`,
          codeTrigger: 'take'
        };
      }
    }
  }

  yield {
    dp: dp.map(r => [...r]), active: { i: n, w: W }, n, W, items,
    msg: `✅ Maximum value = ${dp[n][W]}`,
    done: true, codeTrigger: 'result'
  };
}
