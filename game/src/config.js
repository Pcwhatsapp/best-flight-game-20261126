// Skycrest — Alpine Ring Run: the numbers the whole game shares.
// One world unit is about 10 metres. The valley runs north (+z); the runway
// lies along it at x in [-8, 8], z in [170, 530].
export const WORLD = {
  waterLevel: -1.0,
  runway: { x0: -12, x1: 12, z0: 170, z1: 530 },
  gridStep: 16,
  gridAhead: 340,
  gridBehind: 40,
  gridSide: 170,
  fogNear: 260,
  fogFar: 420,
};

export const PLANE = {
  minSpeed: 16,
  maxSpeed: 72,
  cruiseThrottle: 0.62,
  pitchRate: 0.95,
  rollRate: 1.7,
  maxPitch: 0.62,
  maxRoll: 1.15,
  levelRate: 0.9,
  stallSpeed: 24,
  rotateSpeed: 42,
  fuelDrain: 0.55,
  fuelStart: 100,
  startPos: { x: 0, y: 1.2, z: 300 },
  startHeading: 0,
};

export const COURSE = {
  ringCount: 8,
  ringRadius: 13,
  firstRingRadius: 13,
  ringScore: 100,
  landingBonus: 500,
};

export const VIEW = {
  width: 1280,
  height: 720,
  fovDeg: 70,
  chaseBack: 10,
  chaseUp: 3.4,
  cockpitForward: 2.2,
};

export const COLORS = {
  skyTop: '#1d5fb8',
  skyMid: '#6ea8dd',
  skyHorizon: '#cfe4f2',
  sunCore: '#fff3c4',
  sunGlow: 'rgba(255, 236, 170, 0.45)',
  mountainFar: '#8fa8c4',
  mountainNear: '#6d8299',
  water: '#2f7fc9',
  waterDeep: '#1f5f9e',
  runway: '#454b54',
  runwayLine: '#e8e8e8',
  ringNext: '#ffc93c',
  ringOther: '#37c8e8',
  hudPanel: 'rgba(8, 18, 30, 0.62)',
  hudText: '#dff3ff',
  hudAccent: '#ffc93c',
  hudWarn: '#ff5a3c',
  planeBody: '#e8ecf0',
  planeBelly: '#c3ccd4',
  planeStripe: '#e2483d',
  planeCanopy: '#7ec8e8',
};
