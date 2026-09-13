import * as THREE from "three";
const { Group, Mesh, Color, BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry, ConeGeometry, PlaneGeometry, MeshStandardMaterial } = THREE;

const M = {
  panel:  new MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.7, roughness: 0.4 }),
  dark:   new MeshStandardMaterial({ color: 0x8d97a1, metalness: 0.7, roughness: 0.45 }),
  galv:   new MeshStandardMaterial({ color: 0xc9d0d6, metalness: 0.9, roughness: 0.3 }),
  trim:   new MeshStandardMaterial({ color: 0x38404a, metalness: 0.6, roughness: 0.5 }),
  bright: new MeshStandardMaterial({ color: 0xe7ebf0, metalness: 0.85, roughness: 0.25 }),
  copper: new MeshStandardMaterial({ color: 0xc07b46, metalness: 0.85, roughness: 0.35 }),
  blue:   new MeshStandardMaterial({ color: 0x2f6bb0, metalness: 0.55, roughness: 0.4 }),
  green:  new MeshStandardMaterial({ color: 0x3f7d5a, metalness: 0.4, roughness: 0.55 }),
  yellow: new MeshStandardMaterial({ color: 0xd6a43a, metalness: 0.5, roughness: 0.45 }),
};
function add(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
// a rotating fan wheel (backward-curved), returns the spinning group
function fanWheel(parent, cx, cy, cz, r, mat) {
  const w = new Group(); w.position.set(cx, cy, cz); parent.add(w);
  add(new TorusGeometry(r, r * 0.08, 10, 32), mat, w).rotation.y = Math.PI / 2;
  add(new TorusGeometry(r, r * 0.08, 10, 32), mat, w, -r * 0.5, 0, 0).rotation.y = Math.PI / 2;
  add(new CylinderGeometry(r * 0.22, r * 0.22, r * 0.7, 18), M.dark, w).rotation.z = Math.PI / 2;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = add(new BoxGeometry(r * 0.55, r * 0.34, 0.04), mat, w, -r * 0.25, Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
    b.rotation.x = a; b.rotation.z = 0.6;
  }
  w.userData.spinAxis = "x";
  return w;
}
// an axial fan: a few wide pitched blades on a hub, spins about the vertical y-axis
function axialFan(parent, cx, cy, cz, r, blades = 6, mat = M.panel) {
  const w = new Group(); w.position.set(cx, cy, cz); parent.add(w);
  add(new CylinderGeometry(r * 0.16, r * 0.16, 0.34, 18), M.dark, w);
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const bl = add(new BoxGeometry(r * 0.92, 0.05, r * 0.36), mat, w, Math.cos(a) * r * 0.52, 0, Math.sin(a) * r * 0.52);
    bl.rotation.y = -a; bl.rotation.x = 0.38;
  }
  w.userData.spinAxis = "y";
  return w;
}

/* =========================================================================
   MODEL BUILDERS — one per HVAC machine. Each returns { group, spin:[] }.
   Built procedurally in real 3D (no downloads). More get added over time.
   ========================================================================= */
const BUILD = {};

BUILD.ahu = () => {
  const g = new Group(); const Y = 3.4;
  add(new BoxGeometry(4.8, 2.0, 2.0), M.panel, g, 0, Y, 0);
  for (const sx of [-2.4, 2.4]) for (const sz of [-1, 1]) add(new BoxGeometry(0.1, 2.02, 0.1), M.trim, g, sx, Y, sz);
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) add(new BoxGeometry(4.82, 0.1, 0.1), M.trim, g, 0, Y + sy, sz);
  for (const sz of [-0.82, 0.82]) add(new BoxGeometry(4.9, 0.16, 0.18), M.trim, g, 0, Y - 1.05, sz);
  for (let i = -3; i <= 3; i++) add(new BoxGeometry(0.06, 0.16, 1.5), M.dark, g, -2.41, Y + i * 0.24, 0).rotation.z = 0.55;
  const door = (cx, w, view) => {
    add(new BoxGeometry(w, 1.72, 0.05), M.panel, g, cx, Y, 1.01);
    add(new BoxGeometry(w + 0.06, 1.82, 0.03), M.trim, g, cx, Y, 0.99);
    add(new BoxGeometry(0.06, 0.44, 0.1), M.bright, g, cx + w / 2 - 0.14, Y - 0.1, 1.05);
    if (view) add(new BoxGeometry(0.5, 0.5, 0.04), M.copper, g, cx, Y + 0.35, 1.04);
  };
  door(-1.35, 1.15, true); door(0.15, 1.35, false);
  add(new TorusGeometry(0.74, 0.13, 14, 40), M.dark, g, 2.42, Y, 0).rotation.y = Math.PI / 2;
  const spin = fanWheel(g, 2.4, Y, 0, 0.6, M.bright);
  const manifold = (cx) => { const hy = Y - 1.18;
    add(new CylinderGeometry(0.28, 0.28, 2, 24), M.galv, g, cx, hy, 0).rotation.x = Math.PI / 2;
    for (const dz of [-0.7, 0, 0.7]) { const len = hy - 0.55;
      add(new CylinderGeometry(0.22, 0.22, len, 20), M.galv, g, cx, hy - len / 2, dz);
      add(new CylinderGeometry(0.34, 0.22, 0.3, 20), M.galv, g, cx, 0.2, dz); } };
  manifold(-1.4); manifold(1.4);
  return { group: g, spin: [spin] };
};

BUILD.chiller = () => {
  const g = new Group(); const Y = 1.9;
  add(new BoxGeometry(6.4, 0.4, 2.4), M.trim, g, 0, 0.2, 0);          // skid
  // two horizontal shells (evaporator + condenser)
  add(new CylinderGeometry(0.85, 0.85, 5.4, 28), M.panel, g, 0, Y + 0.9, 0.55).rotation.z = Math.PI / 2;
  add(new CylinderGeometry(0.95, 0.95, 5.4, 28), M.panel, g, 0, Y - 0.15, -0.4).rotation.z = Math.PI / 2;
  for (const x of [-2.7, 2.7]) { // dished heads
    add(new SphereGeometry(0.85, 20, 12, 0, Math.PI), M.dark, g, x, Y + 0.9, 0.55).rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    add(new SphereGeometry(0.95, 20, 12, 0, Math.PI), M.dark, g, x, Y - 0.15, -0.4).rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  // compressor (semi-hermetic) on top + motor
  add(new CylinderGeometry(0.6, 0.6, 1.6, 24), M.dark, g, -1.1, Y + 2.1, 0.2).rotation.z = Math.PI / 2;
  add(new CylinderGeometry(0.5, 0.5, 1.2, 20), M.blue, g, 0.5, Y + 2.1, 0.2).rotation.z = Math.PI / 2;
  add(new BoxGeometry(0.3, 0.5, 0.5), M.trim, g, 1.4, Y + 2.1, 0.2);
  // refrigerant piping
  add(new CylinderGeometry(0.16, 0.16, 1.4, 16), M.copper, g, -1.1, Y + 1.6, 0.55);
  add(new CylinderGeometry(0.16, 0.16, 1.2, 16), M.copper, g, 1.1, Y + 1.55, 0.2);
  // control panel
  add(new BoxGeometry(0.3, 1.4, 1.1), M.trim, g, 3.15, Y + 0.6, 0.4);
  add(new BoxGeometry(0.05, 0.6, 0.8), M.blue, g, 3.32, Y + 0.8, 0.4);
  // water nozzles
  for (const z of [1.4, -1.3]) add(new CylinderGeometry(0.3, 0.3, 0.5, 16), M.dark, g, -2.2, Y + (z > 0 ? 0.9 : -0.15), z).rotation.x = Math.PI / 2;
  return { group: g, spin: [] };
};

BUILD.tower = () => {
  const g = new Group();
  // stand + deck
  for (const sx of [-2, 2]) for (const sz of [-2, 2]) add(new BoxGeometry(0.18, 1.0, 0.18), M.trim, g, sx, 0.5, sz);
  add(new BoxGeometry(4.7, 0.18, 4.7), M.trim, g, 0, 1.0, 0);
  // cold-water basin
  add(new BoxGeometry(4.8, 0.7, 4.8), M.dark, g, 0, 1.45, 0);
  // casing body (galvanized)
  add(new BoxGeometry(4.2, 3.3, 4.2), M.panel, g, 0, 3.55, 0);
  // intake louvers on the lower half of every side
  for (let i = 0; i < 6; i++) {
    const y = 2.15 + i * 0.3;
    for (const s of [1, -1]) {
      add(new BoxGeometry(4.0, 0.16, 0.12), M.dark, g, 0, y, s * 2.12).rotation.x = s * 0.5;
      add(new BoxGeometry(0.12, 0.16, 4.0), M.dark, g, s * 2.12, y, 0).rotation.z = -s * 0.5;
    }
  }
  // enclosed fan deck + flared fan cylinder (eased inlet) + induced-draft axial fan
  add(new BoxGeometry(4.3, 0.2, 4.3), M.panel, g, 0, 5.3, 0);
  add(new CylinderGeometry(1.6, 1.95, 1.15, 36, 1, true), M.panel, g, 0, 6.0, 0);
  const fan = axialFan(g, 0, 5.9, 0, 1.6, 6, M.dark);
  return { group: g, spin: [fan] };
};

BUILD.pump = () => {
  const g = new Group(); const Y = 1.05;
  add(new BoxGeometry(3.8, 0.35, 1.4), M.yellow, g, 0, 0.18, 0);             // common baseplate
  // motor (right) with cooling fins + rear cowl + terminal box
  add(new CylinderGeometry(0.62, 0.62, 2.0, 28), M.blue, g, 1.05, Y, 0).rotation.z = Math.PI / 2;
  add(new BoxGeometry(2.0, 0.35, 1.0), M.blue, g, 1.05, 0.5, 0);
  for (let i = 0; i < 12; i++) add(new BoxGeometry(0.04, 0.5, 0.04), M.dark, g, 0.2 + i * 0.14, Y, 0.63);
  add(new BoxGeometry(0.45, 0.5, 0.55), M.dark, g, 1.05, Y + 0.62, 0);        // terminal box
  add(new CylinderGeometry(0.5, 0.5, 0.16, 24), M.dark, g, 2.1, Y, 0).rotation.z = Math.PI / 2; // rear cowl
  // coupling guard between motor and pump
  add(new BoxGeometry(0.55, 0.7, 0.72), M.trim, g, -0.1, Y, 0);
  // volute casing (snail)
  add(new CylinderGeometry(0.9, 0.9, 0.62, 32), M.dark, g, -1.2, Y, 0).rotation.z = Math.PI / 2;
  add(new TorusGeometry(0.64, 0.3, 16, 32), M.dark, g, -1.2, Y, 0).rotation.y = Math.PI / 2;
  // suction flange on the END (axial, front) — larger bore
  add(new CylinderGeometry(0.44, 0.44, 0.5, 22), M.dark, g, -1.95, Y, 0).rotation.z = Math.PI / 2;
  add(new CylinderGeometry(0.52, 0.52, 0.1, 22), M.bright, g, -2.2, Y, 0).rotation.z = Math.PI / 2;
  // discharge flange on TOP (vertical) — smaller bore
  add(new CylinderGeometry(0.34, 0.34, 0.95, 22), M.dark, g, -1.2, Y + 0.9, 0);
  add(new CylinderGeometry(0.42, 0.42, 0.1, 22), M.bright, g, -1.2, Y + 1.4, 0);
  const spin = new Group(); spin.position.set(-1.2, Y, 0); spin.userData.spinAxis = "x"; g.add(spin);
  add(new CylinderGeometry(0.12, 0.12, 0.7, 12), M.bright, spin).rotation.z = Math.PI / 2;
  return { group: g, spin: [spin] };
};

BUILD.vav = () => {
  const g = new Group(); const Y = 1.6;
  add(new BoxGeometry(2.6, 1.3, 1.3), M.galv, g, 0, Y, 0);                    // box
  add(new CylinderGeometry(0.55, 0.55, 0.6, 24), M.galv, g, -1.5, Y, 0).rotation.z = Math.PI / 2; // inlet duct
  add(new CylinderGeometry(0.58, 0.58, 0.12, 24), M.dark, g, -1.75, Y, 0).rotation.z = Math.PI / 2;
  // actuator on top
  add(new BoxGeometry(0.5, 0.4, 0.4), M.yellow, g, -0.5, Y + 0.85, 0);
  add(new CylinderGeometry(0.06, 0.06, 0.5, 12), M.dark, g, -0.5, Y + 0.55, 0);
  // reheat coil (finned) at discharge
  for (let i = 0; i < 8; i++) add(new BoxGeometry(0.04, 1.0, 1.0), M.copper, g, 0.9 + i * 0.08, Y, 0);
  add(new BoxGeometry(0.75, 1.2, 1.2), M.trim, g, 1.15, Y, 0);
  for (const z of [0.45, -0.45]) add(new CylinderGeometry(0.1, 0.1, 0.5, 12), M.copper, g, 1.15, Y + 0.75, z);
  // controller
  add(new BoxGeometry(0.4, 0.5, 0.08), M.trim, g, 0.2, Y, 0.7);
  return { group: g, spin: [] };
};

BUILD.fan = () => {
  const g = new Group(); const Y = 1.9;
  add(new BoxGeometry(0.3, 3.2, 3.2), M.trim, g, -1.2, Y, 0);                 // mounting wall
  add(new TorusGeometry(1.3, 0.16, 16, 44), M.dark, g, -1.0, Y, 0).rotation.y = Math.PI / 2;
  add(new CylinderGeometry(1.3, 1.3, 0.5, 44, 1, true), M.dark, g, -0.75, Y, 0).rotation.z = Math.PI / 2;
  const spin = fanWheel(g, -0.7, Y, 0, 1.05, M.panel);
  // motor on struts behind
  add(new CylinderGeometry(0.4, 0.4, 1.0, 20), M.blue, g, 0.4, Y, 0).rotation.z = Math.PI / 2;
  for (const a of [0, 2.1, 4.2]) add(new BoxGeometry(1.2, 0.08, 0.08), M.dark, g, -0.2, Y + Math.cos(a) * 1.1, Math.sin(a) * 1.1).rotation.x = a;
  return { group: g, spin: [spin] };
};

BUILD.boiler = () => {
  const g = new Group(); const Y = 1.8;
  add(new BoxGeometry(5.4, 0.4, 2.2), M.trim, g, 0, 0.2, 0);                         // skid base
  add(new CylinderGeometry(1.3, 1.3, 4.2, 32), M.panel, g, 0, Y, 0).rotation.z = Math.PI / 2; // shell jacket
  add(new CylinderGeometry(1.34, 1.34, 0.25, 32), M.dark, g, -2.15, Y, 0).rotation.z = Math.PI / 2; // front flue door
  add(new CylinderGeometry(1.34, 1.34, 0.25, 32), M.dark, g, 2.15, Y, 0).rotation.z = Math.PI / 2;  // rear flue door
  add(new BoxGeometry(0.1, 0.5, 0.5), M.bright, g, -2.35, Y, 0);                      // door latch
  // burner + blower on the front
  add(new CylinderGeometry(0.5, 0.5, 1.0, 24), M.blue, g, -2.95, Y - 0.2, 0).rotation.z = Math.PI / 2;
  add(new CylinderGeometry(0.72, 0.72, 0.7, 24), M.blue, g, -3.45, Y - 0.2, 0).rotation.z = Math.PI / 2;
  add(new BoxGeometry(0.4, 0.9, 0.55), M.trim, g, -3.2, Y + 0.7, 0);                  // burner control
  // vertical flue stack on top
  add(new CylinderGeometry(0.5, 0.5, 2.4, 24), M.dark, g, 1.5, Y + 2.2, 0);
  add(new CylinderGeometry(0.58, 0.58, 0.2, 24), M.dark, g, 1.5, Y + 3.4, 0);
  // supply/return water nozzles on top
  for (const x of [-0.6, 0.6]) add(new CylinderGeometry(0.24, 0.24, 0.7, 16), M.dark, g, x, Y + 1.5, 0);
  // control panel on the side
  add(new BoxGeometry(0.9, 1.1, 0.25), M.trim, g, -0.2, Y + 0.2, 1.35);
  add(new BoxGeometry(0.5, 0.5, 0.05), M.blue, g, -0.2, Y + 0.35, 1.5);
  return { group: g, spin: [] };
};

BUILD.heatpump = () => {
  const g = new Group(); const Y = 1.7;
  add(new BoxGeometry(3.4, 3.0, 1.9), M.panel, g, 0, Y, 0);                           // powder-coated cabinet
  add(new BoxGeometry(3.46, 0.12, 1.96), M.trim, g, 0, Y + 1.5, 0);                   // top cap
  for (const sz of [-0.98, 0.98]) add(new BoxGeometry(3.0, 0.2, 0.12), M.trim, g, 0, 0.3, sz); // base rails
  // condenser coil fins across both side faces (depth-wise)
  for (const sx of [-1.71, 1.71]) for (let i = 0; i < 13; i++)
    add(new BoxGeometry(0.02, 2.5, 0.05), M.dark, g, sx, Y, -0.82 + i * 0.137);
  // right half = access panel (compressor) with seam + handle
  add(new BoxGeometry(0.03, 2.7, 0.02), M.trim, g, 0.35, Y, 0.96);
  add(new BoxGeometry(0.18, 0.4, 0.06), M.bright, g, 0.8, Y - 0.2, 0.98);
  // left half = front fan behind a circular grille (facing +z)
  add(new TorusGeometry(1.05, 0.08, 12, 44), M.trim, g, -0.55, Y + 0.35, 0.95);       // grille rim
  for (let r = 0.3; r < 1.0; r += 0.26) add(new TorusGeometry(r, 0.018, 8, 36), M.dark, g, -0.55, Y + 0.35, 0.94);
  const fan = new Group(); fan.position.set(-0.55, Y + 0.35, 0.9); fan.userData.spinAxis = "z"; g.add(fan);
  add(new CylinderGeometry(0.16, 0.16, 0.24, 16), M.dark, fan).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2;
    add(new BoxGeometry(0.32, 0.86, 0.04), M.dark, fan, Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0).rotation.z = a + 0.4; }
  return { group: g, spin: [fan] };
};

BUILD.plateHX = () => {
  const g = new Group(); const Y = 1.45;
  add(new BoxGeometry(1.7, 0.22, 2.2), M.trim, g, 0, 0.11, 0);                        // feet
  add(new BoxGeometry(0.36, 2.4, 1.9), M.blue, g, -1.0, Y, 0);                        // fixed head
  for (let i = 0; i < 28; i++) add(new BoxGeometry(0.05, 2.2, 1.8), i % 2 ? M.bright : M.dark, g, -0.78 + i * 0.053, Y, 0); // plate pack
  add(new BoxGeometry(0.36, 2.4, 1.9), M.blue, g, 0.85, Y, 0);                        // pressure plate
  for (const sy of [0.95, -0.95]) for (const sz of [0.72, -0.72]) add(new CylinderGeometry(0.06, 0.06, 2.5, 12), M.dark, g, 0, Y + sy, sz).rotation.z = Math.PI / 2; // tie bolts
  add(new BoxGeometry(2.7, 0.12, 0.12), M.dark, g, 0, Y + 1.3, 0);                    // carrying bar
  for (const sy of [0.75, -0.75]) for (const sz of [0.55, -0.55]) {                   // 4 nozzles on the head
    add(new CylinderGeometry(0.22, 0.22, 0.5, 16), M.dark, g, -1.35, Y + sy, sz).rotation.z = Math.PI / 2;
    add(new CylinderGeometry(0.28, 0.28, 0.08, 16), M.bright, g, -1.6, Y + sy, sz).rotation.z = Math.PI / 2;
  }
  return { group: g, spin: [] };
};

BUILD.tes = () => {
  const g = new Group();
  add(new CylinderGeometry(2.0, 2.0, 7.0, 44), M.panel, g, 0, 3.7, 0);               // insulated shell
  for (let i = 0; i < 6; i++) add(new TorusGeometry(2.01, 0.03, 8, 44), M.dark, g, 0, 1.1 + i * 1.05, 0).rotation.x = Math.PI / 2; // cladding bands
  add(new SphereGeometry(2.0, 44, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.panel, g, 0, 7.2, 0); // domed top
  add(new CylinderGeometry(0.5, 0.5, 0.3, 20), M.trim, g, 0, 8.35, 0);               // manway
  add(new CylinderGeometry(0.3, 0.3, 0.5, 16), M.dark, g, 0.9, 7.9, 0);              // top nozzle
  add(new CylinderGeometry(0.36, 0.36, 0.7, 16), M.dark, g, 1.9, 0.6, 0).rotation.z = Math.PI / 2; // bottom nozzle
  // side ladder
  for (const sz of [0.2, -0.2]) add(new CylinderGeometry(0.04, 0.04, 6.6, 8), M.dark, g, 2.06, 3.7, sz);
  for (let i = 0; i < 11; i++) add(new BoxGeometry(0.05, 0.05, 0.5), M.dark, g, 2.06, 0.9 + i * 0.55, 0);
  return { group: g, spin: [] };
};

BUILD.rtu = () => {
  const g = new Group(); const Y = 1.75; const spin = [];
  add(new BoxGeometry(7.2, 0.5, 3.4), M.trim, g, 0, 0.25, 0);                         // roof curb
  add(new BoxGeometry(6.8, 2.3, 3.2), M.panel, g, 0, Y, 0);                           // cabinet
  add(new BoxGeometry(6.84, 0.12, 3.24), M.trim, g, 0, Y + 1.2, 0);                   // top cap
  // condenser section (right): two up-blast axial fans + coil louvers
  for (const x of [1.4, 3.0]) {
    add(new TorusGeometry(0.95, 0.08, 12, 40), M.trim, g, x, Y + 1.25, 0).rotation.x = Math.PI / 2;
    add(new CylinderGeometry(0.95, 0.95, 0.2, 32, 1, true), M.dark, g, x, Y + 1.35, 0);
    spin.push(axialFan(g, x, Y + 1.35, 0, 0.9, 6, M.dark));
  }
  for (const s of [1, -1]) for (let i = 0; i < 10; i++) add(new BoxGeometry(3.2, 0.02, 0.05), M.dark, g, 2.2, Y - 0.9 + i * 0.2, s * 1.61); // condenser coil fins
  // fresh-air hood on the left end
  add(new BoxGeometry(0.7, 1.4, 2.6), M.panel, g, -3.6, Y + 0.2, 0);
  for (let i = 0; i < 5; i++) add(new BoxGeometry(0.12, 0.16, 2.4), M.dark, g, -3.95, Y - 0.2 + i * 0.28, 0).rotation.z = 0.5;
  // access panels + handles (front)
  for (const cx of [-2.2, -0.6]) { add(new BoxGeometry(1.4, 1.9, 0.03), M.trim, g, cx, Y, 1.61);
    add(new BoxGeometry(0.06, 0.4, 0.08), M.bright, g, cx + 0.6, Y, 1.64); }
  // supply/return openings underneath (through the curb)
  for (const cz of [0.7, -0.7]) add(new BoxGeometry(1.4, 0.5, 1.0), M.dark, g, -1.4, 0.25, cz);
  return { group: g, spin };
};

BUILD.fcu = () => {
  const g = new Group(); const Y = 1.9;
  add(new BoxGeometry(3.2, 1.0, 1.5), M.galv, g, 0, Y, 0);                            // cabinet
  add(new BoxGeometry(1.7, 0.06, 1.2), M.dark, g, -0.5, Y - 0.52, 0);                // return grille (bottom)
  for (let i = 0; i < 7; i++) add(new BoxGeometry(1.6, 0.03, 0.04), M.panel, g, -0.5, Y - 0.5, -0.5 + i * 0.16);
  add(new BoxGeometry(0.22, 0.75, 1.1), M.dark, g, 1.65, Y, 0);                       // supply collar (end)
  // coil (finned) near the supply end + pipe connections on the side
  for (let i = 0; i < 8; i++) add(new BoxGeometry(0.03, 0.8, 1.0), M.copper, g, 0.7 + i * 0.06, Y, 0);
  for (const sy of [0.25, -0.25]) add(new CylinderGeometry(0.09, 0.09, 0.5, 12), M.copper, g, 0.9, Y + sy, 0.8);
  // small blower + motor visible through the cabinet end
  const blow = fanWheel(g, -1.2, Y, 0, 0.42, M.bright);
  add(new CylinderGeometry(0.6, 0.6, 0.5, 24, 1, true), M.dark, g, -1.2, Y, 0).rotation.z = Math.PI / 2;
  // hanger rods
  for (const sx of [-1.4, 1.4]) for (const sz of [-0.65, 0.65]) add(new CylinderGeometry(0.03, 0.03, 1.0, 8), M.dark, g, sx, Y + 1.0, sz);
  return { group: g, spin: [blow] };
};

BUILD.damper = () => {
  const g = new Group(); const Y = 1.6;
  // hat-channel frame
  add(new BoxGeometry(2.6, 0.16, 0.4), M.dark, g, 0, Y + 1.05, 0);
  add(new BoxGeometry(2.6, 0.16, 0.4), M.dark, g, 0, Y - 1.05, 0);
  add(new BoxGeometry(0.16, 2.3, 0.4), M.dark, g, -1.3, Y, 0);
  add(new BoxGeometry(0.16, 2.3, 0.4), M.dark, g, 1.3, Y, 0);
  // blades (parallel), slightly open
  for (let i = 0; i < 5; i++) add(new BoxGeometry(2.5, 0.42, 0.05), M.panel, g, 0, Y - 0.85 + i * 0.42, 0).rotation.x = 0.6;
  // side linkage bar + actuator
  add(new BoxGeometry(0.07, 2.0, 0.07), M.trim, g, 1.28, Y, 0.22);
  add(new CylinderGeometry(0.06, 0.06, 0.5, 12), M.dark, g, 1.5, Y, 0).rotation.z = Math.PI / 2;
  add(new BoxGeometry(0.55, 0.55, 0.5), M.yellow, g, 1.85, Y, 0);                     // actuator
  return { group: g, spin: [] };
};

BUILD.valve = () => {
  const g = new Group(); const Y = 1.2;
  add(new CylinderGeometry(0.3, 0.3, 3.0, 24), M.dark, g, 0, Y, 0).rotation.z = Math.PI / 2; // pipe
  for (const x of [-1.4, 1.4]) add(new CylinderGeometry(0.5, 0.5, 0.16, 24), M.bright, g, x, Y, 0).rotation.z = Math.PI / 2; // flanges
  add(new SphereGeometry(0.56, 28, 20), M.blue, g, 0, Y, 0);                          // globe body
  add(new CylinderGeometry(0.3, 0.3, 0.5, 18), M.blue, g, 0, Y + 0.55, 0);           // bonnet
  add(new CylinderGeometry(0.08, 0.08, 0.7, 12), M.bright, g, 0, Y + 1.0, 0);        // stem
  add(new CylinderGeometry(0.34, 0.34, 0.3, 20), M.trim, g, 0, Y + 1.25, 0);         // yoke
  add(new BoxGeometry(0.72, 0.62, 0.72), M.yellow, g, 0, Y + 1.7, 0);                // electric actuator
  add(new BoxGeometry(0.3, 0.12, 0.3), M.trim, g, 0.3, Y + 1.7, 0.3);               // conduit knockout
  return { group: g, spin: [] };
};

BUILD.ducts = () => {
  const g = new Group(); const Y = 1.4;
  add(new BoxGeometry(3.0, 1.2, 1.2), M.galv, g, -1.2, Y, 0);                         // rectangular run
  for (const x of [-2.6, 0.2]) add(new BoxGeometry(0.06, 1.3, 1.3), M.dark, g, x, Y, 0); // flange joints
  add(new BoxGeometry(1.2, 1.2, 1.2), M.galv, g, 0.5, Y, 0);                          // elbow corner
  add(new BoxGeometry(1.2, 2.0, 1.2), M.galv, g, 0.5, Y + 1.5, 0);                    // vertical riser
  add(new CylinderGeometry(0.55, 0.6, 0.9, 24), M.galv, g, 0.5, Y + 2.7, 0);         // square-to-round transition
  add(new CylinderGeometry(0.5, 0.5, 1.4, 24), M.galv, g, 0.5, Y + 3.6, 0);          // round duct
  // round takeoff on the side of the rectangular run
  add(new CylinderGeometry(0.32, 0.32, 0.9, 20), M.galv, g, -1.5, Y, 0.9).rotation.x = Math.PI / 2;
  add(new CylinderGeometry(0.4, 0.4, 0.1, 20), M.dark, g, -1.5, Y, 1.3).rotation.x = Math.PI / 2;
  return { group: g, spin: [] };
};

BUILD.sensor = () => {
  const g = new Group(); const Y = 1.6;
  add(new BoxGeometry(2.6, 1.4, 1.4), M.galv, g, -0.5, Y, 0);                         // duct section
  for (const x of [-1.7, 0.7]) add(new BoxGeometry(0.05, 1.5, 1.5), M.dark, g, x, Y, 0); // flanges
  // duct temperature sensor: enclosure on the wall + probe into the airstream
  add(new BoxGeometry(0.55, 0.7, 0.4), M.bright, g, -0.8, Y + 0.9, 0);               // enclosure
  add(new CylinderGeometry(0.05, 0.05, 1.3, 12), M.dark, g, -0.8, Y + 0.05, 0);      // probe (into duct)
  add(new BoxGeometry(0.1, 0.1, 0.3), M.dark, g, -0.8, Y + 0.55, 0);                 // gland
  // DDC controller panel beside
  add(new BoxGeometry(0.28, 1.5, 1.1), M.trim, g, 1.35, Y, 0);
  add(new BoxGeometry(0.05, 0.5, 0.7), M.green, g, 1.5, Y + 0.35, 0);                // board
  for (let i = 0; i < 6; i++) add(new BoxGeometry(0.06, 0.08, 0.8), M.bright, g, 1.5, Y - 0.4, -0.35 + i * 0.14); // terminals
  return { group: g, spin: [] };
};

BUILD.economizer = () => {
  const g = new Group(); const Y = 1.9;
  add(new BoxGeometry(3.4, 3.0, 2.4), M.panel, g, 0, Y, 0);                           // mixing-box section
  for (const sx of [-1.7, 1.7]) for (const sz of [-1.2, 1.2]) add(new BoxGeometry(0.1, 3.0, 0.1), M.trim, g, sx, Y, sz);
  // OA damper (front) — blue tag
  for (let i = 0; i < 6; i++) add(new BoxGeometry(2.4, 0.3, 0.06), M.dark, g, 0, Y - 0.85 + i * 0.34, 1.21).rotation.x = 0.55;
  add(new BoxGeometry(0.5, 0.5, 0.35), M.yellow, g, 1.45, Y, 1.2);                    // OA actuator
  add(new BoxGeometry(0.5, 0.22, 0.03), M.blue, g, -1.0, Y + 1.2, 1.22);             // OA label plate
  // RA damper (back) — green tag
  for (let i = 0; i < 6; i++) add(new BoxGeometry(2.4, 0.3, 0.06), M.dark, g, 0, Y - 0.85 + i * 0.34, -1.21).rotation.x = -0.55;
  add(new BoxGeometry(0.5, 0.22, 0.03), M.green, g, -1.0, Y + 1.2, -1.22);           // RA label plate
  // EA damper (top) — warm tag
  for (let i = 0; i < 5; i++) add(new BoxGeometry(0.3, 0.06, 1.9), M.dark, g, -1.0 + i * 0.5, Y + 1.51, 0).rotation.z = 0.55;
  add(new BoxGeometry(0.5, 0.5, 0.35), M.yellow, g, -1.4, Y + 1.5, 0.9);             // EA actuator
  return { group: g, spin: [] };
};

BUILD.humidifier = () => {
  const g = new Group(); const Y = 1.7;
  add(new BoxGeometry(3.0, 1.7, 1.7), M.galv, g, 0.4, Y, 0);                          // duct section
  for (const x of [-1.05, 1.85]) add(new BoxGeometry(0.05, 1.8, 1.8), M.dark, g, x, Y, 0); // flanges
  // stainless dispersion tube across the duct + orifices
  add(new CylinderGeometry(0.12, 0.12, 1.6, 20), M.bright, g, 0.4, Y + 0.35, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) add(new CylinderGeometry(0.03, 0.03, 0.14, 8), M.bright, g, 0.4, Y + 0.52, -0.62 + i * 0.25);
  // steam generator canister (vertical) + control box beside the duct
  add(new CylinderGeometry(0.52, 0.52, 1.8, 28), M.dark, g, -1.9, Y - 0.2, 0);
  add(new SphereGeometry(0.52, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.dark, g, -1.9, Y + 0.7, 0);
  add(new BoxGeometry(0.28, 0.9, 0.6), M.blue, g, -1.9, Y + 0.1, 0.66);              // controller
  // steam hose from canister up into the dispersion tube
  add(new CylinderGeometry(0.08, 0.08, 1.3, 12), M.trim, g, -0.85, Y + 0.7, 0.4).rotation.z = 0.8;
  return { group: g, spin: [] };
};

BUILD.silencer = () => {
  const g = new Group(); const Y = 1.6;
  add(new BoxGeometry(3.2, 1.9, 2.1), M.galv, g, 0, Y, 0);                            // rectangular casing
  add(new BoxGeometry(0.6, 1.4, 1.6), M.galv, g, -1.9, Y, 0);                         // evasé entry
  add(new BoxGeometry(0.6, 1.4, 1.6), M.galv, g, 1.9, Y, 0);                          // evasé exit
  for (const x of [-2.2, 2.2]) add(new BoxGeometry(0.05, 1.5, 1.7), M.dark, g, x, Y, 0); // end flanges
  // internal splitter baffles (perforated), visible through the ends
  for (let i = 0; i < 4; i++) add(new BoxGeometry(3.0, 1.6, 0.16), M.dark, g, 0, Y, -0.72 + i * 0.48);
  add(new BoxGeometry(3.24, 0.06, 2.14), M.trim, g, 0, Y + 0.95, 0);                  // top seam
  return { group: g, spin: [] };
};

BUILD.expansiontank = () => {
  const g = new Group();
  add(new CylinderGeometry(0.92, 0.92, 3.0, 36), M.blue, g, 0, 2.0, 0);              // vessel
  add(new SphereGeometry(0.92, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.blue, g, 0, 3.5, 0); // domed top
  add(new SphereGeometry(0.92, 36, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.blue, g, 0, 0.5, 0); // dished bottom
  // ring base
  add(new CylinderGeometry(1.02, 1.02, 0.22, 36, 1, true), M.trim, g, 0, 0.35, 0);
  add(new TorusGeometry(0.98, 0.08, 10, 36), M.trim, g, 0, 0.24, 0).rotation.x = Math.PI / 2;
  // system water connection (bottom) + flange
  add(new CylinderGeometry(0.18, 0.18, 0.55, 16), M.dark, g, 0, 0.0, 0);
  add(new CylinderGeometry(0.28, 0.28, 0.08, 16), M.bright, g, 0, -0.28, 0);
  // air charge valve on top
  add(new CylinderGeometry(0.07, 0.07, 0.28, 12), M.dark, g, 0, 4.05, 0);
  add(new BoxGeometry(0.45, 0.3, 0.02), M.bright, g, 0, 2.3, 0.93);                   // nameplate
  return { group: g, spin: [] };
};

export { BUILD, M, add };
