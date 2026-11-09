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
  scene.fog = new THREE.Fog(0x0b1930, 18, 62);

  var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
  var CAM_Y = 3.2;
  camera.position.set(0, CAM_Y, 21);

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

  /* ---------- height field: one towering summit, flanked ridge ---------- */
  var PEAKS = [
    { x: -27, z: -13, h: 7, r: 9 },
    { x: -14, z: -16, h: 11.5, r: 8 },
    { x: 6, z: -14, h: 19, r: 9.5 },  // the summit
    { x: 17, z: -16, h: 12, r: 7 },
    { x: 27, z: -12, h: 7.5, r: 8 }
  ];

  function height(x, z) {
    var h = 0;
    for (var i = 0; i < PEAKS.length; i++) {
      var p = PEAKS[i];
      var dx = x - p.x;
      var dz = (z - p.z) * 1.7; // compress depth so peaks form a ridge line
      var d = Math.sqrt(dx * dx + dz * dz);
      var t = Math.max(0, 1 - d / p.r);
      h += p.h * Math.pow(t, 1.6);
    }
    // rougher in the back range, calm foothills near the camera
    var backFactor = 0.3 + 0.7 * Math.min(1, Math.max(0, (-z + 8) / 22));
    h += (valueNoise(x * 0.14 + 7, z * 0.14 + 3) * 2.6 +
          valueNoise(x * 0.45 + 2, z * 0.45 + 9) * 1.1) * backFactor;
    return h;
  }

  var geo = new THREE.PlaneGeometry(90, 44, 150, 74);
  geo.rotateX(-Math.PI / 2);

  var pos = geo.attributes.position;
  var count = pos.count;
  var solidColors = new Float32Array(count * 3);
  var base = new THREE.Color(0x0f2037);
  var baseDark = new THREE.Color(0x081525);
  var tmp = new THREE.Color();
  var maxH = 0;

  for (var i = 0; i < count; i++) {
    var x = pos.getX(i), z = pos.getZ(i);
    var h = height(x, z);
    pos.setY(i, h);
    if (h > maxH) maxH = h;

    var shade = valueNoise(x * 0.3 + 11, z * 0.3 + 5);
    tmp.copy(baseDark).lerp(base, shade);
    solidColors[i * 3] = tmp.r;
    solidColors[i * 3 + 1] = tmp.g;
    solidColors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(solidColors, 3));
  geo.computeVertexNormals();

  // dark under-mesh: occludes rear wires so the range reads as a solid
  // silhouette wearing the wireframe, and keeps text legible above it
  var terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.95,
    metalness: 0
  }));
  terrain.position.z = -4;
  scene.add(terrain);

  // the star of the scene: blue wire surface, glowing brighter with altitude
  var wireGeo = geo.clone();
  var wireColors = new Float32Array(count * 3);
  var wireDim = new THREE.Color(0x15385e);
  var wireMid = new THREE.Color(0x3aa3e8);
  var wireHot = new THREE.Color(0xcfeaff);

  for (var j = 0; j < count; j++) {
    var wy = wireGeo.attributes.position.getY(j);
    var wz = wireGeo.attributes.position.getZ(j);
    var alt = Math.min(1, Math.max(0, wy / maxH));
    if (alt < 0.45) tmp.copy(wireDim).lerp(wireMid, alt / 0.45);
    else tmp.copy(wireMid).lerp(wireHot, (alt - 0.45) / 0.55);
    // keep the flat foreground floor faint so it never fights the content
    var floorDim = 0.35 + 0.65 * Math.min(1, Math.max(0, (-wz + 14) / 26));
    tmp.multiplyScalar(floorDim);
    wireColors[j * 3] = tmp.r;
    wireColors[j * 3 + 1] = tmp.g;
    wireColors[j * 3 + 2] = tmp.b;
  }
  wireGeo.setAttribute('color', new THREE.BufferAttribute(wireColors, 3));

  var wire = new THREE.Mesh(wireGeo, new THREE.MeshBasicMaterial({
    wireframe: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.55
  }));
  wire.position.z = -4;
  wire.position.y = 0.04;
  scene.add(wire);

  // moonlight from the upper right, cool ambient bounce
  var moonlight = new THREE.DirectionalLight(0xcfe4f8, 0.85);
  moonlight.position.set(26, 30, 10);
  scene.add(moonlight);
  scene.add(new THREE.HemisphereLight(0x2c4a6e, 0x070d18, 0.7));

  function resize() {
    var w = wrap.clientWidth || 1;
    var h = wrap.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() {
    camera.lookAt(0, 6.2, -8);
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
