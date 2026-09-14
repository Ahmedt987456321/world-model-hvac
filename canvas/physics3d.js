/* physics3d.js — the science behind each machine.
 *
 * Every entry is a real engineering model: the governing law, its inputs (with
 * ranges), and a compute() that returns outputs from the actual equations.
 * Standard forms from building-simulation references (EnergyPlus / Modelica
 * Carnot chiller, Hottel–Whillier–Bliss collector, e-NTU heat exchangers,
 * cooling-tower approach/range, affinity laws, radiator ΔT^1.3).
 *
 * A machine's 3D shape is how it looks; this is how it behaves.
 */
const CPW = 4187, CPA = 1005, RHOW = 1000, RHOA = 1.2, G = 9.81;
const f2 = (x) => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2));
const f1 = (x) => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(1));

export const PHYSICS = {
  chiller: {
    title: "Vapour-compression chiller",
    ref: "Carnot-COP model (EnergyPlus / Modelica Buildings)",
    law: "COP = η·(T_e+273)/(T_c−T_e)   ·   Q = ṁ·c_p·ΔT   ·   W = Q/COP",
    inputs: [
      ["mdot", "Chilled-water flow", "kg/s", 40, 5, 120, 1],
      ["dT", "ΔT return−supply", "K", 6, 2, 12, 0.5],
      ["Te", "Evaporator temp", "°C", 5, 1, 12, 0.5],
      ["Tc", "Condenser temp", "°C", 38, 28, 55, 0.5],
      ["eta", "Carnot fraction η", "", 0.5, 0.3, 0.7, 0.01],
    ],
    compute: ({ mdot, dT, Te, Tc, eta }) => {
      const Q = mdot * CPW * dT, COP = eta * (Te + 273.15) / Math.max(1, Tc - Te), W = Q / COP;
      return [
        ["Cooling capacity", f1(Q / 1000), "kW  (" + f1(Q / 3517) + " tons)"],
        ["COP", f2(COP), ""],
        ["Compressor power", f1(W / 1000), "kW"],
        ["Heat rejected", f1((Q + W) / 1000), "kW"],
      ];
    },
  },

  aircooled: {
    title: "Air-cooled chiller",
    ref: "Carnot-COP model; air-cooled → higher condensing temp, lower COP",
    law: "COP = η·(T_e+273)/(T_c−T_e)   ·   condenser rejects to ambient air (T_c ≈ T_amb + 15 K)",
    inputs: [
      ["mdot", "Chilled-water flow", "kg/s", 25, 5, 90, 1],
      ["dT", "ΔT return−supply", "K", 6, 2, 12, 0.5],
      ["Te", "Evaporator temp", "°C", 6, 1, 12, 0.5],
      ["Tamb", "Ambient air", "°C", 45, 20, 52, 1],
      ["eta", "Carnot fraction η", "", 0.42, 0.3, 0.6, 0.01],
    ],
    compute: ({ mdot, dT, Te, Tamb, eta }) => {
      const Tc = Tamb + 15, Q = mdot * CPW * dT, COP = eta * (Te + 273.15) / (Tc - Te), W = Q / COP;
      return [
        ["Condensing temp", f1(Tc), "°C"],
        ["Cooling capacity", f1(Q / 1000), "kW  (" + f1(Q / 3517) + " tons)"],
        ["COP", f2(COP), ""],
        ["Compressor power", f1(W / 1000), "kW"],
      ];
    },
  },

  tower: {
    title: "Cooling tower",
    ref: "Approach / range, wet-bulb limited (Brentwood / EnergyPlus)",
    law: "T_out = T_wb + approach   ·   range = T_in − T_out   ·   ε = range/(T_in − T_wb)   ·   Q = ṁ·c_p·range",
    inputs: [
      ["mdot", "Condenser flow", "kg/s", 60, 10, 150, 1],
      ["Tin", "Hot water in", "°C", 37, 30, 45, 0.5],
      ["Twb", "Ambient wet-bulb", "°C", 28, 10, 32, 0.5],
      ["approach", "Approach", "K", 4, 2, 10, 0.5],
    ],
    compute: ({ mdot, Tin, Twb, approach }) => {
      const Tout = Twb + approach, range = Math.max(0, Tin - Tout), Q = mdot * CPW * range;
      return [
        ["Leaving water", f1(Tout), "°C"],
        ["Range", f1(range), "K"],
        ["Heat rejected", f1(Q / 1000), "kW"],
        ["Effectiveness", f1(100 * range / Math.max(0.1, Tin - Twb)), "%"],
      ];
    },
  },

  pump: {
    title: "Centrifugal pump",
    ref: "Pump curve + affinity laws",
    law: "H = H₀·n² − k·Q²   ·   P_hyd = ρ·g·Q·H   ·   P_shaft = P_hyd/η   ·   (Q∝n, H∝n², P∝n³)",
    inputs: [
      ["Q", "Flow", "L/s", 50, 5, 150, 1],
      ["H0", "Shut-off head", "m", 45, 10, 90, 1],
      ["k", "Curve coeff k", "", 0.006, 0, 0.02, 0.001],
      ["eta", "Efficiency η", "", 0.75, 0.4, 0.85, 0.01],
      ["n", "Speed", "%", 100, 30, 100, 1],
    ],
    compute: ({ Q, H0, k, eta, n }) => {
      const nn = n / 100, H = Math.max(0, H0 * nn * nn - k * Q * Q);
      const Phyd = RHOW * G * (Q / 1000) * H, Psh = Phyd / eta;
      return [
        ["Head developed", f1(H), "m"],
        ["Hydraulic power", f2(Phyd / 1000), "kW"],
        ["Shaft power", f2(Psh / 1000), "kW"],
      ];
    },
  },

  fan: {
    title: "Centrifugal fan",
    ref: "Fan power + affinity laws",
    law: "P = ΔP·V̇/η   ·   affinity: V̇∝n, ΔP∝n², P∝n³",
    inputs: [
      ["V", "Airflow", "m³/s", 15, 1, 40, 0.5],
      ["dP", "Static pressure", "Pa", 600, 100, 2000, 10],
      ["eta", "Efficiency η", "", 0.65, 0.4, 0.8, 0.01],
      ["n", "Speed", "%", 100, 30, 100, 1],
    ],
    compute: ({ V, dP, eta, n }) => {
      const nn = n / 100, Vn = V * nn, dPn = dP * nn * nn, P = dPn * Vn / eta;
      return [
        ["Airflow", f1(Vn), "m³/s"],
        ["Pressure", f1(dPn), "Pa"],
        ["Fan power", f2(P / 1000), "kW"],
      ];
    },
  },

  boiler: {
    title: "Fire-tube boiler",
    ref: "Combustion efficiency + energy balance",
    law: "Q_out = ṁ·c_p·(T_out − T_in)   ·   Q_fuel = Q_out / η",
    inputs: [
      ["mdot", "Water flow", "kg/s", 5, 1, 20, 0.5],
      ["Tin", "Return temp", "°C", 60, 40, 75, 1],
      ["Tout", "Supply temp", "°C", 80, 60, 95, 1],
      ["eta", "Efficiency η", "", 0.9, 0.75, 0.98, 0.01],
    ],
    compute: ({ mdot, Tin, Tout, eta }) => {
      const Q = mdot * CPW * (Tout - Tin), Qf = Q / eta;
      return [["Heat output", f1(Q / 1000), "kW"], ["Fuel input", f1(Qf / 1000), "kW"], ["Efficiency", f1(eta * 100), "%"]];
    },
  },

  heatpump: {
    title: "Air-source heat pump",
    ref: "Carnot-COP heating model",
    law: "COP_h = η·(T_h+273)/(T_h − T_c)   ·   Q_h = W·COP_h   ·   Q_source = Q_h − W",
    inputs: [
      ["Tc", "Source air", "°C", 5, -10, 25, 1],
      ["Th", "Supply water", "°C", 45, 30, 60, 1],
      ["eta", "Carnot fraction η", "", 0.45, 0.3, 0.6, 0.01],
      ["W", "Compressor power", "kW", 10, 1, 50, 1],
    ],
    compute: ({ Tc, Th, eta, W }) => {
      const COP = eta * (Th + 273.15) / Math.max(1, Th - Tc), Qh = W * COP;
      return [["COP (heating)", f2(COP), ""], ["Heat delivered", f1(Qh), "kW"], ["Heat from air", f1(Qh - W), "kW"]];
    },
  },

  plateHX: {
    title: "Plate heat exchanger",
    ref: "ε-NTU, counterflow",
    law: "NTU = UA/C_min ,  C_r = C_min/C_max   ·   ε = (1−e^(−NTU(1−C_r)))/(1−C_r·e^(−NTU(1−C_r)))   ·   Q = ε·C_min·(T_h−T_c)",
    inputs: [
      ["mh", "Hot flow", "kg/s", 10, 1, 40, 1],
      ["Th", "Hot in", "°C", 80, 40, 95, 1],
      ["mc", "Cold flow", "kg/s", 12, 1, 40, 1],
      ["Tc", "Cold in", "°C", 40, 5, 70, 1],
      ["UA", "UA", "kW/K", 50, 5, 200, 1],
    ],
    compute: ({ mh, Th, mc, Tc, UA }) => {
      const Ch = mh * CPW / 1000, Cc = mc * CPW / 1000, Cmin = Math.min(Ch, Cc), Cmax = Math.max(Ch, Cc);
      const Cr = Cmin / Cmax, NTU = UA / Cmin;
      const e = Math.exp(-NTU * (1 - Cr));
      const eff = Math.abs(1 - Cr) < 1e-6 ? NTU / (1 + NTU) : (1 - e) / (1 - Cr * e);
      const Q = eff * Cmin * (Th - Tc);
      return [["Effectiveness", f1(eff * 100), "%"], ["Duty", f1(Q), "kW"], ["Hot leaves at", f1(Th - Q / Ch), "°C"], ["Cold leaves at", f1(Tc + Q / Cc), "°C"]];
    },
  },

  ahu: {
    title: "Air handling unit — cooling coil",
    ref: "Coil sensible energy balance",
    law: "ṁ_air = ρ·V̇   ·   Q_coil = ṁ_air·c_p·(T_in − T_out)",
    inputs: [["V", "Airflow", "m³/s", 10, 1, 60, 0.5], ["Tin", "Entering air", "°C", 28, 20, 45, 0.5], ["Tout", "Leaving air", "°C", 13, 8, 20, 0.5]],
    compute: ({ V, Tin, Tout }) => { const m = RHOA * V, Q = m * CPA * (Tin - Tout); return [["Mass flow", f1(m), "kg/s"], ["Coil duty", f1(Q / 1000), "kW  (" + f1(Q / 3517) + " tons)"]]; },
  },

  vav: {
    title: "VAV terminal",
    ref: "Variable-air-volume energy balance",
    law: "V̇ = V̇_max·PLR   ·   Q = ρ·V̇·c_p·(T_zone − T_supply)",
    inputs: [["Vmax", "Design airflow", "m³/s", 1.5, 0.2, 4, 0.1], ["plr", "Damper position", "%", 60, 20, 100, 1], ["Ts", "Supply air", "°C", 13, 10, 18, 0.5], ["Tz", "Zone setpoint", "°C", 24, 20, 27, 0.5]],
    compute: ({ Vmax, plr, Ts, Tz }) => { const V = Vmax * plr / 100, Q = RHOA * V * CPA * (Tz - Ts); return [["Airflow", f2(V), "m³/s"], ["Cooling to zone", f1(Q / 1000), "kW"]]; },
  },

  tes: {
    title: "Thermal storage tank",
    ref: "Sensible storage",
    law: "E = ρ·V·c_p·ΔT   ·   discharge hours = E / Load",
    inputs: [["V", "Tank volume", "m³", 5000, 100, 20000, 100], ["dT", "Usable ΔT", "K", 8, 4, 12, 0.5], ["load", "Discharge load", "kW", 1000, 100, 5000, 50]],
    compute: ({ V, dT, load }) => { const E = RHOW * V * CPW * dT / 3.6e6; return [["Stored energy", f1(E / 1000), "MWh"], ["Discharge time", f1(E / load), "h"]]; },
  },

  recoveryWheel: {
    title: "Energy recovery wheel",
    ref: "Sensible effectiveness",
    law: "ε = (T_sa − T_oa)/(T_ra − T_oa)   ·   Q = ε·ṁ·c_p·(T_oa − T_ra)",
    inputs: [["eff", "Effectiveness", "%", 75, 40, 90, 1], ["mdot", "Air flow", "kg/s", 8, 1, 30, 0.5], ["Toa", "Outdoor air", "°C", 45, -10, 50, 1], ["Tra", "Return air", "°C", 24, 18, 28, 0.5]],
    compute: ({ eff, mdot, Toa, Tra }) => { const e = eff / 100, Tsa = Toa - e * (Toa - Tra), Q = Math.abs(e * mdot * CPA * (Toa - Tra)); return [["Supply after wheel", f1(Tsa), "°C"], ["Energy recovered", f1(Q / 1000), "kW"]]; },
  },

  solarThermal: {
    title: "Flat-plate solar collector",
    ref: "Hottel–Whillier–Bliss equation",
    law: "η = F_R(τα) − F_R·U_L·(T_i − T_a)/G   ·   Q_u = A·η·G",
    inputs: [["A", "Aperture area", "m²", 4, 1, 20, 0.5], ["G", "Irradiance", "W/m²", 900, 100, 1100, 10], ["Ti", "Inlet fluid", "°C", 60, 20, 90, 1], ["Ta", "Ambient", "°C", 40, 0, 50, 1], ["FRta", "F_R(τα)", "", 0.72, 0.5, 0.85, 0.01], ["FRUL", "F_R·U_L", "W/m²K", 5, 2, 9, 0.1]],
    compute: ({ A, G, Ti, Ta, FRta, FRUL }) => { const eff = Math.max(0, FRta - FRUL * (Ti - Ta) / G), Q = A * eff * G; return [["Efficiency", f1(eff * 100), "%"], ["Useful heat", f2(Q / 1000), "kW"]]; },
  },

  pv: {
    title: "Solar PV array",
    ref: "Single-diode power with temperature derate",
    law: "P = A·G·η·(1 − β(T_cell − 25))",
    inputs: [["A", "Array area", "m²", 18, 1, 100, 1], ["G", "Irradiance", "W/m²", 950, 100, 1100, 10], ["eta", "Module η", "%", 20, 12, 24, 0.5], ["beta", "Temp coeff β", "%/°C", 0.4, 0.2, 0.6, 0.05], ["Tcell", "Cell temp", "°C", 55, 15, 80, 1]],
    compute: ({ A, G, eta, beta, Tcell }) => { const P = A * G * (eta / 100) * (1 - (beta / 100) * (Tcell - 25)); return [["Power output", f2(P / 1000), "kW"], ["Derate vs 25 °C", f1((beta) * (Tcell - 25)), "%"]]; },
  },

  radiator: {
    title: "Panel radiator",
    ref: "Manufacturer ΔT^n emission (n≈1.3)",
    law: "Q = Q₅₀·(ΔT/50)^1.3 ,  ΔT = ½(T_flow+T_return) − T_room",
    inputs: [["Q50", "Rated output @ΔT50", "W", 1500, 200, 4000, 50], ["Tf", "Flow temp", "°C", 65, 35, 85, 1], ["Tr", "Return temp", "°C", 55, 30, 80, 1], ["Troom", "Room temp", "°C", 21, 16, 24, 0.5]],
    compute: ({ Q50, Tf, Tr, Troom }) => { const dT = (Tf + Tr) / 2 - Troom, Q = dT > 0 ? Q50 * Math.pow(dT / 50, 1.3) : 0; return [["Mean ΔT", f1(dT), "K"], ["Heat output", f1(Q), "W"]]; },
  },

  valve: {
    title: "Control valve",
    ref: "Kv sizing + equal-% characteristic",
    law: "Q = Kv·√(Δp/SG)   ·   equal-%: Kv = Kvs·R^(pos−1)",
    inputs: [["Kvs", "Rated Kvs", "m³/h/√bar", 25, 1, 100, 1], ["R", "Rangeability", "", 50, 10, 100, 5], ["pos", "Stem position", "%", 60, 0, 100, 1], ["dp", "Δp across valve", "bar", 0.5, 0.05, 3, 0.05]],
    compute: ({ Kvs, R, pos, dp }) => { const Kv = Kvs * Math.pow(R, pos / 100 - 1), Q = Kv * Math.sqrt(dp); return [["Effective Kv", f2(Kv), ""], ["Flow", f1(Q), "m³/h"], ["Authority note", "β = Δp_valve/Δp_total", ""]]; },
  },

  damper: {
    title: "Control damper",
    ref: "Installed characteristic with authority",
    law: "q = α / √(β + (1−β)·α²) ,  α = position,  β = authority",
    inputs: [["pos", "Blade position", "%", 60, 0, 100, 1], ["beta", "Authority β", "", 0.3, 0.05, 1, 0.05]],
    compute: ({ pos, beta }) => { const a = pos / 100, q = a / Math.sqrt(beta + (1 - beta) * a * a); return [["Relative flow", f1(q * 100), "%"]]; },
  },

  ducts: {
    title: "Duct & fittings",
    ref: "Darcy–Weisbach friction",
    law: "v = V̇/A   ·   Δp = f·(L/D)·½ρv²",
    inputs: [["V", "Airflow", "m³/s", 2, 0.2, 10, 0.1], ["D", "Diameter", "m", 0.5, 0.15, 1.2, 0.05], ["L", "Length", "m", 20, 1, 100, 1], ["f", "Friction factor", "", 0.02, 0.01, 0.04, 0.001]],
    compute: ({ V, D, L, f }) => { const A = Math.PI * D * D / 4, v = V / A, dp = f * (L / D) * 0.5 * RHOA * v * v; return [["Velocity", f1(v), "m/s"], ["Pressure drop", f1(dp), "Pa"]]; },
  },

  diffuser: {
    title: "Ceiling diffuser",
    ref: "Orifice pressure drop",
    law: "v_face = V̇/(C_d·A)   ·   Δp = ½ρ·v_face²",
    inputs: [["V", "Airflow", "m³/s", 0.2, 0.02, 1, 0.01], ["A", "Neck area", "m²", 0.09, 0.02, 0.4, 0.01], ["Cd", "Discharge coeff", "", 0.7, 0.5, 0.95, 0.01]],
    compute: ({ V, A, Cd }) => { const v = V / (Cd * A), dp = 0.5 * RHOA * v * v; return [["Face velocity", f1(v), "m/s"], ["Pressure drop", f1(dp), "Pa"]]; },
  },

  humidifier: {
    title: "Steam humidifier",
    ref: "Moisture & latent balance",
    law: "ṁ_water = ρ·V̇·Δw   ·   Q_latent = ṁ_water·h_fg",
    inputs: [["V", "Airflow", "m³/s", 5, 0.5, 20, 0.5], ["dw", "Moisture added Δw", "g/kg", 3, 0.5, 8, 0.5]],
    compute: ({ V, dw }) => { const m = RHOA * V, mw = m * (dw / 1000), Q = mw * 2500; return [["Water rate", f1(mw * 3600), "kg/h"], ["Latent load", f1(Q), "kW"]]; },
  },

  economizer: {
    title: "Economizer / mixing box",
    ref: "Mixed-air balance + free cooling logic",
    law: "T_mix = x·T_oa + (1−x)·T_ra ;  free-cool when T_oa < T_ra",
    inputs: [["x", "Outdoor-air fraction", "%", 30, 0, 100, 1], ["Toa", "Outdoor air", "°C", 20, -10, 48, 1], ["Tra", "Return air", "°C", 24, 20, 28, 0.5]],
    compute: ({ x, Toa, Tra }) => { const Tm = (x / 100) * Toa + (1 - x / 100) * Tra; return [["Mixed-air temp", f1(Tm), "°C"], ["Mode", Toa < Tra ? "free cooling available" : "mechanical cooling", ""]]; },
  },

  expansiontank: {
    title: "Diaphragm expansion tank",
    ref: "Water expansion + Boyle's law acceptance",
    law: "V_t = V_sys·E_exp / (1 − P₁/P₂) ,  E_exp ≈ 0.00034·ΔT",
    inputs: [["Vsys", "System volume", "L", 5000, 100, 50000, 100], ["dT", "Temp rise", "K", 60, 10, 80, 1], ["P1", "Fill pressure (abs)", "bar", 2.5, 1.5, 4, 0.1], ["P2", "Max pressure (abs)", "bar", 4, 2.5, 6, 0.1]],
    compute: ({ Vsys, dT, P1, P2 }) => { const E = 0.00034 * dT, Vt = Vsys * E / Math.max(0.05, 1 - P1 / P2); return [["Water expansion", f1(Vsys * E), "L"], ["Min tank size", f1(Vt), "L"]]; },
  },

  sensor: {
    title: "Duct temperature sensor",
    ref: "NTC thermistor — β (Steinhart) model",
    law: "R = R₀·exp[β(1/T − 1/T₀)] ,  T in kelvin",
    inputs: [["T", "Measured temp", "°C", 22, -20, 60, 0.5], ["R0", "R₀ @25 °C", "kΩ", 10, 1, 100, 1], ["B", "β constant", "K", 3950, 3000, 4500, 10]],
    compute: ({ T, R0, B }) => { const R = R0 * Math.exp(B * (1 / (T + 273.15) - 1 / 298.15)); return [["Resistance", f2(R), "kΩ"], ["→ DDC reads", f1(T), "°C"]]; },
  },

  rtu: {
    title: "Packaged rooftop unit",
    ref: "DX cooling + EER",
    law: "Q = ṁ_air·c_p·ΔT   ·   Power = Q/EER",
    inputs: [["V", "Supply airflow", "m³/s", 6, 1, 20, 0.5], ["dT", "Coil ΔT", "K", 12, 6, 18, 0.5], ["EER", "Rated EER", "", 11, 7, 15, 0.5]],
    compute: ({ V, dT, EER }) => { const Q = RHOA * V * CPA * dT, kW = Q / (EER / 3.412); return [["Cooling capacity", f1(Q / 1000), "kW  (" + f1(Q / 3517) + " tons)"], ["Electric power", f1(kW / 1000), "kW"]]; },
  },

  fcu: {
    title: "Fan coil unit",
    ref: "Coil energy balance",
    law: "Q = ρ·V̇·c_p·(T_in − T_out)",
    inputs: [["V", "Airflow", "m³/s", 0.3, 0.05, 1.5, 0.05], ["Tin", "Room air", "°C", 26, 20, 32, 0.5], ["Tout", "Off-coil", "°C", 14, 9, 20, 0.5]],
    compute: ({ V, Tin, Tout }) => { const Q = RHOA * V * CPA * (Tin - Tout); return [["Cooling duty", f2(Q / 1000), "kW"]]; },
  },

  silencer: {
    title: "Duct silencer",
    ref: "Sabine attenuation for lined ducts (ASHRAE)",
    law: "IL = 1.05·α^1.4·(P/A)·L   ·   P/A = perimeter-to-area of the airway",
    inputs: [
      ["alpha", "Lining absorption α", "", 0.6, 0.1, 0.99, 0.01],
      ["W", "Airway width", "m", 0.6, 0.1, 1.5, 0.05],
      ["H", "Airway height", "m", 0.4, 0.1, 1.2, 0.05],
      ["L", "Silencer length", "m", 1.2, 0.3, 3, 0.1],
    ],
    compute: ({ alpha, W, H, L }) => {
      const PA = 2 * (W + H) / (W * H), IL = 1.05 * Math.pow(alpha, 1.4) * PA * L;
      return [["Perimeter/area", f2(PA), "1/m"], ["Insertion loss", f1(IL), "dB"]];
    },
  },

  absorption: {
    title: "Absorption chiller",
    ref: "Thermal-COP energy balance (LiBr–water)",
    law: "Q_chill = ṁ·c_p·ΔT   ·   COP_th = Q_chill/Q_heat   ·   Q_reject = Q_chill + Q_heat",
    inputs: [
      ["mdot", "Chilled-water flow", "kg/s", 40, 5, 120, 1],
      ["dT", "ΔT return−supply", "K", 6, 2, 12, 0.5],
      ["COP", "Thermal COP", "", 0.72, 0.5, 1.5, 0.01],
    ],
    compute: ({ mdot, dT, COP }) => {
      const Q = mdot * CPW * dT, Qh = Q / COP;
      return [
        ["Cooling capacity", f1(Q / 1000), "kW  (" + f1(Q / 3517) + " tons)"],
        ["Driving heat", f1(Qh / 1000), "kW"],
        ["Heat rejected", f1((Q + Qh) / 1000), "kW"],
      ];
    },
  },

  gshp: {
    title: "Ground-source heat pump",
    ref: "Carnot-COP with a stable ground source",
    law: "COP_h = η·(T_h+273)/(T_h − T_g)   ·   Q_h = W·COP_h   ·   Q_ground = Q_h − W",
    inputs: [
      ["Tg", "Ground-loop temp", "°C", 12, 2, 25, 0.5],
      ["Th", "Supply water", "°C", 40, 30, 55, 1],
      ["eta", "Carnot fraction η", "", 0.5, 0.3, 0.65, 0.01],
      ["W", "Compressor power", "kW", 8, 1, 40, 1],
    ],
    compute: ({ Tg, Th, eta, W }) => {
      const COP = eta * (Th + 273.15) / Math.max(1, Th - Tg), Qh = W * COP;
      return [["COP (heating)", f2(COP), ""], ["Heat delivered", f1(Qh), "kW"], ["Heat from ground", f1(Qh - W), "kW"]];
    },
  },

  drycooler: {
    title: "Dry cooler",
    ref: "Sensible air-cooled heat rejection",
    law: "Q = ṁ_w·c_p·ΔT   ·   dry-bulb limited: T_out ≈ T_db + approach",
    inputs: [
      ["mdot", "Water flow", "kg/s", 25, 5, 90, 1],
      ["Tin", "Water in", "°C", 45, 25, 60, 0.5],
      ["Tdb", "Ambient dry-bulb", "°C", 35, 10, 48, 1],
      ["approach", "Approach", "K", 5, 3, 15, 0.5],
    ],
    compute: ({ mdot, Tin, Tdb, approach }) => {
      const Tout = Tdb + approach, range = Math.max(0, Tin - Tout), Q = mdot * CPW * range;
      return [["Leaving water", f1(Tout), "°C"], ["Range", f1(range), "K"], ["Heat rejected", f1(Q / 1000), "kW"]];
    },
  },

  unitheater: {
    title: "Unit heater",
    ref: "Air-side sensible heating balance",
    law: "ṁ_air = ρ·V̇   ·   Q = ṁ_air·c_p·(T_out − T_in)",
    inputs: [
      ["V", "Airflow", "m³/s", 1.2, 0.2, 4, 0.1],
      ["Tin", "Room air", "°C", 16, 5, 22, 0.5],
      ["Tout", "Discharge air", "°C", 40, 25, 55, 0.5],
    ],
    compute: ({ V, Tin, Tout }) => {
      const m = RHOA * V, Q = m * CPA * (Tout - Tin);
      return [["Mass flow", f2(m), "kg/s"], ["Heat output", f1(Q / 1000), "kW"]];
    },
  },

  chilledbeam: {
    title: "Active chilled beam",
    ref: "Water-side balance + induction ratio",
    law: "Q_water = ṁ·c_p·ΔT   ·   room air induced ≈ K·V̇_primary",
    inputs: [
      ["mdot", "Water flow", "kg/s", 0.08, 0.01, 0.4, 0.01],
      ["dT", "Water ΔT", "K", 3, 1, 6, 0.5],
      ["Vp", "Primary air", "L/s·m", 12, 4, 25, 1],
      ["K", "Induction ratio", "", 4, 2, 6, 0.5],
    ],
    compute: ({ mdot, dT, Vp, K }) => {
      const Q = mdot * CPW * dT;
      return [["Cooling output", f1(Q / 1000), "kW"], ["Induced room air", f1(Vp * K), "L/s·m"]];
    },
  },

  crac: {
    title: "CRAC / precision cooling",
    ref: "Sensible data-hall cooling",
    law: "Q = ρ·V̇·c_p·ΔT   ·   SHR ≈ 0.95–1.0 (little latent)",
    inputs: [
      ["V", "Supply airflow", "m³/s", 6, 1, 20, 0.5],
      ["dT", "Coil ΔT", "K", 11, 5, 16, 0.5],
    ],
    compute: ({ V, dT }) => {
      const Q = RHOA * V * CPA * dT;
      return [["Sensible capacity", f1(Q / 1000), "kW  (" + f1(Q / 3517) + " tons)"], ["Airflow", (V * 3600).toFixed(0), "m³/h"]];
    },
  },
};
