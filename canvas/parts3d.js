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

  part(g, parts, "Filter bank",
    "Pleated media traps dust and particulate so downstream coils and the space stay clean.",
    [0, 0, 3.0], (n) => {
      add(new BoxGeometry(0.35, 1.8, 1.8), M.trim, n, -1.6, Y, 0);
      for (const sz of [-0.55, 0, 0.55]) add(new BoxGeometry(0.3, 1.7, 0.5), MEDIA, n, -1.6, Y, sz);
    });

  part(g, parts, "Cooling coil",
    "Chilled water in a finned tube bank pulls heat and moisture out of the passing air.",
    [0, 0, 4.7], (n) => {
      for (let i = 0; i < 9; i++) add(new BoxGeometry(0.03, 1.7, 1.7), M.bright, n, -0.7 + i * 0.06, Y, 0);
      for (const sy of [0.75, -0.75]) add(new CylinderGeometry(0.1, 0.1, 1.8, 12), M.copper, n, -0.4, Y + sy, 0).rotation.z = Math.PI / 2;
    });

  part(g, parts, "Heating coil",
    "Hot water (or electric elements) re-warms the air for winter heating and humidity control.",
    [0, 0, 6.3], (n) => {
      for (let i = 0; i < 6; i++) add(new BoxGeometry(0.03, 1.6, 1.6), M.copper, n, 0.55 + i * 0.06, Y, 0);
    });

  part(g, parts, "Drain pan",
    "A sloped stainless tray catches condensate from the cooling coil and drains it away.",
    [0, -2.6, 0], (n) => {
      add(new BoxGeometry(1.8, 0.12, 1.9), M.bright, n, 0.0, Y - 0.95, 0);
      add(new CylinderGeometry(0.1, 0.1, 0.5, 12), M.dark, n, 0.7, Y - 1.2, 0.7);
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

  const comp = part(g, parts, "Compressor & motor",
    "Draws low-pressure vapour from the evaporator and compresses it hot and high-pressure — the machine's engine.",
    [-1.1, 2.6, 0], (n) => {
      add(new CylinderGeometry(0.6, 0.6, 1.6, 24), M.dark, n, -1.1, Y + 2.1, 0.2).rotation.z = Math.PI / 2;
      const w = new Group(); w.position.set(0.5, Y + 2.1, 0.2); w.userData.spinAxis = "x"; n.add(w);
      add(new CylinderGeometry(0.5, 0.5, 1.2, 20), M.blue, w).rotation.z = Math.PI / 2;
      spin.push(w);
      add(new BoxGeometry(0.3, 0.5, 0.5), M.trim, n, 1.4, Y + 2.1, 0.2);
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

  const fan = part(g, parts, "Induced-draught fan & motor",
    "An axial fan on the deck pulls air up through the fill, driving the evaporation that rejects the heat.",
    [0, 3.2, 0], (n) => {
      n.position.set(0, 5.9, 0);
      add(new CylinderGeometry(1.6, 1.95, 1.15, 36, 1, true), M.panel, n, 0, 0.1, 0);
      const w = new Group(); w.userData.spinAxis = "y"; n.add(w);
      add(new CylinderGeometry(0.26, 0.26, 0.34, 18), M.dark, w);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2;
        const bl = add(new BoxGeometry(1.5, 0.05, 0.58), M.dark, w, Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85);
        bl.rotation.y = -a; bl.rotation.x = 0.38; }
      spin.push(w);
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

  part(g, parts, "Motor & belt drive",
    "The motor turns the wheel through a belt and pulleys, whose ratio sets the fan speed.",
    [1.8, 0, 0], (n) => {
      add(new CylinderGeometry(0.4, 0.4, 1.0, 20), M.blue, n, 0.4, Y, 0).rotation.z = Math.PI / 2;
      for (const a of [0, 2.1, 4.2]) add(new BoxGeometry(1.2, 0.08, 0.08), M.dark, n, -0.2, Y + Math.cos(a) * 1.1, Math.sin(a) * 1.1).rotation.x = a;
      add(new CylinderGeometry(0.28, 0.28, 0.08, 16), M.bright, n, -0.15, Y, 0).rotation.z = Math.PI / 2;
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

  const burner = part(g, parts, "Burner & blower",
    "Mixes fuel with forced air and fires it into the furnace; the blower supplies the combustion air.",
    [-3.6, 0, 0], (n) => {
      add(new CylinderGeometry(0.5, 0.5, 1.0, 24), M.blue, n, -2.95, Y - 0.2, 0).rotation.z = Math.PI / 2;
      const w = new Group(); w.position.set(-3.45, Y - 0.2, 0); w.userData.spinAxis = "x"; n.add(w);
      add(new CylinderGeometry(0.72, 0.72, 0.7, 24), M.blue, w).rotation.z = Math.PI / 2;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2;
        add(new BoxGeometry(0.1, 0.5, 0.16), M.bright, w, 0, Math.cos(a) * 0.4, Math.sin(a) * 0.4).rotation.x = a; }
      spin.push(w);
      add(new BoxGeometry(0.4, 0.9, 0.55), M.trim, n, -3.2, Y + 0.7, 0);
    });

  part(g, parts, "Flue stack",
    "Vents the spent combustion gases safely up and out after they've given up their heat.",
    [0, 3.0, 0], (n) => {
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

  const comp = part(g, parts, "Compressor",
    "Compresses the refrigerant vapour, driving the heat-pump cycle that moves heat against its natural direction.",
    [1.6, -1.2, 0], (n) => {
      add(new CylinderGeometry(0.42, 0.42, 1.0, 24), M.dark, n, 0.75, Y - 0.6, 0);
      const w = new Group(); w.position.set(0.75, Y - 0.6, 0); w.userData.spinAxis = "y"; n.add(w);
      add(new CylinderGeometry(0.2, 0.2, 0.3, 12), M.blue, w);
      spin.push(w);
    });

  part(g, parts, "Reversing valve & expansion valve",
    "The reversing valve swaps heating and cooling; the expansion valve meters refrigerant into the coil.",
    [1.6, 1.4, 0], (n) => {
      add(new CylinderGeometry(0.16, 0.16, 0.8, 16), M.copper, n, 0.75, Y + 0.5, 0).rotation.z = Math.PI / 2;
      add(new BoxGeometry(0.3, 0.3, 0.3), M.yellow, n, 0.4, Y + 0.5, 0);
    });

  return { group: g, parts, spin };
};

export const HERO = Object.keys(ASSEMBLY);
