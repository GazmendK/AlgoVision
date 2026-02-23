
"use strict";

class AnimationEngine {
  constructor() {
    this.frames     = [];
    this.currentIdx = -1;
    this.isPlaying  = false;
    this.speed      = 5;
    this.timerId    = null;

    this.onFrame = null;
    this.onEnd   = null;
  }


  load(generator) {
    this.frames = [];
    for (const f of generator) this.frames.push(f);
    this.currentIdx = -1;
    this.stop();
    return this.frames.length;
  }


  get delay() {
    const delays = [800, 600, 450, 300, 200, 140, 90, 60, 35, 15];
    return delays[Math.min(Math.max(this.speed - 1, 0), 9)];
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._tick();
  }

  pause() {
    this.isPlaying = false;
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
  }

  _tick() {
    if (!this.isPlaying) return;
    const hasNext = this.step();
    if (!hasNext) {
      this.isPlaying = false;
      if (this.onEnd) this.onEnd();
    } else {
      this.timerId = setTimeout(() => this._tick(), this.delay);
    }
  }

  /** Advance one frame forward. Returns false when at last frame. */
  step() {
    if (this.currentIdx >= this.frames.length - 1) return false;
    this.currentIdx++;
    if (this.onFrame) this.onFrame(this.frames[this.currentIdx], this.currentIdx);
    return this.currentIdx < this.frames.length - 1;
  }

  /** Step backward one frame. */
  stepBack() {
    if (this.currentIdx <= 0) return false;
    this.currentIdx--;
    if (this.onFrame) this.onFrame(this.frames[this.currentIdx], this.currentIdx);
    return true;
  }

  /** Reset playhead to beginning without clearing frames. */
  reset() {
    this.stop();
    this.currentIdx = -1;
  }

  /** The frame currently shown (null if playhead is before start). */
  get currentFrame() { return this.frames[this.currentIdx] || null; }
}
