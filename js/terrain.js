/* Hero WebGL terrain — a dense silver wireframe massif on a near-black body.
   Progressive enhancement: if Three.js or WebGL is unavailable, the SVG
   peaks remain untouched. On success the hero gets .webgl-on, which hides
   the SVG range; fog layers, moon, particles and the eagle stay on top. */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var wrap = document.getElementById('heroTerrain');
  var hero = document.querySelector('.hero');
  if (!wrap || !hero) return;

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
  scene.fog = new THREE.Fog(0x0a1420, 20, 70);

  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 140);
  var CAM_Y = 3.0;
  camera.position.set(0, CAM_Y, 22);

  /* ---------- deterministic value noise (stable ridge across loads) ---------- */
  function hash(ix, iz) {
    var n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function valueNoise(x, z) {
    var ix = Math.floor(x), iz = Math.floor(z);
    var fx = x - ix, fz = z - iz;
    var a = hash(ix, iz), b = hash(ix + 1, iz);
    var c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    var ux = smooth(fx), uz = smooth(fz);
    return (a * (1 - ux) + b * ux) * (1 - uz) + (c * (1 - ux) + d * ux) * uz;
  }
  // ridged noise: folds the noise into sharp crests
  function ridged(x, z) {
    var v = 1 - Math.abs(2 * valueNoise(x, z) - 1);
    return v * v;
  }

  /* ---------- height field: central massif, layered foothills ---------- */
  var PEAKS = [
    { x: 11, z: -15, h: 21, r: 11 },   // the monolith
    { x: 18, z: -11, h: 12, r: 7 },    // right shoulder
    { x: 4, z: -10, h: 9.5, r: 6 },    // left shoulder
    { x: -14, z: -13, h: 7, r: 8 },
    { x: 28, z: -13, h: 8.5, r: 8 },
    { x: -30, z: -11, h: 4.5, r: 9 }
  ];

  function peakMass(x, z) {
    var h = 0;
    for (var i = 0; i < PEAKS.length; i++) {
      var p = PEAKS[i];
      var dx = x - p.x;
      var dz = (z - p.z) * 1.5;
      var d = Math.sqrt(dx * dx + dz * dz);
      var t = Math.max(0, 1 - d / p.r);
      h += p.h * Math.pow(t, 1.5);
    }
    return h;
  }

  function height(x, z) {
    var mass = peakMass(x, z);
    var onMountain = Math.min(1, mass / 5);
    var backFactor = 0.3 + 0.7 * Math.min(1, Math.max(0, (-z + 8) / 22));
    var h = mass;
    // sharp crest folds where the mountain stands
    h += ridged(x * 0.09 + 4, z * 0.09 + 2) * 4.2 * onMountain;
    // mid + fine detail everywhere, calmer on the open floor
    h += (valueNoise(x * 0.16 + 7, z * 0.16 + 3) * 2.2 +
          valueNoise(x * 0.5 + 2, z * 0.5 + 9) * 0.9) *
         backFactor * (0.45 + 0.55 * onMountain);
    // micro wrinkles so the faces read as fine gauze up close
    h += valueNoise(x * 1.1 + 5, z * 1.1 + 1) * 0.5 * onMountain;
    // gentle swells so the foreground floor ripples like fabric
    h += valueNoise(x * 0.07 + 13, z * 0.07 + 6) * 1.1 * (1 - onMountain);
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
    // jitter interior vertices so the mesh reads as irregular triangles,
    // not a uniform grid (boundary stays put to keep clean edges)
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

  // near-black body: hides rear wires so the massif reads as a solid
  // mountain wearing the mesh, and keeps the hero text legible
  var body = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x07101d }));
  body.position.z = -4;
  body.renderOrder = 0;
  scene.add(body);

  /* ---------- the wire surface: silver, brighter along the crests ---------- */
  var wireGeo = geo.clone();
  var wireColors = new Float32Array(count * 3);
  var wireDim = new THREE.Color(0x232b33);
  var wireMid = new THREE.Color(0x9aa6b2);
  var wireHot = new THREE.Color(0xf2f6fa);
  var tmp = new THREE.Color();

  for (i = 0; i < count; i++) {
    x = wireGeo.attributes.position.getX(i);
    z = wireGeo.attributes.position.getZ(i);
    var wy = wireGeo.attributes.position.getY(i);
    var alt = Math.pow(Math.min(1, Math.max(0, wy / maxH)), 1.2);
    if (alt < 0.5) tmp.copy(wireDim).lerp(wireMid, alt / 0.5);
    else tmp.copy(wireMid).lerp(wireHot, (alt - 0.5) / 0.5);
    // crest lines pop
    tmp.multiplyScalar(0.65 + 0.7 * ridged(x * 0.09 + 4, z * 0.09 + 2));
    // keep the flat foreground floor faint so it never fights the content
    tmp.multiplyScalar(0.3 + 0.7 * Math.min(1, Math.max(0, (-z + 14) / 26)));
    // ease the lines down under the headline/copy column on the left
    tmp.multiplyScalar(0.55 + 0.45 * Math.min(1, Math.max(0, (x + 20) / 22)));
    wireColors[i * 3] = tmp.r;
    wireColors[i * 3 + 1] = tmp.g;
    wireColors[i * 3 + 2] = tmp.b;
  }
  wireGeo.setAttribute('color', new THREE.BufferAttribute(wireColors, 3));

  var wire = new THREE.Mesh(wireGeo, new THREE.MeshBasicMaterial({
    wireframe: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  wire.position.z = -4;
  wire.position.y = 0.04;
  wire.renderOrder = 1;
  scene.add(wire);

  // bloom: the soft luminous halo where lines cluster (the reference's glow)
  var composer = null;
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    composer.addPass(new THREE.UnrealBloomPass(
      new THREE.Vector2(wrap.clientWidth || 1, wrap.clientHeight || 1),
      0.6,   // strength
      0.55,  // radius
      0.12   // threshold
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
    camera.lookAt(0, 7.5, -8);
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
