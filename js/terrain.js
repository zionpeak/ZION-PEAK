/* Hero WebGL terrain — a low-poly moonlit ridge rendered with Three.js.
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
  scene.fog = new THREE.Fog(0x0b1930, 16, 55);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  var CAM_Y = 3.4;
  camera.position.set(0, CAM_Y, 20);

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

  /* ---------- height field: five art-directed peaks + noise detail ---------- */
  var PEAKS = [
    { x: -24, z: -14, h: 6.5, r: 9 },
    { x: -11, z: -17, h: 10.5, r: 8 },
    { x: 1, z: -15, h: 13, r: 7.5 },
    { x: 11, z: -16, h: 8.5, r: 7 },
    { x: 22, z: -13, h: 6, r: 8 }
  ];

  function height(x, z) {
    var h = 0;
    for (var i = 0; i < PEAKS.length; i++) {
      var p = PEAKS[i];
      var dx = x - p.x;
      var dz = (z - p.z) * 1.5; // compress depth so peaks form a ridge line
      var d = Math.sqrt(dx * dx + dz * dz);
      var t = Math.max(0, 1 - d / p.r);
      h += p.h * Math.pow(t, 1.35);
    }
    // rougher in the back range, calm foothills near the camera
    var backFactor = 0.3 + 0.7 * Math.min(1, Math.max(0, (-z + 8) / 22));
    h += (valueNoise(x * 0.14 + 7, z * 0.14 + 3) * 2.4 +
          valueNoise(x * 0.42 + 2, z * 0.42 + 9) * 0.8) * backFactor;
    return h;
  }

  var geo = new THREE.PlaneGeometry(90, 44, 110, 54);
  geo.rotateX(-Math.PI / 2);

  var pos = geo.attributes.position;
  var colors = new Float32Array(pos.count * 3);
  var base = new THREE.Color(0x16293f);
  var baseDark = new THREE.Color(0x0d1d30);
  var snow = new THREE.Color(0xb9d4ea);
  var tmp = new THREE.Color();

  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), z = pos.getZ(i);
    var h = height(x, z);
    pos.setY(i, h);

    var shade = valueNoise(x * 0.3 + 11, z * 0.3 + 5);
    tmp.copy(baseDark).lerp(base, shade);
    var s = Math.min(1, Math.max(0, (h - 7.2) / 4));
    tmp.lerp(snow, s * s);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  var terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.95,
    metalness: 0
  }));
  terrain.position.z = -4;
  scene.add(terrain);

  // faint blue wire overlay, echoing the hero grid
  var wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    wireframe: true,
    color: 0x38b6ff,
    transparent: true,
    opacity: 0.045
  }));
  wire.position.z = -4;
  wire.position.y = 0.03;
  scene.add(wire);

  // moonlight from the upper right, cool ambient bounce
  var moonlight = new THREE.DirectionalLight(0xcfe4f8, 1.25);
  moonlight.position.set(26, 30, 10);
  scene.add(moonlight);
  scene.add(new THREE.HemisphereLight(0x2c4a6e, 0x070d18, 0.85));

  function resize() {
    var w = wrap.clientWidth || 1;
    var h = wrap.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() {
    camera.lookAt(0, 4.2, -8);
    renderer.render(scene, camera);
  }

  resize();
  render();
  hero.classList.add('webgl-on');
  window.addEventListener('resize', function () { resize(); render(); });

  if (prefersReducedMotion) return; // static moonlit frame, no drift

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
