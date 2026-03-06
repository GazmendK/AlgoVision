// ============================================================
// TREE DATA STRUCTURES
//
// BSTree  — standard Binary Search Tree with insert / search
// AVLTree — self-balancing AVL tree with 4 rotation cases
//
// Both classes are pure data structures with no DOM or canvas
// dependencies. The App controller reads their root nodes and
// passes them to CanvasRenderer.drawTree().
// ============================================================

"use strict";

// ── BST Node ─────────────────────────────────────────────────
class BSTNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// ── Binary Search Tree ────────────────────────────────────────
class BSTree {
  constructor() {
    this.root = null;
  }

  /** Insert a value; returns an array of animation frames. */
  insert(val) {
    const frames = [];

    const _ins = (node, val, path = []) => {
      if (!node) {
        frames.push({
          type: 'insert', val, path: [...path],
          msg: `Inserting ${val}: found empty slot, creating node.`,
          codeTrigger: 'create'
        });
        return new BSTNode(val);
      }

      frames.push({
        type: 'compare', val, node: node.val, path: [...path],
        msg: `Comparing ${val} with ${node.val}: go ${val < node.val ? 'LEFT' : 'RIGHT'}`,
        codeTrigger: 'compare'
      });

      if (val < node.val)        node.left  = _ins(node.left,  val, [...path, 'left']);
      else if (val > node.val)   node.right = _ins(node.right, val, [...path, 'right']);
      else frames.push({ type: 'duplicate', val, msg: `${val} already exists!` });

      return node;
    };

    this.root = _ins(this.root, val);
    return frames;
  }

  /** Search for a value; returns an array of animation frames. */
  search(val) {
    const frames = [];
    let cur = this.root;

    while (cur) {
      frames.push({
        type: 'compare', val, node: cur.val,
        msg: `Searching ${val}: at ${cur.val}, go ${val < cur.val ? 'LEFT' : val > cur.val ? 'RIGHT' : 'FOUND!'}`
      });

      if (val === cur.val) {
        frames.push({ type: 'found', val, msg: `✅ Found ${val}!` });
        break;
      }
      cur = val < cur.val ? cur.left : cur.right;
    }

    if (!cur) frames.push({ type: 'notfound', val, msg: `❌ ${val} not found.` });
    return frames;
  }
}

// ── AVL Node ─────────────────────────────────────────────────
class AVLNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

// ── AVL Tree ─────────────────────────────────────────────────
class AVLTree {
  height(n)           { return n ? n.height : 0; }
  bf(n)               { return n ? this.height(n.left) - this.height(n.right) : 0; }
  updateHeight(n)     { n.height = 1 + Math.max(this.height(n.left), this.height(n.right)); }

  rotateRight(y) {
    const x = y.left, T2 = x.right;
    x.right = y; y.left = T2;
    this.updateHeight(y);
    this.updateHeight(x);
    return x;
  }

  rotateLeft(x) {
    const y = x.right, T2 = y.left;
    y.left = x; x.right = T2;
    this.updateHeight(x);
    this.updateHeight(y);
    return y;
  }

  /**
   * Insert val into the subtree rooted at root.
   * Mutates frames[] with animation steps and returns the new root.
   */
  insert(root, val, frames = []) {
    if (!root) return new AVLNode(val);

    if (val < root.val) {
      frames.push({ msg: `${val} < ${root.val}: go left`,  codeTrigger: 'left' });
      root.left  = this.insert(root.left,  val, frames);
    } else if (val > root.val) {
      frames.push({ msg: `${val} > ${root.val}: go right`, codeTrigger: 'right' });
      root.right = this.insert(root.right, val, frames);
    } else {
      return root; // duplicate
    }

    this.updateHeight(root);
    const bf = this.bf(root);
    frames.push({ msg: `Node ${root.val}: height=${root.height}, balance=${bf}`, codeTrigger: 'balance' });

    // LL case
    if (bf > 1 && val < root.left.val) {
      frames.push({ msg: `LL case: Right rotation at ${root.val}`, codeTrigger: 'rotate' });
      return this.rotateRight(root);
    }
    // RR case
    if (bf < -1 && val > root.right.val) {
      frames.push({ msg: `RR case: Left rotation at ${root.val}`, codeTrigger: 'rotate' });
      return this.rotateLeft(root);
    }
    // LR case
    if (bf > 1 && val > root.left.val) {
      frames.push({ msg: `LR case: Left-Right rotation at ${root.val}`, codeTrigger: 'rotate' });
      root.left = this.rotateLeft(root.left);
      return this.rotateRight(root);
    }
    // RL case
    if (bf < -1 && val < root.right.val) {
      frames.push({ msg: `RL case: Right-Left rotation at ${root.val}`, codeTrigger: 'rotate' });
      root.right = this.rotateRight(root.right);
      return this.rotateLeft(root);
    }

    return root;
  }
}
