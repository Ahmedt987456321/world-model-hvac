/* cycles3d.js — the "how it works" layer.
 *
 * Turns each machine's parts into a short, interactive lesson: an ordered
 * set of steps that walk the working cycle. Every step names the part(s) in
 * play (matching the assembly part names so the 3D model can highlight them),
 * explains the physics in a line, and gives the governing relation.
 *
 * `loop: true` marks a thermodynamic cycle that also drives the 4-stage
 * refrigeration loop diagram; each step's `stage` lights the matching node.
 */
export const CYCLES = {
  chiller: {
    intro: "A water-cooled chiller runs the vapour-compression refrigeration cycle — it moves heat out of the building's water using a refrigerant that boils and condenses around one loop.",
    loop: true,
    steps: [
      { t: "1 · Compress", stage: "compress", parts: ["Compressor & motor"],
        body: "The compressor draws cold, low-pressure vapour from the evaporator and squeezes it — pressure and temperature shoot up. This is the only work input; it drives the whole loop.",
        eq: "W = ṁ·(h₂ − h₁)" },
      { t: "2 · Condense", stage: "condense", parts: ["Condenser shell"],
        body: "The hot, high-pressure gas gives up its heat to the condenser water (bound for the cooling tower) and condenses into a warm liquid.",
        eq: "Q_c = ṁ·(h₂ − h₃)" },
      { t: "3 · Expand", stage: "expand", parts: ["Refrigerant piping & expansion valve"],
        body: "The expansion valve throttles the liquid: pressure drops, some flashes to vapour, and the temperature plunges — now it is colder than the building water.",
        eq: "h₄ ≈ h₃   (throttling)" },
      { t: "4 · Evaporate", stage: "evaporate", parts: ["Evaporator shell"],
        body: "In the evaporator the cold refrigerant boils, pulling heat out of the chilled water sent to the mosque. The vapour returns to the compressor and the loop repeats.",
        eq: "Q_e = ṁ·(h₁ − h₄)" },
      { t: "The payoff · COP", parts: ["Evaporator shell", "Compressor & motor"],
        body: "Cooling delivered ÷ work put in is the coefficient of performance. A good chiller shifts 5–6 kW of heat for every 1 kW of compressor power.",
        eq: "COP = Q_e / W ≈ 5–6" },
    ],
  },

  heatpump: {
    intro: "A heat pump runs the very same refrigeration loop — but we keep the warm end. It gathers low-grade heat from cold outdoor air and lifts it to a useful temperature.",
    loop: true,
    steps: [
      { t: "1 · Compress", stage: "compress", parts: ["Refrigerant circuit"],
        body: "The compressor raises the refrigerant to high pressure and temperature — the step that upgrades cheap, low-grade heat into hot, usable heat.",
        eq: "W = ṁ·(h₂ − h₁)" },
      { t: "2 · Condense (deliver heat)", stage: "condense", parts: ["Refrigerant circuit"],
        body: "Indoors, the hot gas condenses and hands its heat to the building's water or air. This is the output we want.",
        eq: "Q_h = ṁ·(h₂ − h₃)" },
      { t: "3 · Expand", stage: "expand", parts: ["Refrigerant circuit"],
        body: "The expansion valve drops the pressure so the refrigerant turns cold — colder than the outdoor air.",
        eq: "h₄ ≈ h₃" },
      { t: "4 · Evaporate (harvest heat)", stage: "evaporate", parts: ["Condenser / evaporator coil", "Fan & grille"],
        body: "The outdoor coil, fanned by ambient air, lets the cold refrigerant boil — soaking up heat even from chilly air. Back to the compressor.",
        eq: "Q_source = Q_h − W" },
      { t: "The payoff · COP", parts: ["Refrigerant circuit"],
        body: "Heat delivered ÷ work in. Because most of the heat is moved, not made, COP is 3–5 — far beyond any electric heater's 1.0.",
        eq: "COP_h = Q_h / W" },
    ],
  },

  gshp: {
    intro: "A ground-source heat pump is the same cycle, but its source is the earth — a stable ~12 °C all year — instead of swinging outdoor air. Steadier source, higher efficiency.",
    loop: true,
    steps: [
      { t: "1 · Harvest from the ground", stage: "evaporate", parts: ["Ground loop (borehole U-tubes)"],
        body: "Water circulates through sealed U-tubes deep underground and picks up the earth's warmth, carrying it back to the heat pump.",
        eq: "Q_ground = ṁ·c_p·ΔT" },
      { t: "2 · Compress", stage: "compress", parts: ["Refrigerant circuit"],
        body: "The compressor lifts the harvested heat to a higher temperature. A warmer source than winter air means less lift, so less work.",
        eq: "W = ṁ·(h₂ − h₁)" },
      { t: "3 · Deliver to the building", stage: "condense", parts: ["Refrigerant circuit"],
        body: "The refrigerant condenses and passes its heat to the building's heating water through the load exchanger.",
        eq: "Q_h = W·COP_h" },
      { t: "Why it wins", parts: ["Ground loop (borehole U-tubes)", "Refrigerant circuit"],
        body: "COP rises as the source–sink gap shrinks. The 12 °C ground gives COP ~4–5 in winter, where air-source might sag to 2–3.",
        eq: "COP_h = η·T_h/(T_h − T_g)" },
    ],
  },

  absorption: {
    intro: "An absorption chiller makes cold from heat, not electricity. A lithium-bromide solution does the work a compressor normally would — perfect for waste heat or solar.",
    steps: [
      { t: "1 · Generator — boil off refrigerant", parts: ["Generator heat input", "Upper shell (generator / condenser)"],
        body: "Steam or hot water boils water vapour (the refrigerant) out of the lithium-bromide solution. Heat replaces the compressor here.",
        eq: "Q_gen drives the cycle" },
      { t: "2 · Condense", parts: ["Upper shell (generator / condenser)"],
        body: "The refrigerant vapour condenses to liquid water, rejecting heat to the cooling water.",
        eq: "Q_c out" },
      { t: "3 · Evaporate — make the cold", parts: ["Lower shell (absorber / evaporator)"],
        body: "Under deep vacuum the water boils at a few °C, pulling heat from the chilled-water loop. That is the cooling you feel.",
        eq: "Q_e = ṁ·c_p·ΔT" },
      { t: "4 · Absorb", parts: ["Lower shell (absorber / evaporator)"],
        body: "Strong LiBr solution greedily soaks up the refrigerant vapour, keeping the vacuum and pulling more water off to boil.",
        eq: "vapour + solution → weak solution" },
      { t: "5 · Recycle the solution", parts: ["Solution pump", "Solution heat exchanger"],
        body: "The pump returns weak solution to the generator; the heat exchanger pre-warms it to save energy. COP ≈ 0.7 (single-effect).",
        eq: "COP_th = Q_e / Q_gen" },
    ],
  },

  tower: {
    intro: "A cooling tower throws away the chillers' heat by evaporating a little water. Evaporation is a powerful heat sink — that is why you sweat.",
    steps: [
      { t: "1 · Rain the hot water down", parts: ["Spray header"],
        body: "Warm condenser water from the chillers is sprayed across the top of the fill, spreading into a thin film over huge surface area.",
        eq: "T_in ≈ 37 °C" },
      { t: "2 · Wet the fill", parts: ["Fill / wet deck media"],
        body: "The fill holds that film so air and water meet over as much area as possible — the more contact, the more evaporation.",
        eq: "area → transfer" },
      { t: "3 · Pull air through", parts: ["Fan drive", "Intake louvers"],
        body: "The fan draws desert air up through the falling water. A small fraction of the water evaporates — and evaporation carries away enormous latent heat.",
        eq: "Q = ṁ_evap·h_fg" },
      { t: "4 · Catch the drift, collect the cold", parts: ["Drift eliminators", "Cold-water basin"],
        body: "Drift eliminators strip water droplets from the leaving air; the cooled water gathers in the basin, ready to return to the chillers.",
        eq: "T_out = T_wet-bulb + approach" },
    ],
  },

  boiler: {
    intro: "A fire-tube boiler turns fuel into hot water or steam. Hot combustion gases race through tubes surrounded by water, handing over their heat.",
    steps: [
      { t: "1 · Fire the burner", parts: ["Burner & blower"],
        body: "The burner mixes fuel with forced air and ignites it in the furnace — a controlled flame releasing the fuel's chemical energy.",
        eq: "Q_fuel = ṁ_fuel·LHV" },
      { t: "2 · Send gas through the tubes", parts: ["Fire tubes & furnace", "Front tube sheet & smokebox"],
        body: "Hot gases sweep through the fire tubes. Their walls are wetted on the outside, so heat passes from gas → tube → water.",
        eq: "Q = U·A·ΔT_lm" },
      { t: "3 · Heat the water", parts: ["Pressure-vessel shell"],
        body: "The surrounding water absorbs the heat and rises in temperature (or boils to steam). Efficiency is the heat kept vs. fuel burned.",
        eq: "Q_out = ṁ·c_p·ΔT" },
      { t: "4 · Vent safely", parts: ["Flue stack", "Safety relief valve"],
        body: "Spent gases leave up the flue; the relief valve guards against over-pressure. What heat escaped the flue is the main loss.",
        eq: "η = Q_out / Q_fuel" },
    ],
  },

  ahu: {
    intro: "An air handling unit conditions the air itself: it mixes, cleans, cools and pushes air to the space. Follow the air from left to right.",
    steps: [
      { t: "1 · Mix fresh & return air", parts: ["Intake louvers", "Mixing damper & linkage"],
        body: "Outdoor air blends with recirculated room air. The damper sets the ratio — more fresh air for ventilation, more return air to save energy.",
        eq: "T_mix = x·T_oa + (1−x)·T_ra" },
      { t: "2 · Filter", parts: ["Filter bank"],
        body: "Pleated media traps dust before it can foul the coil or reach the space.",
        eq: "" },
      { t: "3 · Cool & dehumidify", parts: ["Coil section"],
        body: "Chilled water in the coil pulls both heat (sensible) and moisture (latent) out of the air. This is where the chiller's cold is spent.",
        eq: "Q = ṁ_air·(h_in − h_out)" },
      { t: "4 · Move the air", parts: ["Supply fan & motor"],
        body: "The fan adds the pressure needed to push conditioned air through the ducts to every diffuser. Fan power grows with the cube of speed.",
        eq: "P = ΔP·V̇ / η" },
    ],
  },

  pump: {
    intro: "A centrifugal pump adds energy to water by spinning it — turning shaft power into flow and pressure.",
    steps: [
      { t: "1 · Spin the shaft", parts: ["Electric motor"],
        body: "The motor turns the shaft at speed. On a variable-speed drive, that speed is the main control knob for the whole loop.",
        eq: "P_shaft = T·ω" },
      { t: "2 · Fling the water out", parts: ["Impeller"],
        body: "The impeller's vanes hurl water outward, adding kinetic energy — the water leaves the tips moving fast.",
        eq: "H ∝ (n·D)²" },
      { t: "3 · Turn speed into pressure", parts: ["Volute casing"],
        body: "The spiral volute slows that fast water down, and by Bernoulli the lost velocity becomes the discharge pressure (head).",
        eq: "P_hyd = ρ·g·Q·H" },
      { t: "The affinity laws", parts: ["Impeller", "Electric motor"],
        body: "Halve the speed and flow halves, head quarters, and power drops eightfold — why variable-speed pumping saves so much.",
        eq: "Q∝n · H∝n² · P∝n³" },
    ],
  },

  fan: {
    intro: "A centrifugal fan is a pump for air: the wheel adds energy, the scroll converts it to pressure to overcome the ductwork.",
    steps: [
      { t: "1 · Draw air into the eye", parts: ["Mounting wall & inlet cone"],
        body: "The bell-mouth inlet feeds air smoothly into the centre of the spinning wheel.",
        eq: "" },
      { t: "2 · Accelerate it", parts: ["Backward-curved wheel"],
        body: "The curved blades fling the air outward, adding velocity. Blade shape sets efficiency and how much pressure the fan can build.",
        eq: "ΔP ∝ n²" },
      { t: "3 · Build pressure in the scroll", parts: ["Scroll housing"],
        body: "The volute gathers the fast air and slows it, converting velocity into the static pressure that pushes air down the ducts.",
        eq: "P = ΔP·V̇ / η" },
      { t: "The affinity laws", parts: ["Drive assembly"],
        body: "Airflow follows speed, pressure its square, power its cube — so trimming fan speed is the biggest energy lever in air systems.",
        eq: "V̇∝n · ΔP∝n² · P∝n³" },
    ],
  },
};
