// ============================================================
// RED-BLACK TREE
//
// Self-balancing BST with color properties:
//   1. Every node is red or black
//   2. Root is always black
//   3. Red nodes can only have black children (no red-red)
//   4. Every path root→leaf has the same number of black nodes
//
// Interactive like BST/AVL: user inserts values, sees fix-ups.
// Generates animation frames for each fix-up step.
// ============================================================

"use strict";

const RB_RED   = 'red';
const RB_BLACK = 'black';
const RB_NIL   = null; // Sentinel leaf

class RBNode {
  constructor(val) {
    this.val    = val;
    this.color  = RB_RED;      // New nodes start red
    this.left   = null;
    this.right  = null;
    this.parent = null;
  }
}

class RBTree {
  constructor() {
    this.root = null;
  }

  // ── Insert ────────────────────────────────────────────────
  // Returns array of animation frames showing each fix-up step.
  insert(val) {
    const frames = [];
    const z = new RBNode(val);

    // Standard BST insert
    let y = null, x = this.root;
    while (x !== null) {
      y = x;
      x = val < x.val ? x.left : x.right;
    }
    z.parent = y;
    if (y === null) {
      this.root = z;
    } else if (val < y.val) {
      y.left  = z;
    } else {
      y.right = z;
    }

    frames.push({
      type: 'insert', val,
      msg: `Inserted ${val} as RED node (standard BST insert).`,
      highlight: val, action: 'insert', codeTrigger: 'insert'
    });

    // Fix-up
    this._fixInsert(z, frames);

    return frames;
  }

  _fixInsert(z, frames) {
    while (z.parent !== null && z.parent.color === RB_RED) {
      const parent = z.parent;
      const grand  = parent.parent;
      if (grand === null) break;

      if (parent === grand.left) {
        const uncle = grand.right;

        if (uncle !== null && uncle.color === RB_RED) {
          // Case 1: Uncle is red → recolor
          parent.color  = RB_BLACK;
          uncle.color   = RB_BLACK;
          grand.color   = RB_RED;
          frames.push({
            type: 'recolor', val: z.val,
            msg: `Case 1: Uncle ${uncle.val} is RED → Recolor parent(${parent.val})→black, uncle(${uncle.val})→black, grandparent(${grand.val})→red.`,
            highlight: z.val, rotHighlight: grand.val, action: 'recolor', codeTrigger: 'recolor'
          });
          z = grand;
        } else {
          if (z === parent.right) {
            // Case 2: Node is right child → left rotate parent
            z = parent;
            this._rotateLeft(z);
            frames.push({
              type: 'rotate', val: z.val,
              msg: `Case 2: Left-rotate at ${z.val} to convert to Case 3.`,
              highlight: z.val, action: 'rotate-left', codeTrigger: 'rotate'
            });
          }
          // Case 3: Node is left child → right rotate grandparent
          z.parent.color  = RB_BLACK;
          grand.color     = RB_RED;
          this._rotateRight(grand);
          frames.push({
            type: 'rotate', val: z.val,
            msg: `Case 3: Recolor parent(${z.parent?.val ?? '?'})→black, grandparent(${grand.val})→red, right-rotate at ${grand.val}.`,
            highlight: z.val, rotHighlight: grand.val, action: 'rotate-right', codeTrigger: 'rotate'
          });
        }
      } else {
        // Mirror cases: parent is right child of grandparent
        const uncle = grand.left;

        if (uncle !== null && uncle.color === RB_RED) {
          parent.color  = RB_BLACK;
          uncle.color   = RB_BLACK;
          grand.color   = RB_RED;
          frames.push({
            type: 'recolor', val: z.val,
            msg: `Case 1 (mirror): Recolor parent(${parent.val})→black, uncle(${uncle.val})→black, grandparent(${grand.val})→red.`,
            highlight: z.val, rotHighlight: grand.val, action: 'recolor', codeTrigger: 'recolor'
          });
          z = grand;
        } else {
          if (z === parent.left) {
            z = parent;
            this._rotateRight(z);
            frames.push({
              type: 'rotate', val: z.val,
              msg: `Case 2 (mirror): Right-rotate at ${z.val}.`,
              highlight: z.val, action: 'rotate-right', codeTrigger: 'rotate'
            });
          }
          z.parent.color  = RB_BLACK;
          grand.color     = RB_RED;
          this._rotateLeft(grand);
          frames.push({
            type: 'rotate', val: z.val,
            msg: `Case 3 (mirror): Left-rotate at ${grand.val}.`,
            highlight: z.val, rotHighlight: grand.val, action: 'rotate-left', codeTrigger: 'rotate'
          });
        }
      }
    }
    this.root.color = RB_BLACK;
    frames.push({
      type: 'done_step', val: z.val,
      msg: `Fix-up complete. Root is BLACK. Tree satisfies all RB properties.`,
      action: 'done', codeTrigger: 'done'
    });
  }

  // ── Rotations ─────────────────────────────────────────────
  _rotateLeft(x) {
    const y  = x.right;
    x.right  = y.left;
    if (y.left !== null) y.left.parent = x;
    y.parent = x.parent;
    if (x.parent === null)        this.root    = y;
    else if (x === x.parent.left) x.parent.left  = y;
    else                          x.parent.right = y;
    y.left   = x;
    x.parent = y;
  }

  _rotateRight(x) {
    const y  = x.left;
    x.left   = y.right;
    if (y.right !== null) y.right.parent = x;
    y.parent = x.parent;
    if (x.parent === null)         this.root     = y;
    else if (x === x.parent.right) x.parent.right = y;
    else                           x.parent.left  = y;
    y.right  = x;
    x.parent = y;
  }

  // ── Snapshot helper ───────────────────────────────────────
  // Returns a plain serializable copy of the tree for rendering.
  snapshot() {
    const copy = (n) => {
      if (!n) return null;
      return { val: n.val, color: n.color, left: copy(n.left), right: copy(n.right) };
    };
    return copy(this.root);
  }
}
