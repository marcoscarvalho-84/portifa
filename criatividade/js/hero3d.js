/* Entrada da apresentação: a marca em cromo e o anel 'MARCOS CARVALHO /',
   tirados de js/scene.js do site (só a parte do hero, sem o túnel). */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = innerWidth < 768;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
const stage = canvas.parentElement;
const vw = () => stage.clientWidth || innerWidth, vh = () => stage.clientHeight || innerHeight;
renderer.setSize(vw(), vh(), false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
/* site inverted to white: the canvas clears to the light page colour and the
   fog recedes marks into white instead of black (studio env stays dark so the
   chrome keeps dark reflections and reads as a metal object against white) */
renderer.setClearColor(0xf5f4f0, 1);

const scene = new THREE.Scene();
/* fog tuned for plane separation: the mark of the moment sits ~6.5 units
   out (barely fogged, stays chrome), while the NEXT mark 9+ units beyond
   recedes into the light instead of competing for the frame */
scene.fog = new THREE.FogExp2(0xf5f4f0, 0.05);

const camera = new THREE.PerspectiveCamera(40, vw() / vh(), 0.1, 100);
camera.position.set(0, 0, 5);

/* ---- monochrome studio environment -> liquid chrome reflections ----
   These marks are flat extruded logos, not spheres: low curvature means a
   single small hotspot only catches light at some rotation angles and goes
   dark at others (measured: brightness swung 20-212 across a rotation, an
   unacceptable flicker on a mesh that spins continuously). The fix is broad
   coverage: several medium panels around the front hemisphere so the face
   always catches decent light at any angle, still with a brighter top panel
   for a believable vertical chrome gradient (measured stable range: 111-203). */
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x050505);
function panel(v, x, y, z, w, h) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v) })
  );
  m.position.set(x, y, z);
  m.lookAt(0, 0, 0);
  envScene.add(m);
}
panel(3.2, 0, 8, 10, 18, 14);   // top front, bright
panel(2.2, 9, -2, 6, 14, 18);   // right front, medium
panel(2.2, -9, -2, 6, 14, 18);  // left front, medium
panel(1.4, 0, -8, 8, 16, 12);   // bottom front, dimmer
panel(0.6, 0, 0, -30, 24, 24);  // back fill, dim
scene.environment = pmrem.fromScene(envScene, 0.28).texture;
envScene.background = null;

scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 0.3);
key.position.set(1, 3, 6);
scene.add(key);

const chrome = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 1, roughness: 0.1,
  clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.5
});

/* ---- the marks, extruded smooth (never faceted) ----
   void = hero; sun/urchin align to the 2 chapter interstitials
   (The work / Selected work). creature and scribble dropped as the Solvefy
   and Brand-and-art chapters folded into the single Selected work list. */
const SYMBOLS = ['asset-3'];
const GAP = 21; // 50% more distance
/* the craft sphere's sticky stage is opaque, so the urchin's flyby is pulled
   forward (z -33 instead of -42) to peak in the transparent craft-statement
   band right before that section swallows the view */
const Z_POS = [0, -GAP, -33];
const OFFSET = [
  [0, 0],        // void: hero, centred
  [-1.7, 0.7],   // sun
  [1.8, -0.6],   // urchin
  [-1.6, -0.7],  // scribble
  [1.7, 0.65],   // creature
];
const forms = [];
const loader = new SVGLoader();

function addForm(data, index) {
  const shapes = [];
  data.paths.forEach(p => SVGLoader.createShapes(p).forEach(s => shapes.push(s)));
  /* v3: 72/16 built 15 million vertices across the three marks and held the
     main thread for ~1.3s before anything could show. 36/8 keeps every facet
     under a pixel at the sizes these marks are drawn, at about a fifth of the
     geometry. */
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 14, bevelEnabled: true, bevelThickness: 4, bevelSize: 3,
    bevelSegments: 8, curveSegments: 36
  });
  geo.center();
  geo.computeBoundingBox();
  const size = new THREE.Vector3();
  geo.boundingBox.getSize(size);
  /* travelling marks must be monumental when they cross the camera
     (AIR reference): ~70% of frame height at the window centre;
     bigger than that and you are inside blown-white geometry */
  const targetWidth = index === 0 ? 2.34 : 3.42;
  const fit = targetWidth / Math.max(size.x, size.y);

  /* big close-up faces reflect the whole bright studio and flash white;
     travelling marks get a slightly dimmer clone of the chrome so they
     keep their gradient at flyby distance (hero keeps the original) */
  const mat = index === 0 ? chrome : chrome.clone();
  if (index !== 0) mat.envMapIntensity = 1.15;

  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(fit, -fit, fit); // flip Y, SVG is y-down
  mesh.position.set(OFFSET[index][0], OFFSET[index][1], Z_POS[index] ?? -index * GAP);
  mesh.userData.spin = 0.08 + index * 0.02;
  mesh.userData.floatSeed = index * 1.7;
  mesh.userData.baseY = OFFSET[index][1];
  forms[index] = mesh;
  scene.add(mesh);
}
function heroReady() {
  if (window.__heroReady) return;
  window.__heroReady = true;
  requestAnimationFrame(() => requestAnimationFrame(() =>
    document.documentElement.classList.add('gl-ready')));
}
loader.load(`assets/cerol/${SYMBOLS[0]}.svg`, d => { addForm(d, 0); heroReady(); });

const ORBIT = {
  text: 'MARCOS CARVALHO',
  sep: '/',
  radius: 1.25,      // world units out from the mark's centre
  band: 0.55,        // ribbon height in world units, before the seam snap
  cap: 0.37,         // cap height as a share of that band
  track: 0.02,       // letter spacing in em — the loader wordmark's own value
  weight: 700,
  colour: '#050505',
  tiltX: 24,         // deg — how open the ellipse reads
  tiltZ: -6,         // deg — the slight lean the reference carries
  /* the near half of the orbit is closer to the camera, so perspective drags
     the ellipse's apparent centre below world zero — this lifts it back onto
     the mark's optical middle */
  y: 0.14,
  phase: 0.06,       // turns of head start, so the M leads at rest
  loop: 19           // seconds per revolution
};

const orbitGroup = new THREE.Group();
scene.add(orbitGroup);
let orbitMesh = null;

function buildOrbit() {
  if (orbitMesh) {
    orbitGroup.remove(orbitMesh);
    orbitMesh.geometry.dispose();
    orbitMesh.material.uniforms.uMap.value.dispose();
    orbitMesh.material.dispose();
    orbitMesh = null;
  }

  const circ = 2 * Math.PI * ORBIT.radius;
  /* read the viewport now rather than the load-time isMobile flag: this runs
     again once Pacaembu lands and whenever the size class flips, so a phone
     turned landscape isn't stuck with a portrait-sized ring texture. A zero
     width means the window hasn't been measured yet — that is not a phone */
  const small = innerWidth > 0 && innerWidth < 768;
  let H = small ? 288 : 448;
  let size = Math.round(H * ORBIT.cap);
  let track = size * ORBIT.track;

  const c = document.createElement('canvas');
  let cx = c.getContext('2d');
  const face = () => `${ORBIT.weight} ${size}px "Pacaembu", system-ui, sans-serif`;
  const unit = (ORBIT.text + '  ' + ORBIT.sep + '  ').toUpperCase();
  const runW = ctx => { let w = 0; for (const ch of unit) w += ctx.measureText(ch).width + track; return w; };

  cx.font = face();
  const unitW = runW(cx);
  /* how many whole wordmarks fit around the ring at an honest 1:1 aspect */
  const reps = Math.max(1, Math.round((H * circ / ORBIT.band) / unitW));
  let W = Math.round(unitW * reps);

  const max = renderer.capabilities.maxTextureSize || 4096;
  if (W > max) { const k = max / W; W = max; H = Math.round(H * k); size *= k; track *= k; }

  c.width = W; c.height = H;   // resizing wipes the 2d state, so re-arm it after
  cx = c.getContext('2d');
  cx.font = face();
  cx.fillStyle = ORBIT.colour;
  cx.textAlign = 'left';
  cx.textBaseline = 'alphabetic';
  /* centre on the caps, not on the em box: an all-caps line has no descenders,
     so an em-centred baseline would park the wordmark under the ribbon's middle */
  const m = cx.measureText(ORBIT.text.toUpperCase());
  const baseline = H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  let x = 0;
  for (let r = 0; r < reps; r++) for (const ch of unit) {
    cx.fillText(ch, x, baseline);
    x += cx.measureText(ch).width + track;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  /* mipmaps stop the far half of the ring shimmering as it recedes; WebGL1
     can't mip a non power of two texture, so it falls back to plain linear */
  const mip = renderer.capabilities.isWebGL2 !== false;
  tex.generateMipmaps = mip;
  tex.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  /* the seam snap moved the canvas width, so take the band height back from
     it and the letterforms stay square */
  const band = circ * H / W;

  const segU = small ? 192 : 288, segV = 1;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segU; i++) {
    const u = i / segU, a = u * Math.PI * 2;
    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      pos.push(Math.cos(a) * ORBIT.radius, (v - 0.5) * band, Math.sin(a) * ORBIT.radius);
      uv.push(1 - u, v);   // flipped so the near face reads left to right
    }
  }
  const row = segV + 1;
  for (let i = 0; i < segU; i++) for (let j = 0; j < segV; j++) {
    const a = i * row + j, b = a + 1, d = (i + 1) * row + j, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);

  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: null } }]),
    transparent: true, side: THREE.DoubleSide, depthWrite: true, fog: true,
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform sampler2D uMap;
      varying vec2 vUv;
      void main(){
        vec4 c = texture2D(uMap, vUv);
        /* the type is painted once, on the outside of the band — the far half
           of the ring shows it through the ribbon, mirrored, like a shop sign
           read from inside. Soft alpha instead of a hard cut so the letters
           don't crawl while the ring turns */
        float a = smoothstep(0.35, 0.62, c.a);
        if (a < 0.02) discard;
        gl_FragColor = vec4(c.rgb, a);
        #include <fog_fragment>
      }
    `
  });
  mat.uniforms.uMap.value = tex;   // merge clones its values, so hand it over after

  orbitMesh = new THREE.Mesh(geo, mat);
  orbitGroup.add(orbitMesh);
}
/* the ring is half again as wide as the mark it circles, so a narrow window
   would slice the wordmark off at both edges — exactly the word you came to
   read. Pull the whole orbit in until its widest point clears the frame at
   the hero's viewing distance. */
function fitOrbit() {
  const aspect = vh() > 0 ? vw() / vh() : camera.aspect;
  const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 5 * aspect;
  orbitGroup.scale.setScalar(Math.min(1, Math.max(0.55, halfW * 0.88 / ORBIT.radius)));
}

buildOrbit();
fitOrbit();
/* the ring is measured in Pacaembu — remeasure once it actually lands, or the
   fallback's metrics decide how many wordmarks fit and the seam drifts */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildOrbit);
/* refit on every resize, but only redraw the texture when the phone/desktop
   size class actually flips — otherwise a window drag would throw away a
   multi megabyte texture on every frame */
let orbitSmall = innerWidth > 0 && innerWidth < 768;
addEventListener('resize', () => {
  const now = innerWidth > 0 && innerWidth < 768;
  if (now !== orbitSmall) { orbitSmall = now; buildOrbit(); }
  fitOrbit();
});

let mx = 0, my = 0;
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  mx = e.clientX / innerWidth - 0.5;
  my = e.clientY / innerHeight - 0.5;
});
addEventListener('resize', () => {
  camera.aspect = vw() / vh();
  camera.updateProjectionMatrix();
  renderer.setSize(vw(), vh(), false);
});

/* só desenha enquanto a primeira página está na tela */
let onScreen = true;
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.02 }).observe(stage);

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  if (!onScreen) return;
  const t = reduce ? 0 : clock.getElapsedTime();
  camera.position.x += (mx * 0.7 - camera.position.x) * 0.04;
  camera.position.y += (-my * 0.5 - camera.position.y) * 0.04;
  camera.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, camera.position.z - 6);
  forms.forEach((m, i) => {
    if (!m) return;
    const driftY = Math.sin(t * m.userData.spin + i * 1.3) * 0.05;
    const aimY = reduce ? 0 : mx * 1.1 + driftY;
    const aimX = reduce ? 0 : my * 0.7;
    m.rotation.y += (aimY - m.rotation.y) * 0.08;
    m.rotation.x += (aimX - m.rotation.x) * 0.08;
    const targetRotZ = Math.sin(t * 0.15 + m.userData.floatSeed) * 0.05;
    m.rotation.z += (targetRotZ - m.rotation.z) * 0.05;
    m.position.y = m.userData.baseY + (reduce ? 0 : Math.sin(t * 0.2 + m.userData.floatSeed) * 0.12);
  });
  if (orbitMesh) {
    const tt = (t % ORBIT.loop) / ORBIT.loop;
    const turn = tt - 0.18 * Math.sin(Math.PI * 2 * tt) / (Math.PI * 2);
    orbitMesh.rotation.y = (ORBIT.phase + turn) * Math.PI * 2;
    orbitGroup.rotation.x = THREE.MathUtils.degToRad(ORBIT.tiltX) + (reduce ? 0 : -my * 0.16);
    orbitGroup.rotation.z = THREE.MathUtils.degToRad(ORBIT.tiltZ) + (reduce ? 0 : mx * 0.10);
    orbitGroup.position.y = ORBIT.y + (forms[0] ? forms[0].position.y : 0);
  }
  renderer.render(scene, camera);
}
tick();
