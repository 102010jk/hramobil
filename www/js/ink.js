// "Fixy" – free-hand marker layer over the board.
// Strokes are stored in board-relative coordinates (0..1), so they survive
// resizing and zooming and can be saved with the game.

export class Ink {
  constructor(canvas, boardEl) {
    this.canvas = canvas;
    this.board = boardEl;
    this.ctx = canvas.getContext('2d');
    this.strokes = [];
    this.current = null;
    this.color = '#ffd34d';
    this.width = 0.012; // fraction of board width
    this.eraser = false;
    this.w = 1; this.h = 1;
  }

  resize(w, h) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    this.w = w; this.h = h;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  toLocal(x, y) {
    const r = this.board.getBoundingClientRect();
    return [(x - r.left) / r.width, (y - r.top) / r.height];
  }

  startStroke(x, y) {
    this.current = { c: this.color, w: this.width, e: this.eraser, p: [this.toLocal(x, y)] };
    this.drawStroke(this.current);
  }

  moveStroke(x, y) {
    if (!this.current) return;
    const p = this.toLocal(x, y);
    const last = this.current.p[this.current.p.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.002) return;
    this.current.p.push(p);
    this.drawSegment(this.current, this.current.p.length - 2);
  }

  endStroke() {
    if (!this.current) return;
    this.current.p = this.current.p.map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]);
    this.strokes.push(this.current);
    this.current = null;
  }

  cancelStroke() { this.current = null; this.redraw(); }

  undo() { this.strokes.pop(); this.redraw(); }

  clear() { this.strokes = []; this.redraw(); }

  getStrokes() { return this.strokes.slice(); }

  setStrokes(s) { this.strokes = Array.isArray(s) ? s.slice() : []; this.redraw(); }

  style(s) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.c;
    ctx.fillStyle = s.c;
    ctx.lineWidth = Math.max(1.5, s.w * this.w * (s.e ? 3 : 1));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = s.e ? 1 : 0.9;
  }

  drawSegment(s, i) {
    const ctx = this.ctx;
    this.style(s);
    const [a, b] = [s.p[i], s.p[i + 1]];
    ctx.beginPath();
    ctx.moveTo(a[0] * this.w, a[1] * this.h);
    ctx.lineTo(b[0] * this.w, b[1] * this.h);
    ctx.stroke();
  }

  drawStroke(s) {
    const ctx = this.ctx;
    this.style(s);
    if (s.p.length === 1) {
      ctx.beginPath();
      ctx.arc(s.p[0][0] * this.w, s.p[0][1] * this.h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(s.p[0][0] * this.w, s.p[0][1] * this.h);
    for (let i = 1; i < s.p.length; i++) ctx.lineTo(s.p[i][0] * this.w, s.p[i][1] * this.h);
    ctx.stroke();
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    for (const s of this.strokes) this.drawStroke(s);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
  }
}
