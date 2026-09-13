/* Code-native scientific sculptures. Three.js r180 compatible.
 * Geometry is illustrative; no physical or kinetic measurements are implied.
 * No renderer, DOM, textures, imports, randomness, or global animation state.
 * Use update(elapsedSeconds, hoverActivity) with activity in [0, 1].
 */

const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const safeTime = value => Number.isFinite(value) ? value : 0;
const fract = value => value - Math.floor(value);
const seed = index => fract(Math.sin(index * 127.1 + 311.7) * 43758.5453123);

function roundedPath(THREE, width, height, radius, ShapeType = THREE.Shape) {
  const path = new ShapeType();
  const x = -width / 2, y = -height / 2;
  const r = Math.max(0.001, Math.min(radius, width / 2 - 0.001, height / 2 - 0.001));
  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

function slab(THREE, width, height, depth, radius = 0.08, bevel = 0.018) {
  const b = Math.min(bevel, depth * 0.24, width * 0.12, height * 0.12);
  const shape = roundedPath(THREE, width - b * 2, height - b * 2, Math.max(0.002, radius - b));
  const coreDepth = depth - b * 2;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: coreDepth, bevelEnabled: b > 0,
    bevelThickness: b, bevelSize: b, bevelSegments: 3,
    curveSegments: 6, steps: 1,
  });
  geometry.translate(0, 0, -coreDepth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function frame(THREE, width, height, border, depth, radius = 0.14) {
  const outer = roundedPath(THREE, width, height, radius);
  outer.holes.push(roundedPath(THREE, width - border * 2, height - border * 2,
    Math.max(0.01, radius - border), THREE.Path));
  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth, bevelEnabled: false, curveSegments: 8, steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function glass(THREE, color = 0x77eaf3, opacity = 0.46) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0.05, roughness: 0.12,
    transmission: 0.48, thickness: 0.2, ior: 1.46,
    transparent: true, opacity, depthWrite: false,
    clearcoat: 1, clearcoatRoughness: 0.08,
    attenuationColor: new THREE.Color(color), attenuationDistance: 2.8,
    emissive: color, emissiveIntensity: 0.014,
    side: THREE.DoubleSide,
  });
}

function metal(THREE, color = 0x738ca8) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0.8, roughness: 0.24,
    clearcoat: 1, clearcoatRoughness: 0.12,
  });
}

function lightMaterial(THREE, color, intensity = 0.5) {
  return new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: intensity,
    metalness: 0.32, roughness: 0.22,
  });
}

function addMesh(THREE, group, geometry, material, name, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

/** Layering is along local Z; the 3 x 3 candidate grid faces +Z. */
export function createAIChip(THREE) {
  const group = new THREE.Group();
  group.name = 'AI material design — layered candidate chip';
  group.userData.researchStage = 'design';
  const silver = metal(THREE, 0x9b80c6);
  const darkMetal = metal(THREE, 0x42306d);
  const cyan = lightMaterial(THREE, 0xb49bff, 0.42);
  const magenta = lightMaterial(THREE, 0xc1ef66, 0.55);
  const violet = lightMaterial(THREE, 0xf494d4, 0.42);
  const glassCyan = glass(THREE, 0xb28af2, 0.32);
  const glassViolet = glass(THREE, 0x8255c9, 0.27);

  addMesh(THREE, group, slab(THREE, 2.38, 2.38, 0.15, 0.17), darkMetal,
    'Ceramic-metal carrier', [0, 0, -0.31]);
  addMesh(THREE, group, frame(THREE, 2.38, 2.38, 0.095, 0.06, 0.17), silver,
    'Machined carrier perimeter', [0, 0, -0.205]);
  const lowerWindow = addMesh(THREE, group, slab(THREE, 2.27, 2.27, 0.046, 0.14, 0.009),
    glassViolet, 'Lower transparent dielectric', [0, 0, -0.145]);
  lowerWindow.renderOrder = 1;

  const candidateGeometry = slab(THREE, 0.51, 0.51, 0.072, 0.075, 0.012);
  const tokens = [
    new THREE.OctahedronGeometry(0.12, 0),
    new THREE.TorusGeometry(0.103, 0.026, 10, 32),
    new THREE.IcosahedronGeometry(0.115, 1),
  ];
  const tokenMaterials = [cyan, violet, magenta];
  const candidates = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const i = row * 3 + col;
      const cell = new THREE.Group();
      cell.name = `Candidate ${i + 1}`;
      cell.position.set((col - 1) * 0.65, (1 - row) * 0.65, -0.012);
      const pane = addMesh(THREE, cell, candidateGeometry, i === 4 ? glassViolet : glassCyan,
        'Candidate glass seat');
      pane.renderOrder = 2;
      const token = addMesh(THREE, cell, tokens[(i + row) % 3], tokenMaterials[i % 3],
        'Material candidate core', [0, 0, 0.104]);
      token.rotation.set(0.28 + i * 0.17, i * 0.21, i * 0.23);
      group.add(cell);
      candidates.push({ cell, token, phase: i * 0.73 });
    }
  }

  const selection = addMesh(THREE, group, frame(THREE, 0.56, 0.56, 0.025, 0.024, 0.085),
    magenta, 'Selected candidate perimeter', [0, 0, 0.175]);
  const selectionRotor = addMesh(THREE, group,
    new THREE.TorusGeometry(0.18, 0.008, 8, 48, Math.PI * 1.52),
    cyan, 'Candidate evaluation arc', [0, 0, 0.26]);

  const upperLayer = new THREE.Group();
  upperLayer.name = 'Floating protective glass layer';
  upperLayer.position.z = 0.375;
  const cover = addMesh(THREE, upperLayer, slab(THREE, 2.49, 2.49, 0.045, 0.17, 0.008),
    glassCyan, 'Transparent top cover');
  cover.renderOrder = 4;
  addMesh(THREE, upperLayer, frame(THREE, 2.49, 2.49, 0.018, 0.015, 0.17),
    cyan, 'Optical cover edge', [0, 0, 0.025]);
  group.add(upperLayer);

  const pinGeometry = slab(THREE, 0.13, 0.058, 0.065, 0.018, 0.007);
  for (let i = 0; i < 8; i++) {
    const offset = (i - 3.5) * 0.255;
    for (const side of [-1, 1]) {
      addMesh(THREE, group, pinGeometry, silver, 'Edge contact', [side * 1.215, offset, -0.31]);
      const vertical = addMesh(THREE, group, pinGeometry, silver, 'Edge contact',
        [offset, side * 1.215, -0.31]);
      vertical.rotation.z = Math.PI / 2;
    }
  }

  function update(time, activity = 0) {
    const t = safeTime(time), a = clamp01(activity);
    upperLayer.rotation.z = Math.sin(t * 0.34) * (0.009 + 0.045 * a);
    upperLayer.position.z = 0.375 + a * 0.065 + Math.sin(t * 0.65) * 0.009;
    selectionRotor.rotation.z = t * 0.22 + a * Math.sin(t * 1.2) * 0.65;
    selection.scale.setScalar(1 + a * 0.025 * Math.sin(t * 2.1));
    candidates.forEach(({ cell, token, phase }, i) => {
      cell.position.z = -0.012 + a * 0.022 * Math.sin(t * 1.4 + phase);
      token.rotation.x = 0.28 + i * 0.17 + Math.sin(t * 0.7 + phase) * (0.05 + a * 0.21);
      token.rotation.y = i * 0.21 + t * 0.11 + a * Math.sin(t * 0.9 + phase) * 0.4;
      token.rotation.z = i * 0.23 + t * 0.07;
    });
    cyan.emissiveIntensity = 0.42 + a * 0.65;
    magenta.emissiveIntensity = 0.55 + a * (0.65 + 0.15 * Math.sin(t * 2));
  }
  update(0, 0);
  return { group, update };
}

function profileCurve(THREE, points, segments) {
  return new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y)))
    .getPoints(segments).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
}

/** Flask is upright along local Y; an open neck and inner shell are modeled. */
export function createSynthesisVessel(THREE) {
  const group = new THREE.Group();
  group.name = 'Material synthesis — glass reaction vessel';
  group.userData.researchStage = 'synthesis';
  const shellMaterial = glass(THREE, 0xf3d09b, 0.38);
  shellMaterial.thickness = 0.075;
  shellMaterial.roughness = 0.09;
  const silver = metal(THREE, 0xb19e83);
  const accent = lightMaterial(THREE, 0xffd078, 0.34);
  const reactionAccent = lightMaterial(THREE, 0xf59850, 0.45);
  const outer = profileCurve(THREE, [
    [0, -1.085], [0.56, -1.085], [0.86, -1.015], [1.035, -0.82],
    [1.09, -0.54], [1.085, -0.30], [1.015, -0.08], [0.88, 0.15],
    [0.70, 0.38], [0.49, 0.61], [0.34, 0.81], [0.30, 1.02], [0.30, 1.32],
  ], 76);
  const inner = profileCurve(THREE, [
    [0.24, 1.32], [0.24, 1.02], [0.28, 0.81], [0.43, 0.60],
    [0.64, 0.37], [0.82, 0.14], [0.95, -0.09], [1.018, -0.32],
    [1.018, -0.54], [0.97, -0.77], [0.80, -0.95], [0.54, -1.005], [0, -1.005],
  ], 76);
  const shellProfile = [
    ...outer,
    new THREE.Vector2(0.335, 1.335), new THREE.Vector2(0.34, 1.40),
    new THREE.Vector2(0.315, 1.44), new THREE.Vector2(0.25, 1.44),
    new THREE.Vector2(0.24, 1.40), ...inner,
  ];
  const shell = addMesh(THREE, group, new THREE.LatheGeometry(shellProfile, 64),
    shellMaterial, 'Thick open glass shell');
  shell.renderOrder = 5;

  const liquidMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf7a72f, metalness: 0.02, roughness: 0.15,
    transmission: 0.34, thickness: 0.7, ior: 1.333,
    transparent: true, opacity: 0.68, depthWrite: false,
    clearcoat: 1, clearcoatRoughness: 0.06,
    attenuationColor: new THREE.Color(0xe8831c), attenuationDistance: 1.9,
    emissive: 0xb55717, emissiveIntensity: 0.14,
    side: THREE.DoubleSide,
  });
  const liquidProfile = profileCurve(THREE, [
    [0, -0.994], [0.53, -0.994], [0.77, -0.93],
    [0.938, -0.75], [0.988, -0.53], [0.988, -0.34], [0.939, -0.115],
  ], 38);
  liquidProfile.push(new THREE.Vector2(0.939, -0.108), new THREE.Vector2(0, -0.108));
  const liquid = addMesh(THREE, group, new THREE.LatheGeometry(liquidProfile, 64),
    liquidMaterial, 'Amber reaction fluid');
  liquid.renderOrder = 2;
  const meniscus = addMesh(THREE, group, new THREE.TorusGeometry(0.933, 0.009, 8, 64),
    accent, 'Liquid meniscus', [0, -0.106, 0]);
  meniscus.rotation.x = Math.PI / 2;

  const neckRing = addMesh(THREE, group, new THREE.TorusGeometry(0.317, 0.014, 10, 64),
    silver, 'Fine neck collar', [0, 1.36, 0]);
  neckRing.rotation.x = Math.PI / 2;
  const foot = addMesh(THREE, group, new THREE.CylinderGeometry(0.62, 0.66, 0.066, 64),
    silver, 'Instrument foot', [0, -1.145, 0]);
  const footAccent = addMesh(THREE, group, new THREE.TorusGeometry(0.636, 0.008, 8, 64),
    reactionAccent, 'Foot optical accent', [0, -1.125, 0]);
  footAccent.rotation.x = Math.PI / 2;

  const stirrer = new THREE.Group();
  stirrer.name = 'Magnetic stirring capsule';
  stirrer.position.y = -0.928;
  const stirringCapsule = addMesh(THREE, stirrer, new THREE.CapsuleGeometry(0.04, 0.24, 6, 14),
    silver, 'Metal-coated stir bar');
  stirringCapsule.rotation.z = Math.PI / 2;
  group.add(stirrer);

  const bubbleGeometry = new THREE.SphereGeometry(1, 18, 12);
  const bubbleMaterial = glass(THREE, 0xffe1a8, 0.62);
  bubbleMaterial.transmission = 0.62;
  bubbleMaterial.thickness = 0.05;
  bubbleMaterial.emissiveIntensity = 0.05;
  const bubbles = [];
  for (let i = 0; i < 13; i++) {
    const bubble = addMesh(THREE, group, bubbleGeometry, bubbleMaterial, `Reaction bubble ${i + 1}`);
    bubble.renderOrder = 3;
    bubbles.push({ mesh: bubble, phase: seed(i + 31), angle: seed(i + 83) * TAU,
      radius: 0.029 + seed(i + 124) * 0.028, orbit: 0.15 + seed(i + 211) * 0.50 });
  }

  // Restrained etched calibration marks following the front curvature.
  const calibrationMaterial = glass(THREE, 0xffedc7, 0.42);
  for (let i = 0; i < 4; i++) {
    const y = -0.61 + i * 0.245;
    const radius = [1.08, 1.09, 1.034, 0.89][i];
    const mark = addMesh(THREE, group,
      new THREE.TorusGeometry(radius + 0.006, 0.0055, 6, 22, 0.24),
      calibrationMaterial, 'Etched volume mark', [0, y, 0]);
    mark.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 0.12);
    mark.renderOrder = 6;
  }

  function update(time, activity = 0) {
    const t = safeTime(time), a = clamp01(activity);
    stirrer.rotation.y = t * 0.75 + a * Math.sin(t * 1.8) * 0.55;
    meniscus.rotation.z = Math.sin(t * 1.4) * (0.003 + a * 0.008);
    bubbles.forEach(({ mesh, phase, angle, radius, orbit }, i) => {
      const p = fract(phase + t * (0.081 + i * 0.0019) + a * 0.026 * Math.sin(t * 0.9));
      const theta = angle + t * 0.12 + a * 0.11 * Math.sin(t * 1.3 + i);
      const spread = orbit * (0.70 + p * 0.26);
      mesh.position.set(Math.cos(theta) * spread, -0.88 + p * 0.675, Math.sin(theta) * spread);
      const envelope = Math.pow(Math.max(0.001, Math.sin(Math.PI * p)), 0.32);
      mesh.scale.setScalar(radius * envelope * (1 + a * 0.3));
    });
    liquidMaterial.emissiveIntensity = 0.10 + a * 0.10;
    bubbleMaterial.emissiveIntensity = 0.05 + a * 0.17;
    reactionAccent.emissiveIntensity = 0.45 + a * 0.55;
  }
  update(0, 0);
  return { group, update };
}

/** Upright along Y; three plates occupy X, with two ion transport gaps. */
export function createElectrochemicalCell(THREE) {
  const group = new THREE.Group();
  group.name = 'Electrochemical performance — three-electrode cell';
  group.userData.researchStage = 'performance';
  const silver = metal(THREE, 0x6b829d);
  const glassCyan = glass(THREE, 0x91b8ff, 0.29);
  const glassViolet = glass(THREE, 0xa397f0, 0.31);
  const cyan = lightMaterial(THREE, 0x6daaff, 0.42);
  const magenta = lightMaterial(THREE, 0xf17faa, 0.46);
  const housingGeometry = frame(THREE, 2.42, 2.05, 0.075, 0.085, 0.17);
  const frontFrame = addMesh(THREE, group, housingGeometry, glassCyan,
    'Front transparent housing frame', [0, 0, 0.715]);
  frontFrame.renderOrder = 4;
  const rearFrame = addMesh(THREE, group, housingGeometry, glassViolet,
    'Rear transparent housing frame', [0, 0, -0.715]);
  rearFrame.renderOrder = 1;
  const railGeometry = slab(THREE, 0.057, 0.057, 1.42, 0.014, 0.01);
  for (const x of [-1.155, 1.155]) for (const y of [-0.97, 0.97]) {
    addMesh(THREE, group, railGeometry, silver, 'Structural corner rail', [x, y, 0]);
  }
  const window = addMesh(THREE, group, slab(THREE, 2.265, 1.90, 0.018, 0.12, 0.003),
    glassCyan, 'Clear front observation window', [0, 0, 0.708]);
  window.renderOrder = 5;
  const rearWindow = addMesh(THREE, group, slab(THREE, 2.265, 1.90, 0.018, 0.12, 0.003),
    glassViolet, 'Clear rear observation window', [0, 0, -0.708]);
  rearWindow.renderOrder = 1;

  const base = addMesh(THREE, group, slab(THREE, 2.28, 0.13, 1.39, 0.065, 0.02),
    silver, 'Instrument base', [0, -1.085, 0]);
  const baseAccent = addMesh(THREE, group, slab(THREE, 2.09, 0.015, 0.018, 0.006, 0.002),
    cyan, 'Base optical accent', [0, -1.07, 0.70]);

  const electrodeMaterials = [
    new THREE.MeshPhysicalMaterial({ color: 0x488beb, metalness: 0.56, roughness: 0.24,
      clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x234a8b, emissiveIntensity: 0.07 }),
    glass(THREE, 0xaea1ff, 0.68),
    new THREE.MeshPhysicalMaterial({ color: 0xe768a0, metalness: 0.52, roughness: 0.25,
      clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x922f59, emissiveIntensity: 0.07 }),
  ];
  electrodeMaterials[1].transmission = 0.38;
  electrodeMaterials[1].metalness = 0.24;
  const plateGeometry = slab(THREE, 1.15, 1.52, 0.076, 0.10, 0.017);
  const plateAngle = Math.PI / 2 - 0.26;
  const plates = [];
  for (let i = 0; i < 3; i++) {
    const plate = addMesh(THREE, group, plateGeometry, electrodeMaterials[i],
      ['Cyan electrode', 'Violet reference electrode', 'Magenta electrode'][i], [(i - 1) * 0.65, -0.025, 0]);
    plate.rotation.y = plateAngle;
    plate.renderOrder = i === 1 ? 2 : 0;
    plates.push(plate);
    addMesh(THREE, group, slab(THREE, 0.125, 0.255, 0.125, 0.035, 0.015),
      silver, 'Individual electrode contact', [(i - 1) * 0.65, 0.864, 0]);
    addMesh(THREE, group, new THREE.CylinderGeometry(0.078, 0.078, 0.12, 20),
      i === 2 ? magenta : cyan, 'Terminal indicator', [(i - 1) * 0.65, 1.045, 0]);
  }

  const ionGeometry = new THREE.SphereGeometry(1, 16, 10);
  const ionMaterials = [cyan.clone(), magenta.clone()];
  const ions = [];
  for (let channel = 0; channel < 2; channel++) {
    for (let i = 0; i < 9; i++) {
      const ion = addMesh(THREE, group, ionGeometry, ionMaterials[channel],
        `Gap ${channel + 1} ion ${i + 1}`);
      ion.renderOrder = 3;
      ions.push({ mesh: ion, channel, phase: seed(i + 20 * channel + 303),
        y: -0.60 + seed(i + channel * 20 + 401) * 1.16,
        z: -0.43 + seed(i + channel * 20 + 511) * 0.86,
        radius: 0.032 + seed(i + 621) * 0.012 });
    }
  }

  function update(time, activity = 0) {
    const t = safeTime(time), a = clamp01(activity);
    const slope = Math.tan(0.26);
    ions.forEach(({ mesh, channel, phase, y, z, radius }, i) => {
      let p = fract(phase + t * (0.090 + (i % 3) * 0.007) + a * 0.025 * Math.sin(t * 1.1));
      if (channel === 1) p = 1 - p;
      const x = (channel - 1) * 0.65 + 0.122 + p * 0.406 - slope * z;
      mesh.position.set(x, y + Math.sin(t * 1.1 + i) * (0.012 + a * 0.025), z);
      const envelope = Math.pow(Math.max(0.001, Math.sin(Math.PI * p)), 0.30);
      mesh.scale.setScalar(radius * envelope * (1 + a * 0.30));
    });
    electrodeMaterials[0].emissiveIntensity = 0.07 + a * 0.24;
    electrodeMaterials[2].emissiveIntensity = 0.07 + a * 0.24;
    electrodeMaterials[1].emissiveIntensity = 0.014 + a * 0.09;
    ionMaterials[0].emissiveIntensity = 0.58 + a * 0.9;
    ionMaterials[1].emissiveIntensity = 0.60 + a * 0.9;
    cyan.emissiveIntensity = 0.42 + a * 0.65;
    magenta.emissiveIntensity = 0.46 + a * 0.65;
    plates[1].position.y = -0.025 + Math.sin(t * 0.9) * a * 0.012;
    baseAccent.scale.x = 1 + a * 0.02 * Math.sin(t * 1.5);
  }
  update(0, 0);
  return { group, update };
}
