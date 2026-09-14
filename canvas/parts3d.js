/* parts3d.js — the internals of each machine, as an exploded assembly.
 *
 * Where models3d.js draws a machine as one closed shape, this builds it from
 * NAMED parts. Each part is its own node carrying { name, fn, dir }:
 *   name — what the part is called
 *   fn   — what it does (its function in the machine)
 *   dir  — the offset it slides to when the machine is "exploded" apart
 *
 * The library reads these so you can tap a machine, pull it apart like an
 * engineering cutaway, and read every part and what it's for.
 */
import * as THREE from "three";
import { M, add } from "./models3d.js";
const {
  Group, Vector3, MeshStandardMaterial,
  BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry, ConeGeometry,
} = THREE;

/* extra materials for internals */
const MEDIA = new MeshStandardMaterial({ color: 0xbcc3ad, roughness: 0.95, metalness: 0.0 }); // filter media
const FLAME = new MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xd83a00, emissiveIntensity: 0.8, roughness: 0.5 });
const FILM  = new MeshStandardMaterial({ color: 0x2a3b4d, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.35 });

/* build one named part; meshes are added inside `node`, node explodes as a unit */
function part(g, parts, name, fn, dir, build) {
  const node = new Group();
  node.userData = { name, fn, dir: new Vector3(dir[0], dir[1], dir[2]) };
  build(node);
  node.userData.home = node.position.clone();
  node.userData.homeRot = node.rotation.clone();
  g.add(node);
  parts.push(node);
  return node;
}

/* a compound part that itself drills down into named sub-parts.
 * `build(node, subs)` populates `subs` by calling part(node, subs, ...). */
function group(g, parts, name, fn, dir, build) {
  const node = new Group();
  node.userData = { name, fn, dir: new Vector3(dir[0], dir[1], dir[2]), children: [] };
  build(node, node.userData.children);
  node.userData.home = node.position.clone();
  node.userData.homeRot = node.rotation.clone();
  g.add(node);
  parts.push(node);
  return node;
}

export const ASSEMBLY = {};

/* ============================ AIR HANDLING UNIT ============================ */
ASSEMBLY.ahu = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 3.4;

  part(g, parts, "Casing & access doors",
    "Insulated double-skin panels seal the cabinet, cut heat gain and noise, and hinge open for service.",
    [0, 4.2, 0], (n) => {
      add(new BoxGeometry(4.8, 2.0, 2.0), new MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.6, roughness: 0.45, transparent: true, opacity: 0.5 }), n, 0, Y, 0);
      for (const sx of [-2.4, 2.4]) for (const sz of [-1, 1]) add(new BoxGeometry(0.1, 2.02, 0.1), M.trim, n, sx, Y, sz);
      for (const sy of [-1, 1]) for (const sz of [-1, 1]) add(new BoxGeometry(4.82, 0.1, 0.1), M.trim, n, 0, Y + sy, sz);
      add(new BoxGeometry(0.06, 0.44, 0.1), M.bright, n, -0.55, Y - 0.1, 1.05);
    });

  part(g, parts, "Intake louvers",
    "Weather louvers admit outdoor air and throw off rain and large debris before it enters the unit.",
    [-3.6, 0, 0], (n) => {
      for (let i = -3; i <= 3; i++) add(new BoxGeometry(0.06, 0.16, 1.5), M.dark, n, -2.41, Y + i * 0.24, 0).rotation.z = 0.55;
      add(new BoxGeometry(0.12, 2.0, 1.9), M.trim, n, -2.5, Y, 0);
    });

  part(g, parts, "Mixing damper & linkage",
    "Opposed blades tied by a jackshaft linkage set the blend of fresh and recirculated air; an actuator drives them.",
    [-2.0, 0, -3.4], (n) => {
      for (let i = 0; i < 5; i++) add(new BoxGeometry(0.05, 0.34, 1.7), M.panel, n, -2.0, Y - 0.8 + i * 0.42, 0).rotation.z = (i % 2 ? 1 : -1) * 0.5;
      add(new BoxGeometry(0.06, 2.0, 0.06), M.trim, n, -2.0, Y, 0.9);
      add(new BoxGeometry(0.4, 0.4, 0.4), M.yellow, n, -2.0, Y - 1.1, 0.9);
    });

  part(g, parts, "Filter bank",
    "Pleated media traps dust and particulate so downstream coils and the space stay clean.",
    [0, 0, 3.0], (n) => {
      add(new BoxGeometry(0.35, 1.8, 1.8), M.trim, n, -1.6, Y, 0);
      for (const sz of [-0.55, 0, 0.55]) add(new BoxGeometry(0.3, 1.7, 0.5), MEDIA, n, -1.6, Y, sz);
    });

  group(g, parts, "Coil section",
    "Where the air is conditioned: a cooling coil, a heating coil and a drain pan. Drill in to see each.",
    [0, 0, 5.2], (n, subs) => {
      part(n, subs, "Cooling coil",
        "Chilled water in a finned tube bank pulls heat and moisture out of the passing air.",
        [0, 0, 2.4], (m) => {
          for (let i = 0; i < 9; i++) add(new BoxGeometry(0.03, 1.7, 1.7), M.bright, m, -0.7 + i * 0.06, Y, 0);
          for (const sy of [0.75, -0.75]) add(new CylinderGeometry(0.1, 0.1, 1.8, 12), M.copper, m, -0.4, Y + sy, 0).rotation.z = Math.PI / 2;
        });
      part(n, subs, "Heating coil",
        "Hot water (or electric elements) re-warms the air for winter heating and humidity control.",
        [1.8, 0, 0], (m) => {
          for (let i = 0; i < 6; i++) add(new BoxGeometry(0.03, 1.6, 1.6), M.copper, m, 0.55 + i * 0.06, Y, 0);
        });
      part(n, subs, "Drain pan",
        "A sloped stainless tray catches condensate from the cooling coil and drains it away.",
        [0, -1.8, 0], (m) => {
          add(new BoxGeometry(1.8, 0.12, 1.9), M.bright, m, 0.0, Y - 0.95, 0);
          add(new CylinderGeometry(0.1, 0.1, 0.5, 12), M.dark, m, 0.7, Y - 1.2, 0.7);
        });
    });

  const fan = part(g, parts, "Supply fan & motor",
    "A centrifugal blower driven by its motor pushes conditioned air out into the duct system.",
    [3.8, 0, 0], (n) => {
      n.position.set(2.4, Y, 0);
      add(new TorusGeometry(0.74, 0.13, 14, 40), M.dark, n, 0, 0, 0).rotation.y = Math.PI / 2;
      const w = new Group(); w.userData.spinAxis = "x"; n.add(w);
      add(new TorusGeometry(0.6, 0.05, 10, 32), M.bright, w).rotation.y = Math.PI / 2;
      add(new CylinderGeometry(0.14, 0.14, 0.5, 16), M.dark, w).rotation.z = Math.PI / 2;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2;
        add(new BoxGeometry(0.34, 0.2, 0.03), M.bright, w, -0.15, Math.cos(a) * 0.48, Math.sin(a) * 0.48).rotation.x = a; }
      spin.push(w);
      add(new BoxGeometry(0.5, 0.5, 0.5), M.blue, n, 0.0, -0.9, 0);
    });

  part(g, parts, "Coil headers & piping",
    "Supply and return water manifolds feed the coils and connect the unit into the plant loop.",
    [0, -3.4, 0], (n) => {
      for (const cx of [-1.4, 1.4]) { const hy = Y - 1.18;
        add(new CylinderGeometry(0.28, 0.28, 2, 24), M.galv, n, cx, hy, 0).rotation.x = Math.PI / 2;
        for (const dz of [-0.7, 0.7]) add(new CylinderGeometry(0.22, 0.22, hy - 0.55, 20), M.galv, n, cx, hy - (hy - 0.55) / 2, dz);
      }
    });

  return { group: g, parts, spin };
};

/* ============================ WATER-COOLED CHILLER ======================== */
ASSEMBLY.chiller = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.9;

  part(g, parts, "Baseplate skid",
    "A welded steel frame carries the whole machine and lets it ship and sit as one rigid package.",
    [0, -1.6, 0], (n) => add(new BoxGeometry(6.4, 0.4, 2.4), M.trim, n, 0, 0.2, 0));

  part(g, parts, "Evaporator shell",
    "Chilled water flows through tubes while refrigerant boils around them, absorbing the building's heat.",
    [0, 0, 3.2], (n) => {
      add(new CylinderGeometry(0.85, 0.85, 5.4, 28), M.panel, n, 0, Y + 0.9, 0.55).rotation.z = Math.PI / 2;
      for (const x of [-2.7, 2.7]) add(new SphereGeometry(0.85, 20, 12, 0, Math.PI), M.dark, n, x, Y + 0.9, 0.55).rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      add(new CylinderGeometry(0.3, 0.3, 0.5, 16), M.blue, n, -2.2, Y + 0.9, 1.4).rotation.x = Math.PI / 2;
    });

  part(g, parts, "Condenser shell",
    "Condenser water carries the absorbed heat plus the compressor's work away to the cooling tower.",
    [0, 0, -3.2], (n) => {
      add(new CylinderGeometry(0.95, 0.95, 5.4, 28), M.panel, n, 0, Y - 0.15, -0.4).rotation.z = Math.PI / 2;
      for (const x of [-2.7, 2.7]) add(new SphereGeometry(0.95, 20, 12, 0, Math.PI), M.dark, n, x, Y - 0.15, -0.4).rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      add(new CylinderGeometry(0.3, 0.3, 0.5, 16), M.green, n, -2.2, Y - 0.15, -1.3).rotation.x = Math.PI / 2;
    });

  group(g, parts, "Compressor & motor",
    "Draws low-pressure vapour from the evaporator and compresses it hot and high-pressure — the machine's engine. Drill in for its internals.",
    [-0.3, 3.4, 0.2], (n, subs) => {
      part(n, subs, "Compressor housing",
        "The semi-hermetic casing that seals the motor and compression set inside the refrigerant atmosphere.",
        [0, 2.2, 0], (m) => {
          add(new CylinderGeometry(0.62, 0.62, 2.6, 24), clear({ c: 0x8d97a1, m: 0.7, o: 0.5 }), m, -0.2, Y + 2.1, 0.2).rotation.z = Math.PI / 2;
          add(new CylinderGeometry(0.64, 0.64, 0.12, 24), M.dark, m, 1.15, Y + 2.1, 0.2).rotation.z = Math.PI / 2;
          add(new BoxGeometry(0.3, 0.5, 0.5), M.trim, m, 1.5, Y + 2.1, 0.2);
        });
      part(n, subs, "Rotor / scroll set",
        "The moving compression element — as it turns it squeezes the refrigerant vapour up to high pressure.",
        [0, 0, 2.4], (m) => {
          m.position.set(0.4, Y + 2.1, 0.2);
          const w = new Group(); w.userData.spinAxis = "x"; m.add(w);
          add(new CylinderGeometry(0.5, 0.5, 0.9, 20), M.bright, w).rotation.z = Math.PI / 2;
          for (let i = 0; i < 3; i++) add(new TorusGeometry(0.34, 0.05, 8, 24, Math.PI * 1.6), M.dark, w, -0.2 + i * 0.2, 0, 0).rotation.y = Math.PI / 2;
          spin.push(w);
        });
      part(n, subs, "Motor stator & windings",
        "Copper windings in a laminated stator turn electricity into the torque that drives the rotor.",
        [-2.4, 0, 0], (m) => {
          add(new CylinderGeometry(0.55, 0.55, 0.9, 24), M.dark, m, -1.0, Y + 2.1, 0.2).rotation.z = Math.PI / 2;
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2;
            add(new CylinderGeometry(0.07, 0.07, 0.9, 8), M.copper, m, -1.0, Y + 2.1 + Math.cos(a) * 0.42, 0.2 + Math.sin(a) * 0.42).rotation.z = Math.PI / 2; }
        });
      part(n, subs, "Oil sump & pump",
        "A reservoir of lubricant with a pump that keeps the bearings and rotor running on an oil film.",
        [0, -1.8, 0], (m) => {
          add(new BoxGeometry(1.2, 0.5, 0.7), M.trim, m, 0.2, Y + 1.5, 0.2);
          add(new CylinderGeometry(0.12, 0.12, 0.4, 12), M.dark, m, -0.4, Y + 1.45, 0.2);
        });
    });

  part(g, parts, "Refrigerant piping & expansion valve",
    "Carries refrigerant between shells; the expansion valve drops its pressure so it can boil cold again.",
    [2.6, 1.8, 0], (n) => {
      add(new CylinderGeometry(0.16, 0.16, 1.4, 16), M.copper, n, -1.1, Y + 1.6, 0.55);
      add(new CylinderGeometry(0.16, 0.16, 1.2, 16), M.copper, n, 1.1, Y + 1.55, 0.2);
      add(new BoxGeometry(0.3, 0.3, 0.3), M.yellow, n, 1.1, Y + 0.9, 0.4);
    });

  part(g, parts, "Control panel",
    "The microprocessor reads pressures and temperatures and drives the compressor to hold the chilled-water setpoint.",
    [3.6, 0, 0], (n) => {
      add(new BoxGeometry(0.3, 1.4, 1.1), M.trim, n, 3.15, Y + 0.6, 0.4);
      add(new BoxGeometry(0.05, 0.6, 0.8), M.blue, n, 3.32, Y + 0.8, 0.4);
    });

  return { group: g, parts, spin };
};

/* ============================ COOLING TOWER ============================== */
ASSEMBLY.tower = () => {
  const g = new Group(); const parts = []; const spin = [];

  part(g, parts, "Structural stand",
    "Steel legs and a deck raise the tower so its cold-water basin can gravity-drain back to the plant.",
    [0, -2.4, 0], (n) => {
      for (const sx of [-2, 2]) for (const sz of [-2, 2]) add(new BoxGeometry(0.18, 1.0, 0.18), M.trim, n, sx, 0.5, sz);
      add(new BoxGeometry(4.7, 0.18, 4.7), M.trim, n, 0, 1.0, 0);
    });

  part(g, parts, "Cold-water basin",
    "Collects the cooled water at the bottom and holds the sump the condenser pumps draw from.",
    [0, -1.4, 0], (n) => add(new BoxGeometry(4.8, 0.7, 4.8), M.dark, n, 0, 1.45, 0));

  part(g, parts, "Fill / wet deck media",
    "A honeycomb pack spreads the hot water into a thin film over huge surface area for evaporation.",
    [0, 0, 4.0], (n) => {
      add(new BoxGeometry(3.8, 1.8, 3.8), MEDIA, n, 0, 3.2, 0);
      for (let i = 0; i < 8; i++) add(new BoxGeometry(3.8, 0.03, 3.8), M.trim, n, 0, 2.4 + i * 0.22, 0);
    });

  part(g, parts, "Intake louvers",
    "Air louvers around the base let the induced draught in while keeping water spray inside.",
    [0, 0, -4.2], (n) => {
      for (let i = 0; i < 6; i++) { const y = 2.15 + i * 0.3;
        for (const s of [1, -1]) { add(new BoxGeometry(4.0, 0.16, 0.12), M.dark, n, 0, y, s * 2.12).rotation.x = s * 0.5;
          add(new BoxGeometry(0.12, 0.16, 4.0), M.dark, n, s * 2.12, y, 0).rotation.z = -s * 0.5; } }
    });

  part(g, parts, "Casing",
    "The galvanized shell contains the wetted section and directs all airflow up through the fill.",
    [-4.4, 0, 0], (n) => add(new BoxGeometry(4.2, 3.3, 4.2), new MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.45 }), n, 0, 3.55, 0));

  part(g, parts, "Spray header",
    "Distribution nozzles rain the hot return water evenly across the top of the fill.",
    [0, 1.6, 0], (n) => {
      add(new CylinderGeometry(0.14, 0.14, 3.6, 16), M.blue, n, 0, 4.6, 0).rotation.z = Math.PI / 2;
      for (let i = -1; i <= 1; i++) add(new CylinderGeometry(0.14, 0.14, 3.6, 16), M.blue, n, 0, 4.6, i * 1.2).rotation.x = Math.PI / 2;
    });

  part(g, parts, "Drift eliminators",
    "Zig-zag blades above the fill strip water droplets out of the leaving air so they fall back, not blow away.",
    [0, 2.2, 0], (n) => { for (let i = 0; i < 6; i++) add(new BoxGeometry(3.6, 0.5, 0.08), M.panel, n, 0, 4.7, -1.5 + i * 0.6).rotation.x = 0.5; });

  group(g, parts, "Fan drive",
    "The induced-draught fan and the gearbox and motor that turn it. Drill in for each.",
    [0, 3.2, 0], (n, subs) => {
      part(n, subs, "Gearbox & driveshaft",
        "A right-angle gearbox and shaft let a motor at the side turn the big fan slowly and quietly.",
        [3.4, 0, 0], (m) => {
          add(new BoxGeometry(0.6, 0.6, 0.6), M.dark, m, 0, 5.3, 0);
          add(new CylinderGeometry(0.1, 0.1, 2.0, 12), M.bright, m, 1.2, 5.3, 0).rotation.z = Math.PI / 2;
          add(new CylinderGeometry(0.4, 0.4, 0.5, 20), M.blue, m, 2.3, 5.3, 0).rotation.z = Math.PI / 2;
        });
      part(n, subs, "Induced-draught fan",
        "An axial fan on the deck pulls air up through the fill, driving the evaporation that rejects the heat.",
        [0, 2.2, 0], (m) => {
          m.position.set(0, 5.9, 0);
          add(new CylinderGeometry(1.6, 1.95, 1.15, 36, 1, true), M.panel, m, 0, 0.1, 0);
          const w = new Group(); w.userData.spinAxis = "y"; m.add(w);
          add(new CylinderGeometry(0.26, 0.26, 0.34, 18), M.dark, w);
          for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2;
            const bl = add(new BoxGeometry(1.5, 0.05, 0.58), M.dark, w, Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85);
            bl.rotation.y = -a; bl.rotation.x = 0.38; }
          spin.push(w);
        });
    });

  return { group: g, parts, spin };
};

/* ============================ CENTRIFUGAL PUMP ========================== */
ASSEMBLY.pump = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.05;

  part(g, parts, "Baseplate",
    "A rigid common bed keeps the motor and pump shafts aligned and takes the reaction loads.",
    [0, -1.4, 0], (n) => add(new BoxGeometry(3.8, 0.35, 1.4), M.yellow, n, 0, 0.18, 0));

  const motor = part(g, parts, "Electric motor",
    "Spins the shaft; its speed (often on a VFD) sets the flow the pump delivers.",
    [2.8, 0.6, 0], (n) => {
      add(new CylinderGeometry(0.62, 0.62, 2.0, 28), M.blue, n, 1.05, Y, 0).rotation.z = Math.PI / 2;
      for (let i = 0; i < 12; i++) add(new BoxGeometry(0.04, 0.5, 0.04), M.dark, n, 0.4 + i * 0.12, Y, 0.63);
      add(new BoxGeometry(0.45, 0.5, 0.55), M.dark, n, 1.05, Y + 0.62, 0);
      add(new CylinderGeometry(0.5, 0.5, 0.16, 24), M.dark, n, 2.1, Y, 0).rotation.z = Math.PI / 2;
    });

  part(g, parts, "Coupling & guard",
    "A flexible coupling links motor to pump shaft; the guard is the safety cage over it.",
    [0, 1.4, 0], (n) => add(new BoxGeometry(0.55, 0.7, 0.72), M.trim, n, -0.1, Y, 0));

  const imp = part(g, parts, "Impeller",
    "The spinning vaned wheel — it flings water outward, adding the velocity that becomes pressure.",
    [-1.6, 0, 1.8], (n) => {
      n.position.set(-1.2, Y, 0);
      const w = new Group(); w.userData.spinAxis = "x"; n.add(w);
      add(new CylinderGeometry(0.55, 0.55, 0.12, 24), M.bright, w).rotation.z = Math.PI / 2;
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2;
        add(new BoxGeometry(0.06, 0.44, 0.16), M.bright, w, 0, Math.cos(a) * 0.34, Math.sin(a) * 0.34).rotation.x = a + 0.5; }
      spin.push(w);
    });

  part(g, parts, "Volute casing",
    "The spiral housing collects the fast water and slows it, converting velocity into discharge pressure.",
    [-1.2, 0, -1.9], (n) => {
      add(new CylinderGeometry(0.9, 0.9, 0.62, 32), M.dark, n, -1.2, Y, 0).rotation.z = Math.PI / 2;
      add(new TorusGeometry(0.64, 0.3, 16, 32), M.dark, n, -1.2, Y, 0).rotation.y = Math.PI / 2;
    });

  group(g, parts, "Shaft & seal assembly",
    "Carries the impeller and keeps the casing water-tight around the turning shaft. Drill in for the detail.",
    [-1.2, 1.8, 0], (n, subs) => {
      part(n, subs, "Shaft & bearing housing",
        "Carries the impeller on the motor shaft and locates it on bearings against thrust and radial load.",
        [0, 1.4, 0], (m) => {
          add(new CylinderGeometry(0.16, 0.16, 0.9, 16), M.bright, m, -0.55, Y, 0).rotation.z = Math.PI / 2;
          add(new CylinderGeometry(0.3, 0.3, 0.4, 20), M.dark, m, -0.55, Y, 0).rotation.z = Math.PI / 2;
        });
      part(n, subs, "Mechanical seal",
        "Seals the rotating shaft where it enters the casing so water can't leak out along it.",
        [0, 0, 1.6], (m) => add(new CylinderGeometry(0.22, 0.22, 0.16, 20), M.yellow, m, -0.78, Y, 0).rotation.z = Math.PI / 2);
    });

  part(g, parts, "Suction & discharge nozzles",
    "Water enters axially at the front (suction) and leaves under pressure from the top (discharge).",
    [-2.6, 1.4, 0], (n) => {
      add(new CylinderGeometry(0.44, 0.44, 0.5, 22), M.dark, n, -1.95, Y, 0).rotation.z = Math.PI / 2;
      add(new CylinderGeometry(0.52, 0.52, 0.1, 22), M.bright, n, -2.2, Y, 0).rotation.z = Math.PI / 2;
      add(new CylinderGeometry(0.34, 0.34, 0.95, 22), M.dark, n, -1.2, Y + 0.9, 0);
      add(new CylinderGeometry(0.42, 0.42, 0.1, 22), M.bright, n, -1.2, Y + 1.4, 0);
    });

  return { group: g, parts, spin };
};

/* ============================ CENTRIFUGAL FAN ========================== */
ASSEMBLY.fan = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.9;

  part(g, parts, "Mounting wall & inlet cone",
    "Bolts the fan to the bulkhead; the bell-mouth inlet feeds air smoothly into the wheel's eye.",
    [-1.8, 0, 0], (n) => {
      add(new BoxGeometry(0.3, 3.2, 3.2), M.trim, n, -1.2, Y, 0);
      add(new TorusGeometry(1.3, 0.16, 16, 44), M.dark, n, -1.0, Y, 0).rotation.y = Math.PI / 2;
    });

  part(g, parts, "Scroll housing",
    "The volute scroll gathers air thrown off the wheel and turns it into a pressurised outlet stream.",
    [0, 1.8, 0], (n) => add(new CylinderGeometry(1.3, 1.3, 0.5, 44, 1, true), M.dark, n, -0.75, Y, 0).rotation.z = Math.PI / 2);

  const wheel = part(g, parts, "Backward-curved wheel",
    "The impeller — its curved blades accelerate the air; blade shape sets efficiency and pressure.",
    [0, 0, 2.2], (n) => {
      n.position.set(-0.7, Y, 0);
      const w = new Group(); w.userData.spinAxis = "x"; n.add(w);
      add(new TorusGeometry(1.05, 0.08, 10, 32), M.panel, w).rotation.y = Math.PI / 2;
      add(new TorusGeometry(1.05, 0.08, 10, 32), M.panel, w, -0.5, 0, 0).rotation.y = Math.PI / 2;
      add(new CylinderGeometry(0.24, 0.24, 0.7, 18), M.dark, w).rotation.z = Math.PI / 2;
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2;
        const b = add(new BoxGeometry(0.58, 0.36, 0.04), M.panel, w, -0.25, Math.cos(a) * 0.82, Math.sin(a) * 0.82);
        b.rotation.x = a; b.rotation.z = 0.6; }
      spin.push(w);
    });

  group(g, parts, "Drive assembly",
    "Everything that turns the wheel: the shaft on its bearings, and the motor and belt. Drill in for each.",
    [1.6, 1.4, 0], (n, subs) => {
      part(n, subs, "Shaft & bearings",
        "The wheel spins on this shaft, held by pillow-block bearings that carry the load.",
        [0, 1.4, 0], (m) => {
          add(new CylinderGeometry(0.1, 0.1, 1.7, 14), M.bright, m, 0.1, Y, 0).rotation.z = Math.PI / 2;
          for (const x of [-0.4, 0.6]) add(new BoxGeometry(0.28, 0.42, 0.4), M.trim, m, x, Y - 0.25, 0);
        });
      part(n, subs, "Motor & belt drive",
        "The motor turns the wheel through a belt and pulleys, whose ratio sets the fan speed.",
        [1.8, 0, 0], (m) => {
          add(new CylinderGeometry(0.4, 0.4, 1.0, 20), M.blue, m, 0.4, Y, 0).rotation.z = Math.PI / 2;
          for (const a of [0, 2.1, 4.2]) add(new BoxGeometry(1.2, 0.08, 0.08), M.dark, m, -0.2, Y + Math.cos(a) * 1.1, Math.sin(a) * 1.1).rotation.x = a;
          add(new CylinderGeometry(0.28, 0.28, 0.08, 16), M.bright, m, -0.15, Y, 0).rotation.z = Math.PI / 2;
        });
    });

  return { group: g, parts, spin };
};

/* ============================ FIRE-TUBE BOILER ========================== */
ASSEMBLY.boiler = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.8;

  part(g, parts, "Skid base",
    "The steel base carries the pressure vessel and sets it level on the plant-room floor.",
    [0, -1.6, 0], (n) => add(new BoxGeometry(5.4, 0.4, 2.2), M.trim, n, 0, 0.2, 0));

  part(g, parts, "Pressure-vessel shell",
    "The water jacket — combustion heat passes through the tubes into this water to raise steam or hot water.",
    [0, 0, 3.2], (n) => {
      add(new CylinderGeometry(1.3, 1.3, 4.2, 32), new MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.5, roughness: 0.45, transparent: true, opacity: 0.5 }), n, 0, Y, 0).rotation.z = Math.PI / 2;
      add(new CylinderGeometry(1.34, 1.34, 0.25, 32), M.dark, n, 2.15, Y, 0).rotation.z = Math.PI / 2;
    });

  part(g, parts, "Fire tubes & furnace",
    "Hot combustion gases race through these tubes (and the furnace); their surface transfers heat to the water.",
    [0, 0, 3.2], (n) => {
      add(new CylinderGeometry(0.55, 0.55, 4.0, 24), FLAME, n, 0, Y - 0.35, 0).rotation.z = Math.PI / 2;
      for (const sy of [0.5, -0.55]) for (const sz of [0.5, -0.5]) add(new CylinderGeometry(0.16, 0.16, 4.0, 12), M.dark, n, 0, Y + sy, sz).rotation.z = Math.PI / 2;
    });

  group(g, parts, "Burner & blower",
    "Mixes fuel with forced air and fires it into the furnace. Drill in for its parts.",
    [-3.6, 0, 0], (n, subs) => {
      part(n, subs, "Forced-draught blower",
        "A fan that supplies the combustion air the burner needs to fire cleanly.",
        [-2.0, 0, 0], (m) => {
          const w = new Group(); w.position.set(-3.45, Y - 0.2, 0); w.userData.spinAxis = "x"; m.add(w);
          add(new CylinderGeometry(0.72, 0.72, 0.7, 24), M.blue, w).rotation.z = Math.PI / 2;
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2;
            add(new BoxGeometry(0.1, 0.5, 0.16), M.bright, w, 0, Math.cos(a) * 0.4, Math.sin(a) * 0.4).rotation.x = a; }
          spin.push(w);
        });
      part(n, subs, "Fuel gun & blast tube",
        "Sprays and mixes the fuel and projects the flame into the furnace throat.",
        [0, -1.6, 0], (m) => add(new CylinderGeometry(0.5, 0.5, 1.0, 24), M.blue, m, -2.95, Y - 0.2, 0).rotation.z = Math.PI / 2);
      part(n, subs, "Flame-safeguard control",
        "Proves the flame and sequences ignition, shutting the fuel off safely if it fails.",
        [0, 1.8, 0], (m) => add(new BoxGeometry(0.4, 0.9, 0.55), M.trim, m, -3.2, Y + 0.7, 0));
    });

  part(g, parts, "Front tube sheet & smokebox",
    "The drilled plate the fire tubes land in, and the smokebox that turns the gases into the next pass.",
    [-3.4, 1.6, 0], (n) => {
      add(new CylinderGeometry(1.32, 1.32, 0.2, 32), M.bright, n, -2.05, Y, 0).rotation.z = Math.PI / 2;
      for (const sy of [0.5, -0.55]) for (const sz of [0.5, -0.5]) add(new CylinderGeometry(0.18, 0.18, 0.2, 12), M.dark, n, -2.05, Y + sy, sz).rotation.z = Math.PI / 2;
    });

  part(g, parts, "Safety relief valve",
    "A spring valve that lifts to release pressure if the boiler ever exceeds its safe limit.",
    [0, 3.0, 0.0], (n) => {
      add(new CylinderGeometry(0.14, 0.14, 0.4, 14), M.bright, n, -0.9, Y + 1.5, 0);
      add(new BoxGeometry(0.2, 0.2, 0.5), M.dark, n, -0.9, Y + 1.75, 0);
    });

  part(g, parts, "Flue stack",
    "Vents the spent combustion gases safely up and out after they've given up their heat.",
    [0, 3.6, 0], (n) => {
      add(new CylinderGeometry(0.5, 0.5, 2.4, 24), M.dark, n, 1.5, Y + 2.2, 0);
      add(new CylinderGeometry(0.58, 0.58, 0.2, 24), M.dark, n, 1.5, Y + 3.4, 0);
    });

  part(g, parts, "Water connections & controls",
    "Supply and return nozzles tie the boiler into the heating loop; the panel runs the burner to setpoint.",
    [0, 1.6, 1.6], (n) => {
      for (const x of [-0.6, 0.6]) add(new CylinderGeometry(0.24, 0.24, 0.7, 16), M.dark, n, x, Y + 1.5, 0);
      add(new BoxGeometry(0.9, 1.1, 0.25), M.trim, n, -0.2, Y + 0.2, 1.35);
      add(new BoxGeometry(0.5, 0.5, 0.05), M.blue, n, -0.2, Y + 0.35, 1.5);
    });

  return { group: g, parts, spin };
};

/* ============================ AIR-SOURCE HEAT PUMP ===================== */
ASSEMBLY.heatpump = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.7;

  part(g, parts, "Cabinet",
    "The powder-coated weatherproof enclosure houses the refrigerant circuit outdoors.",
    [0, 3.2, 0], (n) => {
      add(new BoxGeometry(3.4, 3.0, 1.9), new MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.55, roughness: 0.45, transparent: true, opacity: 0.4 }), n, 0, Y, 0);
      add(new BoxGeometry(3.46, 0.12, 1.96), M.trim, n, 0, Y + 1.5, 0);
    });

  part(g, parts, "Condenser / evaporator coil",
    "The finned outdoor coil exchanges heat with the air — absorbing it in heating, rejecting it in cooling.",
    [-3.0, 0, 0], (n) => {
      for (const sx of [-1.71, 1.71]) for (let i = 0; i < 13; i++) add(new BoxGeometry(0.02, 2.5, 0.05), M.dark, n, sx, Y, -0.82 + i * 0.137);
    });

  const fan = part(g, parts, "Fan & grille",
    "The propeller fan pulls outdoor air across the coil; the grille guards it and shapes the discharge.",
    [0, 0, 2.6], (n) => {
      add(new TorusGeometry(1.05, 0.08, 12, 44), M.trim, n, -0.55, Y + 0.35, 0.95);
      for (let r = 0.3; r < 1.0; r += 0.26) add(new TorusGeometry(r, 0.018, 8, 36), M.dark, n, -0.55, Y + 0.35, 0.94);
      const w = new Group(); w.position.set(-0.55, Y + 0.35, 0.9); w.userData.spinAxis = "z"; n.add(w);
      add(new CylinderGeometry(0.16, 0.16, 0.24, 16), M.dark, w).rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2;
        add(new BoxGeometry(0.32, 0.86, 0.04), M.dark, w, Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0).rotation.z = a + 0.4; }
      spin.push(w);
    });

  group(g, parts, "Refrigerant circuit",
    "The sealed loop that moves heat: compressor, valves and accumulator. Drill in for each.",
    [1.9, 0.4, 1.4], (n, subs) => {
      part(n, subs, "Compressor",
        "Compresses the refrigerant vapour, driving the heat-pump cycle that moves heat against its natural direction.",
        [0, -1.6, 0], (m) => {
          add(new CylinderGeometry(0.42, 0.42, 1.0, 24), M.dark, m, 0.75, Y - 0.6, 0);
          const w = new Group(); w.position.set(0.75, Y - 0.6, 0); w.userData.spinAxis = "y"; m.add(w);
          add(new CylinderGeometry(0.2, 0.2, 0.3, 12), M.blue, w);
          spin.push(w);
        });
      part(n, subs, "Reversing valve & expansion valve",
        "The reversing valve swaps heating and cooling; the expansion valve meters refrigerant into the coil.",
        [0, 1.6, 0], (m) => {
          add(new CylinderGeometry(0.16, 0.16, 0.8, 16), M.copper, m, 0.75, Y + 0.5, 0).rotation.z = Math.PI / 2;
          add(new BoxGeometry(0.3, 0.3, 0.3), M.yellow, m, 0.4, Y + 0.5, 0);
        });
      part(n, subs, "Accumulator",
        "A suction-line vessel that holds back liquid refrigerant so only vapour reaches the compressor.",
        [1.8, 0, 0], (m) => {
          add(new CylinderGeometry(0.28, 0.28, 0.9, 20), M.bright, m, 0.2, Y - 0.2, 0.5);
          add(new SphereGeometry(0.28, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.bright, m, 0.2, Y + 0.25, 0.5);
        });
    });

  return { group: g, parts, spin };
};

const glassMat = () => new MeshStandardMaterial({ color: 0x27384a, metalness: 0.1, roughness: 0.06, transparent: true, opacity: 0.32 });
const absMat   = () => new MeshStandardMaterial({ color: 0x10141b, metalness: 0.35, roughness: 0.55 });
const cellMat  = () => new MeshStandardMaterial({ color: 0x1a2b4c, metalness: 0.45, roughness: 0.32 });
const clear    = (o) => new MeshStandardMaterial({ color: o.c ?? 0xcfd6dc, metalness: o.m ?? 0.6, roughness: o.r ?? 0.45, transparent: true, opacity: o.o ?? 0.45 });

/* ============================ VAV TERMINAL BOX ======================== */
ASSEMBLY.vav = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.6;

  part(g, parts, "Casing",
    "The sheet-metal box mounted above the ceiling that houses the damper and reheat coil.",
    [0, 1.8, 0], (n) => {
      add(new BoxGeometry(2.6, 1.3, 1.3), clear({ c: 0xc9d0d6, m: 0.8, o: 0.45 }), n, 0, Y, 0);
      add(new BoxGeometry(0.75, 1.2, 1.2), M.trim, n, 1.15, Y, 0);
    });

  part(g, parts, "Inlet damper & actuator",
    "A single blade throttles the primary supply air; the actuator sets its angle to the zone's demand.",
    [-2.6, 0, 0], (n) => {
      add(new CylinderGeometry(0.55, 0.55, 0.6, 24), M.galv, n, -1.5, Y, 0).rotation.z = Math.PI / 2;
      add(new CylinderGeometry(0.58, 0.58, 0.12, 24), M.dark, n, -1.75, Y, 0).rotation.z = Math.PI / 2;
      const blade = add(new CylinderGeometry(0.5, 0.5, 0.05, 24), M.bright, n, -1.5, Y, 0);
      blade.rotation.z = Math.PI / 2; blade.rotation.y = 0.5;
      add(new BoxGeometry(0.5, 0.4, 0.4), M.yellow, n, -0.5, Y + 0.85, 0);
      add(new CylinderGeometry(0.06, 0.06, 0.5, 12), M.dark, n, -0.5, Y + 0.55, 0);
    });

  part(g, parts, "Reheat coil",
    "A hot-water or electric coil that re-warms the supply air when the zone calls for heat.",
    [0, 0, 2.4], (n) => {
      for (let i = 0; i < 8; i++) add(new BoxGeometry(0.04, 1.0, 1.0), M.copper, n, 0.9 + i * 0.08, Y, 0);
      for (const z of [0.45, -0.45]) add(new CylinderGeometry(0.1, 0.1, 0.5, 12), M.copper, n, 1.15, Y + 0.75, z);
    });

  part(g, parts, "DDC controller",
    "Reads the zone thermostat and the box's airflow, then drives the damper to hold setpoint.",
    [0, -1.8, 0], (n) => {
      add(new BoxGeometry(0.4, 0.5, 0.08), M.trim, n, 0.2, Y - 0.2, 0.7);
      add(new BoxGeometry(0.3, 0.35, 0.03), M.green, n, 0.2, Y - 0.2, 0.75);
    });

  return { group: g, parts, spin };
};

/* ============================ AIR-COOLED CHILLER ======================= */
ASSEMBLY.aircooled = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.5;

  part(g, parts, "Skid frame",
    "A structural steel base that carries the whole rooftop package and spreads its weight to the curb.",
    [0, -2.4, 0], (n) => add(new BoxGeometry(9.2, 0.4, 3.0), M.trim, n, 0, 0.2, 0));

  part(g, parts, "Evaporator barrel",
    "Building chilled water flows through this shell while refrigerant boils around it, absorbing the load.",
    [0, -3.2, 0], (n) => {
      add(new CylinderGeometry(0.7, 0.7, 7.6, 24), M.bright, n, 0, Y - 0.2, 0).rotation.z = Math.PI / 2;
      for (const z of [1.2, -1.1]) add(new CylinderGeometry(0.24, 0.24, 0.5, 16), M.blue, n, -3.6, Y - 0.2, z).rotation.x = Math.PI / 2;
    });

  part(g, parts, "Casing",
    "The painted sheet-metal body that ties the coils, fans and compressors into one weatherproof unit.",
    [0, 0, 3.4], (n) => add(new BoxGeometry(8.6, 1.9, 2.6), clear({}), n, 0, Y, 0));

  group(g, parts, "Condenser section",
    "Rejects the heat straight to the outdoor air. Drill in for the V-coils and the fan row.",
    [0, 2.4, 0], (n, subs) => {
      part(n, subs, "Condenser coils (V-bank)",
        "Micro-channel coils in a V reject the refrigerant's heat straight to the outdoor air — no water needed.",
        [0, 0, 2.6], (m) => {
          for (const s of [1, -1]) for (let i = 0; i < 10; i++)
            add(new BoxGeometry(0.72, 1.7, 0.03), M.dark, m, -3.6 + i * 0.8, Y, s * 1.45).rotation.y = s * 0.32;
        });
      part(n, subs, "Condenser fans",
        "A row of up-blast axial fans pulls air across the coils and drives it out of the top.",
        [0, 2.2, 0], (m) => {
          for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) {
            add(new TorusGeometry(0.72, 0.07, 12, 34), M.trim, m, x, Y + 1.0, 0).rotation.x = Math.PI / 2;
            const w = new Group(); w.position.set(x, Y + 1.05, 0); w.userData.spinAxis = "y"; m.add(w);
            add(new CylinderGeometry(0.12, 0.12, 0.24, 14), M.dark, w);
            for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2;
              add(new BoxGeometry(0.6, 0.04, 0.24), M.dark, w, Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36).rotation.y = -a; }
            spin.push(w);
          }
        });
    });

  part(g, parts, "Compressors & controls",
    "Scroll compressors squeeze the refrigerant vapour; the panel stages them to match the cooling demand.",
    [4.4, 0, 0], (n) => {
      add(new BoxGeometry(0.7, 1.7, 2.7), M.trim, n, 4.5, Y, 0);
      add(new BoxGeometry(0.05, 0.8, 1.2), M.blue, n, 4.86, Y + 0.2, 0);
      for (const z of [0.7, -0.7]) add(new CylinderGeometry(0.34, 0.34, 0.8, 20), M.dark, n, 4.2, Y - 0.4, z);
    });

  return { group: g, parts, spin };
};

/* ============================ THERMAL STORAGE TANK ==================== */
ASSEMBLY.tes = () => {
  const g = new Group(); const parts = []; const spin = [];

  part(g, parts, "Insulated shell",
    "A tall welded tank, clad and insulated, holding thousands of tonnes of chilled water.",
    [-4.5, 0, 0], (n) => {
      add(new CylinderGeometry(2.0, 2.0, 7.0, 44), clear({ o: 0.4 }), n, 0, 3.7, 0);
      for (let i = 0; i < 6; i++) add(new TorusGeometry(2.01, 0.03, 8, 44), M.dark, n, 0, 1.1 + i * 1.05, 0).rotation.x = Math.PI / 2;
    });

  part(g, parts, "Domed top & manway",
    "The dished roof closes the vessel; the manway gives access for inspection and the vent.",
    [0, 2.6, 0], (n) => {
      add(new SphereGeometry(2.0, 44, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.panel, n, 0, 7.2, 0);
      add(new CylinderGeometry(0.5, 0.5, 0.3, 20), M.trim, n, 0, 8.35, 0);
    });

  part(g, parts, "Upper diffuser",
    "A ring header that lays warm return water gently on top so it never mixes with the cold below.",
    [0, 1.4, 3.4], (n) => {
      add(new TorusGeometry(1.6, 0.08, 10, 36), M.blue, n, 0, 6.2, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2;
        add(new BoxGeometry(0.5, 0.04, 0.1), M.blue, n, Math.cos(a) * 1.6, 6.2, Math.sin(a) * 1.6).rotation.y = -a; }
    });

  part(g, parts, "Lower diffuser",
    "A matching ring near the floor draws off the coldest water to feed the plant — the thermocline stays sharp.",
    [0, -1.4, 3.4], (n) => {
      add(new TorusGeometry(1.6, 0.08, 10, 36), M.bright, n, 0, 1.0, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2;
        add(new BoxGeometry(0.5, 0.04, 0.1), M.bright, n, Math.cos(a) * 1.6, 1.0, Math.sin(a) * 1.6).rotation.y = -a; }
    });

  part(g, parts, "Nozzles & connections",
    "Top and bottom nozzles tie the tank into the chilled-water loop for charge and discharge.",
    [3.4, 0, 0], (n) => {
      add(new CylinderGeometry(0.3, 0.3, 0.5, 16), M.dark, n, 0.9, 7.9, 0);
      add(new CylinderGeometry(0.36, 0.36, 0.7, 16), M.dark, n, 1.9, 0.6, 0).rotation.z = Math.PI / 2;
    });

  part(g, parts, "Access ladder",
    "A caged ladder up the side for the manway and instrument work.",
    [3.6, 0, 0], (n) => {
      for (const sz of [0.2, -0.2]) add(new CylinderGeometry(0.04, 0.04, 6.6, 8), M.dark, n, 2.06, 3.7, sz);
      for (let i = 0; i < 11; i++) add(new BoxGeometry(0.05, 0.05, 0.5), M.dark, n, 2.06, 0.9 + i * 0.55, 0);
    });

  return { group: g, parts, spin };
};

/* ============================ PACKAGED ROOFTOP UNIT ================== */
ASSEMBLY.rtu = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.75;

  part(g, parts, "Roof curb",
    "A raised, insulated frame that mounts the unit and carries supply and return duct through the roof.",
    [0, -2.2, 0], (n) => add(new BoxGeometry(7.2, 0.5, 3.4), M.trim, n, 0, 0.25, 0));

  part(g, parts, "Cabinet",
    "The weatherproof outer casing that divides the unit into condenser, supply-air and fresh-air sections.",
    [0, 3.2, 0], (n) => {
      add(new BoxGeometry(6.8, 2.3, 3.2), clear({ o: 0.4 }), n, 0, Y, 0);
      add(new BoxGeometry(6.84, 0.12, 3.24), M.trim, n, 0, Y + 1.2, 0);
    });

  group(g, parts, "Condenser coil & fans",
    "Rejects the heat the unit collects indoors. Drill in for the fans and the coil.",
    [3.0, 2.4, 0], (n, subs) => {
      part(n, subs, "Condenser fans",
        "Up-blast axial fans that pull outdoor air up through the condenser coil.",
        [0, 2.2, 0], (m) => {
          for (const x of [1.4, 3.0]) {
            add(new TorusGeometry(0.95, 0.08, 12, 40), M.trim, m, x, Y + 1.25, 0).rotation.x = Math.PI / 2;
            const w = new Group(); w.position.set(x, Y + 1.35, 0); w.userData.spinAxis = "y"; m.add(w);
            add(new CylinderGeometry(0.14, 0.14, 0.24, 14), M.dark, w);
            for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2;
              add(new BoxGeometry(0.8, 0.04, 0.3), M.dark, w, Math.cos(a) * 0.48, 0, Math.sin(a) * 0.48).rotation.y = -a; }
            spin.push(w);
          }
        });
      part(n, subs, "Condenser coil",
        "The finned coil where hot high-pressure refrigerant gives up its heat to the passing air.",
        [0, 0, 2.4], (m) => {
          for (const s of [1, -1]) for (let i = 0; i < 10; i++) add(new BoxGeometry(3.2, 0.02, 0.05), M.dark, m, 2.2, Y - 0.9 + i * 0.2, s * 1.61);
        });
    });

  part(g, parts, "Compressor",
    "The DX compressor drives the refrigerant cycle that links the indoor and outdoor coils.",
    [1.2, -2.0, 0], (n) => {
      add(new CylinderGeometry(0.42, 0.42, 1.0, 24), M.dark, n, 1.0, Y - 0.6, 0.6);
      add(new CylinderGeometry(0.42, 0.42, 1.0, 24), M.dark, n, 2.0, Y - 0.6, -0.6);
    });

  const blow = part(g, parts, "Evaporator coil & supply blower",
    "Warm return air is cooled over the DX evaporator coil and pushed back to the space by the blower.",
    [-1.4, 0, 3.4], (n) => {
      for (let i = 0; i < 8; i++) add(new BoxGeometry(0.03, 1.6, 1.8), M.bright, n, -1.9 + i * 0.06, Y, 0);
      const w = new Group(); w.position.set(-0.6, Y, 0); w.userData.spinAxis = "x"; n.add(w);
      add(new TorusGeometry(0.6, 0.06, 10, 28), M.panel, w).rotation.y = Math.PI / 2;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2;
        add(new BoxGeometry(0.34, 0.18, 0.03), M.panel, w, -0.15, Math.cos(a) * 0.48, Math.sin(a) * 0.48).rotation.x = a; }
      spin.push(w);
    });

  part(g, parts, "Fresh-air hood",
    "A louvered intake that brings in outdoor air for ventilation and free cooling when it pays.",
    [-3.8, 0, 0], (n) => {
      add(new BoxGeometry(0.7, 1.4, 2.6), M.panel, n, -3.6, Y + 0.2, 0);
      for (let i = 0; i < 5; i++) add(new BoxGeometry(0.12, 0.16, 2.4), M.dark, n, -3.95, Y - 0.2 + i * 0.28, 0).rotation.z = 0.5;
    });

  part(g, parts, "Supply & return openings",
    "Bottom openings through the curb hand conditioned air to the ducts and take room air back.",
    [0, -3.2, 0], (n) => { for (const cz of [0.7, -0.7]) add(new BoxGeometry(1.4, 0.5, 1.0), M.dark, n, -1.4, 0.25, cz); });

  return { group: g, parts, spin };
};

/* ============================ FAN COIL UNIT ========================= */
ASSEMBLY.fcu = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.9;

  part(g, parts, "Cabinet",
    "The compact casing that hangs above the ceiling and holds the coil, blower and filter.",
    [0, 1.8, 0], (n) => add(new BoxGeometry(3.2, 1.0, 1.5), clear({ c: 0xc9d0d6, m: 0.8, o: 0.45 }), n, 0, Y, 0));

  part(g, parts, "Return grille & filter",
    "Room air is drawn in through the bottom grille and cleaned by a filter before the coil.",
    [0, -1.8, 0], (n) => {
      add(new BoxGeometry(1.7, 0.06, 1.2), M.dark, n, -0.5, Y - 0.52, 0);
      for (let i = 0; i < 7; i++) add(new BoxGeometry(1.6, 0.03, 0.04), M.panel, n, -0.5, Y - 0.5, -0.5 + i * 0.16);
      add(new BoxGeometry(1.5, 0.12, 1.0), MEDIA, n, -0.5, Y - 0.36, 0);
    });

  part(g, parts, "Coil",
    "A 2- or 4-pipe finned coil that cools or heats the passing air from the building water loops.",
    [0, 0, 2.4], (n) => {
      for (let i = 0; i < 8; i++) add(new BoxGeometry(0.03, 0.8, 1.0), M.copper, n, 0.7 + i * 0.06, Y, 0);
      for (const sy of [0.25, -0.25]) add(new CylinderGeometry(0.09, 0.09, 0.5, 12), M.copper, n, 0.9, Y + sy, 0.8);
    });

  part(g, parts, "Blower & motor",
    "A small centrifugal blower on its motor circulates room air through the coil and out the supply.",
    [-2.0, 0, 0], (n) => {
      add(new CylinderGeometry(0.6, 0.6, 0.5, 24, 1, true), M.dark, n, -1.2, Y, 0).rotation.z = Math.PI / 2;
      const w = new Group(); w.position.set(-1.2, Y, 0); w.userData.spinAxis = "x"; n.add(w);
      add(new TorusGeometry(0.4, 0.05, 10, 24), M.bright, w).rotation.y = Math.PI / 2;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2;
        add(new BoxGeometry(0.24, 0.14, 0.03), M.bright, w, 0, Math.cos(a) * 0.32, Math.sin(a) * 0.32).rotation.x = a; }
      spin.push(w);
    });

  part(g, parts, "Supply collar",
    "The discharge connection that hands conditioned air to the ductwork or a grille.",
    [2.2, 0, 0], (n) => add(new BoxGeometry(0.22, 0.75, 1.1), M.dark, n, 1.65, Y, 0));

  return { group: g, parts, spin };
};

/* ============================ PLATE HEAT EXCHANGER ================== */
ASSEMBLY.plateHX = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.45;

  part(g, parts, "Fixed head (frame plate)",
    "The heavy stationary end plate that carries the four nozzles and takes the clamping load.",
    [-2.8, 0, 0], (n) => {
      add(new BoxGeometry(0.36, 2.4, 1.9), M.blue, n, -1.0, Y, 0);
      add(new BoxGeometry(1.7, 0.22, 2.2), M.trim, n, -0.9, 0.11, 0);
    });

  part(g, parts, "Plate pack",
    "Thin corrugated plates stacked in alternation — hot and cold streams flow in the gaps and exchange heat.",
    [0, 0, 2.8], (n) => { for (let i = 0; i < 28; i++) add(new BoxGeometry(0.05, 2.2, 1.8), i % 2 ? M.bright : M.dark, n, -0.78 + i * 0.053, Y, 0); });

  part(g, parts, "Pressure plate (follower)",
    "The movable end plate that the tie-bolts pull against to compress the pack and seal every gasket.",
    [2.8, 0, 0], (n) => add(new BoxGeometry(0.36, 2.4, 1.9), M.blue, n, 0.85, Y, 0));

  part(g, parts, "Tie bolts & carrying bar",
    "Long bolts squeeze the stack to its rated gap; the top bar carries and guides the plates.",
    [0, 2.4, 0], (n) => {
      for (const sy of [0.95, -0.95]) for (const sz of [0.72, -0.72]) add(new CylinderGeometry(0.06, 0.06, 2.5, 12), M.dark, n, 0, Y + sy, sz).rotation.z = Math.PI / 2;
      add(new BoxGeometry(2.7, 0.12, 0.12), M.dark, n, 0, Y + 1.3, 0);
    });

  part(g, parts, "Connection nozzles",
    "Hot-in / hot-out and cold-in / cold-out ports route the two fluids into opposite sets of channels.",
    [-2.4, 1.6, 0], (n) => {
      for (const sy of [0.75, -0.75]) for (const sz of [0.55, -0.55]) {
        add(new CylinderGeometry(0.22, 0.22, 0.5, 16), M.dark, n, -1.35, Y + sy, sz).rotation.z = Math.PI / 2;
        add(new CylinderGeometry(0.28, 0.28, 0.08, 16), M.bright, n, -1.6, Y + sy, sz).rotation.z = Math.PI / 2;
      }
    });

  return { group: g, parts, spin };
};

/* ============================ CONTROL DAMPER ======================= */
ASSEMBLY.damper = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.6;

  part(g, parts, "Frame",
    "The channel frame that mounts in the duct and carries the blade bearings.",
    [0, 0, -1.4], (n) => {
      add(new BoxGeometry(2.6, 0.16, 0.4), M.dark, n, 0, Y + 1.05, 0);
      add(new BoxGeometry(2.6, 0.16, 0.4), M.dark, n, 0, Y - 1.05, 0);
      add(new BoxGeometry(0.16, 2.3, 0.4), M.dark, n, -1.3, Y, 0);
      add(new BoxGeometry(0.16, 2.3, 0.4), M.dark, n, 1.3, Y, 0);
    });

  part(g, parts, "Blades",
    "Airfoil blades that rotate together to throttle the airflow from wide open to shut.",
    [0, 0, 1.8], (n) => { for (let i = 0; i < 5; i++) add(new BoxGeometry(2.5, 0.42, 0.05), M.panel, n, 0, Y - 0.85 + i * 0.42, 0).rotation.x = 0.6; });

  part(g, parts, "Linkage",
    "A jackshaft and crank arms tie every blade together so they move as one.",
    [2.0, 0, 0], (n) => add(new BoxGeometry(0.07, 2.0, 0.07), M.trim, n, 1.28, Y, 0.22));

  part(g, parts, "Actuator",
    "The motor that drives the linkage to a commanded position from the controller's signal.",
    [2.6, 0, 0], (n) => {
      add(new CylinderGeometry(0.06, 0.06, 0.5, 12), M.dark, n, 1.5, Y, 0).rotation.z = Math.PI / 2;
      add(new BoxGeometry(0.55, 0.55, 0.5), M.yellow, n, 1.85, Y, 0);
    });

  return { group: g, parts, spin };
};

/* ============================ CONTROL VALVE ======================= */
ASSEMBLY.valve = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.2;

  part(g, parts, "Body & flanges",
    "The pressure-containing globe body and its pipe flanges — the water path with the throttling port.",
    [0, -1.4, 0], (n) => {
      add(new CylinderGeometry(0.3, 0.3, 3.0, 24), M.dark, n, 0, Y, 0).rotation.z = Math.PI / 2;
      for (const x of [-1.4, 1.4]) add(new CylinderGeometry(0.5, 0.5, 0.16, 24), M.bright, n, x, Y, 0).rotation.z = Math.PI / 2;
      add(new SphereGeometry(0.56, 28, 20), clear({ c: 0x2f6bb0, m: 0.5, o: 0.5 }), n, 0, Y, 0);
    });

  part(g, parts, "Plug & seat",
    "A shaped plug moving against a seat sets the opening — its profile gives the equal-% characteristic.",
    [0, 0.5, 0], (n) => {
      add(new ConeGeometry(0.26, 0.4, 20), M.bright, n, 0, Y + 0.1, 0);
      add(new TorusGeometry(0.24, 0.05, 10, 20), M.dark, n, 0, Y - 0.1, 0).rotation.x = Math.PI / 2;
    });

  part(g, parts, "Bonnet & stem",
    "The bonnet seals the top of the body; the stem carries the plug's motion out to the actuator.",
    [0, 1.6, 0], (n) => {
      add(new CylinderGeometry(0.3, 0.3, 0.5, 18), M.blue, n, 0, Y + 0.55, 0);
      add(new CylinderGeometry(0.08, 0.08, 0.7, 12), M.bright, n, 0, Y + 1.0, 0);
    });

  part(g, parts, "Yoke",
    "The bracket that holds the actuator rigidly above the bonnet, in line with the stem.",
    [0, 2.5, 0], (n) => add(new CylinderGeometry(0.34, 0.34, 0.3, 20), M.trim, n, 0, Y + 1.25, 0));

  part(g, parts, "Electric actuator",
    "Drives the stem to the position the controller asks for, modulating the water flow to the coil.",
    [0, 3.4, 0], (n) => {
      add(new BoxGeometry(0.72, 0.62, 0.72), M.yellow, n, 0, Y + 1.7, 0);
      add(new BoxGeometry(0.3, 0.12, 0.3), M.trim, n, 0.3, Y + 1.7, 0.3);
    });

  return { group: g, parts, spin };
};

/* ============================ DUCT & FITTINGS ===================== */
ASSEMBLY.ducts = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.4;

  part(g, parts, "Rectangular trunk",
    "The main low-velocity duct that carries the bulk airflow from the air handler.",
    [-1.6, 0, 0], (n) => {
      add(new BoxGeometry(3.0, 1.2, 1.2), M.galv, n, -1.2, Y, 0);
      for (const x of [-2.6, 0.2]) add(new BoxGeometry(0.06, 1.3, 1.3), M.dark, n, x, Y, 0);
    });

  part(g, parts, "90° elbow",
    "A turned fitting that redirects the air with turning vanes to keep the pressure loss low.",
    [0.5, 0, 1.6], (n) => add(new BoxGeometry(1.2, 1.2, 1.2), M.galv, n, 0.5, Y, 0));

  part(g, parts, "Riser & transition",
    "A vertical riser and a square-to-round transition adapt the duct to the branch geometry.",
    [0, 1.8, 0], (n) => {
      add(new BoxGeometry(1.2, 2.0, 1.2), M.galv, n, 0.5, Y + 1.5, 0);
      add(new CylinderGeometry(0.55, 0.6, 0.9, 24), M.galv, n, 0.5, Y + 2.7, 0);
    });

  part(g, parts, "Round branch",
    "A round duct off the transition that feeds a run of diffusers.",
    [0, 3.4, 0], (n) => add(new CylinderGeometry(0.5, 0.5, 1.4, 24), M.galv, n, 0.5, Y + 3.6, 0));

  part(g, parts, "Takeoff",
    "A tapped spigot on the trunk that starts a branch to a single outlet.",
    [-1.6, 0, 2.0], (n) => {
      add(new CylinderGeometry(0.32, 0.32, 0.9, 20), M.galv, n, -1.5, Y, 0.9).rotation.x = Math.PI / 2;
      add(new CylinderGeometry(0.4, 0.4, 0.1, 20), M.dark, n, -1.5, Y, 1.3).rotation.x = Math.PI / 2;
    });

  return { group: g, parts, spin };
};

/* ============================ SENSOR & DDC ======================= */
ASSEMBLY.sensor = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.6;

  part(g, parts, "Duct section",
    "The length of duct the measurement is taken in — the point the control system 'feels'.",
    [0, 0, -1.6], (n) => {
      add(new BoxGeometry(2.6, 1.4, 1.4), clear({ c: 0xc9d0d6, m: 0.8, o: 0.4 }), n, -0.5, Y, 0);
      for (const x of [-1.7, 0.7]) add(new BoxGeometry(0.05, 1.5, 1.5), M.dark, n, x, Y, 0);
    });

  part(g, parts, "Temperature probe",
    "A sheathed element in the airstream whose resistance tracks the air temperature.",
    [0, -1.8, 0], (n) => {
      add(new CylinderGeometry(0.05, 0.05, 1.3, 12), M.dark, n, -0.8, Y + 0.05, 0);
      add(new BoxGeometry(0.1, 0.1, 0.3), M.dark, n, -0.8, Y + 0.55, 0);
    });

  part(g, parts, "Sensor enclosure",
    "Houses the transmitter that turns the probe's resistance into a signal for the controller.",
    [0, 1.8, 0], (n) => add(new BoxGeometry(0.55, 0.7, 0.4), M.bright, n, -0.8, Y + 0.9, 0));

  part(g, parts, "DDC controller",
    "The direct-digital controller runs the loop — reading the sensor and driving valves and dampers.",
    [2.4, 0, 0], (n) => {
      add(new BoxGeometry(0.28, 1.5, 1.1), M.trim, n, 1.35, Y, 0);
      add(new BoxGeometry(0.05, 0.5, 0.7), M.green, n, 1.5, Y + 0.35, 0);
    });

  part(g, parts, "Terminal block",
    "The field-wiring landing where sensors and actuators connect to the controller.",
    [2.6, -1.0, 0], (n) => { for (let i = 0; i < 6; i++) add(new BoxGeometry(0.06, 0.08, 0.8), M.bright, n, 1.5, Y - 0.4, -0.35 + i * 0.14); });

  return { group: g, parts, spin };
};

/* ============================ ECONOMIZER / MIXING BOX ============ */
ASSEMBLY.economizer = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.9;

  part(g, parts, "Mixing-box casing",
    "The AHU section where outdoor and return air streams meet and blend before the coils.",
    [0, 3.2, 0], (n) => {
      add(new BoxGeometry(3.4, 3.0, 2.4), clear({ o: 0.4 }), n, 0, Y, 0);
      for (const sx of [-1.7, 1.7]) for (const sz of [-1.2, 1.2]) add(new BoxGeometry(0.1, 3.0, 0.1), M.trim, n, sx, Y, sz);
    });

  group(g, parts, "Mixing dampers",
    "The three dampers that blend and relieve the air streams. Drill in for each.",
    [0, 0, 2.8], (n, subs) => {
      part(n, subs, "Outdoor-air damper",
        "Admits fresh outdoor air; opens wide for free cooling when the outside air is cool and dry.",
        [0, 0, 2.6], (m) => {
          for (let i = 0; i < 6; i++) add(new BoxGeometry(2.4, 0.3, 0.06), M.dark, m, 0, Y - 0.85 + i * 0.34, 1.21).rotation.x = 0.55;
          add(new BoxGeometry(0.5, 0.22, 0.03), M.blue, m, -1.0, Y + 1.2, 1.22);
        });
      part(n, subs, "Return-air damper",
        "Recirculates room air; closes as the outdoor-air damper opens so total flow stays constant.",
        [0, 0, -2.6], (m) => {
          for (let i = 0; i < 6; i++) add(new BoxGeometry(2.4, 0.3, 0.06), M.dark, m, 0, Y - 0.85 + i * 0.34, -1.21).rotation.x = -0.55;
          add(new BoxGeometry(0.5, 0.22, 0.03), M.green, m, -1.0, Y + 1.2, -1.22);
        });
      part(n, subs, "Exhaust-air damper",
        "Relieves the extra outdoor air to keep the building from over-pressurising.",
        [0, 2.4, 0], (m) => { for (let i = 0; i < 5; i++) add(new BoxGeometry(0.3, 0.06, 1.9), M.dark, m, -1.0 + i * 0.5, Y + 1.51, 0).rotation.z = 0.55; });
    });

  part(g, parts, "Actuators & controller",
    "Sequence the three dampers together, choosing mechanical vs. free cooling from the air conditions.",
    [3.4, 0, 0], (n) => {
      add(new BoxGeometry(0.5, 0.5, 0.35), M.yellow, n, 1.45, Y, 1.2);
      add(new BoxGeometry(0.5, 0.5, 0.35), M.yellow, n, -1.4, Y + 1.5, 0.9);
    });

  return { group: g, parts, spin };
};

/* ============================ STEAM HUMIDIFIER ================== */
ASSEMBLY.humidifier = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.7;

  part(g, parts, "Duct section",
    "The stretch of supply duct where the steam is added to the airstream.",
    [0, 2.4, 0], (n) => {
      add(new BoxGeometry(3.0, 1.7, 1.7), clear({ c: 0xc9d0d6, m: 0.8, o: 0.4 }), n, 0.4, Y, 0);
      for (const x of [-1.05, 1.85]) add(new BoxGeometry(0.05, 1.8, 1.8), M.dark, n, x, Y, 0);
    });

  part(g, parts, "Dispersion tube",
    "A stainless manifold with fine orifices that releases dry steam evenly across the duct.",
    [0, 0, 2.4], (n) => {
      add(new CylinderGeometry(0.12, 0.12, 1.6, 20), M.bright, n, 0.4, Y + 0.35, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) add(new CylinderGeometry(0.03, 0.03, 0.14, 8), M.bright, n, 0.4, Y + 0.52, -0.62 + i * 0.25);
    });

  part(g, parts, "Steam canister",
    "A generator that boils treated water into clean steam on demand from the controller.",
    [-2.4, 0, 0], (n) => {
      add(new CylinderGeometry(0.52, 0.52, 1.8, 28), M.dark, n, -1.9, Y - 0.2, 0);
      add(new SphereGeometry(0.52, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.dark, n, -1.9, Y + 0.7, 0);
    });

  part(g, parts, "Controller",
    "Meters steam output to hold the duct or space humidity setpoint.",
    [-2.6, 0, 1.6], (n) => add(new BoxGeometry(0.28, 0.9, 0.6), M.blue, n, -1.9, Y + 0.1, 0.66));

  part(g, parts, "Steam hose",
    "Carries the steam from the canister up to the dispersion tube, sloped so condensate drains back.",
    [-1.4, 1.4, 0], (n) => add(new CylinderGeometry(0.08, 0.08, 1.3, 12), M.trim, n, -0.85, Y + 0.7, 0.4).rotation.z = 0.8);

  return { group: g, parts, spin };
};

/* ============================ DUCT SILENCER ==================== */
ASSEMBLY.silencer = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.6;

  part(g, parts, "Casing",
    "The rigid outer shell that seals the attenuator into the duct run.",
    [0, 2.4, 0], (n) => {
      add(new BoxGeometry(3.2, 1.9, 2.1), clear({ c: 0xc9d0d6, m: 0.85, o: 0.4 }), n, 0, Y, 0);
      add(new BoxGeometry(3.24, 0.06, 2.14), M.trim, n, 0, Y + 0.95, 0);
    });

  part(g, parts, "Splitter baffles",
    "Perforated, absorptive splitters — air passes between them and their lining soaks up the fan noise.",
    [0, 0, 2.6], (n) => { for (let i = 0; i < 4; i++) add(new BoxGeometry(3.0, 1.6, 0.16), MEDIA, n, 0, Y, -0.72 + i * 0.48); });

  part(g, parts, "Evasé transitions",
    "Tapered inlet and outlet that ease the air in and out so the silencer adds little of its own noise.",
    [0, -2.0, 0], (n) => { for (const x of [-1.9, 1.9]) add(new BoxGeometry(0.6, 1.4, 1.6), M.galv, n, x, Y, 0); });

  part(g, parts, "End flanges",
    "The bolted connections that join the silencer to the ductwork either side.",
    [3.4, 0, 0], (n) => { for (const x of [-2.2, 2.2]) add(new BoxGeometry(0.05, 1.5, 1.7), M.dark, n, x, Y, 0); });

  return { group: g, parts, spin };
};

/* ============================ EXPANSION TANK ================== */
ASSEMBLY.expansiontank = () => {
  const g = new Group(); const parts = []; const spin = [];

  part(g, parts, "Steel vessel",
    "The pressure shell that holds the system water and the compressed air cushion.",
    [-3.0, 0, 0], (n) => {
      add(new CylinderGeometry(0.92, 0.92, 3.0, 36), clear({ c: 0x2f6bb0, m: 0.5, o: 0.42 }), n, 0, 2.0, 0);
      add(new SphereGeometry(0.92, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2), clear({ c: 0x2f6bb0, m: 0.5, o: 0.42 }), n, 0, 3.5, 0);
      add(new SphereGeometry(0.92, 36, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clear({ c: 0x2f6bb0, m: 0.5, o: 0.42 }), n, 0, 0.5, 0);
    });

  part(g, parts, "Diaphragm",
    "A flexible membrane that separates the air cushion from the water so they never mix.",
    [3.0, 0, 0], (n) => {
      add(new SphereGeometry(0.82, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), M.bright, n, 0, 1.9, 0);
      add(new TorusGeometry(0.8, 0.05, 10, 28), M.dark, n, 0, 1.9, 0).rotation.x = Math.PI / 2;
    });

  part(g, parts, "Air charge valve",
    "The Schrader valve on top used to pre-charge the air side to the system's fill pressure.",
    [0, 2.4, 0], (n) => add(new CylinderGeometry(0.07, 0.07, 0.28, 12), M.dark, n, 0, 4.05, 0));

  part(g, parts, "System connection",
    "The bottom tapping that ties the tank into the hydronic loop where pressure is held.",
    [0, -2.2, 0], (n) => {
      add(new CylinderGeometry(0.18, 0.18, 0.55, 16), M.dark, n, 0, 0.0, 0);
      add(new CylinderGeometry(0.28, 0.28, 0.08, 16), M.bright, n, 0, -0.28, 0);
    });

  part(g, parts, "Ring base",
    "A welded ring that lets the vessel stand upright on the plant-room floor.",
    [0, -2.6, 0], (n) => {
      add(new CylinderGeometry(1.02, 1.02, 0.22, 36, 1, true), M.trim, n, 0, 0.35, 0);
      add(new TorusGeometry(0.98, 0.08, 10, 36), M.trim, n, 0, 0.24, 0).rotation.x = Math.PI / 2;
    });

  return { group: g, parts, spin };
};

/* ============================ ENERGY RECOVERY WHEEL ========== */
ASSEMBLY.recoveryWheel = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 2.2;

  part(g, parts, "Casing",
    "The frame that seals the wheel between the supply and exhaust air paths.",
    [0, 0, 3.2], (n) => add(new BoxGeometry(0.9, 4.2, 4.2), clear({ c: 0xc9d0d6, m: 0.85, o: 0.35 }), n, 0, Y, 0));

  part(g, parts, "Supply / exhaust divider",
    "The seal bar that keeps the two airstreams apart so only the wheel carries energy between them.",
    [0, 0, -3.2], (n) => add(new BoxGeometry(0.95, 0.18, 4.2), M.trim, n, 0, Y, 0));

  group(g, parts, "Wheel drive",
    "The rotating matrix and the motor that turns it. Drill in for the wheel and its drive.",
    [-3.0, 0, 0], (n, subs) => {
      part(n, subs, "Enthalpy wheel",
        "A slowly turning honeycomb matrix that picks up heat and moisture on one side and releases them on the other.",
        [0, 1.8, 0], (m) => {
          m.position.set(0, Y, 0);
          const w = new Group(); w.userData.spinAxis = "x"; m.add(w);
          add(new CylinderGeometry(1.75, 1.75, 0.5, 48), M.dark, w).rotation.z = Math.PI / 2;
          add(new CylinderGeometry(1.6, 1.6, 0.56, 48, 1, true), M.panel, w).rotation.z = Math.PI / 2;
          for (let r = 0.4; r < 1.6; r += 0.34) add(new TorusGeometry(r, 0.02, 8, 44), M.trim, w).rotation.y = Math.PI / 2;
          for (let i = 0; i < 12; i++) add(new BoxGeometry(0.5, 1.5, 0.035), M.trim, w).rotation.x = (i / 12) * Math.PI * 2;
          add(new CylinderGeometry(0.22, 0.22, 0.7, 16), M.dark, w).rotation.z = Math.PI / 2;
          spin.push(w);
        });
      part(n, subs, "Drive motor & belt",
        "A small motor turns the wheel at a few rpm through a belt around its rim.",
        [0, -2.4, 0], (m) => add(new CylinderGeometry(0.3, 0.3, 0.5, 16), M.blue, m, 0.1, Y - 2.15, 1.4).rotation.z = Math.PI / 2);
    });

  return { group: g, parts, spin };
};

/* ============================ SOLAR THERMAL COLLECTOR ======== */
ASSEMBLY.solarThermal = () => {
  const g = new Group(); const parts = []; const spin = [];
  const tilt = (n) => { n.rotation.x = -0.62; n.position.y = 1.7; };

  part(g, parts, "Frame & casing",
    "The insulated box that holds the absorber and glazing and mounts to the array.",
    [0, 0, -2.6], (n) => { tilt(n); add(new BoxGeometry(5.2, 0.28, 3.3), M.trim, n, 0, 0, 0); });

  part(g, parts, "Absorber plate",
    "A dark selective-coated sheet that soaks up sunlight and turns it into heat.",
    [0, 1.4, 0], (n) => { tilt(n); add(new BoxGeometry(4.8, 0.12, 3.0), absMat(), n, 0, 0.12, 0); });

  part(g, parts, "Riser tubes & headers",
    "Copper tubes bonded to the absorber carry the fluid that collects the captured heat.",
    [0, 2.4, 0], (n) => {
      tilt(n);
      for (let i = 0; i < 7; i++) add(new CylinderGeometry(0.045, 0.045, 3.0, 10), M.copper, n, -2 + i * 0.66, 0.16, 0).rotation.x = Math.PI / 2;
      for (const z of [1.45, -1.45]) add(new CylinderGeometry(0.08, 0.08, 4.9, 14), M.copper, n, 0, 0.16, z).rotation.z = Math.PI / 2;
    });

  part(g, parts, "Glazing",
    "A glass cover that traps the heat like a greenhouse and shields the absorber from wind.",
    [0, 3.4, 0], (n) => { tilt(n); add(new BoxGeometry(4.8, 0.04, 3.0), glassMat(), n, 0, 0.26, 0); });

  part(g, parts, "Ground stand",
    "A tilted frame that sets the collector at the best angle to the sun.",
    [0, -2.2, 0], (n) => { for (const x of [-2.4, 2.4]) {
      add(new BoxGeometry(0.14, 0.14, 3.6), M.trim, n, x, 0.1, 0);
      add(new BoxGeometry(0.14, 2.5, 0.14), M.trim, n, x, 1.25, -1.5);
      add(new BoxGeometry(0.14, 0.7, 0.14), M.trim, n, x, 0.4, 1.5);
    } });

  return { group: g, parts, spin };
};

/* ============================ SOLAR PV ARRAY ================ */
ASSEMBLY.pv = () => {
  const g = new Group(); const parts = []; const spin = [];
  const tilt = (n) => { n.rotation.x = -0.5; n.position.y = 1.9; };

  part(g, parts, "Module frame",
    "The aluminium frame that stiffens each panel and clamps to the mounting rails.",
    [0, 0, -2.6], (n) => { tilt(n); add(new BoxGeometry(6.2, 0.14, 3.3), M.trim, n, 0, 0, 0); });

  part(g, parts, "PV cells",
    "Silicon cells wired in series — the photovoltaic effect turns sunlight straight into DC power.",
    [0, 1.4, 0], (n) => { tilt(n);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) add(new BoxGeometry(0.92, 0.06, 0.92), cellMat(), n, -2.5 + i * 1.0, 0.12, -1.0 + j * 1.0);
    });

  part(g, parts, "Front glass",
    "A tempered-glass laminate that protects the cells and lets the light through.",
    [0, 2.4, 0], (n) => { tilt(n); add(new BoxGeometry(6.0, 0.03, 3.1), glassMat(), n, 0, 0.2, 0); });

  part(g, parts, "Ground stand & rails",
    "Tilted rails that hold the array at the optimum angle and tie it down against wind.",
    [0, -2.2, 0], (n) => { for (const x of [-2.85, 2.85]) {
      add(new BoxGeometry(0.15, 0.15, 3.6), M.trim, n, x, 0.1, 0);
      add(new BoxGeometry(0.15, 2.7, 0.15), M.trim, n, x, 1.35, -1.4);
      add(new BoxGeometry(0.15, 1.1, 0.15), M.trim, n, x, 0.55, 1.4);
    } });

  return { group: g, parts, spin };
};

/* ============================ PANEL RADIATOR =============== */
ASSEMBLY.radiator = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.4;

  part(g, parts, "Water panels",
    "Steel panels with waterways — hot water inside radiates heat off their large front face.",
    [0, 0, 1.6], (n) => {
      add(new BoxGeometry(3.4, 2.0, 0.28), M.panel, n, 0, Y, 0.16);
      add(new BoxGeometry(3.4, 2.0, 0.28), M.panel, n, 0, Y, -0.16);
    });

  part(g, parts, "Convector fins",
    "Zig-zag fins welded between the panels multiply the surface area and drive convection.",
    [0, 0, -1.6], (n) => { for (let i = 0; i < 22; i++) add(new BoxGeometry(0.05, 1.9, 0.34), M.dark, n, -1.6 + i * 0.152, Y, 0); });

  part(g, parts, "Top grille",
    "A slotted top that lets the warmed convection air rise out of the radiator.",
    [0, 1.8, 0], (n) => add(new BoxGeometry(3.4, 0.12, 0.6), M.dark, n, 0, Y + 1.05, 0));

  part(g, parts, "Thermostatic valve (TRV)",
    "A self-acting valve that throttles the flow to hold the room at its set temperature.",
    [-2.2, -1.0, 0], (n) => {
      add(new BoxGeometry(0.26, 0.26, 0.26), M.blue, n, -1.4, Y - 1.45, 0);
      add(new CylinderGeometry(0.09, 0.09, 0.5, 12), M.copper, n, -1.4, Y - 1.2, 0);
    });

  part(g, parts, "Connections",
    "Flow and return tails that tie the radiator into the heating loop.",
    [2.2, -1.0, 0], (n) => add(new CylinderGeometry(0.09, 0.09, 0.5, 12), M.copper, n, 1.4, Y - 1.2, 0));

  return { group: g, parts, spin };
};

/* ============================ CEILING DIFFUSER ============ */
ASSEMBLY.diffuser = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 2.6;

  part(g, parts, "Face flange",
    "The square trim that sits flush in the ceiling grid and frames the outlet.",
    [0, -1.6, 0], (n) => add(new BoxGeometry(3.0, 0.1, 3.0), M.panel, n, 0, Y, 0));

  part(g, parts, "Cone deflectors",
    "Nested cones that fan the supply air out horizontally so it mixes before it reaches people.",
    [0, -0.6, 0], (n) => { for (let i = 0; i < 3; i++) { const s = 2.4 - i * 0.6; add(new BoxGeometry(s, 0.16, s), M.panel, n, 0, Y - 0.22 - i * 0.3, 0); } });

  part(g, parts, "Neck / collar",
    "The round connection that joins the diffuser to its branch duct.",
    [0, 1.6, 0], (n) => add(new CylinderGeometry(0.72, 0.72, 0.7, 24), M.galv, n, 0, Y + 0.42, 0));

  return { group: g, parts, spin };
};

/* a small up-blast axial fan spin group */
function axfan(parent, cx, cy, cz, r, blades = 6, mat = M.dark) {
  const w = new Group(); w.position.set(cx, cy, cz); w.userData.spinAxis = "y"; parent.add(w);
  add(new CylinderGeometry(r * 0.16, r * 0.16, 0.24, 14), M.dark, w);
  for (let i = 0; i < blades; i++) { const a = (i / blades) * Math.PI * 2;
    add(new BoxGeometry(r * 0.9, 0.04, r * 0.34), mat, w, Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5).rotation.y = -a; }
  return w;
}

/* ============================ ABSORPTION CHILLER ==================== */
ASSEMBLY.absorption = () => {
  const g = new Group(); const parts = []; const spin = [];

  part(g, parts, "Baseplate skid",
    "The welded frame that carries the two big vacuum vessels as one shippable package.",
    [0, -1.8, 0], (n) => add(new BoxGeometry(6.2, 0.4, 2.6), M.trim, n, 0, 0.2, 0));

  part(g, parts, "Lower shell (absorber / evaporator)",
    "Under deep vacuum, refrigerant water boils to chill the load, then lithium-bromide solution soaks the vapour up.",
    [0, 0, 3.0], (n) => {
      add(new CylinderGeometry(1.0, 1.0, 5.2, 28), M.panel, n, 0, 1.5, 0).rotation.z = Math.PI / 2;
      for (const x of [-2.6, 2.6]) add(new SphereGeometry(1.0, 20, 12, 0, Math.PI), M.dark, n, x, 1.5, 0).rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      for (const z of [1.2, -1.1]) add(new CylinderGeometry(0.28, 0.28, 0.5, 16), M.blue, n, -2.4, 1.5, z).rotation.x = Math.PI / 2;
    });

  part(g, parts, "Upper shell (generator / condenser)",
    "Heat boils the water back out of the solution (generator); it then condenses, ready to evaporate and chill again.",
    [0, 2.6, 0], (n) => {
      add(new CylinderGeometry(0.9, 0.9, 5.2, 28), clear({ o: 0.55 }), n, 0, 3.4, 0).rotation.z = Math.PI / 2;
      for (const x of [-2.6, 2.6]) add(new SphereGeometry(0.9, 20, 12, 0, Math.PI), M.dark, n, x, 3.4, 0).rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    });

  part(g, parts, "Solution heat exchanger",
    "Pre-heats strong solution heading to the generator using heat from the returning weak solution — the efficiency trick.",
    [3.4, 1.2, 0], (n) => add(new BoxGeometry(0.5, 1.8, 0.7), M.dark, n, 2.9, 2.4, 0));

  part(g, parts, "Solution pump",
    "Lifts the lithium-bromide solution from the low-pressure absorber up to the generator.",
    [0, -2.4, 2.4], (n) => {
      add(new CylinderGeometry(0.32, 0.32, 0.5, 20), M.blue, n, 1.4, 0.55, 1.0).rotation.z = Math.PI / 2;
      add(new BoxGeometry(0.7, 0.35, 0.5), M.yellow, n, 1.4, 0.3, 1.0);
    });

  part(g, parts, "Generator heat input",
    "Steam or hot water — often waste heat — drives the whole cycle, so there is no large electric compressor.",
    [-3.6, 1.6, 0], (n) => { for (const z of [0.5, -0.5]) add(new CylinderGeometry(0.2, 0.2, 1.4, 16), M.copper, n, -3.0, 3.4, z).rotation.x = Math.PI / 2; });

  part(g, parts, "Control panel",
    "Sequences the pumps and the heat valve to hold the chilled-water setpoint.",
    [3.6, -0.4, 1.6], (n) => {
      add(new BoxGeometry(0.3, 1.3, 1.0), M.trim, n, 3.1, 1.4, 1.0);
      add(new BoxGeometry(0.05, 0.6, 0.7), M.blue, n, 3.27, 1.6, 1.0);
    });

  return { group: g, parts, spin };
};

/* ============================ GROUND-SOURCE HEAT PUMP ============== */
ASSEMBLY.gshp = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.7;

  part(g, parts, "Cabinet",
    "The indoor enclosure — quiet, weather-free — that houses the whole refrigerant package.",
    [0, 2.8, 0], (n) => {
      add(new BoxGeometry(2.8, 2.6, 2.0), clear({ o: 0.4 }), n, 0, Y, 0);
      add(new BoxGeometry(2.86, 0.12, 2.06), M.trim, n, 0, Y + 1.3, 0);
    });

  group(g, parts, "Refrigerant circuit",
    "The sealed heat-pump loop between the ground and the building. Drill in for its parts.",
    [0, 0, 3.0], (n, subs) => {
      part(n, subs, "Compressor",
        "Compresses the refrigerant vapour, driving heat from the ground loop up to the building water.",
        [0, -1.6, 0], (m) => {
          add(new CylinderGeometry(0.42, 0.42, 0.9, 24), M.dark, m, -0.7, Y - 0.6, 0);
          const w = new Group(); w.position.set(-0.7, Y - 0.6, 0); w.userData.spinAxis = "y"; m.add(w);
          add(new CylinderGeometry(0.2, 0.2, 0.3, 12), M.blue, w); spin.push(w);
        });
      part(n, subs, "Source heat exchanger",
        "A coaxial or plate exchanger that pulls low-grade heat from the circulating ground-loop water.",
        [-1.6, 0, 0], (m) => add(new BoxGeometry(0.4, 1.4, 0.7), M.bright, m, -0.6, Y, 0.5));
      part(n, subs, "Load heat exchanger",
        "Hands the upgraded heat to the building's heating water (or takes heat out of it in cooling).",
        [1.6, 0, 0], (m) => add(new BoxGeometry(0.4, 1.4, 0.7), M.blue, m, 0.6, Y, 0.5));
      part(n, subs, "Reversing & expansion valves",
        "The reversing valve swaps heating and cooling; the expansion valve meters the refrigerant.",
        [0, 1.6, 0], (m) => {
          add(new CylinderGeometry(0.15, 0.15, 0.7, 16), M.copper, m, 0.0, Y + 0.6, -0.4).rotation.z = Math.PI / 2;
          add(new BoxGeometry(0.28, 0.28, 0.28), M.yellow, m, -0.4, Y + 0.6, -0.4);
        });
    });

  part(g, parts, "Ground loop (borehole U-tubes)",
    "Sealed U-tubes grouted deep in the earth exchange heat with the ~12 °C ground — a stable source all year.",
    [0, -3.0, 0], (n) => {
      for (const x of [-1.0, 0, 1.0]) {
        for (const dz of [-0.15, 0.15]) add(new CylinderGeometry(0.09, 0.09, 3.4, 10), M.blue, n, x, -1.7, dz);
        add(new TorusGeometry(0.15, 0.09, 8, 16, Math.PI), M.blue, n, x, -3.4, 0).rotation.x = Math.PI / 2;
      }
      for (const x of [-1.0, 0, 1.0]) add(new CylinderGeometry(0.3, 0.34, 0.3, 16), M.trim, n, x, 0.0, 0);
    });

  return { group: g, parts, spin };
};

/* ============================ DRY COOLER ========================== */
ASSEMBLY.drycooler = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 1.5;

  part(g, parts, "Frame & legs",
    "A galvanised steel frame that holds the coil and fans and stands the unit off the roof.",
    [0, -2.2, 0], (n) => {
      add(new BoxGeometry(8.4, 0.35, 2.8), M.trim, n, 0, 0.18, 0);
      for (const sx of [-3.8, 3.8]) for (const sz of [-1.2, 1.2]) add(new BoxGeometry(0.16, 1.0, 0.16), M.trim, n, sx, 0.6, sz);
    });

  group(g, parts, "Cooling section",
    "Rejects the loop's heat to ambient air with no water use. Drill in for the coil and fans.",
    [0, 2.4, 0], (n, subs) => {
      part(n, subs, "Finned coils (V-bank)",
        "Warm process water flows through finned tubes; passing air carries the heat away — purely dry, sensible cooling.",
        [0, 0, 2.6], (m) => {
          for (const s of [1, -1]) for (let i = 0; i < 9; i++)
            add(new BoxGeometry(0.66, 1.6, 0.03), M.dark, m, -3.2 + i * 0.8, Y, s * 1.2).rotation.y = s * 0.3;
        });
      part(n, subs, "Axial fans",
        "A row of fans pulls ambient air across the coils; they speed up as it gets hotter or the load rises.",
        [0, 2.2, 0], (m) => {
          for (const x of [-2.7, -0.9, 0.9, 2.7]) {
            add(new TorusGeometry(0.7, 0.07, 12, 34), M.trim, m, x, Y + 0.95, 0).rotation.x = Math.PI / 2;
            spin.push(axfan(m, x, Y + 1.0, 0, 0.64, 6, M.dark));
          }
        });
    });

  part(g, parts, "Headers & connections",
    "Manifolds that split the water evenly across the coil circuits and tie the unit into the loop.",
    [-4.2, 0, 0], (n) => {
      add(new CylinderGeometry(0.22, 0.22, 2.4, 20), M.blue, n, -3.9, Y, 0).rotation.x = Math.PI / 2;
      for (const z of [0.8, -0.8]) add(new CylinderGeometry(0.16, 0.16, 0.6, 16), M.blue, n, -4.2, Y, z).rotation.z = Math.PI / 2;
    });

  return { group: g, parts, spin };
};

/* ============================ UNIT HEATER ======================== */
ASSEMBLY.unitheater = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 2.4;

  part(g, parts, "Casing",
    "A compact steel box hung from the ceiling that houses the coil and fan and directs the warm air.",
    [0, 1.6, 0], (n) => add(new BoxGeometry(2.2, 1.8, 1.8), clear({ c: 0xc9d0d6, m: 0.8, o: 0.45 }), n, 0, Y, 0));

  part(g, parts, "Heating coil",
    "Hot water or steam in a finned coil warms the air the fan blows through it.",
    [0, 0, 2.4], (n) => {
      for (let i = 0; i < 8; i++) add(new BoxGeometry(0.04, 1.4, 1.4), M.copper, n, -0.3 + i * 0.07, Y, 0);
      for (const sy of [0.7, -0.7]) add(new CylinderGeometry(0.1, 0.1, 0.5, 12), M.copper, n, 0.05, Y + sy, 0.9);
    });

  part(g, parts, "Propeller fan & motor",
    "An axial fan at the back draws room air in and pushes it forward over the coil.",
    [0, 0, -2.6], (n) => {
      add(new TorusGeometry(0.8, 0.08, 12, 36), M.trim, n, -0.9, Y, 0).rotation.y = Math.PI / 2;
      const w = new Group(); w.position.set(-0.85, Y, 0); w.userData.spinAxis = "x"; n.add(w);
      add(new CylinderGeometry(0.16, 0.16, 0.24, 14), M.dark, w).rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2;
        add(new BoxGeometry(0.05, 0.7, 0.3), M.panel, w, 0, Math.cos(a) * 0.42, Math.sin(a) * 0.42).rotation.x = a + 0.4; }
      spin.push(w);
    });

  part(g, parts, "Discharge louvers",
    "Adjustable vanes at the front aim the warm-air throw down into the occupied space.",
    [2.4, 0, 0], (n) => { for (let i = 0; i < 5; i++) add(new BoxGeometry(0.06, 0.28, 1.5), M.panel, n, 1.15, Y - 0.6 + i * 0.32, 0).rotation.z = 0.5; });

  part(g, parts, "Hanger brackets",
    "Mounting arms that suspend the heater from the structure above.",
    [0, 2.4, 0], (n) => { for (const sx of [-0.9, 0.9]) add(new BoxGeometry(0.1, 0.7, 0.1), M.trim, n, sx, Y + 1.15, 0); });

  return { group: g, parts, spin };
};

/* ============================ CHILLED BEAM ====================== */
ASSEMBLY.chilledbeam = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 2.6;

  part(g, parts, "Housing & perforated face",
    "The slim ceiling casing; room air enters and cooled air leaves through its perforated underside.",
    [0, -1.8, 0], (n) => {
      add(new BoxGeometry(5.2, 0.5, 1.2), clear({ c: 0xc9d0d6, m: 0.85, o: 0.4 }), n, 0, Y, 0);
      for (let i = 0; i < 18; i++) add(new BoxGeometry(0.16, 0.05, 1.0), M.panel, n, -2.4 + i * 0.28, Y - 0.28, 0);
    });

  part(g, parts, "Cooling coil",
    "Chilled water in a finned coil cools the air passing up through it — the heat-transfer heart of the beam.",
    [0, 1.8, 0], (n) => {
      for (let i = 0; i < 22; i++) add(new BoxGeometry(0.16, 0.5, 0.9), i % 2 ? M.bright : M.copper, n, -2.3 + i * 0.21, Y + 0.45, 0);
    });

  part(g, parts, "Induction nozzles",
    "In an active beam, primary air jets from these nozzles induce room air up through the coil — no moving parts.",
    [0, 0, 2.2], (n) => { for (let i = 0; i < 12; i++) add(new CylinderGeometry(0.04, 0.06, 0.2, 10), M.dark, n, -2.2 + i * 0.4, Y + 0.15, 0.45); });

  part(g, parts, "Primary-air plenum",
    "A duct box that feeds conditioned primary air evenly to all the induction nozzles.",
    [0, 2.0, 0], (n) => {
      add(new BoxGeometry(5.0, 0.5, 0.7), M.galv, n, 0, Y + 0.75, 0);
      add(new CylinderGeometry(0.28, 0.28, 0.5, 18), M.galv, n, -2.6, Y + 0.75, 0).rotation.z = Math.PI / 2;
    });

  part(g, parts, "Water connections",
    "Flow and return tails that tie the beam's coil into the chilled-water loop.",
    [3.2, 0.8, 0], (n) => { for (const z of [0.25, -0.25]) add(new CylinderGeometry(0.08, 0.08, 0.6, 12), M.copper, n, 2.5, Y + 0.45, z).rotation.z = Math.PI / 2; });

  return { group: g, parts, spin };
};

/* ============================ CRAC UNIT ======================== */
ASSEMBLY.crac = () => {
  const g = new Group(); const parts = []; const spin = []; const Y = 2.2;

  part(g, parts, "Cabinet",
    "A tall precision-cooling enclosure standing on the data-hall floor; air returns at the top and leaves at the bottom.",
    [0, 3.0, 0], (n) => {
      add(new BoxGeometry(2.4, 4.2, 1.8), clear({ o: 0.4 }), n, 0, Y, 0);
      add(new BoxGeometry(2.46, 0.12, 1.86), M.trim, n, 0, Y + 2.1, 0);
    });

  part(g, parts, "Filter (return air)",
    "Hot return air from the servers is drawn in at the top and cleaned before the coil.",
    [0, 2.6, 0], (n) => {
      add(new BoxGeometry(2.0, 0.14, 1.5), M.dark, n, 0, Y + 1.9, 0);
      add(new BoxGeometry(1.9, 0.18, 1.4), MEDIA, n, 0, Y + 1.78, 0);
    });

  part(g, parts, "Cooling coil",
    "A chilled-water (or DX) coil that removes the servers' heat — high sensible capacity, little dehumidification.",
    [0, 0, 2.4], (n) => {
      for (let i = 0; i < 10; i++) add(new BoxGeometry(1.9, 0.9, 0.03), M.bright, n, 0, Y + 0.7, -0.45 + i * 0.09);
      for (const sx of [0.7, -0.7]) add(new CylinderGeometry(0.1, 0.1, 0.5, 12), M.blue, n, sx, Y + 0.2, 0.8);
    });

  part(g, parts, "Downflow EC fans",
    "Variable-speed fans at the base push the cooled air down into the raised floor to feed the cold aisles.",
    [0, -2.6, 0], (n) => {
      for (const x of [-0.6, 0.6]) {
        add(new TorusGeometry(0.55, 0.06, 12, 30), M.trim, n, x, Y - 1.7, 0).rotation.x = Math.PI / 2;
        spin.push(axfan(n, x, Y - 1.7, 0, 0.5, 7, M.dark));
      }
    });

  part(g, parts, "Controls & humidifier",
    "Precision controls hold tight temperature and humidity; a small humidifier trims the room's moisture.",
    [2.6, 0.5, 0], (n) => {
      add(new BoxGeometry(0.28, 1.4, 1.0), M.trim, n, 1.25, Y + 0.4, 0);
      add(new BoxGeometry(0.06, 0.6, 0.7), M.green, n, 1.4, Y + 0.6, 0);
      add(new CylinderGeometry(0.22, 0.22, 0.7, 16), M.bright, n, 1.1, Y - 0.7, 0);
    });

  part(g, parts, "Floor discharge plenum",
    "The bottom opening that delivers cold supply air into the pressurised raised floor.",
    [0, -3.2, 0], (n) => add(new BoxGeometry(1.9, 0.5, 1.4), M.dark, n, 0, Y - 2.1, 0));

  return { group: g, parts, spin };
};

export const HERO = Object.keys(ASSEMBLY);
