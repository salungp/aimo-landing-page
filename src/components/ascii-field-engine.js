// Vendored generative code: plain JS on purpose, so strict TypeScript
// never has to type a hot render loop. tsconfig's `include` skips .js,
// and `allowJs` lets the bundler pick it up.

function createAsciiField(canvas, options) {
  "use strict";

  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  var o = {
    // character ramp, sparse -> dense
    ramp: "  ..::--==++**##",
    cell: 14,          // px font size for one cell
    speed: 26,         // drift, 0-120 (0 holds the field still)
    scale: 46,         // noise feature size
    coverage: 54,      // share of the field left empty, 8-88
    radius: 9,         // pointer reach, in cells
    trail: 62,         // how long pointer heat lingers, 0-100
    hover: "bloom",    // bloom | ripple | crosshair | scramble | repel
    dim: "#252D28",    // resting field, sparse end
    bright: "#B3C8B9", // resting field, dense end
    levels: null,      // optional 6 hex colours, sparse -> dense; overrides dim/bright blending
    accent: "#FF5A2B", // pointer glow
    accentHot: "#FFC46B",
    background: null,  // null keeps the canvas transparent
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontWeight: 400,   // heavier weights put more light into thin glyphs
    tracking: 1,       // column width as a multiple of the glyph advance (<1 packs tighter)
    lineHeight: 1.32,  // row height as a multiple of the cell size
    maxDpr: 2,
    clickRipples: true,
    // Optional falloff applied to the field's own alpha, as an ellipse in
    // fractions of the canvas: { cx, cy, rx, ry, stops: [[offset, alpha], ...] }.
    // This is deliberately not a CSS mask on the element: a mask makes the
    // browser re-run a masking pass over the whole layer every time the canvas
    // changes, which here is every frame. Done inside the canvas it is one
    // composited fill, and the result is the same pixels.
    fade: null
  };
  var k;
  if (options) for (k in options) if (options[k] !== undefined) o[k] = options[k];

  var BASE_LEVELS = 6, HEAT_LEVELS = 8, N_BUCKETS = BASE_LEVELS * HEAT_LEVELS;

  var host = canvas.parentElement || canvas;
  var cols = 0, rows = 0, cw = 8, ch = 18, aspect = 2, dpr = 1;
  var heat = new Float32Array(0);
  var glitch = new Float32Array(0);
  var lut = [], lutKey = "";
  var ripples = [];
  // Glyph atlas: every ramp character pre-rendered once in every bucket colour,
  // so a frame is ~3,000 blits instead of ~3,000 fillText calls. Text drawing
  // is the single most expensive thing this loop used to do — WebKit in
  // particular shapes and rasterises per call — and a blit from a cached canvas
  // skips all of it.
  var atlas = null, atlasKey = "";
  var tileW = 0, tileH = 0, tileOX = 0, tileOY = 0;
  var colPX = null, rowPY = null;
  var fadeGrad = null, fadeGradKey = "";
  var t = 0, last = 0, raf = 0;
  var running = true, onScreen = true, paused = false, measuredCell = 0;
  var fps = 0, fpsAcc = 0, fpsN = 0;
  var emit = 0;
  var fontFamily = o.fontFamily;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var pointer = {
    x: -1e5, y: -1e5, px: -1e5, py: -1e5, inside: false, cx: 0, cy: 0,
    clientX: -1e5, clientY: -1e5, pending: false
  };

  /* ---------- value noise ---------- */
  // The three coordinate terms only ever meet through XOR, so each can be
  // multiplied out on its own and reused. `hmix` is hash3's tail, the part
  // that genuinely has to run per lattice corner; hash3 stays for the callers
  // that don't march a grid.
  var HX = 1597334677, HY = 3812015801, HZ = 2654435761;
  function hmix(n) {
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function hash3(x, y, z) {
    return hmix((x * HX) ^ (y * HY) ^ (z * HZ));
  }
  function smooth(a) { return a * a * (3 - 2 * a); }
  function vnoise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
    var c000 = hash3(xi, yi, zi), c100 = hash3(xi + 1, yi, zi);
    var c010 = hash3(xi, yi + 1, zi), c110 = hash3(xi + 1, yi + 1, zi);
    var c001 = hash3(xi, yi, zi + 1), c101 = hash3(xi + 1, yi, zi + 1);
    var c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);
    var x00 = c000 + (c100 - c000) * xf, x10 = c010 + (c110 - c010) * xf;
    var x01 = c001 + (c101 - c001) * xf, x11 = c011 + (c111 - c011) * xf;
    var y0 = x00 + (x10 - x00) * yf, y1 = x01 + (x11 - x01) * yf;
    return y0 + (y1 - y0) * zf;
  }
  function fbm(x, y, z) {
    return vnoise(x, y, z) * 0.5333
         + vnoise(x * 2.03, y * 2.03, z * 1.7) * 0.2667
         + vnoise(x * 4.11, y * 4.11, z * 2.6) * 0.1333
         + vnoise(x * 8.07, y * 8.07, z * 3.4) * 0.0667;
  }

  /* ---------- the same fbm, precomputed for a grid ----------
   * Every cell in a frame samples the field at the same handful of
   * coordinates: column x always at `x * cw * freq * octave`, row y always at
   * `y * ch * freq * octave`, and z fixed for the whole frame. So the floor,
   * the smoothstep and the coordinate multiply — twelve of each per cell,
   * across four octaves — are hoisted into per-column and per-row tables, and
   * only the eight corner mixes per octave are left in the loop. Bit for bit
   * the same numbers as fbm(); the arithmetic is in the same order.
   * `repel` moves a cell off its own column and row, so that mode keeps using
   * fbm() directly. */
  var NOCT = 4;
  var OCT_XY = [1, 2.03, 4.11, 8.07];
  var OCT_Z = [1, 1.7, 2.6, 3.4];
  var OCT_W = [0.5333, 0.2667, 0.1333, 0.0667];
  var nxa = null, nxb = null, nxf = null;
  var nya = null, nyb = null, nyf = null;
  var nza = new Int32Array(NOCT), nzb = new Int32Array(NOCT), nzf = new Float64Array(NOCT);
  var noiseKey = "";

  function buildNoiseTables() {
    var freq = 1 / (o.scale * 1.6);
    var key = cols + "|" + rows + "|" + cw + "|" + ch + "|" + freq;
    if (key === noiseKey) return;
    noiseKey = key;
    nxa = new Int32Array(NOCT * cols); nxb = new Int32Array(NOCT * cols);
    nxf = new Float64Array(NOCT * cols);
    nya = new Int32Array(NOCT * rows); nyb = new Int32Array(NOCT * rows);
    nyf = new Float64Array(NOCT * rows);
    for (var m = 0; m < NOCT; m++) {
      var oct = OCT_XY[m], bx = m * cols, by = m * rows, i, v, vi;
      for (i = 0; i < cols; i++) {
        v = i * cw * freq * oct; vi = Math.floor(v);
        nxa[bx + i] = (vi * HX) | 0;
        nxb[bx + i] = ((vi + 1) * HX) | 0;
        nxf[bx + i] = smooth(v - vi);
      }
      for (i = 0; i < rows; i++) {
        v = i * ch * freq * oct; vi = Math.floor(v);
        nya[by + i] = (vi * HY) | 0;
        nyb[by + i] = ((vi + 1) * HY) | 0;
        nyf[by + i] = smooth(v - vi);
      }
    }
  }

  // z is the only coordinate that moves between frames.
  function advanceNoiseZ() {
    for (var m = 0; m < NOCT; m++) {
      var v = t * OCT_Z[m], vi = Math.floor(v);
      nza[m] = (vi * HZ) | 0;
      nzb[m] = ((vi + 1) * HZ) | 0;
      nzf[m] = smooth(v - vi);
    }
  }

  function fbmGrid(col, row) {
    var sum = 0;
    for (var m = 0; m < NOCT; m++) {
      var bx = m * cols + col, by = m * rows + row;
      var ha = nxa[bx], hb = nxb[bx], ja = nya[by], jb = nyb[by];
      var ka = nza[m], kb = nzb[m];
      var xf = nxf[bx], yf = nyf[by], zf = nzf[m];
      var c000 = hmix(ha ^ ja ^ ka), c100 = hmix(hb ^ ja ^ ka);
      var c010 = hmix(ha ^ jb ^ ka), c110 = hmix(hb ^ jb ^ ka);
      var c001 = hmix(ha ^ ja ^ kb), c101 = hmix(hb ^ ja ^ kb);
      var c011 = hmix(ha ^ jb ^ kb), c111 = hmix(hb ^ jb ^ kb);
      var x00 = c000 + (c100 - c000) * xf, x10 = c010 + (c110 - c010) * xf;
      var x01 = c001 + (c101 - c001) * xf, x11 = c011 + (c111 - c011) * xf;
      var y0 = x00 + (x10 - x00) * yf, y1 = x01 + (x11 - x01) * yf;
      sum += (y0 + (y1 - y0) * zf) * OCT_W[m];
    }
    return sum;
  }

  /* ---------- colour ---------- */
  function hex2rgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mix(a, b, m) {
    return [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m, a[2] + (b[2] - a[2]) * m];
  }
  function buildLut() {
    var key = o.dim + o.bright + o.accent + o.accentHot + (o.levels ? o.levels.join("") : "");
    if (key === lutKey) return;
    lutKey = key;
    var lo = hex2rgb(o.dim), hi = hex2rgb(o.bright);
    var acc = hex2rgb(o.accent), hot = hex2rgb(o.accentHot);
    lut = [];
    for (var s = 0; s < BASE_LEVELS; s++) {
      // Explicit per-level colours win; otherwise interpolate dim -> bright.
      var base = o.levels && o.levels[s]
        ? hex2rgb(o.levels[s])
        : mix(lo, hi, Math.pow(s / (BASE_LEVELS - 1), 0.85));
      for (var h = 0; h < HEAT_LEVELS; h++) {
        var m = h / (HEAT_LEVELS - 1);
        var target = mix(acc, hot, Math.max(0, (m - 0.62) / 0.38));
        var c = mix(base, target, Math.pow(m, 0.6));
        lut.push("rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")");
      }
    }
  }

  /* ---------- glyph atlas ----------
   * One tile per (ramp character, bucket colour), laid out glyph across and
   * colour down, in device pixels. A frame then costs one drawImage per cell
   * instead of a fillText, and nothing has to be sorted into colour runs
   * first: the colour is which row of the atlas gets blitted.
   *
   * The tile is sized to the ramp's own ink rather than to the cell, because
   * these glyphs are thin marks and every transparent pixel in a tile is
   * still blended once per cell drawn. */
  function buildAtlas() {
    var key = dpr + "|" + o.cell + "|" + o.fontWeight + "|" + fontFamily + "|" + o.ramp + "|" + lutKey;
    if (atlas && key === atlasKey) return;
    atlasKey = key;

    var chars = o.ramp, L = chars.length;
    if (!atlas) atlas = document.createElement("canvas");
    var a = atlas.getContext("2d");
    // Drawn at device size instead of under a dpr transform, so a tile is a
    // whole number of device pixels and every blit lands 1:1.
    var font = o.fontWeight + " " + o.cell * dpr + "px " + fontFamily;
    a.font = font;
    a.textBaseline = "middle";

    var left = 0, right = 0, up = 0, down = 0, c, tm;
    for (c = 0; c < L; c++) {
      if (chars.charCodeAt(c) === 32) continue;
      tm = a.measureText(chars.charAt(c));
      if (tm.actualBoundingBoxRight === undefined) {
        // No ink metrics: fall back to a cell-sized tile all round.
        left = right = up = down = o.cell * dpr;
        break;
      }
      if (tm.actualBoundingBoxLeft > left) left = tm.actualBoundingBoxLeft;
      if (tm.actualBoundingBoxRight > right) right = tm.actualBoundingBoxRight;
      if (tm.actualBoundingBoxAscent > up) up = tm.actualBoundingBoxAscent;
      if (tm.actualBoundingBoxDescent > down) down = tm.actualBoundingBoxDescent;
    }
    // A pixel of slack each side for the antialiasing the ink bounds exclude.
    tileOX = Math.ceil(left) + 1;
    tileOY = Math.ceil(up) + 1;
    tileW = Math.max(1, tileOX + Math.ceil(right) + 1);
    tileH = Math.max(1, tileOY + Math.ceil(down) + 1);

    atlas.width = L * tileW;
    atlas.height = N_BUCKETS * tileH;
    a.font = font;              // sizing the canvas cleared the state
    a.textBaseline = "middle";
    for (var b = 0; b < N_BUCKETS; b++) {
      a.fillStyle = lut[b];
      for (c = 0; c < L; c++) {
        if (chars.charCodeAt(c) === 32) continue;
        a.fillText(chars.charAt(c), c * tileW + tileOX, b * tileH + tileOY);
      }
    }
    buildCellPositions();
  }

  /* Where each column and row blits to, snapped to whole device pixels so the
   * tiles are never resampled — which also puts the glyphs on a sharper grid
   * than fillText's own subpixel placement did. */
  function buildCellPositions() {
    colPX = new Float64Array(cols);
    rowPY = new Float64Array(rows);
    for (var x = 0; x < cols; x++) colPX[x] = Math.round(x * cw * dpr - tileOX) / dpr;
    for (var y = 0; y < rows; y++) rowPY[y] = Math.round((y * ch + ch * 0.5) * dpr - tileOY) / dpr;
  }

  /* ---------- centre falloff ---------- */
  function applyFade(w, h) {
    var f = o.fade;
    if (!f) return;
    var fx = (f.cx == null ? 0.5 : f.cx) * w, fy = (f.cy == null ? 0.5 : f.cy) * h;
    var rx = (f.rx == null ? 0.5 : f.rx) * w, ry = (f.ry == null ? 0.5 : f.ry) * h;
    if (!(rx > 0) || !(ry > 0)) return;
    var stops = f.stops || [[0, 0], [1, 1]];
    var key = stops.join(";");
    if (!fadeGrad || key !== fadeGradKey) {
      fadeGradKey = key;
      // Built on the unit circle and stretched into the design's ellipse by
      // the transform below. A gradient is resolution-independent and the
      // transform applies when it is painted, so this is built once.
      fadeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      for (var i = 0; i < stops.length; i++) {
        fadeGrad.addColorStop(stops[i][0], "rgba(0,0,0," + stops[i][1] + ")");
      }
    }
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(rx, ry);
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(-fx / rx, -fy / ry, w / rx, h / ry);
    ctx.restore();
  }

  /* ---------- layout ---------- */
  function resolveFont() {
    var fam = o.fontFamily || "ui-monospace, monospace";
    if (fam.slice(0, 2) === "--") {
      var v = getComputedStyle(document.documentElement).getPropertyValue(fam).trim();
      fam = v ? v + ", ui-monospace, monospace" : "ui-monospace, monospace";
    }
    fontFamily = fam;
  }
  function measure() {
    var w = host.clientWidth || canvas.clientWidth;
    var h = host.clientHeight || canvas.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = o.fontWeight + " " + o.cell + "px " + fontFamily;
    ctx.textBaseline = "middle";
    measuredCell = o.cell;
    cw = (ctx.measureText("M").width || o.cell * 0.6) * o.tracking;
    ch = Math.round(o.cell * o.lineHeight);
    aspect = ch / cw;
    cols = Math.ceil(w / cw) + 1;
    rows = Math.ceil(h / ch) + 1;
    if (heat.length !== cols * rows) {
      heat = new Float32Array(cols * rows);
      glitch = new Float32Array(cols * rows);
    }
    buildLut();
    buildAtlas();
    buildCellPositions();   // cols/cw/ch move without the atlas having to
    buildNoiseTables();
  }

  /* ---------- hover writers ---------- */
  function bloom(cx, cy, strength, buf) {
    var r = o.radius, r2 = r * r;
    var x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(cols - 1, Math.ceil(cx + r));
    var y0 = Math.max(0, Math.floor(cy - r / aspect)), y1 = Math.min(rows - 1, Math.ceil(cy + r / aspect));
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx, dy = (y - cy) * aspect;
        var d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        var f = 1 - d2 / r2;
        var idx = y * cols + x;
        buf[idx] = Math.min(1.35, buf[idx] + f * f * strength);
      }
    }
  }

  function crosshair(cx, cy, strength) {
    var reach = o.radius * 3.2;
    var col = Math.round(cx), row = Math.round(cy);
    var x, y, f, idx;
    if (row >= 0 && row < rows) {
      var x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(cols - 1, Math.ceil(cx + reach));
      for (x = x0; x <= x1; x++) {
        f = 1 - Math.abs(x - cx) / reach;
        if (f <= 0) continue;
        idx = row * cols + x;
        heat[idx] = Math.min(1.35, heat[idx] + f * f * strength);
      }
    }
    if (col >= 0 && col < cols) {
      var reachY = reach / aspect;
      var y0 = Math.max(0, Math.floor(cy - reachY)), y1 = Math.min(rows - 1, Math.ceil(cy + reachY));
      for (y = y0; y <= y1; y++) {
        f = 1 - Math.abs(y - cy) / reachY;
        if (f <= 0) continue;
        idx = y * cols + col;
        heat[idx] = Math.min(1.35, heat[idx] + f * f * strength);
      }
    }
  }

  function ring(cx, cy, age) {
    var rad = age * 34;
    var band = 2.4 + age * 3;
    var life = Math.max(0, 1 - age / 1.5);
    if (life <= 0) return false;
    var reach = rad + band;
    var x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(cols - 1, Math.ceil(cx + reach));
    var y0 = Math.max(0, Math.floor(cy - reach / aspect)), y1 = Math.min(rows - 1, Math.ceil(cy + reach / aspect));
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx, dy = (y - cy) * aspect;
        var d = Math.sqrt(dx * dx + dy * dy);
        var off = Math.abs(d - rad);
        if (off > band) continue;
        var f = (1 - off / band) * life;
        var idx = y * cols + x;
        heat[idx] = Math.min(1.35, heat[idx] + f * f * 0.5);
      }
    }
    return true;
  }

  // Walks the segment the pointer covered this frame so a fast cursor still
  // leaves a continuous mark rather than a dotted line.
  function sweep(write, strength) {
    var cx = pointer.x / cw, cy = pointer.y / ch;
    var pcx = pointer.px / cw, pcy = pointer.py / ch;
    var steps = Math.min(12, Math.ceil(Math.sqrt((cx - pcx) * (cx - pcx) + (cy - pcy) * (cy - pcy)) / 1.2));
    if (steps <= 1) { write(cx, cy, strength); return; }
    for (var s = 1; s <= steps; s++) {
      var m = s / steps;
      write(pcx + (cx - pcx) * m, pcy + (cy - pcy) * m, (strength / steps) * 1.7);
    }
  }

  /* ---------- frame ---------- */
  function draw(now) {
    raf = requestAnimationFrame(draw);
    if (!running || !onScreen || !cols || !rows) { last = now; return; }
    if (o.cell !== measuredCell) measure();

    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    if (!paused && !reduce) t += dt * (o.speed / 100) * 0.9;

    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }

    var mode = o.hover;
    var decay = Math.pow(0.86 + (o.trail / 100) * 0.135, dt * 60);
    var gDecay = Math.pow(0.55, dt * 60);
    var i, n;
    for (i = 0, n = heat.length; i < n; i++) {
      if (heat[i] > 0.0015) heat[i] *= decay; else heat[i] = 0;
      if (glitch[i] > 0.0015) glitch[i] *= gDecay; else glitch[i] = 0;
    }

    resolvePointer();
    if (pointer.inside) {
      pointer.cx = pointer.x / cw;
      pointer.cy = pointer.y / ch;
      if (mode === "bloom") {
        sweep(function (x, y, s) { bloom(x, y, s, heat); }, 0.75);
      } else if (mode === "crosshair") {
        crosshair(pointer.cx, pointer.cy, 0.9);
      } else if (mode === "scramble") {
        sweep(function (x, y, s) { bloom(x, y, s, glitch); }, 1.1);
        sweep(function (x, y, s) { bloom(x, y, s, heat); }, 0.45);
      } else if (mode === "ripple") {
        emit -= dt;
        if (emit <= 0) { ripples.push({ x: pointer.cx, y: pointer.cy, age: 0 }); emit = 0.42; }
        if (ripples.length > 8) ripples.shift();
      }
      pointer.px = pointer.x; pointer.py = pointer.y;
    }

    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].age += dt;
      if (!ring(ripples[r].x, ripples[r].y, ripples[r].age)) ripples.splice(r, 1);
    }

    buildLut();
    buildAtlas();
    buildNoiseTables();
    advanceNoiseZ();

    var vw = canvas.width / dpr, vh = canvas.height / dpr;
    if (o.background) {
      ctx.fillStyle = o.background;
      ctx.fillRect(0, 0, vw, vh);
    } else {
      ctx.clearRect(0, 0, vw, vh);
    }

    var chars = o.ramp, L = chars.length;
    var freq = 1 / (o.scale * 1.6);
    var floorT = o.coverage / 100;
    var span = 1 / Math.max(0.12, 1 - floorT);
    var repel = mode === "repel" && pointer.inside;
    var rx = pointer.cx, ry = pointer.cy, rr = o.radius * 1.5, rr2 = rr * rr;
    var gSeed = Math.floor(t * 900) + Math.floor(now / 70);
    var tw = tileW / dpr, th = tileH / dpr;

    for (var y = 0; y < rows; y++) {
      var py = rowPY[y], rowBase = y * cols;
      for (var x = 0; x < cols; x++) {
        var rim = 0, hollow = 1, v;
        if (repel) {
          var sx = x, sy = y;
          var ddx = x - rx, ddy = (y - ry) * aspect;
          var d2 = ddx * ddx + ddy * ddy;
          if (d2 < rr2) {
            var d = Math.sqrt(d2) || 0.0001;
            var fall = d / rr;
            var push = (1 - fall) * (1 - fall) * rr * 0.95;
            sx = x + (ddx / d) * push;
            sy = y + (ddy / aspect / d) * push;
            hollow = fall * fall;
            rim = Math.max(0, 1 - Math.abs(fall - 0.78) / 0.22) * 0.85;
          }
          v = fbm(sx * cw * freq, sy * ch * freq, t);
        } else {
          v = fbmGrid(x, y);
        }
        v = ((v - 0.5) * 1.85 + 0.5 - floorT) * span;
        if (hollow < 1) v *= hollow;

        var idx = rowBase + x;
        var h = heat[idx] + rim;
        var total = v + h * 1.05;
        var g = glitch[idx];
        if (g > 0.06) total = Math.max(total, 0.25 + g * 0.75);
        if (total <= 0.015) continue;

        var ci = Math.floor(total * L);
        if (ci < 0) ci = 0; else if (ci > L - 1) ci = L - 1;
        if (g > 0.06) ci = Math.floor(hash3(x, y, gSeed) * L);
        if (chars.charCodeAt(ci) === 32) continue;

        var sLvl = Math.min(BASE_LEVELS - 1, Math.max(0, Math.floor(Math.max(0, v) * BASE_LEVELS)));
        var hLvl = Math.min(HEAT_LEVELS - 1, Math.max(0, Math.floor(Math.max(h, g) * (HEAT_LEVELS - 1))));
        var bi = sLvl * HEAT_LEVELS + hLvl;

        ctx.drawImage(atlas, ci * tileW, bi * tileH, tileW, tileH, colPX[x], py, tw, th);
      }
    }

    applyFade(vw, vh);
  }

  /* ---------- pointer: listened on window so content on top doesn't block it ---------- */
  function hit(e) {
    var rect = canvas.getBoundingClientRect();
    var nx = e.clientX - rect.left, ny = e.clientY - rect.top;
    if (nx < 0 || ny < 0 || nx > rect.width || ny > rect.height) return null;
    return { x: nx, y: ny };
  }
  // A move only records where the pointer is on the page; turning that into a
  // position on the canvas needs the canvas's box, and asking for the box is
  // what makes the browser stop and settle the layout first. Doing it per
  // event means doing it dozens of times a frame, and while a smooth-scroll
  // library is moving the page every one of those is a fresh layout. The frame
  // resolves it once instead — which is all it can use anyway, since it only
  // ever reads the latest position.
  function onMove(e) {
    pointer.clientX = e.clientX;
    pointer.clientY = e.clientY;
    pointer.pending = true;
  }
  function resolvePointer() {
    if (!pointer.pending) return;
    pointer.pending = false;
    var rect = canvas.getBoundingClientRect();
    var nx = pointer.clientX - rect.left, ny = pointer.clientY - rect.top;
    if (nx < 0 || ny < 0 || nx > rect.width || ny > rect.height) {
      pointer.inside = false;
      return;
    }
    if (!pointer.inside) { pointer.px = nx; pointer.py = ny; }
    pointer.x = nx; pointer.y = ny; pointer.inside = true;
  }
  function onLeave() { pointer.inside = false; pointer.pending = false; }
  function onDown(e) {
    if (!o.clickRipples) return;
    var p = hit(e);
    if (!p) return;
    ripples.push({ x: p.x / cw, y: p.y / ch, age: 0 });
    if (ripples.length > 8) ripples.shift();
  }
  function onVisibility() { running = !document.hidden; last = 0; }

  var io = new IntersectionObserver(function (entries) {
    onScreen = entries[0] ? entries[0].isIntersecting : true;
    last = 0;
  }, { rootMargin: "120px" });
  io.observe(host);

  var ro = new ResizeObserver(function () { measure(); });
  ro.observe(host);

  if (!coarse) window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("pointerleave", onLeave);

  function boot() {
    resolveFont();
    buildLut();
    measure();
    raf = requestAnimationFrame(draw);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot, boot);
  else boot();

  return {
    options: o,
    update: function (next) {
      var key;
      for (key in next) if (next[key] !== undefined) o[key] = next[key];
      if (next && next.fontFamily) { resolveFont(); measure(); }
      return this;
    },
    setPaused: function (p) { paused = p; },
    isPaused: function () { return paused; },
    clear: function () { heat.fill(0); glitch.fill(0); ripples.length = 0; },
    stats: function () { return { cols: cols, rows: rows, fps: fps }; },
    // The current frame as plain text, ready to paste anywhere.
    frameText: function () {
      var chars = o.ramp, L = chars.length;
      var freq = 1 / (o.scale * 1.6);
      var floorT = o.coverage / 100, span = 1 / Math.max(0.12, 1 - floorT);
      var out = [];
      for (var y = 0; y < rows; y++) {
        var line = "";
        for (var x = 0; x < cols; x++) {
          var v = fbm(x * cw * freq, y * ch * freq, t);
          v = ((v - 0.5) * 1.85 + 0.5 - floorT) * span;
          var total = v + heat[y * cols + x] * 1.05;
          var ci = Math.floor(total * L);
          if (ci < 0) ci = 0; else if (ci > L - 1) ci = L - 1;
          line += chars.charAt(ci);
        }
        out.push(line.replace(/\s+$/, ""));
      }
      return out.join("\n");
    },
    destroy: function () {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerleave", onLeave);
    }
  };
}

export { createAsciiField };
