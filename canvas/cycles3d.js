/* cycles3d.js — the lesson layer.
 *
 * Teaching a machine the way people actually learn one:
 *   1. the WHOLE, as a job — what goes in, what comes out, and why you'd care
 *   2. the MECHANISM, part by part, in causal order — each step spotlights one
 *      part, says in plain words what it does and WHY, and (for cycles) tracks
 *      the working fluid's state: Pressure, Temperature, Phase
 *   3. the whole again — put it back together and watch it run
 *
 * `focus` names the part(s) to spotlight (must match assembly part names).
 * `state` drives the P / T / phase chips. `loop` lights the cycle diagram.
 */
export const CYCLES = {
  chiller: {
    hook: "It's 48 °C outside, yet the mosque holds 24 °C. A chiller does it by taking in warm water and handing back cold — using a refrigerant that endlessly boils and condenses. Watch one loop.",
    loop: true,
    recap: "Squeeze it hot → cool it down → let it expand cold → boil it to grab heat. Round and round, the loop carries the building's heat out to the desert air.",
    steps: [
      { t: "Compress", stage: "compress", focus: ["Compressor & motor"],
        say: "Squeeze a gas and it gets hot. The compressor grabs cold, low-pressure vapour and crushes it into a hot, high-pressure gas. This is the only place energy goes in.",
        state: { P: "high", T: "hot", phase: "vapour" }, eq: "W = ṁ·(h₂−h₁)" },
      { t: "Condense", stage: "condense", focus: ["Condenser shell"],
        say: "The hot gas is now hotter than the tower water around it — so heat flows out of it. As it loses heat it turns back into a warm liquid.",
        state: { P: "high", T: "warm", phase: "liquid" }, eq: "Q_c = ṁ·(h₂−h₃)" },
      { t: "Expand", stage: "expand", focus: ["Refrigerant piping & expansion valve"],
        say: "A pinhole valve lets the liquid burst to low pressure. Let a liquid expand and it turns freezing — colder now than the building's water.",
        state: { P: "low", T: "cold", phase: "flash" }, eq: "throttle: h₄ ≈ h₃" },
      { t: "Evaporate", stage: "evaporate", focus: ["Evaporator shell"],
        say: "The freezing refrigerant boils by stealing heat from the building's water — and that stolen heat IS the cooling you feel. The vapour heads back to the compressor.",
        state: { P: "low", T: "cold", phase: "vapour" }, eq: "Q_e = ṁ·(h₁−h₄)" },
    ],
  },

  heatpump: {
    hook: "A heat pump is a chiller run for its warm end. It grabs heat from cold outdoor air and lifts it indoors — moving heat instead of making it, which is why it beats any electric heater.",
    loop: true,
    recap: "Boil cold refrigerant with outdoor air → squeeze it hot → dump that heat indoors → expand cold again. You get 3–5× more heat out than the electricity you put in.",
    steps: [
      { t: "Harvest heat", stage: "evaporate", focus: ["Condenser / evaporator coil", "Fan & grille"],
        say: "Even 5 °C air is warmer than freezing refrigerant. The outdoor coil lets the cold refrigerant boil, soaking heat out of the passing air.",
        state: { P: "low", T: "cold", phase: "vapour" } },
      { t: "Compress", stage: "compress", focus: ["Refrigerant circuit"],
        say: "The compressor squeezes that vapour hot — upgrading cheap, low-grade warmth into genuinely hot gas.",
        state: { P: "high", T: "hot", phase: "vapour" } },
      { t: "Deliver heat", stage: "condense", focus: ["Refrigerant circuit"],
        say: "Indoors the hot gas condenses and pours its heat into the building's water. This is the output you wanted.",
        state: { P: "high", T: "warm", phase: "liquid" } },
      { t: "Expand", stage: "expand", focus: ["Refrigerant circuit"],
        say: "The valve drops the pressure so the refrigerant goes cold again, ready to harvest more heat from the outdoor air.",
        state: { P: "low", T: "cold", phase: "flash" } },
    ],
  },

  gshp: {
    hook: "Winter air is brutal, but a few metres down the earth sits at a steady ~12 °C all year. A ground-source heat pump taps that — a warmer, steadier source means far less work to lift the heat.",
    loop: true,
    recap: "The ground is a giant battery of mild warmth. Because the source barely changes, the pump sips power — COP 4–5 even in deep winter.",
    steps: [
      { t: "Tap the earth", stage: "evaporate", focus: ["Ground loop (borehole U-tubes)"],
        say: "Water loops through sealed pipes deep underground and picks up the earth's steady warmth, carrying it back up to the machine.",
        state: { P: "low", T: "mild", phase: "liquid" } },
      { t: "Compress", stage: "compress", focus: ["Refrigerant circuit"],
        say: "The compressor lifts that mild heat to a useful temperature. A warm source means a small lift — so little electricity is needed.",
        state: { P: "high", T: "hot", phase: "vapour" } },
      { t: "Warm the building", stage: "condense", focus: ["Refrigerant circuit"],
        say: "The refrigerant condenses and hands its heat to the building's heating water.",
        state: { P: "high", T: "warm", phase: "liquid" } },
    ],
  },

  absorption: {
    hook: "This chiller makes cold from HEAT, with almost no electricity. A lithium-bromide solution does the compressor's job — perfect when you have waste heat or steam to spare.",
    recap: "Heat boils refrigerant off the solution; it condenses, then boils again under vacuum to make cold; the thirsty solution drinks the vapour back. Cold, powered by heat.",
    steps: [
      { t: "Boil it off (generator)", focus: ["Generator heat input", "Upper shell (generator / condenser)"],
        say: "Steam heats the lithium-bromide solution until water vapour — the refrigerant — boils out of it. Heat does the work a compressor usually would." },
      { t: "Condense", focus: ["Upper shell (generator / condenser)"],
        say: "That vapour cools and condenses back to liquid water, giving up its heat to the cooling water." },
      { t: "Make the cold (evaporator)", focus: ["Lower shell (absorber / evaporator)"],
        say: "Under a hard vacuum, water boils at just a few degrees. Boiling here steals heat from the chilled-water loop — that's your cooling." },
      { t: "Drink it back (absorber)", focus: ["Lower shell (absorber / evaporator)"],
        say: "Thirsty concentrated solution soaks up the vapour, keeping the vacuum alive so more water can boil. The pump recycles the solution and it begins again." },
    ],
  },

  tower: {
    hook: "How do you throw away a skyscraper's worth of heat into the air? You evaporate a little water — the same trick that cools you when you sweat.",
    recap: "Spread hot water thin, blow air through it, let a little evaporate. Evaporation carries away huge heat, and the cooled water drops to the basin to go again.",
    steps: [
      { t: "Rain it down", focus: ["Spray header"],
        say: "Hot water from the chillers is sprayed across the top, breaking into a fine film with enormous surface area." },
      { t: "Spread it thin", focus: ["Fill / wet deck media"],
        say: "The honeycomb fill holds that film so air and water touch over as much area as possible — more contact, more evaporation." },
      { t: "Pull air through", focus: ["Fan drive", "Intake louvers"],
        say: "The fan drags desert air up through the falling water. A little water evaporates — and turning water to vapour soaks up an enormous amount of heat." },
      { t: "Catch and collect", focus: ["Drift eliminators", "Cold-water basin"],
        say: "Baffles strip stray droplets from the leaving air; the now-cooled water gathers in the basin, ready to cool the chillers again." },
    ],
  },

  boiler: {
    hook: "A boiler is controlled fire in a steel drum. Hot gases race through tubes bathed in water, and the heat soaks straight through the tube walls.",
    recap: "Burn fuel → send the hot gas through water-wrapped tubes → the water heats or boils → vent the spent gas. Whatever heat escapes the flue is the loss you fight.",
    steps: [
      { t: "Light the fire", focus: ["Burner & blower"],
        say: "The burner blends fuel with forced air and ignites it — a roaring, controlled flame releasing the fuel's chemical energy." },
      { t: "Race the gas through", focus: ["Fire tubes & furnace"],
        say: "The hot gases rush through tubes surrounded by water. Thin metal walls let heat pass from gas to water fast." },
      { t: "Heat the water", focus: ["Pressure-vessel shell"],
        say: "The water jacket drinks the heat and climbs in temperature — or flashes to steam. The more heat kept here, the more efficient the boiler." },
      { t: "Vent safely", focus: ["Flue stack", "Safety relief valve"],
        say: "Spent gas leaves up the flue; the safety valve pops if pressure ever runs away. Heat lost up the stack is the boiler's main penalty." },
    ],
  },

  ahu: {
    hook: "This box conditions the air itself — mixing, cleaning, chilling and pushing it to the hall. Follow the air from the moment it enters.",
    recap: "Mix fresh with return → filter → chill and dry over the coil → fan it to the rooms. Simple steps, but it's what actually makes the air breathable and cool.",
    steps: [
      { t: "Mix the air", focus: ["Intake louvers", "Mixing damper & linkage"],
        say: "Fresh outdoor air blends with recirculated room air. The damper picks the ratio — more fresh for ventilation, more return to save energy." },
      { t: "Clean it", focus: ["Filter bank"],
        say: "Pleated filters catch dust before it can foul the coil or reach people's lungs." },
      { t: "Chill and dry", focus: ["Coil section"],
        say: "Cold water in the coil pulls heat AND moisture out of the passing air. This is where the chiller's hard-won cold is actually spent." },
      { t: "Push it out", focus: ["Supply fan & motor"],
        say: "The fan adds the push to drive conditioned air through the ducts to every diffuser in the hall." },
    ],
  },

  pump: {
    hook: "A pump is a heart for water: it spins the water hard, then trades that speed for pressure to shove it around the whole loop.",
    recap: "Motor spins the impeller → impeller flings water fast → the volute trades speed for pressure. Slow the motor a little and the power drops a LOT.",
    steps: [
      { t: "Spin the shaft", focus: ["Electric motor"],
        say: "The motor turns the shaft. On a variable-speed drive, this speed is the master control for the whole water loop." },
      { t: "Fling the water", focus: ["Impeller"],
        say: "The impeller's curved vanes hurl water outward, loading it with speed — it leaves the tips moving fast." },
      { t: "Speed → pressure", focus: ["Volute casing"],
        say: "The spiral casing slows that fast water down, and the lost speed becomes pressure — the push that moves water through pipes and coils." },
    ],
  },

  fan: {
    hook: "A fan is a pump for air. The wheel loads air with speed; the scroll turns that speed into the pressure needed to force air down the ducts.",
    recap: "Wheel adds speed → scroll turns speed into pressure. And because power rises with the cube of speed, easing a fan off a touch saves a fortune.",
    steps: [
      { t: "Draw air in", focus: ["Mounting wall & inlet cone"],
        say: "The bell-mouth inlet feeds air smoothly into the centre of the spinning wheel." },
      { t: "Fling it out", focus: ["Backward-curved wheel"],
        say: "Curved blades throw the air outward, loading it with speed. Blade shape decides efficiency and how hard the fan can push." },
      { t: "Build pressure", focus: ["Scroll housing"],
        say: "The volute gathers the fast air and slows it, converting speed into the static pressure that drives air through the whole duct system." },
    ],
  },
};
