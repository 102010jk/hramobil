// Vstupní bod: renderer, scéna, smyčka a propojení menu se zápasem.
import * as THREE from './vendor/three.module.min.js';
import { initAudio, setSound, suspendAudio } from './audio.js';
import { makeSky } from './textures.js';
import { startMatch, stopMatch, updateMatch, updateIdle, setMapForMenu, setPaused, lockPointer, MATCH, isTouch, toggleScoreboard } from './match.js';
import { initUI, showPostMatch, showMenu, uiTick } from './ui.js';
import { P } from './profile.js';

const $ = (id) => document.getElementById(id);
if (isTouch) document.body.classList.add('touch');
if (P.settings.shadows === null) P.settings.shadows = !isTouch;
if (P.settings.quality === null) P.settings.quality = isTouch ? 0.75 : 1;

const renderer = new THREE.WebGLRenderer({ canvas: $('cv'), antialias: !isTouch, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, 1, 0.04, 900);
camera.rotation.order = 'YXZ';
const vmScene = new THREE.Scene();
const vmCamera = new THREE.PerspectiveCamera(62, 1, 0.01, 10);

// světla
const hemi = new THREE.HemisphereLight('#dfefff', '#6a5a40', 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 220 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
vmScene.add(new THREE.HemisphereLight('#e8f2ff', '#5a5040', 1.4));
const vmSun = new THREE.DirectionalLight('#fff1dc', 2.2);
vmSun.position.set(1, 2, 1.5);
vmScene.add(vmSun);

let sky = null;
const pmrem = new THREE.PMREMGenerator(renderer);
function setSky(def) {
  if (sky) scene.remove(sky);
  const dir = new THREE.Vector3(...(def.sun || [0.5, 0.7, 0.3])).normalize();
  sky = makeSky(def.sky[0], def.sky[1], dir);
  scene.add(sky);
  scene.fog = new THREE.Fog(def.fog || def.sky[1], 70, 260);
  sun.position.copy(dir).multiplyScalar(120);
  sun.target.position.set(0, 0, 0);
  // odrazy z oblohy pro kovy
  const envScene = new THREE.Scene();
  envScene.add(makeSky(def.sky[0], def.sky[1], dir));
  const rt = pmrem.fromScene(envScene, 0.02);
  scene.environment = rt.texture;
  vmScene.environment = rt.texture;
}

function applyQuality() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * (P.settings.quality || 1));
  renderer.shadowMap.enabled = !!P.settings.shadows;
  sun.castShadow = !!P.settings.shadows;
  scene.traverse((o) => {
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true));
  });
  resize();
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  vmCamera.aspect = w / h;
  vmCamera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const env = {
  renderer,
  scene,
  camera,
  vmScene,
  vmCamera,
  setSky,
  onEnd: (res) => {
    setTimeout(() => {
      stopMatch();
      setMapForMenu(menuMap, env);
      showPostMatch(res);
    }, 2500);
  },
  onPause: () => pause(),
};

let menuMap = 'kravin';
function playMatch(cfg) {
  initAudio();
  $('menu').hidden = true;
  startMatch(cfg, env);
  menuMap = cfg.map;
  applyQuality();
}

function pause() {
  if (!MATCH.active || MATCH.paused) return;
  setPaused(true);
  $('pause').hidden = false;
}
function resume() {
  $('pause').hidden = true;
  setPaused(false);
  lockPointer();
  last = performance.now();
}
$('btn-pause').addEventListener('click', pause);
$('btn-resume').addEventListener('click', resume);
$('btn-pause-score').addEventListener('click', () => {
  $('pause').hidden = true;
  toggleScoreboard();
  setTimeout(() => {
    $('scoreboard').hidden = true;
    $('pause').hidden = false;
  }, 3500);
});
$('btn-quit').addEventListener('click', () => {
  $('pause').hidden = true;
  stopMatch();
  setMapForMenu(menuMap, env);
  showMenu();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && MATCH.active) {
    if (MATCH.paused) resume();
    else if ($('buymenu').hidden) pause();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    suspendAudio();
  } else last = performance.now();
});

/* ---------- smyčka ---------- */
let last = performance.now();
let orbit = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (MATCH.active) updateMatch(dt);
  else {
    updateIdle(dt);
    orbit += dt * 0.05;
    camera.position.set(Math.sin(orbit) * 24, 9, Math.cos(orbit) * 24);
    camera.lookAt(0, 1, 0);
    if (camera.fov !== 70) {
      camera.fov = 70;
      camera.updateProjectionMatrix();
    }
    uiTick(dt);
  }
  renderer.clear();
  renderer.render(scene, camera);
  if (MATCH.active && MATCH.me?.alive && !MATCH.me.scope) {
    renderer.clearDepth();
    renderer.render(vmScene, vmCamera);
  }
  requestAnimationFrame(frame);
}

/* ---------- start ---------- */
setSound(P.settings.sound);
resize();
setMapForMenu(menuMap, env);
initUI({ playMatch, applyQuality, setSound, onMenuMap: (id) => setMapForMenu((menuMap = id), env) });
applyQuality();
$('loading').hidden = true;
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

window.__vk = { MATCH, P, env, updateMatch };
