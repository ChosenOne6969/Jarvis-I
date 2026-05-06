import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const speakJarvis = (firstName) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const parts = [
    `Welcome to your MindSpace, ${firstName}.`,
    'Calm down.', 'Take a deep breath.', 'And explore yourself.'
  ];
  let i = 0;
  const speakNext = () => {
    if (i >= parts.length) return;
    const utter = new SpeechSynthesisUtterance(parts[i]);
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(v => v.name === 'Microsoft Hazel - English (United Kingdom)') ||
      voices.find(v => v.name === 'Microsoft Susan - English (United Kingdom)') ||
      voices.find(v => v.name.includes('Hazel')) ||
      voices.find(v => v.name.includes('Susan')) ||
      voices.find(v => v.lang === 'en-GB' && !v.name.includes('George'));
    if (voice) utter.voice = voice;
    utter.pitch = 1.08; utter.rate = 0.65; utter.volume = 0.9;
    utter.onend = () => { i++; setTimeout(speakNext, 750); };
    window.speechSynthesis.speak(utter);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => speakNext();
  } else { speakNext(); }
};

class TibetanAudioSystem {
  constructor() {
    this.ctx = null; this.masterGain = null;
    this.activeNodes = []; this.playing = false; this.volume = 0.4;
  }
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);
  }
  setVolume(v) { this.volume = v; if (this.masterGain) this.masterGain.gain.value = v; }
  stopAll() {
    this.activeNodes.forEach(n => { try { if (n.stop) n.stop(); if (n.disconnect) n.disconnect(); } catch (e) {} });
    this.activeNodes = []; this.playing = false;
  }
  createDrone(freq, detune = 0, gainVal = 0.04) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter(); const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq; osc.detune.value = detune;
    filter.type = 'lowpass'; filter.frequency.value = freq * 4;
    gain.gain.value = gainVal; lfo.frequency.value = 0.07; lfoGain.gain.value = 2.5;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    osc.start(); lfo.start();
    this.activeNodes.push(osc, gain, filter, lfo, lfoGain);
  }
  createBowlStrike(freq, startTime, sustain = 6) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator(); const osc2 = ctx.createOscillator();
    const gain = ctx.createGain(); const gain2 = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    osc2.type = 'sine'; osc2.frequency.value = freq * 2.756;
    gain2.gain.value = 0.3;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.09, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + sustain);
    osc.connect(gain); osc2.connect(gain2); gain2.connect(gain); gain.connect(this.masterGain);
    osc.start(startTime); osc.stop(startTime + sustain);
    osc2.start(startTime); osc2.stop(startTime + sustain);
    this.activeNodes.push(osc, osc2, gain, gain2);
  }
  scheduleBowlLoop(freqs, interval, sustain) {
    if (!this.playing) return;
    const ctx = this.ctx;
    freqs.forEach((freq, i) => { this.createBowlStrike(freq, ctx.currentTime + i * (interval / freqs.length), sustain); });
    const timeout = setTimeout(() => { if (this.playing) this.scheduleBowlLoop(freqs, interval, sustain); }, interval * 1000);
    this.activeNodes.push({ stop: () => clearTimeout(timeout), disconnect: () => {} });
  }
  createNoise(filterFreq, gainVal) {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass';
    filter.frequency.value = filterFreq; filter.Q.value = 0.4;
    const gain = ctx.createGain(); gain.gain.value = gainVal;
    source.connect(filter); filter.connect(gain); gain.connect(this.masterGain); source.start();
    this.activeNodes.push(source, filter, gain);
  }
  play(type) {
    this.init(); this.stopAll(); this.playing = true;
    if (type === 'om_drone') {
      this.createDrone(136.1, 0, 0.05); this.createDrone(272.2, 4, 0.03); this.createDrone(408.3, -3, 0.02);
      this.createNoise(180, 0.015); this.scheduleBowlLoop([256, 341.3, 480], 12, 8);
    }
    if (type === 'heart_bowl') {
      this.createDrone(170.6, 0, 0.04); this.createDrone(341.3, 6, 0.035);
      this.createNoise(300, 0.012); this.scheduleBowlLoop([341.3, 384, 288], 10, 7);
    }
    if (type === 'crown_meditation') {
      this.createDrone(240, 0, 0.035); this.createDrone(480, -5, 0.025); this.createDrone(720, 3, 0.015);
      this.createNoise(600, 0.01); this.scheduleBowlLoop([426.7, 480, 384], 14, 9);
    }
    if (type === 'deep_silence') {
      this.createDrone(40, 0, 0.05); this.createDrone(80, 2, 0.03); this.createDrone(120, -2, 0.02);
      this.createNoise(120, 0.012); this.scheduleBowlLoop([256, 288], 18, 12);
    }
    if (type === 'chakra_sequence') {
      this.createDrone(136.1, 0, 0.04); this.createNoise(250, 0.015);
      this.scheduleBowlLoop([256, 288, 320, 341.3, 384, 426.7, 480], 28, 6);
    }
  }
  pause() { if (this.ctx?.state === 'running') { this.ctx.suspend(); this.playing = false; } }
  resume() { if (this.ctx?.state === 'suspended') { this.ctx.resume(); this.playing = true; } }
  toggle() {
    if (this.playing) { this.pause(); return false; }
    if (this.ctx?.state === 'suspended') { this.resume(); return true; }
    return false;
  }
  destroy() { this.stopAll(); if (this.ctx) { this.ctx.close(); this.ctx = null; } }
}

const TRACKS = [
  { name: 'OM Drone', type: 'om_drone' },
  { name: 'Heart Bowl', type: 'heart_bowl' },
  { name: 'Crown Chakra', type: 'crown_meditation' },
  { name: 'Deep Silence', type: 'deep_silence' },
  { name: 'Chakra Flow', type: 'chakra_sequence' },
];

const DEFAULT_NODES = [
  { title: 'CURIOSITY', goal: '' }, { title: 'CRAFT', goal: '' },
  { title: 'VISION', goal: '' }, { title: 'GROWTH', goal: '' }, { title: 'REST', goal: '' },
];

const NODE_COLORS = [0xc8a840, 0xb89030, 0xd4b850, 0xa07820, 0xc09838];
const hexToRgb = (hex) => ({ r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 });
const DIFF_WEIGHTS = { easy: 1, medium: 2, hard: 3 };
const DIFF_COLORS = { easy: '#00ff88', medium: '#f0c040', hard: '#ff6644' };

const calcProgress = (milestones) => {
  if (!milestones?.length) return 0;
  let total = 0, done = 0;
  milestones.forEach(m => (m.tasks || []).forEach(t => {
    const w = DIFF_WEIGHTS[t.difficulty] || 2; total += w; if (t.done) done += w;
  }));
  return total === 0 ? 0 : Math.round((done / total) * 100);
};

const calcGlow = (lastVisited, progress) => {
  const days = (Date.now() - new Date(lastVisited || Date.now())) / (1000 * 60 * 60 * 24);
  const decay = Math.max(0, 1 - days * 0.12);
  return Math.round(Math.min(100, Math.max(10, (decay * 0.6 + (progress / 100) * 0.4) * 100)));
};

function createNeuralNode(colorHex, glowLevel, progress) {
  const group = new THREE.Group();
  const c = new THREE.Color(colorHex);
  const intensity = glowLevel / 100;
  const coreMat = new THREE.MeshBasicMaterial({ color: c });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), coreMat));
  group.userData.coreMat = coreMat;
  const haloMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.25 * intensity });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), haloMat));
  group.userData.haloMat = haloMat;
  const outerHaloMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.08 * intensity });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), outerHaloMat));
  group.userData.outerHaloMat = outerHaloMat;
  const numArms = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numArms; i++) {
    const theta = (i / numArms) * Math.PI * 2 + Math.random() * 0.3;
    const phi = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
    const length = 0.22 + Math.random() * 0.16;
    const pts = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      const w = Math.sin(t * Math.PI) * 0.03 * (Math.random() - 0.5);
      pts.push(new THREE.Vector3(
        t * length * Math.sin(phi) * Math.cos(theta) + w,
        t * length * Math.cos(phi) + w,
        t * length * Math.sin(phi) * Math.sin(theta) + w,
      ));
    }
    const armMat = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: intensity * (0.6 - i / numArms * 0.3) });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(12)), armMat));
    const tipMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: intensity * 0.85 });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 4, 4), tipMat);
    tip.position.copy(pts[pts.length - 1]); group.add(tip);
  }
  if (progress > 0) {
    const ringMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 * intensity });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.009, 4, 32, (progress / 100) * Math.PI * 2), ringMat);
    ring.rotation.x = Math.PI / 2; group.add(ring);
  }
  group.userData.color = c; group.userData.baseIntensity = intensity;
  return group;
}

function flyCamera(camera, controls, targetPos, targetLookAt, duration, onDone) {
  const startPos = camera.position.clone(); const startTarget = controls.target.clone();
  const start = Date.now();
  const tick = () => {
    const p = Math.min((Date.now() - start) / duration, 1);
    const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
    camera.position.lerpVectors(startPos, targetPos, e);
    controls.target.lerpVectors(startTarget, targetLookAt, e);
    controls.update();
    if (p < 1) requestAnimationFrame(tick); else if (onDone) onDone();
  };
  tick();
}

// ── DETECT MOBILE ──
const isMobile = () => window.innerWidth <= 768;

export default function MindSpace() {
  const mountRef = useRef(null);
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createPos, setCreatePos] = useState({ x: 0, y: 0 });
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const [jarvisMsg, setJarvisMsg] = useState('');
  const [jarvisChat, setJarvisChat] = useState([
    { role: 'jarvis', text: `Welcome, ${user?.name?.split(' ')[0] || 'Explorer'}. Your neural universe breathes before you. Press ENTER BRAIN to step inside your mind.` }
  ]);
  const [showSummary, setShowSummary] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [brainLoaded, setBrainLoaded] = useState(false);
  const [isInsideBrain, setIsInsideBrain] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [voiceSpoken, setVoiceSpoken] = useState(false);
  const [activeMilestoneIdx, setActiveMilestoneIdx] = useState(0);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDifficulty, setNewTaskDifficulty] = useState('medium');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newResource, setNewResource] = useState('');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeTab, setActiveTab] = useState('milestones');

  // ── MOBILE STATE ──
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMusicOpen, setMobileMusicOpen] = useState(false);
  const [mobile, setMobile] = useState(isMobile());

  useEffect(() => {
    const handleResize = () => setMobile(isMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const audioSystem = useRef(new TibetanAudioSystem());
  const sceneRef = useRef(null); const cameraRef = useRef(null);
  const rendererRef = useRef(null); const composerRef = useRef(null);
  const controlsRef = useRef(null); const brainGroupRef = useRef(null);
  const animDataRef = useRef({}); const nodeGroupsRef = useRef([]);
  const nodesRef = useRef([]); const animFrameRef = useRef(null);
  const mouseMoved = useRef(false); const mouseDownPos = useRef({ x: 0, y: 0 });
  const clickCount = useRef(0); const clickTimer = useRef(null);
  const insideRef = useRef(false); const nodeOpenTime = useRef(null);

  const OUTSIDE_POS = new THREE.Vector3(0, 0, 9);
  const INSIDE_POS = new THREE.Vector3(0, 0.2, 0.1);
  const API = 'https://jarvis-i-f04q.onrender.com/api';
  const headers = { Authorization: `Bearer ${token}` };

  const makeNode3D = (n, i, total) => {
    const theta = (i / total) * Math.PI * 2 + 0.4;
    const phi = Math.PI * 0.35 + (i % 3) * 0.38;
    const r = 0.45 + (i % 3) * 0.28;
    const progress = calcProgress(n.milestones);
    return {
      ...n,
      x3d: r * 2.0 * Math.sin(phi) * Math.cos(theta),
      y3d: r * 1.6 * Math.cos(phi),
      z3d: r * 1.8 * Math.sin(phi) * Math.sin(theta),
      progress, glowLevel: calcGlow(n.lastVisited, progress),
      color: NODE_COLORS[i % NODE_COLORS.length],
      milestones: n.milestones || [], resources: n.resources || [],
    };
  };

  const fetchNodes = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/nodes`, { headers });
      if (res.data.length === 0) {
        const seeded = await Promise.all(DEFAULT_NODES.map(n =>
          axios.post(`${API}/nodes`, { title: n.title, goal: '', milestones: [], position: { x: 0, y: 0 } }, { headers })
        ));
        const mapped = seeded.map((r, i) => makeNode3D(r.data, i, seeded.length));
        setNodes(mapped); nodesRef.current = mapped;
      } else {
        const mapped = res.data.map((n, i) => makeNode3D(n, i, res.data.length));
        setNodes(mapped); nodesRef.current = mapped;
      }
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  useEffect(() => {
  if (brainLoaded && !voiceSpoken && user?.name) {
    const firstName = user.name.split(' ')[0];
    setVoiceSpoken(true);
    // On mobile, voice requires user interaction first
    // We delay and attach to window touch event
    const trySpeak = () => {
      speakJarvis(firstName);
      window.removeEventListener('touchstart', trySpeak);
      window.removeEventListener('click', trySpeak);
    };
    // Try immediately for desktop, wait for touch on mobile
    setTimeout(() => {
      if (!isMobile()) {
        speakJarvis(firstName);
      } else {
        window.addEventListener('touchstart', trySpeak, { once: true });
        window.addEventListener('click', trySpeak, { once: true });
      }
    }, 1000);
  }
}, [brainLoaded, voiceSpoken, user]);

  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050e);
    scene.fog = new THREE.FogExp2(0x03050e, 0.010);
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.01, 100);
    camera.position.copy(OUTSIDE_POS);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.0, 0.6, 0.35);
    composer.addPass(bloom);
    composerRef.current = composer;
    animDataRef.current.bloom = bloom;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.4;
    controls.minDistance = 3; controls.maxDistance = 18; controls.enablePan = false;
    controlsRef.current = controls;
    const brainGroup = new THREE.Group();
    scene.add(brainGroup); brainGroupRef.current = brainGroup;

    const starPos = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000 * 3; i++) starPos[i] = (Math.random() - 0.5) * 80;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd4b870, size: 0.022, transparent: true, opacity: 0.3 })));

    fetch('/brain/brain_data.json').then(r => r.json()).then(data => {
      const { points, connections, surface_count } = data;
      const pts = points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const surfPts = pts.slice(0, surface_count);
      const intPts = pts.slice(surface_count);

      const surfDotsMat = new THREE.PointsMaterial({ color: 0xffd060, size: 0.055, transparent: true, opacity: 0.88, sizeAttenuation: true });
      brainGroup.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(surfPts), surfDotsMat));
      animDataRef.current.surfDotsMat = surfDotsMat;

      const surfShortMats = []; const surfLongPositions = [];
      connections.forEach(([i, j]) => {
        if (i >= surface_count || j >= surface_count) return;
        const a = pts[i]; const b = pts[j]; if (!a || !b) return;
        const d = a.distanceTo(b);
        if (d < 0.85) {
          const midRaw = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
          midRaw.addScaledVector(midRaw.clone().normalize(), 0.06 + Math.random() * 0.08);
          const curve = new THREE.QuadraticBezierCurve3(a.clone(), midRaw, b.clone());
          const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(8));
          const baseOp = 0.22 + Math.random() * 0.12;
          const mat = new THREE.LineBasicMaterial({ color: 0xd4a830, transparent: true, opacity: baseOp });
          brainGroup.add(new THREE.Line(geo, mat));
          surfShortMats.push({ mat, base: baseOp });
        } else { surfLongPositions.push(...a.toArray(), ...b.toArray()); }
      });
      animDataRef.current.surfShortMats = surfShortMats;
      if (surfLongPositions.length > 0) {
        const longGeo = new THREE.BufferGeometry();
        longGeo.setAttribute('position', new THREE.Float32BufferAttribute(surfLongPositions, 3));
        const longMat = new THREE.LineBasicMaterial({ color: 0xb08818, transparent: true, opacity: 0.08 });
        brainGroup.add(new THREE.LineSegments(longGeo, longMat));
        animDataRef.current.surfLongMat = longMat;
      }

      if (intPts.length > 0) {
        const intDotsMat = new THREE.PointsMaterial({ color: 0xffaa20, size: 0.042, transparent: true, opacity: 0.55, sizeAttenuation: true });
        brainGroup.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(intPts), intDotsMat));
        animDataRef.current.intDotsMat = intDotsMat;
      }

      const synLines = []; const connected = new Set();
      for (let i = 0; i < intPts.length && synLines.length < 80; i++) {
        const dists = [];
        for (let j = 0; j < intPts.length; j++) {
          if (i === j) continue;
          dists.push({ d: intPts[i].distanceTo(intPts[j]), j });
        }
        dists.sort((a, b) => a.d - b.d);
        let count = 0;
        for (const { d, j } of dists) {
          if (count >= 2) break;
          if (d > 0.65) break;
          const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
          if (connected.has(key)) continue;
          connected.add(key);
          const a = intPts[i]; const b = intPts[j];
          const mid = new THREE.Vector3(
            (a.x + b.x) / 2 + (Math.random() - 0.5) * 0.06,
            (a.y + b.y) / 2 + (Math.random() - 0.5) * 0.06,
            (a.z + b.z) / 2 + (Math.random() - 0.5) * 0.06,
          );
          const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
          const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(8));
          const baseOp = 0.15 + Math.random() * 0.18;
          const mat = new THREE.LineBasicMaterial({ color: 0xffd060, transparent: true, opacity: baseOp });
          brainGroup.add(new THREE.Line(geo, mat));
          synLines.push({ mat, base: baseOp });
          count++;
        }
      }
      animDataRef.current.synLines = synLines;
      setBrainLoaded(true);
    }).catch(() => setBrainLoaded(true));

    scene.add(new THREE.AmbientLight(0xc8a040, 0.3));
    const pl1 = new THREE.PointLight(0xd4b050, 1.2, 25); pl1.position.set(4, 4, 4); scene.add(pl1);
    const pl2 = new THREE.PointLight(0xb09030, 0.7, 20); pl2.position.set(-4, -3, -4); scene.add(pl2);
    const insideLight = new THREE.PointLight(0xc8a840, 0, 8); scene.add(insideLight);
    animDataRef.current.pl1 = pl1; animDataRef.current.pl2 = pl2; animDataRef.current.insideLight = insideLight;

    let t = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      t += 0.016; controls.update();
      const ad = animDataRef.current; const inside = insideRef.current;
      if (ad.surfDotsMat) ad.surfDotsMat.opacity = inside ? 0.5 + 0.15 * Math.sin(t * 0.35) : 0.82 + 0.1 * Math.sin(t * 0.35);
      if (ad.surfShortMats) ad.surfShortMats.forEach((s, i) => { s.mat.opacity = s.base * (0.75 + 0.25 * Math.sin(t * 0.28 + i * 0.04)); });
      if (ad.surfLongMat) ad.surfLongMat.opacity = inside ? 0.04 : 0.07;
      if (ad.intDotsMat) ad.intDotsMat.opacity = inside ? 0.65 + 0.22 * Math.sin(t * 0.4) : 0.42 + 0.15 * Math.sin(t * 0.4);
      if (ad.synLines) ad.synLines.forEach((s, i) => {
        const rate = 0.3 + (i % 11) * 0.06;
        const fire = Math.abs(Math.sin(t * rate + i * 0.27));
        s.mat.opacity = s.base * (inside ? 1.0 : 0.65) * (0.15 + 0.85 * fire);
      });
      if (ad.bloom) ad.bloom.strength = inside ? 1.6 + 0.2 * Math.sin(t * 0.3) : 1.0 + 0.12 * Math.sin(t * 0.3);
      if (ad.insideLight) ad.insideLight.intensity = inside ? 0.5 + 0.25 * Math.sin(t * 0.4) : 0;
      if (ad.pl1) ad.pl1.intensity = 1.0 + 0.3 * Math.sin(t * 0.5);
      nodeGroupsRef.current.forEach((group, i) => {
        if (!group || !nodesRef.current[i]) return;
        const node = nodesRef.current[i]; const glow = node.glowLevel / 100;
        const pulse = 1 + 0.10 * Math.sin(t * 1.4 + i * 0.8);
        group.scale.setScalar(pulse * (inside ? 1.6 : 1.0));
        if (group.userData.coreMat) { const c = group.userData.color.clone(); const dim = 0.4 + glow * 0.6; group.userData.coreMat.color.setRGB(c.r * dim, c.g * dim, c.b * dim); }
        if (group.userData.haloMat) group.userData.haloMat.opacity = 0.22 * glow * pulse;
        if (group.userData.outerHaloMat) group.userData.outerHaloMat.opacity = 0.07 * glow * pulse;
        if (group.userData.light) group.userData.light.intensity = (inside ? 2.2 : 1.2) * glow * (0.6 + 0.4 * Math.sin(t * 1.4 + i));
      });
      composer.render();
    };
    animate();

    const handleResize = () => {
      const W = mount.clientWidth, H = mount.clientHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H); composer.setSize(W, H);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose(); renderer.dispose();
      audioSystem.current.destroy();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const bg = brainGroupRef.current;
    if (!bg || nodes.length === 0) return;
    nodeGroupsRef.current.forEach(g => { if (g.userData.light) bg.remove(g.userData.light); bg.remove(g); });
    nodeGroupsRef.current = [];
    nodes.forEach((node, i) => {
      const group = createNeuralNode(node.color, node.glowLevel, node.progress);
      group.position.set(node.x3d, node.y3d, node.z3d);
      group.userData.nodeIndex = i; group.userData.nodeId = node._id;
      const light = new THREE.PointLight(node.color, 1.2, 3.0);
      light.position.copy(group.position);
      bg.add(light); group.userData.light = light;
      bg.add(group); nodeGroupsRef.current.push(group);
    });
    nodesRef.current = nodes;
  }, [nodes]);

  const enterBrain = () => {
    if (isTransitioning || insideRef.current) return;
    setIsTransitioning(true); setShowCreateMenu(false); setShowPanel(false); setMobileMenuOpen(false);
    const ctrl = controlsRef.current;
    ctrl.autoRotate = false; ctrl.minDistance = 0.1; ctrl.maxDistance = 2;
    flyCamera(cameraRef.current, ctrl, INSIDE_POS, new THREE.Vector3(0, 0, 0), 2000, () => {
      insideRef.current = true; setIsInsideBrain(true); setIsTransitioning(false);
      ctrl.minDistance = 0.05; ctrl.maxDistance = 1.8;
    });
  };

  const exitBrain = () => {
    if (isTransitioning || !insideRef.current) return;
    setIsTransitioning(true); setShowPanel(false); setMobileMenuOpen(false);
    const ctrl = controlsRef.current;
    flyCamera(cameraRef.current, ctrl, OUTSIDE_POS, new THREE.Vector3(0, 0, 0), 2000, () => {
      insideRef.current = false; setIsInsideBrain(false); setIsTransitioning(false);
      ctrl.autoRotate = true; ctrl.minDistance = 3; ctrl.maxDistance = 18;
    });
  };

  const handleMouseDown = (e) => { mouseMoved.current = false; mouseDownPos.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseMove = (e) => {
    if (Math.abs(e.clientX - mouseDownPos.current.x) > 4 || Math.abs(e.clientY - mouseDownPos.current.y) > 4)
      mouseMoved.current = true;
  };
  const handleMouseUp = (e) => {
    if (mouseMoved.current) return;
    const renderer = rendererRef.current, camera = cameraRef.current;
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    setShowCreateMenu(false);
    const allMeshes = [];
    nodeGroupsRef.current.forEach(g => g.traverse(c => { if (c.isMesh) allMeshes.push(c); }));
    const hits = raycaster.intersectObjects(allMeshes, false);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && obj.userData.nodeIndex === undefined) obj = obj.parent;
      if (obj?.userData.nodeIndex !== undefined) {
        const node = nodesRef.current[obj.userData.nodeIndex];
        if (node) {
          setSelectedNode({ ...node, milestones: node.milestones || [], resources: node.resources || [] });
          setActiveMilestoneIdx(0); setActiveTab('milestones');
          setShowPanel(true); setShowSummary(false); setMobileMenuOpen(false);
          nodeOpenTime.current = Date.now();
          markVisited(node._id);
          if (controlsRef.current) controlsRef.current.autoRotate = false;
          return;
        }
      }
    }
    clickCount.current += 1;
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0;
        if (!insideRef.current) { setShowPanel(false); setSelectedNode(null); setCreatePos({ x: e.clientX, y: e.clientY }); setShowCreateMenu(true); }
      }, 280);
    } else {
      clearTimeout(clickTimer.current); clickCount.current = 0;
      if (!insideRef.current) enterBrain();
    }
  };

  const markVisited = async (id) => { try { await axios.patch(`${API}/nodes/${id}/visit`, {}, { headers }); } catch { } };

  const createNodeAt = async () => {
    setShowCreateMenu(false);
    const theta = Math.random() * Math.PI * 2, phi = 0.3 + Math.random() * (Math.PI - 0.6), r = 0.3 + Math.random() * 0.65;
    try {
      const res = await axios.post(`${API}/nodes`, { title: 'UNNAMED', goal: '', milestones: [], resources: [], position: { x: 0, y: 0 } }, { headers });
      const newNode = {
        ...res.data,
        x3d: r * 2.0 * Math.sin(phi) * Math.cos(theta),
        y3d: r * 1.6 * Math.cos(phi),
        z3d: r * 1.8 * Math.sin(phi) * Math.sin(theta),
        glowLevel: 100, progress: 0,
        color: NODE_COLORS[nodesRef.current.length % NODE_COLORS.length],
        milestones: [], resources: [],
      };
      const updated = [...nodesRef.current, newNode];
      nodesRef.current = updated; setNodes(updated);
      setSelectedNode({ ...newNode }); setActiveMilestoneIdx(0); setActiveTab('milestones'); setShowPanel(true);
    } catch (err) { console.error(err); }
  };

  const addMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    const milestones = [...(selectedNode.milestones || []), { title: newMilestoneTitle.trim(), description: '', order: (selectedNode.milestones || []).length, tasks: [] }];
    setSelectedNode({ ...selectedNode, milestones, progress: calcProgress(milestones) });
    setNewMilestoneTitle(''); setShowAddMilestone(false); setActiveMilestoneIdx(milestones.length - 1);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const task = { text: newTaskText.trim(), difficulty: newTaskDifficulty, done: false, deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null, createdAt: new Date().toISOString() };
    const milestones = [...(selectedNode.milestones || [])];
    if (!milestones[activeMilestoneIdx]) return;
    milestones[activeMilestoneIdx] = { ...milestones[activeMilestoneIdx], tasks: [...(milestones[activeMilestoneIdx].tasks || []), task] };
    setSelectedNode({ ...selectedNode, milestones, progress: calcProgress(milestones) });
    setNewTaskText(''); setNewTaskDeadline(''); setShowAddTask(false);
  };

  const toggleTask = (mIdx, tIdx) => {
    const milestones = [...(selectedNode.milestones || [])];
    const tasks = [...milestones[mIdx].tasks];
    tasks[tIdx] = { ...tasks[tIdx], done: !tasks[tIdx].done, completedAt: !tasks[tIdx].done ? new Date().toISOString() : null };
    milestones[mIdx] = { ...milestones[mIdx], tasks };
    const progress = calcProgress(milestones);
    setSelectedNode({ ...selectedNode, milestones, progress, glowLevel: calcGlow(selectedNode.lastVisited, progress) });
  };

  const deleteTask = (mIdx, tIdx) => {
    const milestones = [...(selectedNode.milestones || [])];
    const tasks = [...milestones[mIdx].tasks]; tasks.splice(tIdx, 1);
    milestones[mIdx] = { ...milestones[mIdx], tasks };
    setSelectedNode({ ...selectedNode, milestones, progress: calcProgress(milestones) });
  };

  const deleteMilestone = (mIdx) => {
    const milestones = [...(selectedNode.milestones || [])]; milestones.splice(mIdx, 1);
    setSelectedNode({ ...selectedNode, milestones, progress: calcProgress(milestones) });
    setActiveMilestoneIdx(Math.max(0, activeMilestoneIdx - 1));
  };

  const addResource = () => {
    if (!newResource.trim()) return;
    const resources = [...(selectedNode.resources || []), newResource.trim()];
    setSelectedNode({ ...selectedNode, resources }); setNewResource('');
  };

  const deleteResource = (i) => {
    const resources = [...(selectedNode.resources || [])]; resources.splice(i, 1);
    setSelectedNode({ ...selectedNode, resources });
  };

  const suggestWithJarvis = async () => {
    if (!selectedNode.goal?.trim()) { alert('Please write your goal first, then ask JARVIS.'); return; }
    setIsSuggesting(true);
    try {
      const res = await axios.post(`${API}/jarvis/suggest`, { goal: selectedNode.goal, nodeTitle: selectedNode.title }, { headers });
      if (res.data.milestones?.length > 0) {
        const newMilestones = res.data.milestones.map((m, i) => ({
          title: m.title, description: m.description || '', order: i,
          tasks: (m.tasks || []).map(t => ({ text: t.text, difficulty: t.difficulty || 'medium', done: false, deadline: null, createdAt: new Date().toISOString(), shouldDoFirst: t.shouldDoFirst || false })),
        }));
        const combined = [...(selectedNode.milestones || []), ...newMilestones];
        setSelectedNode({ ...selectedNode, milestones: combined, progress: calcProgress(combined) });
        if (res.data.jarvisNote) setJarvisChat(prev => [...prev, { role: 'jarvis', text: res.data.jarvisNote }]);
        setActiveMilestoneIdx(selectedNode.milestones?.length || 0);
        setActiveTab('milestones');
      }
    } catch (err) {
      console.error(err);
      setJarvisChat(prev => [...prev, { role: 'jarvis', text: 'Systems recalibrating. Please try again.' }]);
    }
    setIsSuggesting(false);
  };

  const saveNode = async () => {
    if (nodeOpenTime.current) {
      const mins = Math.round((Date.now() - nodeOpenTime.current) / 60000);
      if (mins > 0) { try { await axios.patch(`${API}/nodes/${selectedNode._id}/visit`, { timeSpentMinutes: mins }, { headers }); } catch { } }
      nodeOpenTime.current = null;
    }
    try {
      const res = await axios.put(`${API}/nodes/${selectedNode._id}`, { title: selectedNode.title, goal: selectedNode.goal, milestones: selectedNode.milestones, resources: selectedNode.resources }, { headers });
      const updated = nodesRef.current.map((n, i) => n._id === selectedNode._id ? makeNode3D(res.data, i, nodesRef.current.length) : n);
      nodesRef.current = updated; setNodes([...updated]); setShowPanel(false);
      if (controlsRef.current && !insideRef.current) controlsRef.current.autoRotate = true;
    } catch (err) { console.error(err); }
  };

  const deleteNode = async () => {
    try {
      await axios.delete(`${API}/nodes/${selectedNode._id}`, { headers });
      const updated = nodesRef.current.filter(n => n._id !== selectedNode._id);
      nodesRef.current = updated; setNodes(updated); setShowPanel(false); setSelectedNode(null);
    } catch (err) { console.error(err); }
  };

  const handlePlayPause = () => {
  const audio = audioSystem.current;
  // Resume AudioContext if suspended — required on mobile
  if (audio.ctx && audio.ctx.state === 'suspended') {
    audio.ctx.resume().then(() => {
      const nowPlaying = audio.toggle();
      setMusicPlaying(nowPlaying);
    });
    return;
  }
  if (!audio.ctx) { audio.play(TRACKS[currentTrack].type); setMusicPlaying(true); }
  else { const nowPlaying = audio.toggle(); setMusicPlaying(nowPlaying); }
};

  const switchTrack = (i) => { audioSystem.current.play(TRACKS[i].type); setCurrentTrack(i); setMusicPlaying(true); };
  const handleVolume = (v) => { setVolume(v); audioSystem.current.setVolume(v); };

  const sendJarvis = async () => {
    if (!jarvisMsg.trim()) return;
    setJarvisChat(prev => [...prev, { role: 'user', text: jarvisMsg }]);
    setJarvisMsg('');
    try {
      const res = await axios.post(`${API}/jarvis/chat`, { message: jarvisMsg }, { headers });
      setJarvisChat(prev => [...prev, { role: 'jarvis', text: res.data.reply }]);
    } catch { setJarvisChat(prev => [...prev, { role: 'jarvis', text: 'Systems temporarily offline.' }]); }
  };

  const totalProgress = nodes.length > 0 ? Math.round(nodes.reduce((a, n) => a + (n.progress || 0), 0) / nodes.length) : 0;
  const activeNodes = nodes.filter(n => n.glowLevel > 60).length;
  const completedNodes = nodes.filter(n => n.progress === 100).length;
  const nodeColor = (node) => { if (!node?.color) return 'rgb(200,168,64)'; const { r, g, b } = hexToRgb(node.color); return `rgb(${r},${g},${b})`; };
  const progressColor = (p) => p === 100 ? '#00ff88' : p >= 60 ? '#f0c040' : p >= 30 ? '#c8a040' : '#8a6020';
  const activeMilestone = selectedNode?.milestones?.[activeMilestoneIdx];
  const totalTasks = selectedNode?.milestones?.reduce((a, m) => a + (m.tasks?.length || 0), 0) || 0;
  const doneTasks = selectedNode?.milestones?.reduce((a, m) => a + (m.tasks?.filter(t => t.done).length || 0), 0) || 0;
  const overdueTasks = selectedNode?.milestones?.reduce((a, m) => a + (m.tasks?.filter(t => !t.done && t.deadline && new Date(t.deadline) < new Date()).length || 0), 0) || 0;

  return (
    <div style={s.container}>
      <div ref={mountRef} style={s.mount} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} />

      {!brainLoaded && (
        <div style={s.loadingOverlay}>
          <p style={s.loadingTitle}>JARVIS—I</p>
          <p style={s.loadingText}>INITIALIZING NEURAL UNIVERSE</p>
          <div style={s.loadingBar}><div style={{ ...s.loadingFill, width: '70%' }} /></div>
        </div>
      )}

      {/* ── DESKTOP TOP BAR ── */}
      {!mobile && (
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <span style={s.logo}>JARVIS—I</span>
            <span style={s.userName}>{user?.name}</span>
          </div>
          <div style={s.musicBar}>
            <span style={s.musicLabel}>♪ {TRACKS[currentTrack].name}</span>
            <div style={s.musicBtns}>
              {TRACKS.map((t, i) => (
                <button key={i} style={{ ...s.trackBtn, ...(i === currentTrack ? s.trackActive : {}) }}
                  onClick={() => switchTrack(i)} title={t.name}>{i + 1}</button>
              ))}
              <button style={s.playBtn} onClick={handlePlayPause}>{musicPlaying ? '⏸' : '▶'}</button>
              <input type="range" min="0" max="1" step="0.05" value={volume}
                onChange={e => handleVolume(Number(e.target.value))}
                style={{ width: '50px', accentColor: '#c8a840' }} />
            </div>
          </div>
          <div style={s.topActions}>
            {!isInsideBrain
              ? <button style={s.enterBtn} onClick={enterBrain} disabled={isTransitioning}>⬤ ENTER BRAIN</button>
              : <button style={s.exitBrainBtn} onClick={exitBrain} disabled={isTransitioning}>◯ EXIT BRAIN</button>}
            <button style={s.iconBtn} onClick={() => { setShowSummary(!showSummary); setShowPanel(false); setJarvisOpen(false); }}>◎ PROGRESS</button>
            <button style={s.iconBtn} onClick={() => { setJarvisOpen(!jarvisOpen); setShowSummary(false); setShowPanel(false); }}>◈ JARVIS</button>
            <button style={s.iconBtn} onClick={() => { logout(); navigate('/login'); }}>EXIT</button>
          </div>
        </div>
      )}

      {/* ── MOBILE TOP BAR ── */}
      {mobile && (
        <div style={s.mobileTopBar}>
          <span style={s.mobileLogo}>JARVIS—I</span>
          <button style={s.mobileMenuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? '✕' : '⋮'}
          </button>
        </div>
      )}

      {/* ── MOBILE DROPDOWN MENU ── */}
      {mobile && mobileMenuOpen && (
        <div style={s.mobileDropdown}>
          <div style={s.mobileDropdownHeader}>
            <span style={s.mobileDropdownUser}>◈ {user?.name}</span>
          </div>

          {/* Enter / Exit Brain */}
          {!isInsideBrain
            ? <button style={s.mobileDropdownBtn} onClick={enterBrain} disabled={isTransitioning}>
                ⬤ ENTER BRAIN
              </button>
            : <button style={{ ...s.mobileDropdownBtn, color: 'rgba(240,160,160,0.9)', borderColor: 'rgba(220,110,110,0.4)' }} onClick={exitBrain} disabled={isTransitioning}>
                ◯ EXIT BRAIN
              </button>
          }

          {/* Progress */}
          <button style={s.mobileDropdownBtn} onClick={() => {
            setShowSummary(!showSummary); setShowPanel(false);
            setJarvisOpen(false); setMobileMenuOpen(false);
          }}>◎ PROGRESS</button>

          {/* JARVIS */}
          <button style={s.mobileDropdownBtn} onClick={() => {
            setJarvisOpen(!jarvisOpen); setShowSummary(false);
            setShowPanel(false); setMobileMenuOpen(false);
          }}>◈ JARVIS</button>

          {/* Music */}
          <button style={s.mobileDropdownBtn} onClick={() => setMobileMusicOpen(!mobileMusicOpen)}>
            ♪ MUSIC {mobileMusicOpen ? '▲' : '▼'}
          </button>

          {mobileMusicOpen && (
            <div style={s.mobileMusicPanel}>
              <p style={s.mobileMusicTrack}>Now: {TRACKS[currentTrack].name}</p>
              <div style={s.mobileMusicBtns}>
                {TRACKS.map((t, i) => (
                  <button key={i} style={{ ...s.mobileMusicTrackBtn, ...(i === currentTrack ? s.mobileMusicTrackActive : {}) }}
                    onClick={() => { switchTrack(i); }}>
                    {t.name}
                  </button>
                ))}
              </div>
              <div style={s.mobileMusicControls}>
                <button style={s.mobilePlayBtn} onClick={handlePlayPause}>
                  {musicPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={volume}
                  onChange={e => handleVolume(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#c8a840' }} />
              </div>
            </div>
          )}

          {/* Exit */}
          <button style={{ ...s.mobileDropdownBtn, color: 'rgba(220,100,100,0.7)', borderColor: 'rgba(200,70,70,0.3)', marginTop: '8px' }}
            onClick={() => { logout(); navigate('/login'); }}>
            ✕ EXIT
          </button>
        </div>
      )}

      <div style={{ ...s.hint, top: mobile ? '58px' : '60px' }}>
        {isInsideBrain ? 'INSIDE YOUR MIND · TAP NODES TO OPEN'
          : isTransitioning ? 'ENTERING NEURAL SPACE...'
          : mobile ? 'DOUBLE-TAP TO ENTER · TAP NODE TO OPEN'
          : 'DOUBLE-CLICK TO ENTER · DRAG TO ROTATE · CLICK NODE TO OPEN'}
      </div>

      {isInsideBrain && (
        <div style={s.insideIndicator}>
          <div style={s.insidePulse} />
          <span style={s.insideText}>INSIDE MINDSPACE</span>
        </div>
      )}

      <div style={s.nodeCount}>
        {nodes.length} NODES · {activeNodes} ACTIVE · {totalProgress}% MASTERY
      </div>

      {showCreateMenu && (
        <div style={{ ...s.createMenu, left: createPos.x, top: createPos.y }}>
          <p style={s.createLabel}>NEURAL POINT</p>
          <button style={s.createBtn} onClick={createNodeAt}>✦ Spawn Node Here</button>
          <button style={s.cancelSmBtn} onClick={() => setShowCreateMenu(false)}>✕ Cancel</button>
        </div>
      )}

      {/* ── NODE PANEL ── */}
      {showPanel && selectedNode && (
        <div style={{ ...s.panel, ...(mobile ? s.mobilePanel : {}) }}>
          <div style={s.panelHeader}>
            <div style={{ flex: 1 }}>
              <p style={s.panelEyebrow}>NODE INTERFACE</p>
              <input style={s.nodeTitleInput} value={selectedNode.title}
                onChange={e => setSelectedNode({ ...selectedNode, title: e.target.value })}
                placeholder="Node name..." />
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ ...s.glowBadge, color: selectedNode.glowLevel > 60 ? '#00ff88' : selectedNode.glowLevel > 30 ? '#f0c040' : '#ff4444' }}>
                {selectedNode.glowLevel > 60 ? '● ACTIVE' : selectedNode.glowLevel > 30 ? '◑ FADING' : '○ DORMANT'}
              </span>
              {overdueTasks > 0 && <p style={s.overdueAlert}>⚠ {overdueTasks} OVERDUE</p>}
              <button style={s.panelCloseBtn} onClick={() => setShowPanel(false)}>✕</button>
            </div>
          </div>

          <div style={s.progressSection}>
            <div style={s.progressHeader}>
              <span style={s.fieldLabel}>MASTERY PROGRESS</span>
              <span style={{ ...s.progressPct, color: progressColor(selectedNode.progress) }}>{selectedNode.progress}%</span>
            </div>
            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${selectedNode.progress}%`, background: progressColor(selectedNode.progress) }} />
            </div>
            <div style={s.progressStats}>
              <span style={s.statChip}>{doneTasks}/{totalTasks} tasks done</span>
              {selectedNode.timeSpent > 0 && <span style={s.statChip}>{selectedNode.timeSpent} mins spent</span>}
              {selectedNode.milestones?.length > 0 && <span style={s.statChip}>{selectedNode.milestones.length} milestones</span>}
              {selectedNode.progress === 100 && <span style={{ ...s.statChip, color: '#00ff88', borderColor: '#00ff88' }}>✓ MASTERED</span>}
            </div>
          </div>

          <div style={s.goalSection}>
            <label style={s.fieldLabel}>GOAL</label>
            <p style={s.goalHint}>Be specific — instead of "learn guitar" write "play 3 songs by ear in 2 months"</p>
            <textarea style={s.goalInput} value={selectedNode.goal}
              placeholder="What exactly do you want to achieve? Be specific so JARVIS can help..."
              onChange={e => setSelectedNode({ ...selectedNode, goal: e.target.value })} />
          </div>

          <button style={s.suggestBtn} onClick={suggestWithJarvis} disabled={isSuggesting}>
            {isSuggesting ? '◈ JARVIS is building your plan...' : '◈ Ask JARVIS to generate milestones & tasks'}
          </button>

          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(activeTab === 'milestones' ? s.tabActive : {}) }} onClick={() => setActiveTab('milestones')}>
              MILESTONES{selectedNode.milestones?.length > 0 ? ` (${selectedNode.milestones.length})` : ''}
            </button>
            <button style={{ ...s.tab, ...(activeTab === 'resources' ? s.tabActive : {}) }} onClick={() => setActiveTab('resources')}>
              RESOURCES{selectedNode.resources?.length > 0 ? ` (${selectedNode.resources.length})` : ''}
            </button>
          </div>

          {activeTab === 'milestones' && (
            <div style={s.tabContent}>
              <div style={s.milestonesHeader}>
                <button style={s.addMilestoneBtn} onClick={() => setShowAddMilestone(!showAddMilestone)}>
                  {showAddMilestone ? '✕ Cancel' : '+ Add Milestone'}
                </button>
              </div>
              {showAddMilestone && (
                <div style={s.addForm}>
                  <input style={s.addInput} value={newMilestoneTitle} placeholder="e.g. Foundation, Practice, Mastery..."
                    onChange={e => setNewMilestoneTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addMilestone()} autoFocus />
                  <button style={s.addBtn} onClick={addMilestone}>ADD</button>
                </div>
              )}
              {selectedNode.milestones?.length === 0 ? (
                <div style={s.emptyState}>
                  <p style={s.emptyText}>No milestones yet.</p>
                  <p style={s.emptySubtext}>Write your goal above and ask JARVIS to generate a plan, or add milestones manually.</p>
                </div>
              ) : (
                <>
                  <div style={s.milestoneTabs}>
                    {selectedNode.milestones.map((m, i) => {
                      const mDone = m.tasks?.filter(t => t.done).length || 0;
                      const mTotal = m.tasks?.length || 0;
                      const mPct = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;
                      return (
                        <button key={i} style={{ ...s.milestoneTab, ...(i === activeMilestoneIdx ? s.milestoneTabActive : {}) }}
                          onClick={() => setActiveMilestoneIdx(i)}>
                          <span style={s.milestoneTabTitle}>{m.title}</span>
                          <span style={s.milestoneTabPct}>{mPct}%</span>
                        </button>
                      );
                    })}
                  </div>
                  {activeMilestone && (
                    <div style={s.milestoneBox}>
                      <div style={s.milestoneBoxHeader}>
                        <span style={s.milestoneBoxTitle}>{activeMilestone.title}</span>
                        <button style={s.deleteMilestoneBtn} onClick={() => deleteMilestone(activeMilestoneIdx)}>✕</button>
                      </div>
                      <div style={s.taskList}>
                        {(activeMilestone.tasks || []).length === 0 && <p style={s.noTasksText}>No tasks yet — add below or ask JARVIS.</p>}
                        {(activeMilestone.tasks || []).map((task, ti) => {
                          const isOverdue = !task.done && task.deadline && new Date(task.deadline) < new Date();
                          return (
                            <div key={ti} style={{ ...s.taskRow, ...(isOverdue ? s.taskRowOverdue : {}), ...(task.done ? s.taskRowDone : {}) }}>
                              <div style={{ ...s.taskCheck, ...(task.done ? s.taskCheckDone : {}) }} onClick={() => toggleTask(activeMilestoneIdx, ti)}>
                                {task.done ? '✓' : ''}
                              </div>
                              <div style={s.taskContent}>
                                <span style={{ ...s.taskText, textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.45 : 1 }}>
                                  {task.shouldDoFirst && !task.done && <span style={s.firstTag}>PREREQUISITE · </span>}
                                  {task.text}
                                </span>
                                <div style={s.taskMeta}>
                                  <span style={{ color: DIFF_COLORS[task.difficulty], fontSize: '9px', letterSpacing: '1px', fontFamily: 'Courier New, monospace' }}>
                                    {task.difficulty?.toUpperCase()} · {DIFF_WEIGHTS[task.difficulty]}pt
                                  </span>
                                  {task.deadline && (
                                    <span style={{ color: isOverdue ? '#ff5555' : 'rgba(200,168,64,0.55)', fontSize: '9px', marginLeft: '6px', fontFamily: 'Courier New, monospace' }}>
                                      {isOverdue ? '⚠ OVERDUE · ' : '⏰ '}{new Date(task.deadline).toLocaleDateString()}
                                    </span>
                                  )}
                                  {task.done && task.completedAt && (
                                    <span style={{ color: '#00ff88', fontSize: '9px', marginLeft: '6px', fontFamily: 'Courier New, monospace' }}>
                                      ✓ {new Date(task.completedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button style={s.taskDelete} onClick={() => deleteTask(activeMilestoneIdx, ti)}>✕</button>
                            </div>
                          );
                        })}
                      </div>
                      {showAddTask ? (
                        <div style={s.addTaskForm}>
                          <input style={s.addInput} value={newTaskText} placeholder="Describe this task clearly..."
                            onChange={e => setNewTaskText(e.target.value)} autoFocus />
                          <div style={s.taskFormRow}>
                            <select style={s.diffSelect} value={newTaskDifficulty} onChange={e => setNewTaskDifficulty(e.target.value)}>
                              <option value="easy">Easy (1pt)</option>
                              <option value="medium">Medium (2pts)</option>
                              <option value="hard">Hard (3pts)</option>
                            </select>
                            <input type="date" style={s.dateInput} value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)} />
                          </div>
                          <div style={s.addFormBtns}>
                            <button style={s.addBtn} onClick={addTask}>ADD TASK</button>
                            <button style={s.cancelSmBtn} onClick={() => setShowAddTask(false)}>CANCEL</button>
                          </div>
                        </div>
                      ) : (
                        <button style={s.addTaskBtn} onClick={() => setShowAddTask(true)}>+ Add Task</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div style={s.tabContent}>
              <p style={s.resourcesHint}>Add books, links, videos, notes — anything that helps you reach this goal.</p>
              <div style={s.resourceList}>
                {(selectedNode.resources || []).length === 0 && <p style={s.noTasksText}>No resources yet.</p>}
                {(selectedNode.resources || []).map((r, i) => (
                  <div key={i} style={s.resourceRow}>
                    <span style={s.resourceIcon}>{r.startsWith('http') ? '🔗' : r.match(/\.(pdf|doc|txt)/i) ? '📄' : '📌'}</span>
                    <span style={s.resourceText}>{r}</span>
                    <button style={s.taskDelete} onClick={() => deleteResource(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div style={s.addForm}>
                <input style={s.addInput} value={newResource} placeholder="Paste link or describe resource..."
                  onChange={e => setNewResource(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addResource()} />
                <button style={s.addBtn} onClick={addResource}>ADD</button>
              </div>
            </div>
          )}

          <label style={{ ...s.fieldLabel, marginTop: '14px' }}>NODE VITALITY</label>
          <div style={s.vitalityBar}>
            <div style={{ ...s.vitalityFill, width: `${selectedNode.glowLevel}%`, background: selectedNode.glowLevel > 60 ? '#c8a840' : selectedNode.glowLevel > 30 ? '#7a5a20' : '#ff4444' }} />
          </div>
          <div style={s.panelBtns}>
            <button style={s.saveBtn} onClick={saveNode}>SAVE NODE</button>
            <button style={s.deleteBtn} onClick={deleteNode}>RELEASE</button>
          </div>
        </div>
      )}

      {/* PROGRESS SUMMARY */}
      {showSummary && (
        <div style={{ ...s.summary, ...(mobile ? s.mobileSummary : {}) }}>
          <p style={s.summaryTitle}>◎ MINDSPACE OVERVIEW</p>
          <div style={s.summaryGrid}>
            <div style={s.summaryCard}><span style={s.summaryNum}>{nodes.length}</span><span style={s.summaryLabel}>NODES</span></div>
            <div style={s.summaryCard}><span style={s.summaryNum}>{activeNodes}</span><span style={s.summaryLabel}>ACTIVE</span></div>
            <div style={s.summaryCard}><span style={s.summaryNum}>{totalProgress}%</span><span style={s.summaryLabel}>MASTERY</span></div>
            <div style={s.summaryCard}><span style={s.summaryNum}>{completedNodes}</span><span style={s.summaryLabel}>MASTERED</span></div>
          </div>
          <div style={s.nodeList}>
            {nodes.map((n, i) => {
              const nTotal = n.milestones?.reduce((a, m) => a + (m.tasks?.length || 0), 0) || 0;
              const nDone = n.milestones?.reduce((a, m) => a + (m.tasks?.filter(t => t.done).length || 0), 0) || 0;
              return (
                <div key={n._id || i} style={s.nodeRow}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: nodeColor(n), boxShadow: `0 0 6px ${nodeColor(n)}` }} />
                  <span style={s.nodeRowTitle}>{n.title}</span>
                  <div style={s.nodeRowTrack}><div style={{ height: '100%', borderRadius: '2px', width: `${n.progress}%`, background: nodeColor(n) }} /></div>
                  <span style={s.nodeRowPct}>{n.progress}%</span>
                  <span style={s.nodeRowTasks}>{nDone}/{nTotal}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: n.glowLevel > 60 ? '#c8a840' : n.glowLevel > 30 ? '#8a6020' : '#ff4444', opacity: Math.max(0.3, n.glowLevel / 100) }} />
                </div>
              );
            })}
          </div>
          {mobile && <button style={{ ...s.cancelSmBtn, marginTop: '16px', width: '100%' }} onClick={() => setShowSummary(false)}>✕ Close</button>}
        </div>
      )}

      {/* JARVIS */}
      {jarvisOpen && (
        <div style={{ ...s.jarvis, ...(mobile ? s.mobileJarvis : {}) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
            <p style={{ ...s.jarvisTitle, marginBottom: 0 }}>◈ JARVIS INTERFACE</p>
            {mobile && <button style={s.panelCloseBtn} onClick={() => setJarvisOpen(false)}>✕</button>}
          </div>
          <div style={s.chatArea}>
            {jarvisChat.map((msg, i) => (
              <div key={i} style={msg.role === 'jarvis' ? s.jarvisMsg : s.userMsg}>
                <span style={msg.role === 'jarvis' ? s.jarvisName : s.userMsgName}>
                  {msg.role === 'jarvis' ? '◈ JARVIS' : '▸ YOU'}
                </span>
                <p style={s.msgText}>{msg.text}</p>
              </div>
            ))}
          </div>
          <div style={s.jarvisInput}>
            <input style={s.chatInput} value={jarvisMsg}
              onChange={e => setJarvisMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendJarvis()}
              placeholder="Speak to JARVIS..." />
            <button style={s.sendBtn} onClick={sendJarvis}>▸</button>
          </div>
        </div>
      )}
    </div>
  );
}

const gold = 'rgba(200,168,64,';
const s = {
  container: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#03050e' },
  mount: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'grab' },
  loadingOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: '#03050e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' },
  loadingTitle: { color: '#c8a840', fontSize: '32px', letterSpacing: '12px', fontFamily: 'Georgia, serif', textShadow: '0 0 30px rgba(200,168,64,0.6)' },
  loadingText: { color: `${gold}0.5)`, fontSize: '10px', letterSpacing: '5px', fontFamily: 'Courier New, monospace' },
  loadingBar: { width: '300px', height: '2px', background: `${gold}0.12)`, borderRadius: '2px' },
  loadingFill: { height: '100%', background: '#c8a840', borderRadius: '2px', boxShadow: '0 0 10px rgba(200,168,64,0.6)' },

  // ── DESKTOP TOP BAR ──
  topBar: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', background: 'rgba(3,5,14,0.93)', borderBottom: `1px solid ${gold}0.15)`, backdropFilter: 'blur(12px)', gap: '16px' },
  topLeft: { display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 },
  logo: { color: '#c8a840', fontSize: '14px', letterSpacing: '7px', fontFamily: 'Georgia, serif', textShadow: '0 0 20px rgba(200,168,64,0.5)' },
  userName: { color: `${gold}0.45)`, fontSize: '11px', letterSpacing: '2px' },
  musicBar: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'center' },
  musicLabel: { color: `${gold}0.65)`, fontSize: '10px', letterSpacing: '2px', whiteSpace: 'nowrap' },
  musicBtns: { display: 'flex', gap: '5px', alignItems: 'center' },
  trackBtn: { background: 'transparent', border: `1px solid ${gold}0.22)`, color: `${gold}0.5)`, width: '24px', height: '24px', fontSize: '10px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace' },
  trackActive: { borderColor: '#c8a840', color: '#c8a840', background: `${gold}0.12)` },
  playBtn: { background: `${gold}0.18)`, border: `1px solid #c8a840`, color: '#c8a840', width: '30px', height: '30px', fontSize: '13px', cursor: 'pointer', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${gold}0.3)` },
  topActions: { display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' },
  enterBtn: { background: `${gold}0.18)`, border: `1px solid #c8a840`, color: '#c8a840', padding: '6px 16px', fontSize: '11px', letterSpacing: '2px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace', boxShadow: `0 0 14px ${gold}0.35)` },
  exitBrainBtn: { background: 'rgba(200,80,80,0.15)', border: '1px solid rgba(220,110,110,0.6)', color: 'rgba(240,160,160,0.9)', padding: '6px 16px', fontSize: '11px', letterSpacing: '2px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace' },
  iconBtn: { background: 'transparent', border: `1px solid ${gold}0.28)`, color: '#d4b060', padding: '6px 13px', fontSize: '10px', letterSpacing: '2px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace' },

  // ── MOBILE TOP BAR ──
  mobileTopBar: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'rgba(3,5,14,0.95)', borderBottom: `1px solid ${gold}0.15)`, backdropFilter: 'blur(12px)' },
  mobileLogo: { color: '#c8a840', fontSize: '16px', letterSpacing: '6px', fontFamily: 'Georgia, serif', textShadow: '0 0 20px rgba(200,168,64,0.5)' },
  mobileMenuBtn: { background: 'transparent', border: `1px solid ${gold}0.3)`, color: '#c8a840', width: '38px', height: '38px', fontSize: '20px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // ── MOBILE DROPDOWN ──
  mobileDropdown: { position: 'fixed', top: '58px', right: 0, left: 0, zIndex: 19, background: 'rgba(3,5,14,0.98)', borderBottom: `1px solid ${gold}0.2)`, backdropFilter: 'blur(20px)', padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  mobileDropdownHeader: { paddingBottom: '10px', borderBottom: `1px solid ${gold}0.12)`, marginBottom: '4px' },
  mobileDropdownUser: { color: `${gold}0.55)`, fontSize: '11px', letterSpacing: '3px', fontFamily: 'Courier New, monospace' },
  mobileDropdownBtn: { background: 'transparent', border: `1px solid ${gold}0.22)`, color: '#d4b060', padding: '12px 16px', fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', borderRadius: '3px', fontFamily: 'Courier New, monospace', textAlign: 'left' },
  mobileMusicPanel: { background: `${gold}0.06)`, border: `1px solid ${gold}0.15)`, borderRadius: '3px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileMusicTrack: { color: `${gold}0.65)`, fontSize: '10px', letterSpacing: '2px', fontFamily: 'Courier New, monospace', marginBottom: '4px' },
  mobileMusicBtns: { display: 'flex', flexDirection: 'column', gap: '6px' },
  mobileMusicTrackBtn: { background: 'transparent', border: `1px solid ${gold}0.18)`, color: `${gold}0.55)`, padding: '8px 12px', fontSize: '11px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace', textAlign: 'left' },
  mobileMusicTrackActive: { borderColor: '#c8a840', color: '#ffd060', background: `${gold}0.1)` },
  mobileMusicControls: { display: 'flex', gap: '10px', alignItems: 'center' },
  mobilePlayBtn: { background: `${gold}0.15)`, border: `1px solid #c8a840`, color: '#c8a840', padding: '8px 16px', fontSize: '11px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace', whiteSpace: 'nowrap' },

  hint: { position: 'fixed', left: '50%', transform: 'translateX(-50%)', color: `${gold}0.25)`, fontSize: '9px', letterSpacing: '3px', zIndex: 5, whiteSpace: 'nowrap' },
  insideIndicator: { position: 'fixed', bottom: '20px', right: '20px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' },
  insidePulse: { width: '8px', height: '8px', borderRadius: '50%', background: '#c8a840', boxShadow: '0 0 12px rgba(200,168,64,0.8)' },
  insideText: { color: `${gold}0.6)`, fontSize: '9px', letterSpacing: '3px', fontFamily: 'Courier New, monospace' },
  nodeCount: { position: 'fixed', bottom: '20px', left: '24px', zIndex: 10, color: `${gold}0.35)`, fontSize: '10px', letterSpacing: '3px' },

  createMenu: { position: 'fixed', zIndex: 20, transform: 'translate(-50%,-50%)', background: 'rgba(3,5,14,0.97)', border: `1px solid ${gold}0.35)`, borderRadius: '4px', padding: '16px', minWidth: '180px', backdropFilter: 'blur(20px)' },
  createLabel: { color: `${gold}0.6)`, fontSize: '10px', letterSpacing: '4px', marginBottom: '12px', textAlign: 'center' },
  createBtn: { width: '100%', padding: '10px', marginBottom: '8px', background: `${gold}0.1)`, border: `1px solid ${gold}0.45)`, color: '#d4b060', fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace' },
  cancelSmBtn: { background: 'transparent', border: `1px solid ${gold}0.18)`, color: `${gold}0.45)`, fontSize: '10px', cursor: 'pointer', borderRadius: '2px', padding: '6px 10px', fontFamily: 'Courier New, monospace' },

  // ── PANEL ──
  panel: { position: 'fixed', right: '20px', top: '58px', zIndex: 10, width: '325px', maxHeight: 'calc(100vh - 70px)', overflowY: 'auto', background: 'rgba(4,6,18,0.97)', border: `1px solid ${gold}0.25)`, borderRadius: '4px', padding: '20px', backdropFilter: 'blur(20px)' },
  mobilePanel: { right: 0, left: 0, top: '58px', width: '100%', maxHeight: 'calc(100vh - 58px)', borderRadius: 0, border: 'none', borderTop: `1px solid ${gold}0.25)` },
  panelCloseBtn: { background: 'transparent', border: 'none', color: `${gold}0.5)`, fontSize: '16px', cursor: 'pointer', padding: '4px 8px' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '8px' },
  panelEyebrow: { color: `${gold}0.6)`, fontSize: '9px', letterSpacing: '4px', marginBottom: '5px' },
  nodeTitleInput: { background: 'transparent', border: 'none', borderBottom: `1px solid ${gold}0.3)`, color: '#ffd060', fontSize: '17px', letterSpacing: '3px', fontFamily: 'Georgia, serif', outline: 'none', width: '165px', padding: '2px 0' },
  glowBadge: { fontSize: '10px', letterSpacing: '2px', fontFamily: 'Courier New, monospace', display: 'block', fontWeight: 'bold' },
  overdueAlert: { color: '#ff5555', fontSize: '9px', letterSpacing: '2px', marginTop: '4px', fontWeight: 'bold' },
  progressSection: { background: `${gold}0.06)`, border: `1px solid ${gold}0.18)`, borderRadius: '4px', padding: '13px', marginBottom: '14px' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  progressBar: { height: '7px', background: `${gold}0.1)`, borderRadius: '3px' },
  progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s, background 0.5s' },
  progressPct: { fontSize: '22px', fontFamily: 'Georgia, serif', fontWeight: 'bold' },
  progressStats: { display: 'flex', gap: '6px', marginTop: '9px', flexWrap: 'wrap' },
  statChip: { border: `1px solid ${gold}0.28)`, color: `${gold}0.7)`, fontSize: '9px', letterSpacing: '1px', padding: '3px 7px', borderRadius: '2px', fontFamily: 'Courier New, monospace' },
  fieldLabel: { color: `${gold}0.7)`, fontSize: '9px', letterSpacing: '3px', display: 'block', marginBottom: '5px' },
  goalSection: { marginBottom: '10px' },
  goalHint: { color: `${gold}0.45)`, fontSize: '10px', marginBottom: '7px', fontStyle: 'italic', lineHeight: '1.5' },
  goalInput: { width: '100%', padding: '9px', background: `${gold}0.06)`, border: `1px solid ${gold}0.22)`, color: '#ecd080', fontSize: '12px', borderRadius: '3px', outline: 'none', fontFamily: 'Courier New, monospace', minHeight: '60px', resize: 'vertical', lineHeight: '1.5' },
  suggestBtn: { width: '100%', padding: '10px', background: 'rgba(120,90,240,0.12)', border: '1px solid rgba(170,140,255,0.35)', color: 'rgba(210,185,255,0.9)', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', borderRadius: '3px', fontFamily: 'Courier New, monospace', marginBottom: '14px' },
  tabs: { display: 'flex', borderBottom: `1px solid ${gold}0.15)` },
  tab: { flex: 1, padding: '8px', background: 'transparent', border: 'none', color: `${gold}0.45)`, fontSize: '10px', letterSpacing: '2px', cursor: 'pointer', fontFamily: 'Courier New, monospace', borderBottom: '2px solid transparent' },
  tabActive: { color: '#ffd060', borderBottom: '2px solid #c8a840' },
  tabContent: { paddingTop: '14px' },
  milestonesHeader: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' },
  addMilestoneBtn: { background: 'transparent', border: `1px solid ${gold}0.3)`, color: '#d4b060', fontSize: '10px', letterSpacing: '1px', padding: '6px 12px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace' },
  addForm: { display: 'flex', gap: '6px', marginBottom: '12px' },
  addInput: { flex: 1, padding: '8px 11px', background: `${gold}0.06)`, border: `1px solid ${gold}0.22)`, color: '#ecd080', fontSize: '12px', borderRadius: '2px', outline: 'none', fontFamily: 'Courier New, monospace' },
  addBtn: { padding: '8px 13px', background: `${gold}0.14)`, border: `1px solid ${gold}0.4)`, color: '#ffd060', cursor: 'pointer', borderRadius: '2px', fontSize: '11px', fontFamily: 'Courier New, monospace', whiteSpace: 'nowrap' },
  emptyState: { textAlign: 'center', padding: '24px 10px' },
  emptyText: { color: `${gold}0.7)`, fontSize: '13px', marginBottom: '8px' },
  emptySubtext: { color: `${gold}0.45)`, fontSize: '11px', lineHeight: '1.6' },
  milestoneTabs: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' },
  milestoneTab: { background: 'transparent', border: `1px solid ${gold}0.2)`, color: `${gold}0.55)`, fontSize: '10px', padding: '5px 9px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace', display: 'flex', gap: '6px', alignItems: 'center' },
  milestoneTabActive: { borderColor: '#c8a840', color: '#ffd060', background: `${gold}0.1)` },
  milestoneTabTitle: { maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  milestoneTabPct: { fontSize: '9px', opacity: 0.75, flexShrink: 0 },
  milestoneBox: { background: `${gold}0.05)`, border: `1px solid ${gold}0.15)`, borderRadius: '3px', padding: '12px' },
  milestoneBoxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  milestoneBoxTitle: { color: '#ffd060', fontSize: '12px', letterSpacing: '2px', fontFamily: 'Courier New, monospace' },
  deleteMilestoneBtn: { background: 'transparent', border: 'none', color: 'rgba(255,100,100,0.5)', cursor: 'pointer', fontSize: '13px' },
  taskList: { marginBottom: '8px', maxHeight: '220px', overflowY: 'auto' },
  noTasksText: { color: `${gold}0.45)`, fontSize: '11px', textAlign: 'center', padding: '12px', fontFamily: 'Courier New, monospace' },
  taskRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '7px', padding: '8px', background: `${gold}0.05)`, borderRadius: '3px', border: `1px solid ${gold}0.1)` },
  taskRowOverdue: { borderColor: 'rgba(255,80,80,0.35)', background: 'rgba(255,60,60,0.06)' },
  taskRowDone: { opacity: 0.55 },
  taskCheck: { width: '17px', height: '17px', border: `1px solid ${gold}0.4)`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#00ff88', flexShrink: 0, cursor: 'pointer', marginTop: '1px' },
  taskCheckDone: { background: 'rgba(0,255,136,0.15)', borderColor: '#00ff88' },
  taskContent: { flex: 1, minWidth: 0 },
  taskText: { color: '#ecd080', fontSize: '12px', fontFamily: 'Courier New, monospace', lineHeight: '1.5', display: 'block', wordBreak: 'break-word' },
  firstTag: { color: 'rgba(190,160,255,0.8)', fontSize: '9px' },
  taskMeta: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', alignItems: 'center' },
  taskDelete: { background: 'transparent', border: 'none', color: 'rgba(255,100,100,0.4)', cursor: 'pointer', fontSize: '11px', flexShrink: 0 },
  addTaskBtn: { width: '100%', padding: '8px', background: 'transparent', border: `1px dashed ${gold}0.22)`, color: `${gold}0.55)`, fontSize: '11px', cursor: 'pointer', borderRadius: '3px', fontFamily: 'Courier New, monospace', marginTop: '6px' },
  addTaskForm: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '7px' },
  taskFormRow: { display: 'flex', gap: '6px' },
  diffSelect: { flex: 1, padding: '7px', background: '#03050e', border: `1px solid ${gold}0.22)`, color: '#ecd080', fontSize: '11px', borderRadius: '2px', outline: 'none', fontFamily: 'Courier New, monospace' },
  dateInput: { flex: 1, padding: '7px', background: '#03050e', border: `1px solid ${gold}0.22)`, color: '#ecd080', fontSize: '11px', borderRadius: '2px', outline: 'none', fontFamily: 'Courier New, monospace', colorScheme: 'dark' },
  addFormBtns: { display: 'flex', gap: '6px' },
  resourcesHint: { color: `${gold}0.45)`, fontSize: '11px', marginBottom: '12px', lineHeight: '1.5', fontStyle: 'italic' },
  resourceList: { marginBottom: '12px', maxHeight: '180px', overflowY: 'auto' },
  resourceRow: { display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '7px', padding: '8px', background: `${gold}0.05)`, borderRadius: '3px', border: `1px solid ${gold}0.1)` },
  resourceIcon: { fontSize: '15px', flexShrink: 0 },
  resourceText: { flex: 1, color: '#ecd080', fontSize: '12px', fontFamily: 'Courier New, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  vitalityBar: { height: '4px', background: `${gold}0.1)`, borderRadius: '2px', marginTop: '5px', marginBottom: '16px' },
  vitalityFill: { height: '100%', borderRadius: '2px', transition: 'width 0.5s' },
  panelBtns: { display: 'flex', gap: '8px' },
  saveBtn: { flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${gold}0.5)`, color: '#ffd060', fontSize: '11px', letterSpacing: '3px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace' },
  deleteBtn: { flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(200,70,70,0.4)', color: 'rgba(220,100,100,0.7)', fontSize: '11px', letterSpacing: '3px', cursor: 'pointer', borderRadius: '2px', fontFamily: 'Courier New, monospace' },

  // ── SUMMARY ──
  summary: { position: 'fixed', right: '20px', top: '58px', zIndex: 10, width: '315px', maxHeight: 'calc(100vh - 70px)', overflowY: 'auto', background: 'rgba(4,6,18,0.97)', border: `1px solid ${gold}0.22)`, borderRadius: '4px', padding: '20px', backdropFilter: 'blur(20px)' },
  mobileSummary: { right: 0, left: 0, top: '58px', width: '100%', maxHeight: 'calc(100vh - 58px)', borderRadius: 0 },
  summaryTitle: { color: '#ffd060', fontSize: '11px', letterSpacing: '4px', marginBottom: '16px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' },
  summaryCard: { background: `${gold}0.07)`, border: `1px solid ${gold}0.15)`, borderRadius: '3px', padding: '14px', textAlign: 'center' },
  summaryNum: { color: '#ffd060', fontSize: '24px', display: 'block', fontFamily: 'Georgia, serif', textShadow: `0 0 14px ${gold}0.6)` },
  summaryLabel: { color: `${gold}0.55)`, fontSize: '9px', letterSpacing: '3px' },
  nodeList: { display: 'flex', flexDirection: 'column', gap: '11px' },
  nodeRow: { display: 'flex', alignItems: 'center', gap: '7px' },
  nodeRowTitle: { color: '#ecd080', fontSize: '11px', letterSpacing: '1px', width: '70px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  nodeRowTrack: { flex: 1, height: '3px', background: `${gold}0.1)`, borderRadius: '2px' },
  nodeRowPct: { color: `${gold}0.65)`, fontSize: '10px', width: '32px', textAlign: 'right', flexShrink: 0 },
  nodeRowTasks: { color: `${gold}0.4)`, fontSize: '9px', width: '28px', textAlign: 'right', flexShrink: 0 },

  // ── JARVIS ──
  jarvis: { position: 'fixed', left: '20px', top: '58px', zIndex: 10, width: '305px', height: 'calc(100vh - 70px)', background: 'rgba(4,6,18,0.97)', border: `1px solid ${gold}0.2)`, borderRadius: '4px', padding: '20px', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column' },
  mobileJarvis: { left: 0, right: 0, top: '58px', width: '100%', height: 'calc(100vh - 58px)', borderRadius: 0, border: 'none', borderTop: `1px solid ${gold}0.2)` },
  jarvisTitle: { color: '#ffd060', fontSize: '11px', letterSpacing: '4px', marginBottom: '16px', textShadow: `0 0 12px ${gold}0.6)`, flexShrink: 0 },
  chatArea: { flex: 1, overflowY: 'auto', marginBottom: '12px', paddingRight: '4px' },
  jarvisMsg: { marginBottom: '16px' },
  userMsg: { marginBottom: '16px', textAlign: 'right' },
  jarvisName: { color: '#ffd060', fontSize: '9px', letterSpacing: '3px', display: 'block', marginBottom: '5px' },
  userMsgName: { color: `${gold}0.45)`, fontSize: '9px', letterSpacing: '3px', display: 'block', marginBottom: '5px' },
  msgText: { color: '#ecd080', fontSize: '13px', lineHeight: '1.75', fontFamily: 'Georgia, serif' },
  jarvisInput: { display: 'flex', gap: '7px', flexShrink: 0 },
  chatInput: { flex: 1, padding: '10px 13px', background: `${gold}0.06)`, border: `1px solid ${gold}0.22)`, color: '#ecd080', fontSize: '12px', borderRadius: '2px', outline: 'none', fontFamily: 'Courier New, monospace' },
  sendBtn: { padding: '10px 14px', background: 'transparent', border: `1px solid ${gold}0.35)`, color: '#ffd060', cursor: 'pointer', borderRadius: '2px', fontSize: '14px' },
};