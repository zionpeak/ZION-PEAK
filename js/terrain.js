/* Hero WebGL terrain — a connected, rugged wireframe range built from
   domain-warped ridged fractal noise (no cone primitives). Silver-gray
   lines on a near-black body; crests catch the light, valleys fall away.
   Progressive enhancement: without WebGL the SVG peaks remain. */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var wrap = document.getElementById('heroTerrain');
  var hero = document.querySelector('.hero');
  if (!wrap || !hero) return;

  // Image mode: the graded mountain render is the terrain layer; no WebGL.
  if (wrap.getAttribute('data-terrain') === 'image') {
    hero.classList.add('webgl-on'); // hides the SVG peaks and square grid
    return;
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // no WebGL: SVG peaks keep doing their job
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  wrap.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a1626, 24, 78);

  // Painted sky: the hero's deep-navy atmosphere, drawn in-canvas so the
  // bloom pipeline keeps it (the composer output is opaque). Dark navy
  // behind the headline, a soft blue glow toward the summit side.
  var skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 1024;
  var skyCtx = skyCanvas.getContext('2d');
  var vGrad = skyCtx.createLinearGradient(0, 0, 0, 1024);
  vGrad.addColorStop(0, '#0d1b31');
  vGrad.addColorStop(0.55, '#081120');
  vGrad.addColorStop(1, '#05080f');
  skyCtx.fillStyle = vGrad;
  skyCtx.fillRect(0, 0, 1024, 1024);
  var glow = skyCtx.createRadialGradient(700, 300, 60, 700, 300, 640);
  glow.addColorStop(0, 'rgba(30, 68, 118, 0.5)');
  glow.addColorStop(1, 'rgba(30, 68, 118, 0)');
  skyCtx.fillStyle = glow;
  skyCtx.fillRect(0, 0, 1024, 1024);
  scene.background = new THREE.CanvasTexture(skyCanvas);

  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 160);
  var CAM_Y = 2.2;
  camera.position.set(0, CAM_Y, 22);

  /* ---------- deterministic noise toolkit ---------- */
  function hash(ix, iz) {
    var n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function smoothT(t) { return t * t * (3 - 2 * t); }
  function valueNoise(x, z) {
    var ix = Math.floor(x), iz = Math.floor(z);
    var fx = x - ix, fz = z - iz;
    var a = hash(ix, iz), b = hash(ix + 1, iz);
    var c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    var ux = smoothT(fx), uz = smoothT(fz);
    return (a * (1 - ux) + b * ux) * (1 - uz) + (c * (1 - ux) + d * ux) * uz;
  }
  function ridgedOct(x, z) {
    var v = 1 - Math.abs(2 * valueNoise(x, z) - 1);
    return v * v;
  }
  // 5-octave ridged fractal with domain warp: connected ridge networks,
  // uneven crests, gullies down the faces. Returns 0..1.
  function fbmRidged(x, z) {
    x += valueNoise(x * 0.05 + 3, z * 0.05 + 7) * 6;
    z += valueNoise(x * 0.05 + 9, z * 0.05 + 1) * 6;
    var amp = 1, freq = 0.055, sum = 0, norm = 0;
    for (var o = 0; o < 5; o++) {
      sum += ridgedOct(x * freq + o * 17, z * freq + o * 31) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.05;
    }
    return sum / norm;
  }
  function bump(v, c, w) {
    var t = Math.max(0, 1 - Math.abs(v - c) / w);
    return t * t * (3 - 2 * t);
  }

  /* ---------- the range: one massif mask x rugged fractal ---------- */
  // Dominant summit right of center, secondary masses merging into it,
  // a low connected base so nothing reads as an isolated cone.
  function summitProfile(x) {
    var s = Math.max(
      1.0 * bump(x, 10, 16),   // dominant summit
      0.55 * bump(x, -9, 11),  // left mass
      0.5 * bump(x, 27, 10),   // right mass
      0.25 * bump(x, 9, 34)    // connected base of the whole range
    );
    // uneven ridgeline
    return s * (0.8 + 0.45 * valueNoise(x * 0.11 + 2, 3.7));
  }

  function height(x, z) {
    var mask = summitProfile(x) * bump(z, -15, 12);
    var h = fbmRidged(x, z) * mask * 26;
    // rolling foothills layering toward the camera (no flat floor)
    h += fbmRidged(x * 0.9 + 40, z * 0.9 + 40) * 2.4 * bump(z, 2, 16);
    h += valueNoise(x * 0.5 + 6, z * 0.5 + 11) * 0.4;
    return h;
  }

  /* ---------- geometry: jittered grid -> organic triangulation ---------- */
  var SEG_X = 260, SEG_Z = 130;
  var geo = new THREE.PlaneGeometry(100, 50, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);

  var pos = geo.attributes.position;
  var count = pos.count;
  var cellX = 100 / SEG_X, cellZ = 50 / SEG_Z;
  var maxH = 0;
  var i, x, z;

  for (i = 0; i < count; i++) {
    x = pos.getX(i);
    z = pos.getZ(i);
    var col = i % (SEG_X + 1), row = Math.floor(i / (SEG_X + 1));
    if (col > 0 && col < SEG_X && row > 0 && row < SEG_Z) {
      x += (hash(col * 3 + 1, row * 7 + 2) - 0.5) * cellX * 0.9;
      z += (hash(col * 5 + 3, row * 11 + 4) - 0.5) * cellZ * 0.9;
      pos.setX(i, x);
      pos.setZ(i, z);
    }
    var h = height(x, z);
    pos.setY(i, h);
    if (h > maxH) maxH = h;
  }

  // near-black body: occludes rear wires so the range reads as solid rock
  var body = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x04070c }));
  body.position.z = -4;
  body.renderOrder = 0;
  scene.add(body);

  /* ---------- wire surface: silver-gray, crests catch the light ---------- */
  var wireGeo = geo.clone();
  var wireColors = new Float32Array(count * 3);
  var tmp = new THREE.Color();

  for (i = 0; i < count; i++) {
    x = wireGeo.attributes.position.getX(i);
    z = wireGeo.attributes.position.getZ(i);
    var wy = wireGeo.attributes.position.getY(i);
    var alt = Math.min(1, Math.max(0, wy / maxH));
    var crest = Math.pow(fbmRidged(x, z), 1.6);        // bright on ridges
    var depthFade = 0.25 + 0.75 * Math.min(1, Math.max(0, (-z + 16) / 30));
    var latDim = 0.6 + 0.4 * Math.min(1, Math.max(0, (x + 20) / 22));
    var lum = (0.1 + 0.9 * crest) * (0.3 + 0.7 * Math.pow(alt, 0.9)) * depthFade * latDim;
    lum = Math.min(1, lum * 1.5);
    tmp.setRGB(lum * 0.84, lum * 0.9, lum * 0.97);     // cool silver-gray
    wireColors[i * 3] = tmp.r;
    wireColors[i * 3 + 1] = tmp.g;
    wireColors[i * 3 + 2] = tmp.b;
  }
  wireGeo.setAttribute('color', new THREE.BufferAttribute(wireColors, 3));

  var wire = new THREE.Mesh(wireGeo, new THREE.MeshBasicMaterial({
    wireframe: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  wire.position.z = -4;
  wire.position.y = 0.04;
  wire.renderOrder = 1;
  scene.add(wire);

  // subtle glow, only where the crest lines are already bright
  var composer = null;
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    composer.addPass(new THREE.UnrealBloomPass(
      new THREE.Vector2(wrap.clientWidth || 1, wrap.clientHeight || 1),
      0.5,   // strength
      0.4,   // radius
      0.35   // threshold: only the brightest ridges bloom
    ));
  }

  function resize() {
    var w = wrap.clientWidth || 1;
    var h = wrap.clientHeight || 1;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() {
    camera.lookAt(0, 6.5, -8);
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  resize();
  render();
  hero.classList.add('webgl-on');
  window.addEventListener('resize', function () { resize(); render(); });

  if (prefersReducedMotion) return; // static frame, no drift

  /* ---------- slow camera drift, running only while the hero is visible ---------- */
  var running = false;
  var rafId = null;
  var t = 0;
  var last = null;

  function tick(now) {
    if (!running) return;
    if (last !== null) t += Math.min(0.05, (now - last) / 1000);
    last = now;
    camera.position.x = Math.sin(t * 0.1) * 0.9;
    camera.position.y = CAM_Y + Math.sin(t * 0.07) * 0.25;
    render();
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    last = null;
    rafId = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0.05 }).observe(hero);
  } else {
    start();
  }
})();
