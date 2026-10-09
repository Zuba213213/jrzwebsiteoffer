/* ═══════════════════════════════════════════════════════════
   JRZ Consulting Solutions — Services homepage engine
   • WebGL particle field that morphs into a new form per section
   • Loader, split-text reveals, scroll-lit manifesto, cursor, HUD
   No dependencies.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var doc = document, win = window, body = doc.body;
  var reduce = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = win.matchMedia && win.matchMedia('(pointer: fine)').matches;
  var isMobile = win.innerWidth < 900;

  /* ───────────────────── seeded random + helpers ───────────────────── */
  var seed = 1337;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function gauss() { var u = rnd() || 1e-6, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }
  function rotX(p, a) { var c = Math.cos(a), s = Math.sin(a), y = p[1] * c - p[2] * s, z = p[1] * s + p[2] * c; p[1] = y; p[2] = z; return p; }
  function rotY(p, a) { var c = Math.cos(a), s = Math.sin(a), x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c; p[0] = x; p[2] = z; return p; }
  function rotZ(p, a) { var c = Math.cos(a), s = Math.sin(a), x = p[0] * c - p[1] * s, y = p[0] * s + p[1] * c; p[0] = x; p[1] = y; return p; }
  function onSphere(r) { var u = rnd() * 2 - 1, t = rnd() * 6.2831853, s = Math.sqrt(1 - u * u); return [r * s * Math.cos(t), r * u, r * s * Math.sin(t)]; }
  function inSphere(r) { return onSphere(r * Math.cbrt(rnd())); }

  var C = {
    gold: [0.83, 0.66, 0.49], hi: [0.95, 0.85, 0.67], cream: [0.93, 0.91, 0.86],
    clay: [0.73, 0.50, 0.32], sage: [0.66, 0.78, 0.56], ember: [0.90, 0.55, 0.30],
    core: [1.5, 1.2, 0.8], coreHot: [1.7, 1.5, 1.1]
  };
  function pick(weights) { // weights: [[color, w], ...]
    var r = rnd(), acc = 0, i;
    for (i = 0; i < weights.length; i++) { acc += weights[i][1]; if (r <= acc) return weights[i][0]; }
    return weights[weights.length - 1][0];
  }
  var WARM = [[C.gold, .45], [C.hi, .25], [C.clay, .18], [C.cream, .08], [C.sage, .04]];
  function dust(R) { var p = inSphere(Math.min(R, 3.4)); return p; }

  /* ───────────────────── shape library ───────────────────── */
  // Each returns [x,y,z, r,g,b] for particle i of N.
  var SHAPES = {
    // The Sun — radiant core, churning surface, corona rays
    hero: function (i, N) {
      var f = i / N, p, c, rr;
      if (f < 0.3) { p = inSphere(0.95); c = rnd() < .5 ? C.core : C.coreHot; }
      else if (f < 0.62) { p = onSphere(1.0 + gauss() * 0.025); c = pick([[C.hi, .4], [C.gold, .35], [C.ember, .25]]); }
      else if (f < 0.9) {
        var ray = Math.floor(rnd() * 72), u = 1 - 2 * (ray + 0.5) / 72, th = ray * 2.39996, s2 = Math.sqrt(1 - u * u);
        rr = 1.03 + Math.pow(rnd(), 2.2) * (0.6 + ((ray * 37) % 11) / 11 * 0.9);
        p = [s2 * Math.cos(th) * rr + gauss() * .025, u * rr + gauss() * .025, s2 * Math.sin(th) * rr + gauss() * .025];
        c = rr < 1.3 ? C.gold : (rr < 1.7 ? C.ember : C.clay);
      } else if (f < 0.97) { rr = 1.08 + Math.pow(rnd(), 1.5) * 0.35; p = onSphere(rr); c = C.clay; }
      else { p = dust(3.4); c = C.cream; }
      return p.concat(c);
    },
    // The Vault — a lattice cube with a glowing core
    vault: function (i, N) {
      var f = i / N, s = 1.0, p, c = pick(WARM);
      if (f < 0.5) { // edges
        var e = Math.floor(rnd() * 12), t = rnd() * 2 - 1, a = (e & 1) ? s : -s, b = (e & 2) ? s : -s, ax = e >> 2;
        p = ax === 0 ? [t * s, a, b] : ax === 1 ? [a, t * s, b] : [a, b, t * s];
        p[0] += gauss() * .01; p[1] += gauss() * .01; p[2] += gauss() * .01; c = rnd() < .5 ? C.hi : C.gold;
      } else if (f < 0.75) { // face lattice
        var fc = Math.floor(rnd() * 6), u = (Math.round((rnd() * 2 - 1) * 5) / 5) * s, v = (rnd() * 2 - 1) * s;
        if (rnd() < .5) { var tmp = u; u = v; v = tmp; }
        var sg = (fc & 1) ? s : -s, axis = fc >> 1;
        p = axis === 0 ? [sg, u, v] : axis === 1 ? [u, sg, v] : [u, v, sg];
        c = rnd() < .5 ? C.clay : C.gold;
      } else if (f < 0.93) { p = onSphere(0.42 + gauss() * .03); c = C.hi; }
      else { p = dust(5); c = C.cream; }
      rotY(p, 0.62); rotX(p, 0.48);
      return p.concat(c);
    },
    // Custom websites — layered browser windows
    web: function (i, N) {
      var f = i / N, p, c;
      if (f > 0.94) return dust(5).concat(C.cream);
      var k = Math.floor(rnd() * 3), w = 1.45, h = 0.95, x, y, z = (k - 1) * 0.55, r = rnd();
      if (r < 0.34) { // frame
        var t = rnd() * 2 - 1; if (rnd() < .5) { x = t * w; y = rnd() < .5 ? h : -h; } else { x = rnd() < .5 ? w : -w; y = t * h; }
        c = k === 2 ? C.hi : C.gold;
      } else if (r < 0.46) { // header bar
        x = (rnd() * 2 - 1) * w; y = h - 0.2; c = C.gold;
        if (rnd() < .25) { var d = Math.floor(rnd() * 3); x = -w + 0.12 + d * 0.12 + gauss() * .015; y = h - 0.1 + gauss() * .015; c = C.ember; }
      } else if (r < 0.66) { // hero block
        x = -w + 0.15 + rnd() * 1.4; y = 0.15 + rnd() * 0.45; c = k === 2 ? C.hi : C.clay;
      } else { // content columns
        var col = Math.floor(rnd() * 3), cw = (2 * w - 0.5) / 3;
        x = -w + 0.15 + col * (cw + 0.1) + rnd() * cw; y = -h + 0.15 + rnd() * 0.75; c = col === 1 ? C.sage : C.gold;
        if (rnd() < .5) y = Math.round(y * 9) / 9;
      }
      p = [x + (k - 1) * 0.28, y - (k - 1) * 0.18, z];
      rotY(p, -0.55); rotX(p, 0.18);
      return p.concat(c);
    },
    // Ads — broadcast ripples + signal beam
    ads: function (i, N) {
      var f = i / N, p, c;
      if (f < 0.76) {
        var k = 1 + Math.floor(Math.pow(rnd(), 0.8) * 10), r = k * 0.22 + gauss() * 0.012, a = rnd() * 6.2831853;
        p = [Math.cos(a) * r, Math.sin(r * 5.2) * 0.12, Math.sin(a) * r];
        c = k < 3 ? C.hi : (k < 6 ? C.gold : (k < 9 ? C.clay : C.sage));
      } else if (f < 0.9) { var hgt = Math.pow(rnd(), 0.6) * 2.0; p = [gauss() * 0.025, hgt, gauss() * 0.025]; c = C.hi; }
      else { p = dust(5); c = C.cream; }
      rotX(p, 0.55); rotZ(p, -0.12);
      p[1] -= 0.35;
      return p.concat(c);
    },
    // AI — torus-knot neural thread
    ai: function (i, N) {
      var f = i / N, p, c;
      if (f < 0.9) {
        var t = rnd() * 6.2831853, q = 3, pp = 2, rr = Math.cos(q * t) + 2.2, sc = 0.52;
        var spread = f < 0.12 ? 0.012 : 0.07;
        if (f < 0.12) t = Math.round(t / 0.157) * 0.157; // bright neuron nodes
        rr = Math.cos(q * t) + 2.2;
        p = [rr * Math.cos(pp * t) * sc + gauss() * spread, rr * Math.sin(pp * t) * sc + gauss() * spread, -Math.sin(q * t) * sc * 1.2 + gauss() * spread];
        c = f < 0.12 ? C.hi : pick([[C.gold, .4], [C.sage, .25], [C.clay, .2], [C.cream, .15]]);
      } else { p = dust(5); c = C.cream; }
      rotX(p, 0.35);
      return p.concat(c);
    },
    // CRM — audience segments (clusters) wired to a hub
    crm: function (i, N) {
      var f = i / N, p, c;
      var hubs = [[0, 0, 0, .34, C.hi], [1.55, .3, 0, .36, C.gold], [.48, -.2, 1.45, .3, C.sage], [-1.25, .25, .88, .42, C.clay], [-1.2, -.25, -.95, .28, C.cream], [.5, .2, -1.45, .33, C.ember]];
      if (f < 0.84) {
        var h = hubs[Math.floor(rnd() * hubs.length)], q = inSphere(h[3]);
        if (rnd() < .4) q = onSphere(h[3]);
        p = [h[0] + q[0], h[1] + q[1], h[2] + q[2]]; c = h[4];
      } else if (f < 0.96) {
        var hh = hubs[1 + Math.floor(rnd() * 5)], t = rnd();
        p = [hh[0] * t + gauss() * .01, hh[1] * t + gauss() * .01, hh[2] * t + gauss() * .01]; c = C.gold;
      } else { p = dust(5); c = C.cream; }
      rotX(p, 0.42);
      return p.concat(c);
    },
    // The system — core + orbiting channels
    system: function (i, N) {
      var f = i / N, p, c;
      if (f < 0.26) { p = rnd() < .6 ? onSphere(0.5) : inSphere(0.5); c = rnd() < .6 ? C.hi : C.gold; }
      else if (f < 0.86) {
        var k = Math.floor(rnd() * 4), r = 1.0 + k * 0.42, a = rnd() * 6.2831853;
        p = [Math.cos(a) * r, gauss() * 0.012, Math.sin(a) * r];
        rotX(p, 1.15 + k * 0.22); rotZ(p, k * 0.75);
        c = [C.gold, C.sage, C.clay, C.cream][k];
      } else if (f < 0.96) {
        var kk = Math.floor(rnd() * 4), rr = 1.0 + kk * 0.42, aa = kk * 1.7, q = inSphere(0.09);
        p = [Math.cos(aa) * rr + q[0], q[1], Math.sin(aa) * rr + q[2]];
        rotX(p, 1.15 + kk * 0.22); rotZ(p, kk * 0.75); c = C.hi;
      } else { p = dust(5); c = C.cream; }
      return p.concat(c);
    },
    // Galaxy — the closing invitation
    galaxy: function (i, N) {
      var f = i / N, p, c;
      if (f < 0.94) {
        var arm = Math.floor(rnd() * 3), r = 0.08 + Math.pow(rnd(), 1.4) * 2.5;
        var a = arm * 2.0943951 + r * 2.3 + gauss() * (0.22 / (r + 0.4));
        p = [Math.cos(a) * r, gauss() * 0.05 * (1.2 - r / 3), Math.sin(a) * r];
        c = r < 0.5 ? C.hi : (r < 1.2 ? C.gold : (r < 1.9 ? C.clay : C.sage));
      } else { p = dust(5); c = C.cream; }
      rotX(p, 0.95); rotZ(p, 0.25);
      return p.concat(c);
    }
  };

  /* ───────────────────── WebGL particle engine (GPU morph) ───────────────────── */
  var canvas = doc.getElementById('stage');
  var engine = null;
  function initGL() {
    if (!canvas) return null;
    var gl = canvas.getContext('webgl', { antialias: false, alpha: true, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) { canvas.style.display = 'none'; return null; }

    // Particle budget scaled to the device
    var cores = navigator.hardwareConcurrency || 4;
    var N = isMobile ? 5000 : (cores <= 4 ? 9000 : 13000);
    var drawN = N;

    var vs = [
      'attribute vec3 aFrom; attribute vec3 aTo; attribute vec3 aCFrom; attribute vec3 aCTo; attribute float aSeed;',
      'uniform mat4 uProj; uniform float uTime, uMix, uBurst, uSize, uDpr, uAspect, uRy, uRx, uCamZ, uMouseOn;',
      'uniform vec3 uOff; uniform vec2 uMouse;',
      'varying vec3 vCol; varying float vA;',
      'vec2 rot(vec2 v, float a){ float c=cos(a), s=sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }',
      'void main(){',
      '  float m = clamp((uMix - aSeed*0.4)/0.6, 0.0, 1.0); m = m*m*(3.0-2.0*m);',
      '  vec3 p = mix(aFrom, aTo, m);',
      '  float t = uTime*0.35;',
      '  p += 0.02*vec3(sin(t*2.1+aSeed*40.0), sin(t*1.7+aSeed*23.0), cos(t*1.9+aSeed*31.0));',
      '  float travel = sin(m*3.14159);',
      '  vec3 dir = normalize(p + vec3(0.0001));',
      '  float b = uBurst + travel*0.35;',
      '  p += dir * b * (0.3 + aSeed*1.2);',
      '  p.xz = rot(p.xz, b*1.8*(aSeed-0.5));',
      '  p.xz = rot(p.xz, uRy); p.yz = rot(p.yz, uRx);',
      '  p += uOff; p.z -= uCamZ;',
      '  vec4 clip = uProj * vec4(p, 1.0);',
      '  vec2 d = clip.xy/clip.w - uMouse; d.x *= uAspect;',
      '  float L = length(d); float f = smoothstep(0.3, 0.0, L) * uMouseOn;',
      '  vec2 push = (d/(L+0.0001)) * f * 0.14; push.x /= uAspect;',
      '  clip.xy += push * clip.w;',
      '  gl_Position = clip;',
      '  gl_PointSize = min(uSize * uDpr * (0.6 + aSeed*1.2) * (6.0/clip.w) * (1.0 + f), 8.0*uDpr);',
      '  vA = (0.6 + 0.4*sin(uTime*1.3 + aSeed*70.0)) * smoothstep(12.0, 3.0, clip.w) * (1.0 + f);',
      '  vCol = mix(aCFrom, aCTo, m);',
      '}'
    ].join('\n');
    var fs = [
      'precision mediump float; varying vec3 vCol; varying float vA; uniform float uBright;',
      'void main(){ vec2 q = gl_PointCoord - 0.5; float d2 = dot(q,q); if (d2 > 0.25) discard;',
      '  float a = 1.0 - d2*4.0; a *= a;',
      '  gl_FragColor = vec4(vCol * a * vA * uBright, 1.0); }'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
    var prog = gl.createProgram(), v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { canvas.style.display = 'none'; return null; }
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return null; }
    gl.useProgram(prog);

    var from = new Float32Array(N * 3), to = new Float32Array(N * 3), cFrom = new Float32Array(N * 3), cTo = new Float32Array(N * 3);
    var seeds = new Float32Array(N), i;
    for (i = 0; i < N; i++) {
      seeds[i] = rnd();
      var q = inSphere(0.05); from[i * 3] = to[i * 3] = q[0]; from[i * 3 + 1] = to[i * 3 + 1] = q[1]; from[i * 3 + 2] = to[i * 3 + 2] = q[2];
      cFrom[i * 3] = cFrom[i * 3 + 1] = cFrom[i * 3 + 2] = cTo[i * 3] = cTo[i * 3 + 1] = cTo[i * 3 + 2] = 0.9;
    }
    var cache = {};
    function build(name) {
      if (cache[name]) return cache[name];
      seed = 9001 + name.length * 31 + name.charCodeAt(0);
      var P = new Float32Array(N * 3), K = new Float32Array(N * 3), fn = SHAPES[name] || SHAPES.hero, idx = new Uint32Array(N), j;
      for (j = 0; j < N; j++) idx[j] = j;
      for (j = N - 1; j > 0; j--) { var r = Math.floor(rnd() * (j + 1)), t = idx[j]; idx[j] = idx[r]; idx[r] = t; }
      for (j = 0; j < N; j++) {
        var o = fn(j, N), k = idx[j] * 3;
        P[k] = o[0]; P[k + 1] = o[1]; P[k + 2] = o[2]; K[k] = o[3]; K[k + 1] = o[4]; K[k + 2] = o[5];
      }
      return (cache[name] = { p: P, c: K });
    }
    function buf(data, name, size, usage) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      var l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); return b;
    }
    var B = {
      from: buf(from, 'aFrom', 3, gl.DYNAMIC_DRAW), to: buf(to, 'aTo', 3, gl.DYNAMIC_DRAW),
      cFrom: buf(cFrom, 'aCFrom', 3, gl.DYNAMIC_DRAW), cTo: buf(cTo, 'aCTo', 3, gl.DYNAMIC_DRAW)
    };
    buf(seeds, 'aSeed', 1, gl.STATIC_DRAW);
    function upload(b, data) { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data); }
    var U = {}; ['uProj', 'uTime', 'uMix', 'uBurst', 'uSize', 'uDpr', 'uAspect', 'uRy', 'uRx', 'uCamZ', 'uOff', 'uMouse', 'uMouseOn', 'uBright'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.clearColor(0, 0, 0, 0);

    var maxDpr = isMobile ? 1 : 1.25, dpr = Math.min(win.devicePixelRatio || 1, maxDpr), W = 1, H = 1;
    function resize() {
      W = win.innerWidth; H = win.innerHeight; isMobile = W < 900;
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      var aspect = W / H, fl = 1 / Math.tan(20 * Math.PI / 180), n = 0.1, fa = 50;
      gl.uniformMatrix4fv(U.uProj, false, new Float32Array([fl / aspect, 0, 0, 0, 0, fl, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, (2 * fa * n) / (n - fa), 0]));
      gl.uniform1f(U.uAspect, aspect); gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uSize, isMobile ? 5.0 : 5.4);
    }
    resize();
    var rT; win.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(resize, 150); });

    var st = {
      shape: null, mix: 1, burst: 0, ry: 0, tilt: [0, 0], spin: 0.0016,
      off: [0, 0, 0], offT: [0, 0, 0], camZ: 9, camZT: 6.4,
      mouse: [0, 0], mouseT: [0, 0], mouseOn: 0, mouseOnT: 0,
      bright: 0, brightT: 0.9, time: 0, last: 0, running: false, scrollV: 0,
      frames: 0, slow: 0, checked: false
    };
    function ease(m) { return m * m * (3 - 2 * m); }

    function morph(name, side) {
      if (name !== st.shape) {
        var s = build(name), k, j, m;
        // freeze the current on-screen state into "from", then target the new shape
        for (j = 0; j < N; j++) {
          m = ease(Math.min(1, Math.max(0, (st.mix - seeds[j] * 0.4) / 0.6))); k = j * 3;
          from[k] += (to[k] - from[k]) * m; from[k + 1] += (to[k + 1] - from[k + 1]) * m; from[k + 2] += (to[k + 2] - from[k + 2]) * m;
          cFrom[k] += (cTo[k] - cFrom[k]) * m; cFrom[k + 1] += (cTo[k + 1] - cFrom[k + 1]) * m; cFrom[k + 2] += (cTo[k + 2] - cFrom[k + 2]) * m;
        }
        to.set(s.p); cTo.set(s.c);
        upload(B.from, from); upload(B.to, to); upload(B.cFrom, cFrom); upload(B.cTo, cTo);
        st.shape = name; st.mix = reduce ? 1 : 0;
      }
      var mob = W < 900;
      st.offT = [mob ? 0 : (side === 'left' ? -1.75 : side === 'right' ? 1.75 : 0), mob ? 0.2 : 0, 0];
      st.brightT = mob ? (side === 'center' ? 0.5 : 0.38) : (side === 'center' ? 0.5 : 0.85);
      if (reduce) { st.off = st.offT.slice(); st.camZ = st.camZT; st.bright = st.brightT; st.ry = 0.6; render(); }
    }

    function render() {
      gl.uniform1f(U.uTime, st.time); gl.uniform1f(U.uMix, st.mix); gl.uniform1f(U.uBurst, st.burst);
      gl.uniform1f(U.uRy, st.ry + st.tilt[1]); gl.uniform1f(U.uRx, -st.tilt[0]);
      gl.uniform3f(U.uOff, st.off[0], st.off[1], st.off[2]); gl.uniform1f(U.uCamZ, st.camZ);
      gl.uniform2f(U.uMouse, st.mouse[0], st.mouse[1]); gl.uniform1f(U.uMouseOn, st.mouseOn);
      gl.uniform1f(U.uBright, st.bright);
      gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.POINTS, 0, drawN);
    }

    function update(dt) {
      var e = Math.min(dt * 60, 3);
      st.time += dt;
      if (st.mix < 1.4) st.mix += dt / 1.6;
      st.burst *= Math.pow(0.955, e);
      st.ry += (st.spin + Math.min(Math.abs(st.scrollV) * 0.00004, 0.02)) * e;
      st.scrollV *= 0.9;
      for (var a = 0; a < 2; a++) st.off[a] += (st.offT[a] - st.off[a]) * 0.045 * e;
      st.camZ += (st.camZT - st.camZ) * 0.03 * e;
      st.mouse[0] += (st.mouseT[0] - st.mouse[0]) * 0.12 * e; st.mouse[1] += (st.mouseT[1] - st.mouse[1]) * 0.12 * e;
      st.mouseOn += (st.mouseOnT - st.mouseOn) * 0.08 * e;
      st.tilt[0] += (st.mouseT[1] * 0.25 - st.tilt[0]) * 0.04 * e;
      st.tilt[1] += (st.mouseT[0] * 0.35 - st.tilt[1]) * 0.04 * e;
      st.bright += (st.brightT - st.bright) * 0.05 * e;
    }

    // Adaptive quality: if the device can't hold ~45fps, shed particles and resolution
    function adapt(dt) {
      if (st.checked) return;
      st.frames++;
      if (st.frames < 20) return; // ignore warm-up frames
      if (dt > 1 / 45) st.slow++;
      if (st.frames >= 110) {
        st.checked = true;
        if (st.slow > 35) {
          drawN = Math.floor(N * 0.55);
          if (dpr > 1) { dpr = 1; resize(); }
          if (st.slow > 70) { drawN = Math.floor(N * 0.35); }
        }
      }
    }

    function loop(ts) {
      if (!st.running) return;
      var dt = st.last ? Math.min((ts - st.last) / 1000, 0.05) : 0.016; st.last = ts;
      adapt(dt); update(dt); render();
      win.requestAnimationFrame(loop);
    }
    function start() { if (reduce || st.running) return; st.running = true; st.last = 0; win.requestAnimationFrame(loop); }
    function stop() { st.running = false; }
    doc.addEventListener('visibilitychange', function () { doc.hidden ? stop() : start(); });

    win.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      st.mouseT = [(ev.clientX / W) * 2 - 1, -((ev.clientY / H) * 2 - 1)]; st.mouseOnT = 1;
    }, { passive: true });
    doc.addEventListener('pointerleave', function () { st.mouseOnT = 0; });

    return { morph: morph, start: start, st: st, ignite: function () { st.burst = reduce ? 0 : 1.0; st.camZ = 11; } };
  }
  try { engine = initGL(); } catch (err) { console.warn(err); if (canvas) canvas.style.display = 'none'; }

  /* ───────────────────── split text ───────────────────── */
  function splitEl(el) {
    var i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            var inner = doc.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
      });
    }
    walk(el);
  }
  doc.querySelectorAll('[data-split]').forEach(splitEl);

  /* manifesto: wrap words for scroll lighting */
  var mani = doc.querySelector('.manifesto-text'), maniWords = [];
  if (mani) {
    (function wrap(node, gold) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var s = doc.createElement('span'); s.className = 'mw' + (gold ? ' gold' : ''); s.textContent = part; frag.appendChild(s); maniWords.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          if (n.tagName === 'EM') { var t = doc.createTextNode(n.textContent); n.parentNode.replaceChild(t, n); wrapText(t, true); }
          else wrap(n, gold);
        }
      });
      function wrapText(t, g) { var holder = doc.createElement('span'); t.parentNode.replaceChild(holder, t); holder.appendChild(t); wrap(holder, g); }
    })(mani, false);
  }

  /* ───────────────────── reveal observer ───────────────────── */
  var revealTargets = doc.querySelectorAll('[data-split], .fade, .step');
  if ('IntersectionObserver' in win && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) { if (!el.closest('.hero')) io.observe(el); });
  } else { revealTargets.forEach(function (el) { el.classList.add('in'); }); }

  /* ───────────────────── scroll: shapes, HUD, nav, progress ───────────────────── */
  var scenes = Array.prototype.slice.call(doc.querySelectorAll('[data-shape]'));
  var nav = doc.querySelector('.nav'), prog = doc.querySelector('.progress'), floatCta = doc.querySelector('.float-cta');
  var hudNum = doc.querySelector('.hud-num'), hudLabel = doc.querySelector('.hud-label'), hudBar = doc.querySelector('.hud-bar i');
  var current = null, lastY = win.scrollY, ticking = false, litPrev = -1;
  function onScroll() {
    ticking = false;
    var y = win.scrollY, vh = win.innerHeight, max = doc.documentElement.scrollHeight - vh;
    if (engine) engine.st.scrollV += (y - lastY); lastY = y;
    if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (nav) nav.classList.toggle('scrolled', y > 40);
    if (floatCta) floatCta.classList.toggle('show', y > vh * 0.8);
    // active scene = the one covering viewport center
    var best = null, bestD = 1e9, mid = vh * 0.5;
    scenes.forEach(function (s) {
      var r = s.getBoundingClientRect();
      var d = (r.top <= mid && r.bottom >= mid) ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bestD) { bestD = d; best = s; }
    });
    if (best && best !== current) {
      current = best;
      if (engine && !body.classList.contains('loading')) engine.morph(best.dataset.shape, best.dataset.side || 'center');
      if (hudNum) { var idx = scenes.indexOf(best); hudNum.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(scenes.length).padStart(2, '0'); }
      if (hudLabel) { hudLabel.style.opacity = 0; setTimeout(function () { hudLabel.textContent = best.dataset.hud || ''; hudLabel.style.opacity = 1; }, 200); }
    }
    if (hudBar && current) {
      var rr = current.getBoundingClientRect(), p = Math.min(1, Math.max(0, (mid - rr.top) / rr.height));
      hudBar.style.transform = 'scaleX(' + p + ')';
    }
    // manifesto lighting
    if (mani && maniWords.length && !reduce) {
      var mr = mani.getBoundingClientRect(), pr = (vh * 0.82 - mr.top) / (mr.height + vh * 0.25);
      var lit = Math.floor(Math.max(0, Math.min(1, pr)) * maniWords.length * 1.05);
      if (lit !== litPrev) { for (var w = 0; w < maniWords.length; w++) maniWords[w].classList.toggle('lit', w < lit); litPrev = lit; }
    }
  }
  win.addEventListener('scroll', function () { if (!ticking) { ticking = true; win.requestAnimationFrame(onScroll); } }, { passive: true });
  win.addEventListener('resize', onScroll);

  /* ───────────────────── loader ───────────────────── */
  var loader = doc.querySelector('.loader'), lbar = doc.querySelector('.loader-bar i'), lcount = doc.querySelector('.loader-count');
  function finishLoad() {
    body.classList.remove('loading');
    if (loader) loader.classList.add('done');
    doc.querySelectorAll('.hero [data-split], .hero .fade').forEach(function (el) { el.classList.add('in'); });
    current = null; onScroll();
    if (engine) { engine.ignite(); engine.start(); }
  }
  if (loader && !reduce) {
    var t0 = performance.now(), dur = 1700, fontsReady = false;
    (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(function () { fontsReady = true; });
    setTimeout(function () { fontsReady = true; }, 3500);
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur); if (!fontsReady) p = Math.min(p, 0.9);
      var e = 1 - Math.pow(1 - p, 3);
      if (lbar) lbar.style.transform = 'scaleX(' + e + ')';
      if (lcount) lcount.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (p < 1) win.requestAnimationFrame(tick); else setTimeout(finishLoad, 250);
    })(t0);
  } else { finishLoad(); }

  /* ───────────────────── cursor + magnetic ───────────────────── */
  if (fine && !reduce) {
    var cur = doc.querySelector('.cursor'), ring = doc.querySelector('.cursor-ring'), ringTxt = ring && ring.querySelector('span');
    if (cur && ring) {
      body.classList.add('has-cursor');
      var mx = win.innerWidth / 2, my = win.innerHeight / 2, rx = mx, ry = my;
      win.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; cur.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)'; });
      (function follow() { rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16; ring.style.transform = 'translate3d(' + (rx - 0) + 'px,' + ry + 'px,0) translate(-50%,-50%)'; win.requestAnimationFrame(follow); })();
      doc.addEventListener('pointerover', function (e) {
        var t = e.target.closest('a, button, [data-cursor]');
        ring.classList.toggle('hover', !!t && !t.dataset.cursor);
        ring.classList.toggle('label', !!(t && t.dataset.cursor));
        if (ringTxt) ringTxt.textContent = t && t.dataset.cursor ? t.dataset.cursor : '';
      });
    }
    doc.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.32 + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
      el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1), color .4s';
    });
  }

  /* ───────────────────── mobile menu ───────────────────── */
  var menu = doc.querySelector('.mobile-menu');
  doc.querySelectorAll('[data-menu]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      doc.querySelectorAll('[data-menu]').forEach(function (x) { x.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    });
  });
  if (menu) menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { menu.classList.remove('open'); }); });

  onScroll();
})();
