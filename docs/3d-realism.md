# How can we build realistic 3D HVAC models?

Research brief for world-model-hvac. The question behind the question is *how PassiveLogic gets that polished look*, and what pipeline gives us the same without a graphics team.

## 0. The reframe that changes everything

The realism in Blueprint is **not** real-time procedural geometry (what our current `ahu3d.html` does). It's a **library of pre-authored equipment assets** — their own slide says it: *"Reusable components, templates, and validated system designs."* The equipment on their canvas are pre-made, art-directed assets placed and wired, not modelled live in code.

This is a whole industry. Companies sell exactly this:
- **QA Graphics** ships *3D HVAC Equipment Libraries* (AHUs, chillers, air conditioners) as ready graphics for building-automation/SCADA screens.

So the real question isn't "how do I model an AHU in code" — it's **"how do I source or author a library of realistic equipment assets, and place them, each bound to physics."** That last clause is where we beat them.

## 1. Four approaches (and their trade-offs)

| Approach | Realism | Interactive 3D | Effort | Ties to physics | Licensing risk |
|---|---|---|---|---|---|
| **A. Pre-rendered 2.5D sprites** — model in Blender once, export isometric PNGs, place on a 2D canvas | ★★★★★ | ✗ (static images) | Med (author once) | Weak (just a picture) | Low if self-made |
| **B. Real-time 3D: pre-made glTF + PBR + HDRI** (Three.js/Babylon) | ★★★★☆ | ✓ orbit/zoom | Med (source + optimize) | Strong (object per component) | Depends on model source |
| **C. Procedural parametric 3D** (our current proof) | ★★☆☆☆ | ✓ | High per part | ★★★★★ (geometry *is* the parameters) | None |
| **D. AI-generated 3D / sprites** (Meshy, etc.) | ★★★☆☆ | ✓/✗ | Low | Weak | Check terms |

Key insight: **most polished schematic tools use A (pre-rendered sprites).** That's almost certainly what Blueprint's canvas shows — baked isometric renders, which is *why* they look so clean and why they don't rotate. Real-time 3D (B) is what you'd use if you want the user to orbit the model.

## 2. Where the assets come from

- **3D model marketplaces** (glTF/GLB): [TurboSquid](https://www.turbosquid.com/3d-model/free/hvac-equipment) has 50+ free HVAC models in glTF; [Sketchfab](https://sketchfab.com), [Free3D](https://free3d.com/premium-3d-models/hvac), [ArtGraphic3D](https://artgraphic3d.com/3d-models/262-hvac-equipment).
- **BIM / MEP families**: manufacturer Revit families → export to glTF. These are *dimensionally accurate* real equipment — the gold standard for correctness.
- **AI generation**: [Meshy](https://www.meshy.ai/tags/hvac) turns text/images into GLB models. Fast, variable quality, check licensing.
- **Author your own** in Blender → export glTF for approach B, or bake to sprites for approach A. Full control, no licensing questions.

## 3. The realism techniques (for real-time 3D, approach B)

The gap between our toy-looking proof and a realistic render is mostly four things:

1. **PBR materials** — `MeshStandardMaterial` / `MeshPhysicalMaterial` (metalness–roughness workflow) react correctly to lighting. We use these already.
2. **HDRI environment map** — the single biggest realism unlock. An environment map lights the scene and gives metal something real to reflect; it renders faster than many lights and looks far better. Pair with **ACES filmic tone mapping** (we do this). Our proof uses a hand-rolled studio env; a real HDRI (or Three.js's built-in `RoomEnvironment`, which needs no file) jumps the quality immediately.
3. **PBR texture sets** — real albedo / normal / roughness / metalness / AO maps instead of flat colors (brushed-metal grain, painted-panel texture, galvanized speckle). This is what makes a surface read as *real* metal.
4. **Web optimization** — `gltf-transform`, Draco/meshopt geometry compression, KTX2 compressed textures, so realistic models still load fast. Drop-in option: Google's `<model-viewer>` web component.

## 4. Recommendation for world-model-hvac

**A hybrid, and it's the thing that makes us *better* than Blueprint, not just similar:**

- **Real-time 3D library, each model bound to a physics component.** A catalog entry = a glTF model (realistic) **+** a `wm` component (it actually simulates) **+** parameters (it's editable). Blueprint's assets are pretty pictures; ours would be pretty pictures that *predict and learn*.
- **Keep procedural for connective geometry** — ducts and pipes that stretch between components are *better* procedural (they must flex to fit), so approach C stays for those.
- **Sprites (A) as a fast-path fallback** for the 2D canvas view, real-time 3D (B) for a "3D view" toggle.

Concrete near-term build:
1. Upgrade the 3D view to **PBR + a real environment** (`RoomEnvironment` — no download needed) → instant realism jump on the model we already have.
2. Add a **GLTFLoader slot** so any `.glb` file dropped in the repo renders in place of the procedural model.
3. Source 3–4 free glTF models (AHU, pump, chiller, VAV) and bind each to its physics component.

## 5. The one real constraint in this build environment

This cloud sandbox **blocks web downloads** (only package registries like npm are reachable). So I can't fetch models or HDRIs directly. Two unblocked routes:
- **You supply the files** — download a free `.glb` / `.hdr` and drop it in the repo; I wire it in (one line with GLTFLoader).
- **npm-vendored assets** — Three.js (which I *can* pull from npm) ships `RoomEnvironment` (procedural, file-free) and all the loaders. So I can build the **whole realistic pipeline now** — PBR + RoomEnvironment + GLTFLoader — and dropping a real model in becomes trivial.

## Sources
- [PassiveLogic — Blueprint](https://www.passivelogic.com/system/autonomy-building-platform/blueprint)
- [QA Graphics — 3D HVAC Equipment Library (AHU)](https://www.qagraphics.com/equipment-library-air-units/)
- [TurboSquid — free HVAC equipment (glTF)](https://www.turbosquid.com/3d-model/free/hvac-equipment)
- [Sketchfab — HVAC models](https://sketchfab.com)
- [Meshy — AI HVAC 3D models](https://www.meshy.ai/tags/hvac)
- [Three.js — MeshStandardMaterial (PBR)](https://threejs.org/docs/api/en/materials/MeshStandardMaterial)
- [Three.js best-practices / performance](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [PBR textures for Three.js — guide](https://www.playtex.ai/blog/using-pbr-textures-for-three-js-games)
