# Trein handoff 73 (14 Nov 2026): v4.15.0 — the Staggerwing rebuilt from the user's photos, game controller support; next: plan step 7 (footbridge)

The game is no longer one file (4.14.0): `trein.html` (markup) + `css/trein.css` + `js/*.js` + `buildings/*.js`, loaded as classic scripts in the order listed in trein.html. See "Files (4.14.0)" below.

## START HERE (restart brief, updated 14 Nov 2026)
**Project**: Trein, a toy train sim (WebGL2): `trein.html` + `css/` + `js/` + `buildings/`, hosted on GitHub Pages (https://kaasgezicht.github.io/oefening/trein.html). The user plays it on a Pixel 9a and a MacBook M1 Air.
- Repo `kaasgezicht/oefening`. Always work on, commit to and push to branch `claude/trein-village-growth-texture-lhhj3b` (`git push -u origin claude/trein-village-growth-texture-lhhj3b`; it continues from `claude/project-improvements-polish-enesc6`). No PR unless asked.
- End commit messages with these two lines, and put no model names in code or commits:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XEFkHm1jcQJ6MRroWR8zg2
  ```
- After each change, push (GitHub Pages serves the branch the user set up) and send this file plus check pictures with SendUserFile. trein.html alone no longer runs without its js/ files.
- **Where we are (14 Nov)**: plan steps 1–6 are done (4.2.0–4.8.0). In between, on request: the benchmark world (4.4.0), no camera jumps on Build/Trains and reachable-only destinations (4.8.1), the new farm with the grain tower and loading arm (4.9.0), the DB class 01 118 with full valve gear as a second loco and the HEA-style grain hopper (4.10.0, reworked from close-up photos in 4.10.1). Next in the plan: **step 7 (footbridge)**, then water (8–10). See "Rolling stock and farm: reference" and "Findings and open questions (14 Nov)" below.
- **Current plan: `trein-plan.md`** (13 numbered steps, one per "continue"; the user refers to items by number, e.g. 3.4). Read it first. Phone results that shaped it: buildings cost half the frame on the Pixel 9a (Mali-G715); water banding/stripes are probably low-precision texture reads (no `precision highp sampler2D` in GLSL_HEAD).

### Latest (4.15.0, 14 Nov) — the Staggerwing rebuilt from three photos, game controller
User's choices: controller throttle as a rate (stays where you leave it); right stick up = nose down; the proposed button map; a full rebuild.
- **Model** (`planeMeshes` in js/plane.js, the only copy):
  - Parametric and smooth: `surf(M,f,us,vs,paint)` builds a grid surface with normals from central differences and one colour/material per
    quad. Fuselage = one loft of superellipse sections (tables `yT`, `yB`, `hW`, `eX`, `cowlR`, interpolated by `mono`, a monotone cubic)
    from the cowling lip (x 3.02) to the rudder hinge (x -4.62). Proportions measured from photo 1 (depth ~1.5 m at the cabin, cowl 1.28 m).
  - Wings and tail are NACA 4-digit aerofoils (`lift`, `foilY`) on planforms with elliptic tips (`wingPF`); negative stagger (lower LE 1.55,
    upper LE 0.85); I-struts as flared aerofoils; doubled flying and landing wires; tailplane braced from below; rounded fin and rudder.
  - Paint: lightning bolt and cowl speed lines as decal ribbons (`ribbon`, side-view polylines mapped onto the loft, 6 mm proud; normals
    from the skin via `decalNormals`), a pinstripe on the upper wing, gold bars as registration on the rudder.
  - Cabin: the skin is left open where the windows and windscreen are (W1, W2, `inWS`), with glass (material 13: plane glass, more
    reflective, no lamplight) and red frame mouldings; a dark lining (open at the windows), floor, seats, panel with gauges, yoke; pilot and
    passenger are separate meshes (the passenger waves, like photo 2; the pilot is hidden in the cockpit view).
  - Engine: polished lip, nine finned cylinders with pushrods, crankcase, baffle; exhaust stubs; chrome bullet spinner and two twisted
    blades with yellow tips; a faint prop disc (material 12, transparent pass, strength from rpm via uOcc.x).
  - Gear: oleo leg with coil spring and chrome piston, fork, tyre (torus), red hub with chrome cap, drag brace and the big outer fairing plate;
    folds aft into the lower wing root (same 1.45 rad as before). Contact points moved with the new model: mains at x 1.15, y -1.81; tailwheel
    y -0.75 (about 11° nose-up on the ground). Eye for the cockpit view [0.52, 0.6, -0.27].
  - Moving parts on their own hinge lines: `PLANE_PARTS[name] = {i, o, ax}` (ailerons on the upper wing, flaps on the lower wing, elevators,
    rudder); `Plane.draw` uses them. `R.planeMesh = R.veh.slice(37)` (the plane's meshes are last). About 57k triangles in all.
  - New vehicle-shader materials: 10 chrome (mostly reflection), 11 glossy clear-coat paint, 12 prop disc, 13 plane glass.
  - Bugs found on the way: `revolve` and the fairing outline read outside their tables at the first finite difference, and the wing tip
    `sqrt(1-q²)` went NaN just past the tip: each crashed the boot (all vehicles are built at start). Check new mesh code in Node first:
    the builder is plain JS (`/tmp`-style harness: load js/plane.js up to "// ---- flight model" with stub `vmesh`, `clamp`, `COL`).
- **Controller** (`PlanePad` in js/plane.js, polled from `Plane.update`): Gamepad API, standard mapping (Xbox layout). Left stick Y: throttle
  rate (0.7/s); right stick: roll and pitch with a little expo (stick up = nose down, same sign as the touch stick); LB/RB rudder; LT brake
  (analog); A gear, B next camera, X flaps step, Y assists, D-pad down/up flaps out/in, D-pad left/right camera, RT held look back
  (`Plane.lookBack`), Start pause (`Plane.paused`), Back reset. The pad writes a control only while it is used and releases it once, so the
  touch controls still work. `PlaneUI` got `gear()`, `setFlaps(n)`, `nextCam(d)`, `easy()` shared by both.
- **Cockpit view**: eye [0.45, 0.75, -0.27], looking ~3° down; the windscreen runs down to the cowling (`wsX` = 1.72 - 0.32 cos²θ), a
  firewall at x 1.76 closes the fuselage ahead of the panel (the dark glare-shield area), the lining is open at the windows.
- **Camera fix (all flying)**: the near plane grows with height (12% of the height above ground, up to 12 m), so at altitude it cut
  into the plane the chase camera follows 12 m behind (wings vanished). `Cam.update` now caps it at (distance to the plane - 6) x 0.4.
- **Controller test** (scratchpad pad.js): a fake standard gamepad through `navigator.getGamepads`; every mapping passed (hold buttons
  longer than one headless frame, ~1 s, or they are missed).
- Renders for checking: a persistent-profile harness posed like the photos (scratchpad plv.js; views photo1/photo2/photo3/rear/gearup/
  front/top/below/cockpit). Pictures: checks/staggerwing-vs-photos.png (the user's photos left, the game right), staggerwing-views.png,
  staggerwing-cockpit.png.
- Remaining differences to the photos: the real cowling is a little larger relative to the fuselage, the gear legs are sturdier, the
  registration is real lettering (here gold bars).

### Earlier (4.14.0, 14 Nov) — smoothness, performance settings, follow camera, slot ghosts, file split
The user's M1 measurement: 599×338 render, 9.3 ms GPU in "Measure on this phone", but the game ran at 44 fps (22.5 ms). Causes found:
- **Every frame rebuilt the station picture and all building instances** (since 4.8.0): `Life.updateStations` ran every frame and called
  `applyTrackMask`, which set `uploaded=false`, so the whole instance set was rebuilt and uploaded each frame (the log was full of
  "N houses make way for the railway"). Now `Life.update` builds a signature (Net.ver, stations, village levels) and only rebuilds when it
  changes; otherwise `trainsAtStations()` does the cheap per-frame part. Also: a new house no longer throws away the leaf tree grid (it was
  rebuilt from ~170k trees each time; the grid now holds references and skips felled trees), growth runs for one village every 120 ms instead
  of all at once, and culverts are applied at most every 1.5 s (`culvertLater`/`culvertFlush`). CPU per frame on the user's save
  (headless): 4.26 → 1.77 ms at 1×, 29.36 → 3.38 ms at 8×.
- **Full-resolution tone/upscale pass**: with "Sharper upscaling" the last pass runs at the full canvas size (2880×1800 on a retina M1);
  the user's numbers showed +5 ms for it. New **Screen sharpness (pixel density limit)** `maxDpr` (1, 1.25, 1.5, 2, full) caps the canvas.
- **New Quality settings, all in the presets**: `maxDpr`, `labelRate` (labels move every frame / 2nd / 3rd), `ffDetail` (at 4× and 8×
  leaves, steamers, balloons and beach-goers update every 3rd frame with the summed time). Presets now also set shadows, building detail,
  plant budget, cloud/mist/reflection quality, glow, diorama blur and sharper upscaling. Low: 0.7 render scale, pixel density 1×, shadows off,
  no glow/blur, plain upscaling, labels every 2nd frame. Medium: 1.5×. High: 2×. Settings outside "quality" that are in a preset now count
  as device settings (`device()`), so a save from another device does not override them.
- **Measure on this phone**: also reports the real game loop (fps, worst frame, CPU, screen → canvas → render size), the quality settings and
  the browser, plus two new tests (no glow/blur, pixel density 1×). **Copy results** puts the text on the clipboard (with a fallback).
- **Follow camera**: it eased the target toward the train (k = 6·dt), so it lagged by speed/6 and jittered with uneven frames; at 8× the
  train sat 74 px off centre and jumped 2.3 px per frame (headless check). Now the target is fixed to the train and only the left-over offset
  (switching trains, panning) eases away; the ground-follow no longer pulls the follow target. Chase does the same in the train's frame.
  Result: 0 px offset, 0 px jumps at 1× and 8×.
- **Station chips** (name + waiting counts over stations): light background with black text (was gold on dark).
- **Industry station places**: green rectangles with a dark rim on stakes (were thin white rails). Tapping one shows the station ghost there
  (on the track if one passes within 9 m, else free with its own 70 m siding); ✓ builds it. Such a ghost skips the collision check
  (`G.slot`, the places were checked when generated); dragging it makes it a normal ghost again.
- **Bug found while testing**: loading a save charged the trains again (€100,000 for the user's train) because `Money.paidTr` was empty
  after a load. `Trains.load` now marks loaded trains as paid.
- **File split** (the user: GitHub Pages lifts the one-file limit): see "Files (4.14.0)".
- **The user's code review (mid-turn) and what was done**:
  - `updateStations` setting `kitDirty` and calling `applyTrackMask` every frame: fixed by the signature check above (it runs only on change).
  - `Clouds.update` ran its 96² simulation at 10 Hz with Cloud quality Off: now it stops, and the cloud map is cleared once (the ground's
    cloud shadows and the water's sky reflection read it, so leaving it would give shadows of invisible clouds).
  - `fxUpscale` on by default ran the tone pass (bicubic + sharpen) at full screen size whatever the render scale: now off by default and on
    Medium; only High has it. (The bloom and tilt-shift blurs already run at quarter size and are skipped at 0; the tone pass reads one
    bloom sample, now also skipped at 0.)
  - `FS_TERRAIN` had no cheap path: new **Ground detail** setting (`terrainQ`, Full/Simple; Simple on Low). `FS_TERRAIN_LO` is the same
    shader with `#define TLO`: one broad noise for the grass instead of three scales of tufts, no flowers, no rock speckle, plain sand roads
    (no ruts, pebbles, puddles), forest edge read once. Compiled the first time it's used. Picture: checks/ground-full-vs-simple.png.
    SwiftShader frame 5.2 → 1.6 ms in one view (CPU renderer, only indicative).

## Files (4.14.0)
`trein.html` holds the markup and the list of scripts; CSS is `css/trein.css`. The scripts are classic `<script src>` files in one shared
global scope, in this order (code that runs at load time may only use what earlier files define; functions can use anything):
- `js/core.js` — VERSION, log, the parameter registry (`def(...)`, every setting), PRESETS, panel UI, save/load, Money, Goods, UI chips
  (LoadUI, StationUI, VillageUI...).
- `js/gen.js` — terrain generation, erosion, water, the world cache. `js/gl.js` — WebGL setup. `js/shaders.js` — terrain/water/sky shaders.
- `buildings/kit.js` + the models (cottage, tavern, farmhouse, shop, church, bridge, station, sawmill, farm) — loaded directly now; edit them
  in place (there is no embed step any more; `tools/embed_buildings.py` is gone).
- `js/objshaders.js` — shaders for instanced objects and the kit. `js/meshes.js` — low-poly meshes (trees, people, vehicles, slot marks...).
- `js/track.js`, `js/route.js`, `js/network.js`, `js/build.js` (Build: track/road/station tools), `js/train.js` (Trains, Crane),
  `js/audio.js`, `js/drive.js`, `js/weather.js`, `js/life.js` (villages, people, farms, industries, growth), `js/music.js`,
  `js/render.js` (R: passes, post), `js/camera.js` (Cam), `js/plane.js` (Staggerwing), `js/main.js` (main menu, map view, App),
  `js/bench.js` (benchmark world, PhoneBench, the frame loop, boot).
- `sw.js` lists every file for offline play (cache `trein-v2`; bump it and update the list when files are added). It fetches with
  `cache:'no-cache'` so all files come from the same version.
- `?nostart` loads the code without booting (used by `tools/meshcheck.js`); `?nomenu` skips the main menu.
- Syntax check: `for f in js/*.js buildings/*.js; do node --check $f; done`.

### Earlier (4.13.0, 14 Nov) — main menu, map styles, 16 km, the Staggerwing
User's choices: 16 km with 8 m cells (2048²); stick + throttle on screen; realistic with assists; menu at start and from a button.
- **16 × 16 km**: World size option 16384 (auto map detail 2048, also selectable). Generated fine on the test machine (32 villages); about 4x
  the memory and first-start time of 8 km on the phone (not measured there); the world cache makes later starts fast.
- **Map styles** (World > Map style, `mapStyle`: land / island / islands, `landShare`): `coastShape()` (after `shapeHeight` and big mountains)
  lifts land onto a coastline mask and sinks the rest; the sea surface is `SEA_LEVEL` (40 m). The outermost cells are held at sea level, so
  `genWater` sees the ocean as one basin filled to that level; that basin is never breached (`d.sea`). `T.sea` is carried through erosion and the
  cache. The sea never freezes (water shader `uSeaL`, skating `iceOK`). Choosing an island style sets sea-like waves (lakeFetch 40,
  lakeWaves 1.7, lakeFoam 1.4, lakeChop 1.1); Land restores the defaults.
- **Main menu** (`MainMenu`, `#mainMenu`; Menu button 🏠 in the bar; shown at start unless `?nomenu` or a test browser): SVG logo; Continue /
  New game / Saves / Quality / Fly the Staggerwing / All settings. New game: style chips, size, seed + dice, mountain sliders, big mountains,
  island size, villages, and a live 2D preview (`previewLand` 160² + `drawPreview`: relief shading, sea, beaches, snow; no rivers/lakes).
  Start clears track, trains, roads, buses, money and growth, applies the land settings and generates. Saves: save now, load, export/import
  file, debug log. Quality: presets, building detail, render scale.
- **Staggerwing** (`Plane`, `PlaneUI`, `planeMeshes`, vehicle meshes 37-45; Settings > Trains > Fly the Staggerwing, or the menu): lofted fuselage
  with gold/maroon stripe, NACA cowling with polished lip, radial cylinders, chrome spinner, two-blade prop (turns), cabin glazing, crew,
  negative-stagger wings with rounded tips, I-struts and wires, fin, tailplane with struts; moving: propeller, elevator, rudder, ailerons,
  main gear (folds aft, 6 s) and tailwheel. Flight model: rigid body (quaternion), lift curve with stall (~16°, flaps move it), induced/parasite/
  gear/flap drag, thrust from 450 hp and speed, propwash on the controls, stability and damping moments, three wheel contacts (springs,
  brakes, steerable tailwheel), belly with the gear up, crash on hard impacts or water. Assists (on by default): coordinated rudder, bank and
  pitch limits, no stall, vertical-speed hold with the stick centred. Spawns on the flattest dry stretch near the camera (else 300 m up).
  Cameras: chase, cockpit (at the windscreen, rolls with the plane), wing, tower, orbit (free camera following). Controls: throttle slider,
  stick, rudder and brake buttons, gear, flaps, camera, assist, reset, exit. Tested by a scripted take-off: rolls, lifts off ~105 km/h,
  climbs, gear retracts. Not tested: phone touch handling, sound (none yet), landing by hand.

### Earlier (4.12.0, 14 Nov) — five requests with the user's save and log (8 km, Pixel 9a, ~50-60 fps)
- **Bus bug** (3 buses + a lorry stopped at the last stop): a vehicle leaving a stop waited for any lower-id vehicle that was driving slowly
  within 9.5 m, including one queued behind it, which itself waited for the first to leave: a deadlock at a shared stop. Now a dwelling
  vehicle ignores queued vehicles and ones behind it, and after 20 s of extra waiting it goes anyway. Could not reproduce the exact freeze in
  the test (the save stores no bus positions, so they restart at their first stop; a 2-hour simulated run cycled fine); fix is by reading.
- **Money**: on by default (old saves keep their setting). Borrow/Repay hidden until the money is tapped, hide again after 8 s.
- **Big mountains** (World tab): `bigMtns` 0-3, `bigMtnHeight` 200-3000 m, `bigMtnBase` 400-6000 m, `bigMtnLong` (round peak → ridge up
  to 4x longer than wide), and per mountain X/Z position (%) and ridge direction (0 = from the seed). `bigMountains(p)` adds them in metres
  after `shapeHeight` (concave cone along a segment, ridged-noise spurs, faded out within 9 % of the world edge), before erosion, so rivers
  carve them. The snow line follows the real top when the land rises far above "Mountain height" (`T.hTop`). Villages place as usual.
- **World cache** (IndexedDB `trein-cache`, one entry 'land'): the land after vegetation and before villages, stored with the key
  VERSION + every setting with apply world/water/veg. Functions are stripped (`WorldCache.plain`). On start (generate(0)) a matching entry
  replaces terrain/erosion/water/vegetation; villages are generated on top as before, then the compact save applies growth, track etc. Wrong key,
  incomplete or unreadable entries are ignored (and removed) and the land is generated. Test (4 km): 4.7 s of generation → 0.1 s, identical
  village/house/tree counts; a changed seed misses as it should. Setting: Experimental > "Keep the generated land in a cache".
  **Compact save** is now also written automatically every 3 minutes and when the page is hidden (`App.autosave`).
- **Map** (new Map button): camera straight down, clouds/mist/haze/blur off (R.skip + params restored on close), north up, pinch zoom out to
  2.4x the world; a 2D canvas `#mapOv` draws railways (red), bus routes (blue dashed) and lorry routes (orange) along the roads
  (`Buses.roadPath`, cached per leg), trains and buses as dots, and symbols with names (village size: 🏡 hamlet, 🏘️ village, 🏰 town; 🚉
  stations, 🌾 farm stations/farms, 🚏 bus stops, 🏯 castles, ⛏️ mines, 🪚 sawmills, 🪑 workshops, ⚓ docks); names that would overlap one
  already drawn are left out. Tap a symbol to leave the map there.
- Not tested on the phone. The map renders the whole world at once (the user's 8 km world: 1.1M triangles in the test at 15-20 fps on the
  software renderer).

### Earlier (4.11.0, 14 Nov) — user's phone screenshots of the farm + three general requests
**User's findings (phone):** tractor half in the ground, farm buildings "made lazily" (holes, clipping), the grain station partly a normal
station (platform), the look far from the reference; and: make "install app" work in Chrome; building detail slider down to 0.10x; details
should fade in instead of popping.
- **Installable app (PWA)**: `manifest.webmanifest`, `sw.js` (network first, cache fallback, so new versions show on the next start),
  `icons/` (192, 512, maskable 512, drawn by a Python script), `index.html` (redirects to trein.html). trein.html links the manifest and
  registers `sw.js` only on http(s). Checked with Chrome's own installability check (no errors, worker active). **Needs GitHub Pages**:
  repo Settings > Pages > Deploy from branch (the branch with these files, folder /), then open https://kaasgezicht.github.io/oefening/
  on the phone > menu > Install app. Opening the file from Files/Drive (content://) can never offer install.
- **Building detail**: slider `kitLod` min 0.1. **Fade**: instances within +-22 % (in size on screen) of a level switch are drawn by both
  levels (buckets `kit_<type>_<l>f`, program `R.pKitF` = FS_KIT(true)), each dithered by a screen-space noise: the finer level keeps the share
  u, the coarser the rest (instance float iB.w = +-(1+u)). Costs extra draws only for buildings near a switch.
- **Farm rebuilt** (buildings/farm.js): split into kit types `farmHouse`, `farmBarn`, `farmShed`, `farmYard` (each its own plot and level, so
  big pieces no longer drop to the coarse level early), plus `grainTower`, `grainArm`, `farmAll` (render only). Built in the reference's
  layout (seen from the track: shed front left, house behind it, barn at the back, tower on the right) by building mirrored in x (`mirror`),
  positions in `KIT.FARM` (farm frame). New helpers: `slab` (a roof plane laid with real slates), `hip` (pyramid/hip roof of slabs),
  `gable`, `fret` (white fretwork bargeboards and finial), `win2` (sash window with louvred shutters), `door2`, `picket`, `railFence`.
  House: two front gabled bays, quoins, three chimneys with pots, veranda with posts/brackets/balusters and a slate lean-to, roses.
  Tower: quoins, lamps, braced stage, gallery with balusters, board cabin, slate pyramid roof and cupola with real slates, weathervane,
  lean-to with its own slate roof, silo with seams, catwalk, machine house. Tractor wheels stay as discs at the far level (it looked sunken
  because the wheels vanished there).
- **Grain station is cargo only**: `isCargo` includes `st.farm`; no platform pieces, no passenger terrace (it painted the whole area as
  gravel and cleared houses). Instead the ground from the track to behind the tower is levelled to rail height without gravel, and the tower
  stands on its own cobbled loading apron (stone base reaching 3 m down) with a low brick wall, coping and iron posts 2.3 m from the track.
  Passenger trains don't stop there (destOf). Checked: no walkers within 30 m, no conductor, loading still works with the 01 and 4 hoppers.
- Farm positions moved with the layout: `fm.yard`, `fm.gate` (front field gate), `fm.park` (in the yard), `fm.unload`, farm folk.
- **Lesson**: the version bump broke the script once (an apostrophe in the VERSION string ended it): after every edit of trein.html run the
  syntax check (extract the biggest <script>, `node --check`), also after the bump. Kit memory now 156 MB, built in about 3 s on the test machine.
- Not tested: phone speed (the farm is ~130k triangles at full detail; four kit types more to build at start-up), old saves (farm layout is
  regenerated from the seed, so it just changes), night lights on the farm.

### Earlier (4.10.1, 14 Nov) — 01 118 reworked from the user's close-ups (cylinder, cab side, tender rear, front)
- Proportions: loco 15.2 m (front +7.6), tender 8.0 m (VEH.loco01 / tender01). Bogie axles 6.05/3.85, drivers 2.3/0/-2.3 (main crank on the middle one), trailing axle -6.2 under the cab (-5.2..-7.25); a long firebox (down to the running board) between the rear driver and the cab. G01 updated (L 3.6, link pivot 2.6/1.82, lever 4.08, valve spindle at 1.86).
- New helpers: `vhull` (prism over the convex hull of circles: the lagged cylinder + valve chest casing), `vbolts`, `vsign`; `vplate` also faces -x and its frame no longer covers the figures.
- Details from the photos: cylinder blocks under the running board with bolted covers, valve chest tail tube and the red Krupp plate; red rods (coupling, main, eccentric, return crank), steel crosshead/link/radius rod/lever; two slide bars; red main air reservoir between the rear driver and the trailing wheel; cab with a glazed front side window, an open driver's window, grab rail, gold "01 118" plate and small plates, red bottom band, steps; roof with the long overhang and the four-opening ventilator; washout covers and the tall box beside the firebox; deflectors with a rounded top corner standing on the running board; tender: full-width tank, narrower ribbed upper part, rear box with the number plate, three rear lamps, door panels, yellow warning plates, ladder, coil-sprung bogies.
- Triangles: loco ~24.7k, tender ~9.4k. Checked: renders matching each photo's view, valve gear at four quarter turns, cab view, save/load; ui_checks and step2_checks.

### Earlier (4.10.0, 14 Nov) — DB class 01 and the grain hopper (user's photos)
- **Loco choice**: `LOCOS` table (`std` = the green loco, `'01'`) with per-kind mesh, chimney/drain/whistle/eye/crew positions, driving wheel radius `R` (exhaust beats) and pull factor `te`; `locoSpec(tr)` reads `tr.veh[0].lt`. `Trains.locoPair(lt)`, `Trains.setLoco(t,lt)`, `consist(n,livery,lt)`; saves store `lt`. Train list: "🚂 Green / 🚂 01" buttons above the wagon editor; `Drive.locoKind` = the kind new locos get.
- **01 118** (`loco01Mesh`, mesh 34; `VEH.loco01` 14.6 m, 108 t): real size, 2'C1' wheels (bogie 1.0 m, drivers 2.0 m with counterweights, trailing 1.25 m), bar frames, Wagner smoke deflectors, smokebox door with handwheel and "01 118" plate (7-segment figures, `vplate`), chimney, three domes, safety valves, whistle, air and feed pumps, three headlamps, cab with glazed windows, backhead and firedoor glow. ~19k triangles.
- **Valve gear**: vertex anim types 4-10 in VS_VEH with uniforms uG1-uG3 from `G01` (crank -1.3/1.0, r 0.33, main rod 3.3, return crank 0.2 at -90°, link pivot 0.25/1.78, foot 0.42, die 0.26, lever 0.72..1.98): main rod, crosshead/piston rod/union link, eccentric rod, expansion link, radius rod, combination lever (shear) and valve spindle; the die flips with the running direction (`tr._gs`). Checked frame by frame at four quarter turns.
- **T32 tender** (`tender01Mesh`, mesh 35, 8.6 m, two bogies).
- **Hopper** (`hopperMesh` replaces wagonMesh(0), mesh 6): HEA-style open box on two chutes, weathered rust paint (FS material 9), oleo buffers, W-irons, leaf springs, round axlebox covers, ladder, brake lever, placards. **Grain**: `grainHeapMesh` (mesh 36, smooth normals, material 8 = kernels) drawn like the ore heaps, rising in the box with `v.n`, heaped above the rim when full.
- Tested: renders from all sides, valve gear in 4 positions, cab view, loco switch/save/load, a run forward and back, farm loading still fills all hoppers; ui_checks and step2_checks. Not tested: phone speed with several 01 trains, the green loco's look unchanged (same code path), night lamps.

### Earlier (4.9.0, 14 Nov) — farm from the user's picture, grain station, small fixes
- **4.8.1**: opening Build no longer drags the camera to a far track end (piece preview only moves the camera when the selected end is in view and near); opening Trains no longer switches to follow; the train list's destination menu only offers stations reachable from the train's track (`Net.reachSegs`).
- **buildings/farm.js** (loaded by trein.html): kit models `farmstead` (brick farmhouse with veranda, outbuilding, open tractor shed with a static red tractor, yard, fences; built mirrored in x, see `mirror()`), `grainTower`, `grainArm`, and `farmAll` (render only: `node tools/render_building.js farmAll out.jpg`). `KIT.GRAIN={pivot,reach,tipY,track,swing}`.
- **Game**: `v.farm` keeps its old spot; `fm.rot` is now the model's rotation (long side across the village-fields line when free), `fm.park` (tractor parking), `fm.gate` (tractors enter and leave by the front: `farmRoute` in updateFarm), `fm.unload`. Old barn/shed/silo meshes are no longer instanced. `Life.farmAt(x,z,m)` (plot test: houses and station ghosts keep out), `Life.farmFolk()` (four standing people by day).
- **Grain station**: farms are a fourth slot kind (`Life.slotInds()`, `sawSlots(fm)` gives 4 sides, `st.farm={mi:villageIndex,k}`, name "<village> Farm"). `Life.farmTower(fm)` puts the tower at the station (11.7 m from the track, facing it) or at the farm's front when there is none. The station is cargo (`si.cargo`), drawn as kit platform pieces. Grain now accrues only at farm stations (`Goods.src` no longer gives grain near farms).
- **Arm** (`Crane` kind 'farm', `runGrain`, `grainWork`): `Crane.stopAt` stops the train with the first two unfilled grain hoppers either side of the arm; the arm (`s.ax` = spout position along the track; `Life.armInst` writes its instance every frame: turn + stretch) fills the nearer, then the other; then sets `tr.grainMove` and the train draws up (train loop, "Drawing up at"), two wagons at a time; `tr.grainStuck` when the track ends.
- Tested (seed 4711, 4 km): all four sides stop/pour/draw up correctly (front side through all 5 hoppers); ui_checks and step2_checks. Not tested: phone, saved games with an old farm layout, tractors' new routes over a long time, lorry interplay.

### Earlier (4.8.0, 14 Nov) — plan step 6 (stations and villages never overlap)
- `Life.stReserve(x,z,m)`: a station's future grand footprint (building zone, second track side, forecourt). `fitsRect` (house placement) rejects plots touching it; market stalls (and their people) inside it are skipped.
- Existing overlaps: `applyTrackMask` (also called from `updateStations`) now also hides houses touching the station's real footprint ("N houses make way for a station"); reversible like track.
- Station ghost also turns red on the village square and green ("The village square is here" / "The village green is here").
- Tested in the 4711 world: grown village then station (allowed spots listed, forced station hides 1 house), station then growth (0 houses in the reserved area), twin track. ui_checks, step2_checks pass. No pictures, not tested on the phone.

### Earlier (4.7.1, 14 Nov) — station ghost collision checks
`Build.stCheck` now samples the real footprint (platform along its length plus the building zone, every 3 m) and turns the ghost red with a reason for: a house or its plot ("A house is in the way"), another station's footprint ("Another station is in the way", replaces the old 70 m rule), windmill, sawmill, workshop, mine, castle, farm yard, and other track beside the building. Tested: scan along a track (blocked beside the existing station and a farm, free elsewhere), a synthetic house on both sides, ui_checks and step2_checks pass. Not tested on the phone. Next: plan step 6.

### Earlier (4.7.0, 14 Nov) — plan step 5 (station ghost)
User asked (first message of the plan round): when a station is placed make it a green ghost that can be dragged over the ground; a checkmark places it for good. Answer 5a: away from a track it stands free with its own piece of track.
- **Station tool** (Build → Stations → station): tapping anywhere puts the ghost there (`Build.stgMove(h)`); tapping again moves it; dragging (start on the ghost: its ✥ handle or its outline) moves it freely. Within 16 m of a track (32 m once snapped: hysteresis) it snaps onto the track and follows it (`fitPlat` as before); farther it stands **free** (`stg.free`, x/z/h/y) and brings 70 m of its own track, laid with the station when ✓ is pressed (`makeSiding` + `placeStation`). Nothing in the world changes before ✓ (no levelling, no track, no money).
- **3D ghost**: `R.drawGhost` draws the real station model (`station` or `stationTown`, detail level 0.5) see-through green, red when it cannot stand, after the sky: depth-only pass first so only its nearest surface shows, then colour with blending via `uGhost` in FS_KIT. Placement and turn are exactly what the finished station gets (`rot = atan2(±dir)+π`, side flips the direction). Platform and building outlines (and the 70 m track strip for a free ghost) are drawn on the 2D overlay in green/red (`StationUI.drawGhost`, `bandFree`). A label shows the reason when red.
- **Buttons** (bottom bar while a ghost exists): Discard · ⟲ ⟳ (free ghost only, 15° steps) · ⇅ Other side · **✓ Place station** (disabled while red); `btnBuildOK` is hidden then.
- **Validity** (`Build.stCheck`, 5×4 footprint points): inside the world (30 m from the edge), no water, height difference ≤ 8 m, not within 14 m of a village square (`v.plaza`: "it will grow"), no other station within 70 m. Red also blocks ✓ (`confirm` re-checks and checks money).
- Tests (benchmark world, scratch `ghost5.js`): free ghost on clear ground ok; at the village square red with the reason; rotate + flip; ✓ gives station #3 and a new 70 m segment and removes the ghost; snapped ghost beside track ok. Check pictures: `check-station-ghost.png`.
- Not done (step 6): reserving the station's future footprint inside villages (houses and stalls are not checked yet, only the square), moving market stalls out of an existing station.

### Earlier (4.6.1, 14 Nov) — roof glitch fix from the user's screenshot
User screenshot (Pixel 9a): a cottage roof drawn nearly black with vertical streaks at one distance. Cause: my level 0.5 (4.5.0) removed the roof tiles but left the dark roof DECK (0.24/0.18/0.13, material 12) that normally lies under them. Fix: `K.shingles` at level 0.5 lays the finished roof (colour of the far levels, material 20) in a coarse grid over the same area (so porch, dormer and awning roofs in cottage/farmhouse/tavern are covered too, respecting `skip`), and `K.farRoof` darkens the plain roof colour (×0.84/0.89/0.93) because the tiled roof is darker than the plain one (measured on renders: tavern 1.00 of the tiled roof, cottage 1.09 after the fix; it was 1.14–1.27). Same darkening for level 1. Check picture: `check-roof-levels.png` (cottage and tavern at 0 / 0.5 / 1 with `tools/render_building.js <name> out.png '{"lod":0.5,"game":true}'`). Remaining known step: the tiled roof has moss and grey tiles the plain roof lacks (a gentle change at the switch, not a glitch).

### Earlier (4.6.0, 13 Nov) — plan step 4 (people LOD), kept small on purpose
Measured first (benchmark world, 4 places): people are 19k–59k of 0.9–1.1M triangles (≈190 figures, ~650 each; the full figure is 640–690 triangles, the far one 112) = 2–6 %; cow 176, sheep 116, horse 198, bus 528, lorry 396, tractor 1312, steamer 1578 are smaller still. A new middle mesh would save under 3 %, so it was not built.
- **Quality → People detail distance** (`P.peopleLod`, 0.3–2×, scales the old fixed 80 m to the simple far figure; `PD` in `Life.prepare`): Low 0.6, Medium 1, High 1.4 in the presets. Test: at the platform view 0.5× draws 21 full figures, 1× 44, 2× 59.
- Not done (plan 4.1 middle level, 4.3 far level without limb maths, 4.4 vehicle levels, 4.5 crowd budget): too little to gain per the numbers above; the water and the first-frame costs matter more.

### Earlier (4.5.0, 13 Nov) — plan step 3 (building LOD)
User sent the benchmark-world "Measure all places" table from the Pixel 9a (Mali-G715, 1079×2124, preset custom): grand station 29.1 ms (1.60M tris), platform 26.2 (1.47M), village street 29.6 (2.23M), village from above 33.6 (1.05M), second village 40.6 (2.42M), lake shore 18.6 (0.48M), **lake from above 41.6 (0.57M tris)**, **river 31.3 (0.34M tris)**, stream mouth 25.2 (0.45M), culvert 28.4 (1.90M), sawmill 23.3. Reading: about 7 ms per million triangles (shore vs culvert), AND water is the biggest outlier (+12 to +20 ms with almost no triangles) → plan steps 8–10 matter for speed as much as the buildings. They did not send the "Measure on this phone" table with the building test lines yet.
- **Audit** (triangles L0 / L0.5 / L1 / L2, before this step L0 was): cottage 100k / 61k / 13k / 2k, tavern 157k, church 132k, farmhouse 115k, station 177k, stationTown 331k, sawmill 74k, culvert 1.2k. Of a cottage's 100k, 42k are garden leaf blobs (material 1); of a tavern/station 75 % are slate tiles (material 18, boxes 0.12–0.2 m).
- **Thin roof tiles** (`tile()` in kit.js, used by `K.shingles`): each tile was a closed 12-triangle box 2.4 cm thick; now only its top and its lower edge (4 triangles). Picture compared old vs new at 4× zoom at 12–50 m in the benchmark world: same slate relief. L0 now: cottage 85k, tavern 108k, church 81k, farmhouse 82k, station 94k, stationTown 174k (−14 % to −48 %).
- **Middle level** (`K.lod` 0.5, 4 levels now: `[0,0.5,1,2]`, arrays `l<4`, shadow pass uses one level coarser): no single roof tiles, leaf blobs one subdivision coarser; everything else as level 0 (the earlier `K.lod?` truthiness checks were changed to `K.lod>=1?` so 0.5 keeps L0 roof grid). cottage 61k, tavern 72k, station 49k, stationTown 88k, sawmill 24k.
- **Switching by size on screen** (`LVL(t,d)` in `Life.kitInst`): radius in pixels k = r·PS/d·kitLod with PS = innerHeight/(2·tan(fov/2)) and r = the type's bound radius clamped to 8–16 m: ≥150 px level 0, ≥93 px level 0.5, ≥29 px level 1, else 2. A cottage (r 14) keeps its old 110 m / 350 m for level 1 / 2 and gets the new level 0.5 at 68–110 m; culverts switch at 63 m / 200 m (before 88 / 300 m); larger buildings are counted as 16 m (an uncapped radius made farmhouses/taverns/churches heavier than before: measured). Re-picked when the camera moved 4 m, the zoom changed 3 % or houses changed. **Quality → Building detail distance** (`kitLod`, 0.3–2×) scales it (2 = twice the pixels = twice the distance).
- Measure on this phone now lists buildings full / without roof tiles / far / farthest.
- Benchmark world: `Bench.startPaused=true` (before `enter`) freezes it at step 0 for exact picture comparisons. Test pitfalls found: the screenshot is contaminated by smoke particles and lake waves (set `Particles.n=0` and use `R.benchFrame`).
- Triangles in the test world (2 km, seed 39536), old → new: cottage view at 50 m 1.25M → 1.11M, station view at 35 m 1.02M → 0.96M; village views at 85–120 m about −9 %; bigger gains on the phone's own view are expected from the tile change (about −20 to −30 % where buildings dominate).
- Not done: 3.4's mid level for the grand station beyond the above, 3.5 (shader detail fade; the shader already fades bump detail between 60 and 140 m), garden leaf blobs of the cottage (42 % of its triangles) stay as they are at level 0.

### Earlier (4.4.0, 13 Nov) — the benchmark world (asked between plan steps 2 and 3)
User asked: a benchmark environment behind a button in the Experimental menu so tests are repeatable and EXACTLY the same every time, and the game must be playable in it so they can point out gameplay problems and I can find what they mean. Then continue the plan (step 3 needs their phone table from 4.3.0's "Measure on this phone").
- **Button**: Settings → Experimental → **Enter benchmark world** (confirm dialog). Their game is kept aside (`Bench.backup`, also `localStorage 'trein.bench.backup'`), saving/loading/reset are switched off inside, **Exit** brings the game back. After a graphics reset the recover file holds their real game, and a reload inside the bench world restores it at boot.
- **The world** (`BENCH`: seed 4711, 4096 m, fixed step 1/30 s): every non-device setting at its default (device = quality/exp/sound tabs, the presets' keys, renderScale, autoRes…), summer, 10.2 h, clear, time frozen, people 3; then the scenario (same as `tools/bench.js`): straight line through village 1, grand station with second track, two standing trains with 14 passengers, other villages grown; then 600 simulation steps to settle, camera at place 1. Quality settings of the phone are kept on purpose, so measurements reflect them.
- **Exactness** (proven with `tools/`-style scratch tests: 600 steps traced step by step over 3 builds, the first from a messed-up game, all identical; the signature after build is identical after enter → restart → exit → enter): world and scenario use a seeded `Math.random`; the simulation (`Bench.step1`) runs in fixed steps with its own random stream (rendering/UI use another one); `App.time` restarts at 0; the sky state the simulation reads is recomputed per step (`R.atmos()`); `Busy.run` runs at once (`Bench.sync`) instead of at the next frame; the game's state objects (Life, Weather, Crane, Goods, Particles, Buses, Net, Money, Trains) are put back to their pre-world state (`Bench.capture()` at boot, `clearState()`; fields created later by play are deleted). Found while doing this: growth timers (`Life.growT`, `building`, `nextTry`) and `App.time` leaked from earlier play and changed when houses grow. **The simulation looks at the camera** (people and smoke only near it, level of detail), so the same state needs the same camera path; the start state (signature in the corner `sig …`) is always the same. Measurement holds the simulation, so it is exact whatever the camera did before.
- **In the world** (chip "Bench" at the left edge, status text under it: step, signature, time, place): **Note a problem** (pauses the simulation; tap what is wrong or "Whole screen"; records tap, ground point, up to 4 nearest people/houses/trains/stations/animals/culverts/sawmills within 60 px with their state and distance, nearest numbered place, step, signature, camera, time/season/weather, fps, screen; text optional; red pin "N1" stays in the world), **Places** (12 fixed views, numbered, gold labels in the world, tap to go), pause/continue, labels on/off, **My notes** (list, Go there, Export notes → `trein-bench-notes-….json`, delete), **Measure all places** (3×4 frames between GPU fences per place, median, spread, triangles, draws, header with version/signature/GPU/preset; also shown under "Last measurement" and in the log and the export), **Restart this world** (same start again), **Exit**.
- Also fixed: after "Measure on this phone" the lake waves stayed frozen (`R.benchStill` was never reset); a queued road rebuild running after a world swap logged an error (`rebuildRoads` guard).
- How I use the notes: enter the same world (`Bench.enter`), `Bench.step1()` n times to reach the noted step (camera at place 1 like theirs only if they did not move it before the note — otherwise the note's `near` list and `ground` point say where to look), `Cam.setState(note.cam)`.
- Not covered: the person who plays changes the simulation by playing, so a note's moment is reproducible only with the same inputs; the notes therefore carry the position and entity names instead of relying on replay.

### Earlier (4.3.0, 13 Nov) — plan step 2 (buildings' cost)
Findings first: the building shader (FS_KIT) has **no** `discard` (the plan's 2.1 guess was wrong; the trains' shader had it). The building shader is heavy per pixel (procedural materials, 3 height lookups for bump, shadow, cloud shadow), and buildings are dense: a cottage is 100k triangles up to 110 m away, the grand station 331k. 40–87 % of every building's triangles belong to closed boxes.
- **2.2 Far sides of closed blocks skipped** (`optBackface`, on): `K.box` records the vertex range of every complete box in `K.CL`; `R.packKit` flags those vertices (normal's 4th byte = 127) and stores the face's plane constant n·p (1/256 m, int16 at byte 30, attribute 9 `aPd`); VS_KIT moves a flagged face out of view when the camera is more than 10 cm behind its plane. The test uses only per-face-constant inputs, so all corners agree (a first version tested per vertex and dragged single corners of edge-on faces away: thin dotted lines). Not for foliage material 1 (shrinks in winter) or faces > 120 m from the model origin. Not in the shadow pass.
- **2.1 Trains**: glass/solid selection moved to VS_VEH (triangles of the other kind leave the view), FS_VEH has no `discard` any more. Train close-ups day/night compared between builds: identical on the train (differences only in random clouds/birds/stars).
- **2.3 Order**: building instances sorted near to far in every buffer, near detail levels drawn first across types. `optPrepass` (off): buildings' depth first with a trivial fragment path (uPass 2, `invariant gl_Position`), then colour with LEQUAL.
- **Quality → Building detail distance** (`P.kitLod`, 0.3–2 ×, scales the 110/350 m switches; plan 3.2 done early because the benchmark needs it).
- **2.5 Measure on this phone**: lines for far sides skipped (= default), buildings depth-first, and three tests: plain building shader (`R.skip.kitFlat` → `uFlat`), building detail at 1/2 and 1/4 distance. These three tell step 3 whether the buildings' cost is pixel shading or triangle density.
- Object culling gate changed: buffers of ≥ 15 000 triangles are culled (was: meshes of ≥ 120 triangles, which left ~0.9 M off-screen far-tree triangles per frame).
- 2.4 (shadow casters) dropped: the shadow-box culling of 4.1.0 already does it.

### Earlier (4.2.0, 9 Nov) — plan step 1
User sent phone benchmark tables and screenshots (bands in a lake, stripy shore foam, a square in a lake in rain, streams ending square at a river, station through the market, odd footbridge) and asked for a numbered multi-step plan: `trein-plan.md`. Answers: 1a sharper upscaling on by default yes; 3a a slight visible LOD switch on Low is fine; 5a a station ghost away from track stands free with its own piece of track; 12a the checkerboard autumn ground should be organic. This version is step 1.
- **1.1 Phone-only water bug**: `compile()` now puts `precision highp sampler2D/3D/2DArray/2DShadow/Cube` after `#version` in every shader (`shaderHead`, `SAMP_HI`). WebGL2 gives sampler2D low precision by default; Mali honours that, so depth, terrain heights and water levels arrived rounded to ~3 digits.
- **1.2 Low-precision test mode**: open the file with `?lowp=1` (`LOWP_SIM`): every sampler2D read is rounded to a 16-bit float (wrappers `lpTex/lpFetch/lpLod` via #define). It reproduces the phone's lake bands and the screen-row stripes on the test machine; without it the picture is clean. Scratch launcher: env `Q='?lowp=1'`. Use it in every water test from now on.
- **1.3 Water debug views** (Experimental → Water debug view: Depth, Distance to shore, Foam, Flow; `uDbg` in FS_WATER; never restored from a save).
- **1.4 Defaults**: near things first and sharper upscaling on (also switched on for saves from before 4.2).
- **1.5 Measure on this phone**: median of 3 timings per line with ± spread, version in the header, readable part names, buildings split into near/mid/far (`R.skip.kit0/1/2`).
- Not yet confirmed on the phone: ask for screenshots of the same lake spots. The square in the lake in rain is the near wave mesh (plan 8.4), not this bug.

### Earlier (4.1.0, 9 Nov)
User asked: optimize without losing visual fidelity; when in doubt make it an experimental setting; fidelity improvements also as experimental settings; check with high-resolution screenshots compared by a script; maybe much is drawn that is not visible. Answers: identical-picture optimizations on by default, the rest under Experimental (off); slowest on the phone: big towns/stations and loading/building; plays on the Medium preset.
- **Tools** (all in `tools/`): `bench.js` (8 km world, Pixel 9a size 412×915 @2.625, Medium preset, grown town + grand station + two trains with passengers, then `App.hold` and fixed-time frames via `R.benchFrame`; views town/street/platform/overview/wide; frame time = K frames between two GPU fences (`R.benchThroughput`, async); `ABLATE=1` = cost of each category by leaving it out (`R.skip`); `CMP='{...}'` renders every view twice in one session (A with those settings, B with the current) for exact comparison; `DSF=1` for quicker timing runs). `imgdiff.py A B` (mean/max diff, % pixels >6/>24, block SSIM, red heatmap `diff_<view>.png`, warns on nearly one-colour images). `cpuprof.js` (DevTools profile of loading, of timed building actions, and of play; texture/buffer uploads counted by caller).
- **Measuring lessons**: `gl.finish` and 1-pixel `readPixels` do not wait for the GPU in Chrome; timer queries are unreliable on SwiftShader (work lands in the wrong query); use fences (`R.benchFence`). The FFT lake waves step once per frame, so they are frozen in benchmark frames (`R.benchStill`) or every lake shows as a difference. SwiftShader is fill-bound, so triangle savings show small there but should matter more on a phone GPU.
- **On by default (pixel-identical, checked)**: view culling of kit buildings and all object instances (bounding sphere per kit type `R.kitBound` and per object mesh `R.mesh[k].r`; `R.cullInst` with a cache per buffer and view); the same culling against the shadow map's box in the shadow pass (`R.shPl`): 50–72 % fewer triangles per frame in the town scenes. Birds (kind 12) are not culled. `optInvalidate`: the scene buffer's colour+depth are invalidated after the resolve copy (saves memory traffic on tile GPUs; no effect measurable here).
- **Hitches fixed (identical)**: the street-lamp glow map (1024² RGBA16F) was rebuilt and fully uploaded on every village update (float→half conversion: seconds per upload in the profile): now skipped when the lamp set is unchanged, otherwise only the rectangle around changed lamps. The road distance field (up to 3072² RG16F) uploads only the changed rectangle (the upload buffer `R.roadH16` is kept in step, also by `addRoadPieces`). The water texture (16 MB) on track/station edits uploads only the changed rectangle (`R.subRect`, previous data kept in `R._wLast`). Culvert ditches are only rebuilt when their signature (ditches, `R.terrVer`, quality) changes.
- **Settings → Experimental** (new tab): the switches above (on), `optOrder` near things before the ground (identical; no gain on SwiftShader, off), `optShadowHalf` shadows every other frame (reuses the last shadow map with its own light matrix; −26 % frame time where shadows dominate; moving shadows lag a frame; off), `fxUpscale` sharper upscaling (canvas at full screen resolution, 3D at the resolution scale, final pass bicubic with anti-ringing clamp + contrast-adaptive sharpening as AMD CAS/RCAS; visibly crisper, a little more stair-stepping without MSAA; off). **Measure on this phone** runs the current view with each switch and each part left out, timed with GPU fences, and prints a table (also in the log) — ask the user for a screenshot of it to decide defaults for the phone.
- Measured (software GPU, full phone resolution, town scene): frame −14 % town, −6 % street, −2 % platform (the grand station building's pixels dominate), −10 % overview and wide; triangles 3.2 M → 0.9 M. Cost shares (town): buildings 34 %, water 18 %, trains 16 %, shadows 8 %, trees 6 %.
- Not done / candidates: track edits still recompute the whole terrain (carve, render heights, normals, streams; ~1 s here, more on the phone) — a dirty-region version would need care; the water texture still converts on first upload; Mali-specific `mediump` for colour math was not attempted (8 km world coordinates need highp).

### Earlier (4.0.0, 8 Nov)
User asked (two rounds): upgrade-available notifications top right (tap flies to the village, short explanation of the upgrade and why); the sawmill redesigned from their photo as a water mill by a stream (move mills to streams, make a brook if none), turning wheel, people working, the wood-mill station exactly the same; test on hills/flat/rotations, nothing colliding/floating/sticking out. Then: culvert headwalls stuck out of the ground, the stream was cut off square and did not flow in, the back of a culvert showed — dig a ditch so the culvert is the lowest point (photos: a pipe in a stone headwall at the end of a ditch; a headwall flush with a gravel road); small streams may be just a pipe in a ditch; research real culvert placement and game river techniques; a river quality setting; a road menu that works exactly like track building.
- **Upgrade notifications** (`UpgNotes`, top right): one chip per village with an upgrade available; tap flies there and opens the village panel with a short why (`UPG_WHY`, `.vp-why`).
- **Sawmill** (`buildings/sawmill.js`, models `sawmillA`/`sawmillB` = brook on +z/−z of the flume): brick ground floor, board-and-batten upper floor, shingle roof, iron stack, lean-to log shed with a jack ladder, raised stone wheel pit and tailrace, flume on trestles from an intake/weir upstream; yard with logs, lumber stacks, sawhorses, cart. `KIT.sawWheel` turns (object kind 11), spray at the flume end and pit, steam from the stack. Workers: sawyer, cant-hook man, stacker, two plank carriers (`sawWork`). Placement (`placeSawmills`): stream candidates scored by slope/fit, a rill promoted to a brook, else `makeBrook`; a tailrace stream piece runs from the race end to the brook. Station slots unchanged. Tested seeds 39536/1234/4242/777, both mills, stations on all three sides.
- **Culverts in ditches** (`Life.applyCulverts`, `Life.trenchDepth`, `R.buildPatches`): each face is found exactly (bisection between the last open and first piped ribbon point; the water is cut there via the interpolated hide flag `0.5/t`). The ditch follows the stream away from the face: full depth at the face (headwall: coping just above ground; bare pipe: ~0.25 m cover), floor falling 1.2 % toward the pipe, meeting the natural bed (fades by 7×depth, 9–26 m), sides ~1:1.25, behind the face the ground comes back inside the headwall body (or as a bank over the bare pipe). Depth is measured from the lowest ground just behind the face. Terrain: every 8 m cell a ditch touches is cut out of the full-detail terrain (`uPatch` R8 mask, texture unit 28; FS_TERRAIN and the shadow FS discard there when `uChunk.w==0`) and redrawn from an n×n patch (6/10/16 by quality) with exactly the drawn heights at its edges (same corners and diagonal as `R.drawnH`) minus the ditch depth; patches draw only for LOD 0 chunks and in the shadow pass. The stream ribbon drops by the ditch depth per vertex (`aP.y`, uploaded in runs by `R.uploadStreamPts`). Lake water that the ground used to cover is discarded in patched cells. Trees/bushes/rocks in a ditch are removed (`R.sinkVeg`). Streams narrower than ~1 m (scale < 1.45) get `culvertPipe` (concrete pipe with a socket and a few stones), wider ones the stone headwall. Open gaps under 18 m between two pipes are piped through (two faces close together looked like a pit).
- **Texture unit note**: unit 22–24 are the lake FFT's working units; the patch mask first sat on 22 and was silently overwritten. Use 28+ for new fixed units.
- **Rivers quality** (`P.riverQ`, Quality tab, presets low 0/medium 1/high 2; apply 'streams' rebuilds the ribbons): ribbon point spacing 4.5/3/1.6 m, ditch patch detail 6/10/16, stream shader ripple layers 2/3/4 (`uFlood.z`).
- **Road building** (Build → Roads): the same Pieces / Draw / Route strip as track (`Build.target` 'road'|'track', each with its own `pc`/`rt` state). Pieces: curves 12 m (sharp) / 40 m (gentle), length ±, ⟲⟳, New road, Junction (tap any road: starts square to it), Demolish (removes the road ending at the start), Place; gold rings are the open ends of roads you built (`Roads.ends`); a piece ending near a ring joins it with an S-curve, near any other road it meets it. Draw: follow the finger (bends ≥ 12 m), ending on a road or ring joins it. Route: `Life.routePath` (scenic/direct). The plan shows as a road-wide band over the map (`Build.roadTick`, green/amber steep/red), info gives length, tightest bend, steepest, bridge length, cost (45/m). Too steep (>45 %) refuses. Undo restores the road list (`Roads.undoL`). Bus stop / Remove road or stop / buses unchanged in the row below.
- Research for culverts/rivers (sources given to the user): headwalls flush with the embankment face, invert at or just below the bed, stream bed the lowest point (Kings County culvert installation, Alberta CSP detail, FAA AC 150/5320-5C, pdhonline C619); game rivers: carve the bed into the heightfield along the spline, flow-mapped ribbon, density by distance (simonschreibt "River", Peytavie et al. 2019, engineered.at River 2k19).
- Not done / limits: ditches are drawn only for LOD 0 terrain (far away the culvert sits at its floor under the coarse ground, unseen); the ribbon drop is linear between ribbon points (a few cm off on the ditch ends at low quality).

### Earlier (3.9.0, 8 Nov)
User asked: LODs for stations; close the hollow platform back; stairs only at the grand (clock tower) station; the grand station with a platform on both sides of its track; second track only for the grand station (+ unlocks on the upgrade) with a banner explaining the upgrade; with two tracks a platform on both sides of every track (building+platform | rail | platform | rail | platform), people using the stairs; a sweeper at the grand station, in autumn leaves build up, swept into piles, bagged, carried inside. Answers: small station far-side people walk round (no foot crossing); second track 7.2 m out with a full 4.2 m island platform.
- **LODs**: every station piece already had 3 levels (110/350/2400 m); counts now: station 177k/26k/2.3k, stationTown 331k/48k/4.4k, fbT1 6k/3k/0.3k, fbT2 9k/5k/0.4k, shelter 0.6k/0.5k/0.2k, platform pieces ≤0.3k.
- **Hollow platform back (fixed)**: plain pieces (`plat0`, z to 6.5 so they tuck under the building) had their back wall dropped by the kit's plot clipping (plot z1 was 6; faces whose centre lies outside are skipped). Plot z1 is now 7 for all platform pieces (render check: `check-platform-back.png`).
- **Footbridge only at the grand station**: kit pieces `fbT1` (one track: stairs onto the building platform and the platform across) and `fbT2` (two tracks: stairs onto the building, island and outer platforms), `P.footbridgeN(xa,xb,zA,zB,yd,stairL,stairs[])`. The default station has none; far-side people walk round by the streets (`stFar` false for small stations).
- **Grand station layout**: a platform across the line (pieces on side −f, railing at its back, ramps, a shelter at model x fb0−17) → with a second track it becomes an island platform (`plat4`/`plat5`: coping and white line on both edges, no railing, lamp+bench every third; no shelter). Second track (`Build.addTwin`) only for the grand station, `KIT.TWIN_G`=7.2 m; its outer platform has the shelter. The + button shows only for grand stations without a second track; `addTwin` refuses otherwise with a toast.
- **Routes**: platform indices 0 building, 1 across/island, 2 outer (`Life.plat`, `platsOf`), `fbPathTo(psi,a,b)` over the footbridge between any two; `doorSide` opens coach doors toward either platform. At the grand station passengers get off on both sides (random), those on the far/island/outer side cross back over the footbridge; people boarding a train on the second track cross to the island or outer platform; far-side people come in up the farthest platform's end ramp (`farRamp`) and over the footbridge, far-side homes the reverse. `homeIn(v)` picks a standing house clear of the station for people going home (one walked into the building before). `stFoot` covers −6…6 (one track) / −13.2…6 (two tracks).
- **Upgrade banner** (`Banner.grand`, `#banner`): when a station's town reaches its full size (st.grand, saved; not shown for stations loaded that way): what was rebuilt and that the second track is now available, with Show me / OK, auto-hides after 16 s.
- **Porter and leaves** (`Life.updateStationCare`, `stClean` per grand station near the focus): in autumn drifts (`leafpatch`, 46 leaves, scale by amount) land on all platforms about once per 40 s × leaves setting × wind; the porter ('sweep' figure) comes out of the front door when they add up (>3.5) or once each morning out of autumn for a short brush; sweeps the nearest drift (current platform first, crossing the footbridge for the others) onto one of two piles per platform (`leafpile`), kneels to bag each pile (`leafbag`, ~1 per 1.6 of leaves), carries the sacks one by one in through the front door (sack drawn at the hand), then goes in. Stepped test: 26 drifts on 3 platforms → 6 piles → 6 sacks → all carried in → porter home. Piles are placed clear of columns, benches, carts, the shelter and the stairs.
- Tests: town scenario (banner, + refused before the upgrade, 7.2 m separation, kit pieces, alighting on all three platforms, footbridge used up to deck height, nobody visible inside the building), small station (no footbridge/shelter/island pieces, no +, + refused), porter stepped test with screenshots, regression suites all pass. tools/render_building.js knows shelter/fb pieces.
- Not done / limits: old saves with a second track from 3.8.0 at a small station keep their 4.5 m track, but its routes now assume the grand layout. Leaf drifts are not saved.

### Earlier (3.8.0, 8 Nov)
User asked: check stations in every situation and rotation, no mesh/texture glitches, sensible routes (people clipped through the building), a + button for an extra parallel track (player connects it), people using the footbridge, a driver and a conductor, short platforms that still work (answers: plain parallel track; driver in cab + conductor on the platform; only coaches at the platform open and the train pulls up for the rest, with a subtle progress bubble).
- **Level track** (`Net.levelStation(st)`, on build and when a platform grows): the platform stretch (centre ± half + 4 m) is set level at the centre height via segment `prof`s, ramps 12–160 m (2.5%) blend back, stops at junctions/line ends. Real stations stand on level track; before, the level building stood on sloping platforms.
- **Curve rule** (`Build.curveSide`): on curves tighter than R 450 m the building goes on the outside (inside, its straight front closed in on the track; canopy columns came within reach of trains); the ghost's ⇆ refuses with a toast.
- **Terrace ground** (carveTrack, passenger stations): a level rectangle in the building frame (x from the model span or the platform ±(len/2+5), z −11.5 … back +4.6; second platform: −6 … 7.5) at rail −0.18, with cutting/embankment slopes (cutSlope/embSlope) beyond, instead of the old soft blend. Scenario test (8 stations: 4 headings, R 300 both ways, R 900, a 4% slope): ground under the building was −3.5…+4 m off the floor, now −1.5…+0.5 (within the plinth); track 0 cm off level; columns ≥ 2.14 m from the track centre.
- **Pieces**: footbridge is its own kit piece (`fbG` far stairs to the ground, `fbP` onto a second platform; `KIT.FB` x ranges), platform end ramps `platEa/platEb`, plain platform pieces reach under the building front (z to 6.5) so curved platforms leave no gap, lamps moved off the stairs, rear doors with stone steps (default x 0, town x −6.8).
- **Routes** (Life): `stIn` forecourt → rear steps → booking hall (hidden 2–7 s) → front door → platform spot; `stOut` the reverse; people from the far side of the line come over the footbridge (`farIn`; with a second platform via its ramp end); leaving passengers whose home is on the far side go back over it. The station road starts behind the rear door; with no road (village street within 8 m) people use the village street graph to the forecourt. `stFoot` marks building + platforms (+ the tracks between two platforms): village street links passing within 1.8 m are cut (`vgraph`, key includes `stVer`), stroll targets and straight walks avoid it (`safeSpot`), and walks planned before a station appeared are re-planned. Test: 0 of ~2,600 visible walker samples inside the building (was 34–746 per run before the fixes).
- **Second track** (`Build.addTwin`, green + on the ground beside a station in the Stations tab): exact offset arcs (k/(1−k·o)) 4.5 m out on the side away from the building over the platform + 24 m each way, heights copied, two free ends (gold rings) to join up; refused over bridges/tunnels. A twin station (`twinOf`/`twinId`, same name, platform on the outer side) with a brick waiting shelter (`shelter`). Its passengers wait at the main platform and cross the footbridge to board; alighting passengers cross back (`fbPath`). Trains wait up to dwell+25 s for people still on their way. Arrival detection now requires the train to be on the station's own track.
- **Short platforms**: passengers ride in a coach (`p.ci`); `platCoaches` = coaches beside the platform; only those open (`stopPhase`); then `Drive` pulls the train up (`moveUpBy`, ≤ 2.2 m/s, not past a line end) and works the next coaches, until all are done. Bubble in the train card: "⚠ Platform 44 m · train 114 m", coach progress bar, "Pulling up for the next coaches…"; the station chip warns too; status line shows it. Also fixed: long trains (mid more than 28 m from the centre) were never recognised as standing at the station. Test: 6-coach (114 m) train at 44 m: 1 → 3 → 6 coaches, all 60 passengers off at their coaches.
- **Crew**: people kinds `drv` (blue drill, grease-top cap, red neckerchief) and `cond` (navy frock coat with brass buttons, gold-band peaked cap, green flag); pose 9 raises the flag. Driver and fireman stand in the cab (hidden in cab view). The conductor (`tr.cond`, `Life.updateCrew`) steps out of a coach at the platform at each stop/phase, and when the train is ready blows a pea whistle (`Sfx.guard`), raises the flag, gets in; the train leaves only then (the loco whistles). Before a pull-up the conductor gets in without the flag.
- tools/e2e.js screenshots get 180 s (the headless software GPU needs > 30 s per frame with two full-detail stations in view; the profile shows the CPU 99% idle).

### Earlier (3.7.0, 8 Nov)
- **Victorian stations** (`buildings/station.js`, from the user's two "Ravenbrook" reference images): `station` (default: two-storey red brick house with a big cross gable over the platform with paired arched windows, ornate cream bargeboards and finials, one-storey wing with its own small gable, stone quoins/bands/voussoirs, slate roofs with iron cresting, tall chimneys with pots; slate canopy on cast iron columns with spandrel brackets and a dagged valance, hanging clock, hanging lanterns and baskets, name boards (blue/gold, lettering is suggested by gold strokes, not real text), gas lamps, benches, planters, luggage cart with trunks, notice board, low wall with railings, green lattice footbridge with stairs over the line) and `stationTown` (shown when the nearest village is at the top level, `Life.LEVELS` last: long two-storey range with three cross gables, dormers with pinnacles, square clock tower with four clock faces, gablets, corner pinnacles and a slate spire with lucarnes, finial and cross). LOD0/1/2: 183k/29k/2.5k (town 342k/52k/4.8k) triangles. New kit material 24 = bricks (world-aligned stretcher bond on walls, pavers on flat faces, fades to an average colour at distance); added in kit.js MATS and the FS_KIT main mapping/cav list.
- Local frame: track along x through the origin (rail top y 0), platform z 1.5..5.7 (top 1.0), building behind (z >= 5.8) facing -z. Instance rot = heading + π (`Life.kitInst`, from `stInfo`; `si.dx/dz` are already flipped for the far side).
- **Platform pieces** `plat0..3` (4.1 m): brick body, brick paving, stone coping with a white edge; 1 lamp, 2 back railing, 3 railing + lamp + bench + planter. `stationPieces(st,town)` lays them every ~4 m over `st.len`, following the track; inside the model's stretch (`ST_SPAN`) plain, in the footbridge stair zone plain, beyond it railings with a lamp and bench every third. Passenger stations no longer draw the toy `R.stationMesh` (cargo stations unchanged); the town `stationhall` instances are retired.
- **Station side**: `st.side` (+1/-1, saved). New stations default to the village's side of the line (`Build.stSide`); `updateStations` applies it to `_f` for passenger stations. The walking road to the village now starts behind the building (15.5 m out). Station ground carve: along max(28, len/2+6), across 18 m.
- **Station ghost** (Build, stations tab, Station tool): tapping the track no longer builds at once; it shows a ghost (`Build.stg`) drawn every frame on `#ovl` by `StationUI.drawGhost`: platform strip and building footprint (pulsing gold, dashed), a ⇆ drag handle and a label. Drag the handle or the platform to slide it along the track (`Build.down/move/up` with `stDrag`; `fitPlat` keeps the platform on track at dead ends). Pending bar: Discard / ⇅ Other side / Build it. Build it runs `placeStation` inside `Busy.run` (the ground is levelled only then). Tapping off the track with no ghost still builds a siding station as before (sawmill slots and open ground stay immediate).
- **Platform arrows** (`StationUI.arrows`, `#stArrows`): in the stations tab every platform within view gets a round outward arrow (8 m longer at that end, 2000 if money is on) and a small inward one (8 m shorter) at each end; the centre moves by 4 m so the other end stays put; refuses past a dead end, 44–172 m. The old Longer/Shorter chip tools still work (16 m, both ends).
- Tested: ghost tap/drag/flip/build/extend scripted (`t/ghost.js`), in-game views of both stations by day, after `growNow` to town, an extended 60 m platform on the far side, and at night (`t/stgame2.js`); regression suites pass (e2e only when run alone: the headless renderer is too slow for its 30 s screenshot when other runs share the CPU).

### Earlier (3.6.1, 8 Nov)
- **Busy card** (`Busy.run(text,fn)`, `#busy`): a card with a CSS-animated spinner (compositor transform, keeps turning while the script is busy) is shown, the work runs two frames later. Used for the road/bridge rebuild after a village levels up (`Life.busyText` "X is growing: laying out new streets…"). Life.update guards with `roadsBusy`.
- **Track bed never buried** (user screenshot: sleepers half in a dirt cut). Cause: the ground is drawn from corner heights (mean of 4 cells, 8 m cells) and triangles; next to a cutting the corner means pull the drawn surface over the ballast although the bed cells are at formation level. Measured on 5 routed lines (2 km world): before, 97% of track points had ground >0.15 m over the ballast, 11% had sleepers buried. `R.clearTrackBed(T)` (end of `computeRenderHeights`) samples the drawn surface exactly as the GPU builds it (`R.drawnH`) on a 1 m x 0.4 m grid along open track (not on bridges/tunnels, not within 6 m of a tunnel span) and lowers triangle corners that stand above the allowed height (`R.trackBedAllowed(e)`: 0.2 m over formation up to 1.6 m out, then following the ballast shoulder), biggest contributor first, never below that height; the height comes off the corner's cells that stand highest above their own bed level (`T.bedY`, written by `carveTrack`), so bed cells on a steep grade are not taken. After: 0 of 4314 points (2 km) and 0 of 5833 (8 km) over the ballast; 30–50 ms per run. Render heights only (T.H unchanged).
- Ballast shoulders now run on to 3.8 m / 2.66 m below the rail (was 2.7 / 1.4) and their foot follows the drawn ground down where that is lower, so a dug cutting shows a gravel slope instead of a floating edge (at free track ends on high embankments this is a tall gravel face).
- Test scripts: scratchpad `t/sinkr2.js` + `t/sinkm.js` (routes + measurement), `NOBED=1` for the old behaviour.
- `TREIN` exports segPoint, segY, spanAt, segNearest, sampleH for tests.

### Earlier (3.6.0, 8 Nov)
- **User report (two phone logs, Mali-G715)**: lakes showed dark/sand stripes (a glitch seen earlier in development); one WebGL context loss after regenerating worlds three times (last an 8 km one); ~1 s stalls; grass blotchy/square; wants train load indicators and remaining passengers/cargo; straight gorges should meander.
- **Lake stripes** (not reproducible in headless SwiftShader, also not with the user's save): FS_WATER now decides where water is from the smooth terrain depth again (`depthT`); the depth-buffer depth only refines it within 150–400 m and only where both agree; the slope derivatives are taken before any discard. Needs a phone check.
- **Stalls**: the phone log showed `bridges: 93 in stone ... 1085 ms` on every road rebuild. Now `R.bridgeCache` keeps each bridge's packed geometry (key: place, size, deck), so rebuilds only build new bridges (7–34 ms after the first). Lanes added while playing no longer trigger a full road rebuild: `R.addRoadPieces` + bridges for that lane only. `R.buildRoads` reuses its arrays. `rebuildRoads` logs a timing breakdown (gather, distance field, find bridges, bridges, crossings) so the next phone log shows what is left. Tree clearing for a plot only scans its chunks. In headless the full distance-field upload can take ~2 s because SwiftShader's GPU queue is slow; on a phone it should be one frame.
- **Context loss**: not reproduced. Render targets are deleted correctly on resize; the loss came right after the third world regeneration (8 km, ~450k bridge triangles then); the bridge cache also lowers rebuild memory churn. Recovery path works (the log shows the restart).
- **Grass** (`FS_TERRAIN`): no per-triangle colour jitter on grass (made 8 m squares); the forest mask is read 4x around a noise-warped point (soft irregular edge instead of cell steps) and darkens less; noise octaves are rotated (`rn`) so nothing lines up with the grid; clumps softer; spring flowers are small dots up close instead of recoloured triangles.
- **Seats and load**: 24 seats per coach (`SEATS`); the rest keep waiting on the platform. `LoadUI`: a train standing at a station within 700 m shows a card with a passenger bar (aboard/seats, "+n boarding") and a bar per cargo kind in its wagons (20 per wagon), easing toward the real value; every station within 700 m shows a chip with people and goods still waiting. Checked: 40 waiting for one coach → 24 board, 16 stay; card and chips render.
- **Gorges**: the depression-breaching outlets (`genWater` step 1) used to be carved along the D8 steepest path on the filled surface (ruler-straight on flats). Now the path is traced, smoothed (9 cells), given a meander (amplitude up to 6 cells growing from the lake and easing out at the end, wavelength 26–44 cells, a second harmonic) and carved along the curve with the same falling floor and 48° walls. `T.gorges` keeps the curves (debugging). Checked on the user's seed: the three longest gorges now wind; lakes unchanged.

### Earlier (3.5.0, 7 Nov)
- **Buses and lorries** (`Buses`, `BusUI`):
  - Each vehicle has `b.stops` (stop ids, driving order) and `b.allStops` (new stops join it until it is edited); default order = nearest-neighbour tour; buses skip cargo bays. `Buses.cur(b)` replaces the old global `stops[leg % n]` (also in `Crane.lorry`).
  - Road graph `Buses.graph()` from `Life.roads` (not garden paths or squares): points every <= 8 m, shared points merged (1.5 m), loose road ends joined to the nearest other road within 7 m; rebuilt after `rebuildRoads`. `roadPath` = heap Dijkstra; fallback `Life.routePath` over the land (shown "off the roads").
  - Lane: road line rounded once, 0.9 m to the right; pulls in 1.15 m at the stop. Speed limited by braking for the stop, bends (heading change over the next 14 m) and the vehicle ahead in the lane (same direction, within 1.8 m sideways: stop at 9.5 m centre to centre, smooth braking before); ties at the same spot go to the lower id; a new vehicle starts 10 m behind those at its first stop; a dwelling bus waits if one is pulling out right in front.
  - Buses and lorries drawn at 0.75 scale (7.5 m village bus) so they fit village lanes.
  - Bus list: Build → Roads → "Bus list": every vehicle with status (at/to/waiting behind), passengers, Go to, Stops editor (order, road distance from the stop before, round length, ↑ ↓ ✕, add a stop, remove the vehicle).
  - Saved: `buses.list` (name, goods, stops, allStops); old saves (count only) still load as buses over all stops.
  - Checked (2 km world): 3 buses on one route for 10 simulated minutes: 100% of driving samples on roads, never closer than 9.5 m in the same lane, 42 legs, passengers carried; panel reorder/remove and the save round trip; a lorry loads wood at a sawmill bay and drives its legs; the four regression suites pass.
- **Next ideas**: shops/bank assignment for kit houses; benches (sitting pose exists); right-of-way at junctions (vehicles crossing at an angle do not wait for each other yet).

### Earlier (3.4.0, 7 Nov)
- **User (7 Nov, after 3.3.1)**: lakeside paths got chains of bridges; people lay in the lake; shore foam blocky; "pipes not implemented" (two brown boxes, water ran over the street); asked to test every feature properly; update the people as asked before. They asked whether to raise the effort setting: the real fix is scenario testing (each fix is now checked in-game in the situation the user showed, at 2 km and the default 8 km world).
- **Lakes**: `Life.lakeAt/nearLake/awayFromLake`: `routePath` output and `layWay` steps keep 3 m from drawn lake water; `findBridges` never bridges a wet run that is lake (river bridges near lake mouths stay). Beach visitors only where no water is drawn within 1 m (search up to 30 m inland). Checked at 8 km: 0 lake-edge bridges, 3 of 11769 road points within 2 m of lake water, 0 of 30 beach people in water.
- **Water depth** (`FS_WATER`): depth now from the depth copy (view-ray thickness x vertical), so shallows and foam follow the drawn ground, not the bilinear height (that made 8 m squares). Shore foam = distance to the waterline (depth / bottom slope from derivatives) under 1.6 m, broken by a moving lace, plus a faint line at the edge.
- **Culverts**: stream vertices carry a pipe flag (stride 32, attribute 2); FS_STREAM discards where the interpolated flag > 0.5, i.e. exactly half-way between an open and a piped point, where the headwall stands. The mouth is a kit model (`KIT.models.culvert` in buildings/bridge.js; KIT_TYPES 'culvert'; LOD 90/300 m): fieldstone headwall with a real round hole, dark pipe, dressed ring, coping, wing walls, apron. Only plots, garden paths and squares hide streams now; village streets crossing streams get stone bridges again. Checked: water runs into the pipe; a lane over a stream shows a stone bridge.
- **People**: `peopleMesh(kind)` for PEOPLE = man, woman, child (0.62 scale, bigger head), elder (grey hair, stick), post (blue coat, cap, satchel), gard (straw hat, hoe), gardw (watering can), sweep (broom); `peopleFarMesh` beyond 80 m. Object kind 22: material = palette + 10*part; VS_OBJ bends knees/hips/shoulders and leans by pose (iB.y*10: 0 walk/stand, 1 kneel, 2 hoe, 3 water, 4 sweep, 5 talk, 6 sit, 7 run/jump, 8 hammer; iB.w = gait speed); FS_OBJ palettes (tunic, trousers/skirt, skin, hair, hat/scarf, shoes, apron, leather). All people (walkers, beach, market, bus stops, builders, villagers) go through `put` in `Life.prepare`.
- **Daily life** (`Life.updateVillagers`, villages within 900 m of the focus): gardeners at `KIT_WORK` spots per house type for ~2.3 h a day (not in rain/winter), sweepers at the gate 7–9.5 h, chatting groups on the square/streets 8.5–19.5 h, children playing tag on the square (or the end of the green) 10–18.5 h, an evening crowd at the inn 18–23 h, and the postman's round 8–11.5 h (nearest gate first, along `vpath`, 2.5 s at each gate). Strollers and walkers going home follow `vpath` on the street graph (`vgraph`: lane points, junctions within 9 m, a foot node per garden path, gate nodes). Checked: 95% of walker samples on streets/paths/squares (rest: junction short cuts); the station tests still pass (board_check: 10 boarded).
- **Next (done in 3.5.0: buses)**: shops/bank assignment for kit houses; benches for sitting people (pose 6 exists but nothing uses it yet).

### Earlier (3.3.1, 7 Nov)
- **User (7 Nov, after 3.3.0)**: bridges had no detail; pipes worked badly; streams looked bad (should look like the lakes); tiled streets unrealistic, sand paths preferred.
- **Bridges** (`buildings/bridge.js`, render `docs/style/14-bridge.jpg`): `KIT.bridge(spec,lod)` builds a medieval stone bridge per crossing in local coordinates (road along x, y=0 at the bed): one round arch over a stream (span from the stream width), a row of arches with piers and cutwaters over a river; spandrel/parapet walls in material 23 (stone courses aligned in the world: FS_KIT maps 23 to 21 with q from world xz/y, so courses run on across strips), voussoir rings with keystones, arch barrels, coping stones following the hump, string course, end pillars with ball caps, sand deck. `R.buildBridges` builds LOD 0 and 2 for every bridge into one kit-format VBO (`R.packKit`, `R.kitVaoOf`, shared with the buildings) with one instance each; `R.drawKit` draws them (LOD0 under 170 m, frustum and 1.8 km culling, shadow pass LOD2). Stream bridges are now 7–12 m long with a 1 m hump; river bridges stand 2 m above the water (`findBridges`, which also records `lvl` and `sw`). The old box bridge mesh is gone.
- **Stream water** (`FS_STREAM`): pebbly bed seen through the water, tinted with the lakes' shallow/deep colours (deeper in the middle and in wide streams), ripple normals at three scales dragged downstream, Fresnel sky reflection, sun glints, caustic shimmer, foam only as small streaks on steep riffles and a faint lace at the banks, a damp pebbly bank strip beyond the water line (perennial streams), snow on the bank in winter.
- **Culverts**: a hidden point only collapses when both neighbours are hidden (`R.stCol`), so the water runs at full width up to the mouth; open stretches of 2 points (~6 m) or less between two pipes stay in the pipe; `culvertMesh` is smaller (pipe radius 0.42 scaled to the stream width, 0.6–2.4x), a sandstone ring, a dark tube and end inside the wall, low fieldstone headwall and wings.
- **Streets**: `FS_TERRAIN` draws kind-0 roads (village lanes, country/station roads, paths, squares) as packed sand: ragged grassy edge, worn ruts, grassy crown on wide roads, a few pebbles up close, puddles in the ruts when wet. The setts are gone (kind-1 gravel roads unchanged).

### Earlier (3.3.0, 7 Nov)
- **User's requests (7 Nov, second batch)**: culverts instead of keeping plots off streams; church from their reference photo in the kit style, fitting the village plan; all new buildings must work with seasons, snow and lit windows, stained glass in the church; village plans after real western European villages, wiggly and branching, also on hills; people and buses "if it fits in one go" (NOT done this run: next).
- **Church** (`buildings/church.js`, renders `docs/style/13-church*.jpg`): plastered nave on a sandstone plinth with quoins, round-arched stained-glass windows (`archWin`), half-timbered front gable, sandstone porch with round-arched double door, steps and lantern, side tower (plastered base, half-timbered belfry with louvres and two clocks, slate skirt, ribbed copper onion, lantern, small onion, cross), slate roof, churchyard (graves and crosses, box hedge, sandstone wall with pillars and an open iron gate, gravel paths, flower beds, lamp, bench, thujas, trees). Plot `K.plots.church` 25 x 27 m; ~135k triangles at LOD0. In the game `KIT_OF[3]='church'` (the old box church mesh is no longer drawn).
- **Kit seasons/night**: material 22 = stained glass (`stainedC` in `KIT.GLSL.MATS`; dim by day, lit at night by `uMisc.x`). `K.tree` canopies carry aux 0.9 and `flower()` aux 0.6: `VS_KIT` shrinks them away in winter (canopies) and late autumn/winter (flowers); `FS_KIT` turns canopies to autumn colours and yellows blades and flowers; snow on up-facing parts as before. Checked with forced `Weather.seasonW` / `snowCover` (headless time runs too slowly to wait for it).
- **Culverts**: streams are no longer avoided by plots. `Life.applyCulverts(bbox)` hides stream points under plots (plotOn), village lanes and garden paths (`r.way`/`r.h`) and squares (village level 1+) by collapsing their ribbon vertices (`R.setStreamHidden`, partial `bufferSubData`; `R.stC/stV/stHid/stGrid/stSS` kept by `R.buildStreams`), and puts a `culvertMesh` (fieldstone headwall, wing walls, round pipe with sandstone ring, capstone, rubble) at every hidden/visible change. Called after `buildStreams`, each new house/lane, level-up and save replay. Village lanes and garden paths no longer get stream bridges (`findBridges` skips `r.way||r.h`).
- **Village plans** (`v.plan`, chosen at generation): `hill` when the ground falls > 11 m within 45 m (main street along the contour, church and inn uphill/downhill of the square, plots may fall 6.5 m, streets up to 25% grade), else `cluster` 45% (irregular square, 3–4 bending arms), `anger` 27% (no square: two streets bow round a lens-shaped green `v.green`, the church stands in the green, the inn at one end) or `street` (one long street, a short side lane). Streets meander (`o.meander`), lanes fork at 35–70° mostly outward (`newLane`), at most `4 + houses/3` lanes. If the church finds no room on the square it takes the best plot nearby (`growHouse` with `o.vt`). Village sites may now fall up to 16 m (so hill villages exist). Every village gets at least a stub street (guards a crash in the country-road step).
- **Next steps, in order**: (1) people (routines + detailed toy people with LOD, walk on streets/paths), (2) buses (stop list with leg/round distances, bus list button, lane driving, queuing), (3) shops/bank assignment for kit houses (the r <= 6.5 rule excludes them).

### Earlier (3.2.0, 7 Nov)
- **User's answers (7 Nov)**: villages grow live, reacting to stations and roads (option B); people: all activities in one go, a little toy-like but with normal detailed clothing, with LOD; order villages, then people. Also asked: fix streams (done), fix buses (not yet), remodel the church in the kit style (not yet). Long start-up is fine.
- **Next steps, in order**: (1) church in the kit (render for approval first), (2) people (routines + detailed toy people with LOD, walk on streets/paths), (3) buses (stop list with leg/round distances, bus list button, lane driving, queuing).
- **Streams (3.2.0)**: `R.buildStreams` rounds the D8 path with two Chaikin passes, resamples every ~3 m and splits it into pieces of 48 points with a bounding box (`R.stPieces`; `R.drawStreams` culls by frustum and 3 km and merges neighbouring pieces into one draw). `VS_STREAM` puts every vertex on the terrain triangle that is drawn there: per-chunk LOD in `uCL[64]` (from `R.chunkLod`, shared with `R.drawTerrain`), same grid step and diagonal as `gridMesh`, `cornerH`; lift 5 cm + 0.5 mm/m. Plots, house circles and village squares keep off streams (`Life.sgrid`, `streamNear`, `streamHitsRect`; only perennial streams, not rain rills).
- **Villages (3.2.0)**, all in `Life`:
  - Generation: square, then `layWay` lays the main street (two arms) and a side street in 10 m steps toward the flattest way (stops at water, track, plots, other streets 20 m away, the square); church and inn on the square as before (`h.fixed`); then a hamlet of `n0` houses (3–5 × villageSize^1.2) by the same `growHouse` used while playing; `v.R0` = planned radius.
  - `growHouse`: candidates every 2.5 m on both sides of all streets and roads within `maxD = R0·(1.1+0.06·houses)+50` (village lanes, country/station/industry/player roads, so houses ribbon along roads). Score: nearness to the square, attractors (`attractors`: station 0.9, bus stops 0.5, country-road starts 0.3, exp(−d/70)), neighbours (infill), village lanes +0.25, jitter. Type by distance (`zoneType`: shops near the square, cottages, farms outside). Each plot is tried at 3 set-backs; `fitsRect` (method now) checks plots, terrain fall < 5 m, water, track, streets (1 m), squares, streams.
  - `newLane` when no plot fits: carry a street on or branch at right angles (not within 28 m of the square), toward the strongest attractor; at most 2 lanes in a row without a house (`v.idleLanes`), then wait 90 s.
  - While playing (`updateGrowth`, every 1.5 s): `wantHouses = n0 + gp/8` (cap n0 + 30·villageSize^1.3); up to `ceil(missing/4)` (1–4) sites at once; a site takes 55 s (farm 75 s) in three stages drawn with `siteMesh(0..2)` (foundation, planks, sand; timber frame, scaffold, ladder; rafters and topping-out bough) plus 2–3 builders in `sitePeople`. `houseOn` = `plotOn` and `prog>=1`; garden paths use `plotOn`.
  - Live edits are local: `flattenLive` → `R.patchTerrain` (heights, normals, chunk bounds for the patch only), `R.clearVegRect` (trees/rocks in the plot), `R.addRoadPieces` (garden path stamped into the kept road distance field `R.roadD/R.roadK`, patch upload). New lanes trigger a full `rebuildRoads` (bridges). About 10–45 ms per new house on the 8 km world.
  - Saving: each village keeps `v.log` (`['w',width,...pts]`, `['h',x,z,rot,type,hash]`), saved in the snapshot and replayed in order on load (`replayVillage`, skipping entries that no longer fit). Checked: 35 houses before and after a reload.
  - Village panel shows "(n being built)".
- **Known**: the bakery/restaurant/bank-house assignment only takes houses with r ≤ 6.5 m, so no detailed house can become one (as in 3.1.x; the bank upgrade can't appear). Fix with the people/shops work.

## Rolling stock and farm: reference (14 Nov 2026)
**Locomotive kinds.** `LOCOS` (next to `VEH`) maps a kind to its vehicles, meshes and the loco-frame points the game needs:
`std` = the green loco (meshes 0/1), `'01'` = DB 01 118 (meshes 34/35). Fields: `chim` (smoke), `drain` (cylinder cocks), `whistle`,
`eye` (cab camera), `crew` + `crewY` (driver and fireman figures), `R` (driving wheel radius: 4 exhaust beats per turn), `te` (pull factor).
`locoSpec(tr)` reads `tr.veh[0].lt` (undefined = std). `Trains.locoPair(lt)`, `Trains.setLoco(t,lt)` (refuses when the longer loco does
not fit behind), `consist(n,livery,lt)`, `goodsConsist(n,lt)`; saves store `lt`. UI: "🚂 Green / 🚂 01" buttons in the selected train's
row of the train list; `Drive.locoKind` is the kind a newly placed loco gets. Anything new that needs a loco position must go through
`locoSpec`, never fixed numbers.

**01 118 geometry** (loco frame: x forward, rail top y 0, front buffer +7.6): bogie axles 6.05 / 3.85 (wheels 1.0 m), drivers 2.3 / 0 / −2.3
(2.0 m, main crank on the middle one), trailing axle −6.2 (1.25 m), boiler axis 3.05, running board 2.25, cab −5.2…−7.25, cab floor 2.05,
smokebox 4.75…6.95, chimney 5.9, cylinders 4.32…5.62 at z ±1.13 (casing = `vhull` over the cylinder r 0.5 at y 1.02 and the valve chest
r 0.36 at y 1.86). Tender: ±4.0, bogies at ±2.45 (axles ±0.95 from them), tank 1.45…3.3, upper part to 4.3 (z ±1.15).

**Valve gear** (all in the vertex shader, VS_VEH; per-vertex `aAnim` = type, side 0/1, extra, driving wheel radius; uniforms uG1–uG3 from
`G01`, set in `R.drawVehicles`): 1 turns with its wheel (wheels, crank bosses, return crank); 2/3 coupling rods (crank circle, ±quarter
turn); 4 main rod (big end on the crank pin, small end on the crosshead line); 5 crosshead, piston rod, union link (slide by d1);
6 eccentric rod (return crank to link foot); 7 expansion link (rocks about the pivot by φ); 8 radius rod (slides with the die, d2);
9 combination lever (shear between d1 at the bottom and d2 at the top); 10 valve spindle (rigid, at the lever height `aAnim.z`).
Rest geometry is built with every crank pin at its axle centre; the shader places it. The die flips with the last direction the wheels
turned (`tr._gs`). Changing any position means changing `G01` and the mesh together.

**Hopper and grain.** `hopperMesh()` is mesh 6 (the grain wagon kind keeps its id, so old saves load). Weathered rust paint is FS_VEH
material 9 (noise patches by local position), grain is material 8 (kernel speckle). `grainHeapMesh()` (mesh 36) has smooth normals and
is drawn in `drawTrains` like the ore heaps: base height `1.55+1.95·f`, height scale `0.12+0.4·f`, f = load/20.

**Number plates**: `vplate(M,centre,face,'01 118',h,plate,figure)` draws seven-segment figures on a plate (faces 'x', '-x', 'z', '-z').
Other lettering is suggested with lines (`vsign`).

**Farm** (buildings/farm.js, 4.9.0): kit models `farmstead`, `grainTower`, `grainArm` (instanced per frame by `Life.armInst`: turned and
stretched to the spout position), `farmAll` (render only). A farm is a fourth station-slot kind (`Life.slotInds`, 4 sides in
`sawSlots(fm)`, `st.farm={mi,k}`); `Life.farmTower(fm)` stands the tower 11.7 m from that station's track. Loading: `Crane` kind 'farm'
(`runGrain`, `grainWork`), `Crane.stopAt` brings the first two empty hoppers to the arm, the arm fills one then swings to the other, then
`tr.grainMove` makes the train draw up two wagons; `tr.grainStuck` when the track ends. Grain now only comes from farm stations.

## Findings and open questions (14 Nov 2026)
- **Real proportions of the 01**: the first build (4.10.0) put the cab right behind the drivers; the user's station photo showed the cab
  ~4 m behind the rear driver with a long firebox in between. Measured from that photo with the 2.0 m drivers as the scale; total length
  kept at 23.9 m by making the tender 8.0 m. If the user sends a side drawing, recheck the bogie-to-driver gap (1.55 m now).
- **Colours from the photos**: rods red (not steel) on 01 118; valve gear parts bare steel; boiler satin black (material 1 gives the sky
  sheen); number plates gold on the cab and tender, white on the smokebox door.
- **Cost**: loco ≈24.7k triangles, tender ≈9.4k, hopper ≈5.1k, grain heap 0.9k (green loco 2.8k). No LOD for vehicles yet: if the phone
  slows with several 01 trains, add a far mesh (wheels as discs, no valve gear) chosen by distance in `drawTrains`.
- **Not tested on the phone yet**: everything since 4.7.1 (ghost checks, step 6, farm, 01, hopper). Ask the user for a phone check of
  frame rate near the farm and with an 01 train.
- **Not done / ideas**: the arm still swings across the track (the picture had it along the track); hopper bottom doors don't open
  (grain only leaves by Goods delivery); no lettering beyond plates; the 01's lamps follow the old lamp code (not checked at night);
  the green loco and the 01 share chuff sound timing via `R`.
- **Test camera trick**: `Cam.update` pulls the target height to the ground average; for close-up test shots override `Cam.ground`
  (see `tools/rolling_views.js`), otherwise the camera sinks to rail level.

### How the user works
- Ask clarifying questions before long code. Split big requests into steps; they test each step before the next.
- Keep replies short. Be honest about what was and wasn't tested.
- Add a setting whenever something is uncertain.
- They notice shortcuts: removing gardens for convenience was rejected ("I want gardens and fences, make it work").

### Art direction (approved 7 Nov)
- **Man-made things**: cel-shaded, detailed diorama style, rustic and weathered, like the user's 9-building reference sheet (forge, cozy cottage, merchant's shop, tavern, farmhouse, guardhouse, mill, warehouse, windmill).
- **Trees and landscape**: stay as they are (the user likes them).
- **Building technique**:
  - real geometry for shingles, tiles and stones, plus a procedural bump in the shader;
  - weathering: moss, lichen, dirt splash, algae, rain streaks, cracks, plaster fallen off to show brick, soot;
  - a two-band toon light;
  - ink lines (renders only so far);
  - bendy roofs (ridge sag, eave flare);
  - gardens with fences.
- **Renders**: `docs/style/8-cozy-cottage-v2*.jpg`, `9-tavern*`, `10-farmhouse*`, `11-shop*`, `12-in-game.jpg`.

### Building kit (the most recent work)
- **Source of truth**: `buildings/`. `kit.js` holds the builders, materials (`K.M`) and the standalone renderer; `cottage.js`, `tavern.js`, `farmhouse.js` and `shop.js` register `KIT.models[name]`.
- **Loading**: since 4.14.0 trein.html loads `buildings/*.js` directly (no embedding).
- **Preview**: `node tools/render_building.js <name> <out.jpg> ['{"game":true,"lod":1}']` (Playwright + SwiftShader, about 1 s per render).
- **In the game**:
  - Game mode: `K.plot` from `KIT.plots` keeps everything on the plot (gardens, fences, props) and drops the render surroundings (boxes over 20 m, anything centred off the plot, `K.grass` lawns).
  - LOD from the same model code:
    - 0: everything;
    - 1: no shingles or stones; roofs painted as rows (material 20), walls painted as courses (material 21); parts under 0.12 m dropped;
    - 2: only parts over about 0.9 m.
  - LOD distances: under 110 m, 350 m and 2400 m, picked in `Life.kitInst` whenever the camera moves 4 m. (A bug fixed today: it used to be picked only when the village data was rebuilt.) The shadow pass draws one level coarser.
  - Vertices are packed to 32 bytes (48 MB for 4 types x 3 LODs); built at start-up in about 1–3 s.
  - Shader `R.pKit` (VS_KIT/FS_KIT) reuses `KIT.GLSL.MATS` with the game's sun, ambient, shadows, cloud shadow, snow, fog and night windows (`uMisc.x`). `R.drawKit(pass)` runs after `Life.draw`.
  - Phone result: 65 fps at 2.19M triangles.
- **Villages**:
  - Variants map to types through `KIT_OF`: 0/5 cottage, 1 shop, 2 farmhouse, 4 tavern (on the square); 3, the church, keeps the old mesh.
  - Oriented plot rectangles (`rectOf`, `rectHit` SAT, `fitsRect`: other plots, streets within 2 m, the square, slope under 5 m, water, track). `flatRect` levels the whole plot.
  - The front path starts at the gate (`KIT_GATE`); chimney smoke comes from `KIT_CHIM`. Street slots are every 8–12 m.
  - Villages hold fewer, roomier houses than before.

### Still to do (older list from 7 Nov; the current order is trein-plan.md, steps 7–13)
1. **Ink lines in the game.** The approved look has them, but only the offline renderer draws them.
   - Plan: stencil-mark the kit pixels in the main pass, then a full-screen edge pass on depth, plus normals or a part id if a second target is cheap.
   - Keep trees and terrain without ink.
   - Check the phone's fps.
2. **Church in the kit**, so the last old box house goes.
3. **Remaining types from the sheet**: forge/blacksmith, guardhouse, mill (water wheel), warehouse, windmill. Same workflow: render, fix, user approval, embed, add to `KIT_TYPES`, `KIT_OF` and `KIT.plots`.
4. **Old run 2** (asked 5 Nov, not done):
   - buses: a per-bus ordered stop list showing the distance of each leg and of one round, a bus list button, lane driving on the roads, queuing instead of clipping (the bus code in `Buses` is crude);
   - more detailed people up close.
5. **Quality plan steps B–F** (see "Quality plan" below): the railway and roads in the new style, vehicles, terrain (rivers carve straight D8 canyons with 48° walls; they should meander), and polish (seasons and night for the new models, remaining mesh flicker).
6. **OpenTTD gap list**: given to the user, not started.

### Known caveats
- **Start-up**: the kit build adds about 1–3 s on desktop, more on the phone. It could be deferred or cached.
- **Old artwork**: the snow and autumn looks of the old box houses don't exist for the kit houses; only roof snow is handled.
- **Test speed**: headless tests are slower now (heavier scenes). `board_check` may run out of time before the 30 s stop ends; that's not a logic failure.

### Tests and tools (headless Chromium + SwiftShader; never reinstall Playwright)
- **Boot runner**: `node tools/boot.js trein.html <out> [script]`, with env `WS` (world size) and `MR` (map resolution).
- **Test scripts**:
  - `tools/e2e.js`, `crane_e2e.js` (WS=2048), `step1_checks.js` (2048), `step2_checks.js` (2048);
  - `signal_check.js`, `board_check.js` (2048), `ui_checks.js` (2048), `lake_check.js`.
- **Meshes**: `node tools/meshcheck.js trein.html <out> [regex]` checks the old meshes.
- **Rolling stock views**: `node tools/rolling_views.js <outdir> '[["front",7.2,0.35,0.08,14,2.5]]'` (01 + tender + 3 hoppers at 20/10/0 t;
  NOHOP=1 without hoppers, CAB=1 adds cab views; a view named "gear" is rendered at four quarter turns of the wheels).
- **Farm grain cycle**: `node tools/farm_grain_check.js <outdir> <side 0-3>` logs fill levels, arm phase and train status every 4 s.
- **Building renders**: `node tools/render_building.js farmAll out.jpg` (also farmHouse, farmBarn, farmShed, farmYard, grainTower, grainArm with '{"game":true,"lod":N}').
- **Syntax check**: `for f in js/*.js buildings/*.js; do node --check $f; done` (a `//` comment once swallowed code on a one-line edit; use `/* */` inside lines).
- **Pitfalls**:
  - headless frames are slow, so use `waitForTimeout` generously, set screenshot `timeout` to 180000, and use `deviceScaleFactor` 2 via a copy of boot.js for user-facing shots;
  - villages show houses only as they grow: use `Life.addGrowth(v,400)` and wait about 30 s.


## Ground rules
- Toy low-poly models, with photo-real light, water, clouds and mist.
- Three rounds; each one is tested on the Pixel 9a before the next.
- Keep each reply small: earlier long replies were cut off.
- Add a setting whenever something is uncertain.

## Done: building kit in the game (with gardens, fences and LODs)
- **Loading**: trein.html loads `buildings/kit.js` and the models directly (4.14.0; the embed step is gone).
- **Game mode**: `K.plot` (`KIT.plots[type]`, local rect, front -z) keeps everything on the plot (gardens, fences, beds, props, fence-line tufts). It drops the render surroundings: boxes over 20 m, anything centred outside the plot, and `K.grass` lawns.
- **LOD from the same model code** (`K.lod`):
  - 1: no shingles; roofs are painted rows (material 20); stone walls are painted courses (material 21); parts under 0.12 m dropped;
  - 2: only parts over about 0.9 m, a 4x2 roof grid.
  - Sizes: cottage 99.6k/12.9k/2.0k, shop 93.9k/9.1k/1.7k, farmhouse 114.8k/16.2k/4.1k, tavern 156.6k/15.3k/2.5k triangles.
  - Distances: under 110 m LOD0, under 350 m LOD1, under 2400 m LOD2, re-picked in `Life.kitInst` whenever the camera has moved 4 m or the houses changed. (It used to be picked only when the village data was rebuilt, so houses kept the level they had at load.) The shadow pass draws one level coarser.
  - On the user's phone: 65 fps at 2.19M triangles.
- **Memory and start-up**: vertices packed to 32 bytes (48 MB for all 12 meshes); built at start-up in ~1–3 s on desktop.
- **Renderer**: `R.pKit` (VS_KIT/FS_KIT) reuses `KIT.GLSL.MATS` (bump and weathering; weathering heights use local y). It has its own toon light from the game's sun, sky ambient, shadows and cloud shadow, plus snow, fog and windows that glow at night. `R.drawKit(pass)` runs after `Life.draw`.
- **Villages**: house variants 0 and 5 are cottages, 1 shops, 2 farmhouses, 4 the tavern on the square (3, the church, keeps the old mesh).
  - Placement uses oriented plot rectangles: SAT against other plots, street samples within 2 m, the square, slope under 5 m, water and track.
  - `flatRect` levels the whole plot; the house front path starts at the garden gate (`KIT_GATE`); chimney smoke uses `KIT_CHIM`.
  - Street slots are denser (8–12 m) because plots are wide.
- **Village view cost**: about 1.4–1.9M triangles, including the shadow pass. Check fps on the Pixel 9a. If it's too slow, pull the LOD distances in or make LOD1 cheaper.
- **Next**: ink lines in the game (stencil-mask the kit pixels, then a depth/normal edge pass); a church in the kit; the remaining sheet buildings (forge, guardhouse, mill, warehouse, windmill); then run 2 (buses, people).

## Building kit (detailed house types, Nov 2026)
The user approved the style: cel-shaded diorama, rustic and weathered. References are their 9-building sheet (forge, cozy cottage, merchant's shop, tavern, farmhouse, guardhouse, mill, warehouse, windmill).
- **Files**:
  - `buildings/kit.js`: the shared kit. Builders: box, beam, cyl, ico, quad, tri, stones, shingles/tiles, window, bendy gable roof, gable fan, chimney, tree, bush, barrel, crate, pot, ivy, grass, dirt. It also holds the materials and the renderer.
  - `buildings/cottage.js`, `buildings/tavern.js`, `buildings/farmhouse.js` and `buildings/shop.js`: one file per building type, registered in `KIT.models[name]`.
  - `K.patch` lays an irregular ground patch (earth, gravel); use it instead of rectangles.
  - Render one with `node tools/render_building.js <name> <out.jpg>`.
- **Geometry**: real overlapping shingles or clay tiles (lower edges lifted, staggered, a few missing or replaced) on a bent roof (ridge sag, eave flare, wobble), individually laid stones, timber framing, reveals and frames on the windows.
- **Vertex format**: 16 floats: pos, normal, colour, material, uv (-1..1 per face), face half-size in metres, seed, aux (soot amount).
- **Materials** (`K.M`): paint 0, leaf 1, glass 2, glow 3, shingle 4, plaster 5, wood 6, stone 8, grass 9, soil 10, metal 11, deck 12, grass blade 13, end grain 14, bark 15, barrel stave 16, lane 17, clay tile 18, cobble 19.
  - Every material has a procedural bump: bevels, grain, cracks, pillowed stones, voronoi cobbles, ruts.
  - Weathering: moss and lichen (orange on clay), dirt splash and algae at wall feet, rain streaks under the wall tops, plaster stains, hairline cracks and fallen patches showing brick, soot on chimney tops.
- **Render**: shadow map, two soft light bands, sky/ground ambient, SSAO, ink lines (depth, normal and part id; thinner between tiles and stones; none on plants or ground), haze, warm bloom, tilt-shift, grade.
- **Size** with surroundings: cottage ~122k triangles, tavern ~204k, farmhouse ~159k, shop ~132k. These are the close-up level of detail.
- **Next, not started**: get these into the game (step A). Port the material shader into `FS_OBJ`, add the ink and AO passes, add LOD levels (simplified, then far with the roof as a flat textured surface), and make village plots fit the building footprints.
- **Renders**: `docs/style/8-cozy-cottage-v2*.jpg`, `docs/style/9-tavern*.jpg`, `docs/style/10-farmhouse*.jpg`, `docs/style/11-shop*.jpg`.
- **Merchant's shop**: slate roof (the clay-tile material in grey-blue), a front dormer, a leaning stone chimney, an open shop front (the ground floor is split around the opening) with counter and shelves, a striped awning, crates of produce, sacks, barrels, a chalkboard, a sign with scales, and a picket-fenced herb garden.
- **Farmhouse**: half-timbered house on a stone base with a veranda, an attached plank barn (one door open on the hay, hayloft with pulley), a lean-to with firewood and a hand cart, a fenced vegetable garden with a scarecrow, and a farmyard with chickens, hay bales, a trough and a wheelbarrow.

## Quality plan (proposed 6 Nov 2026, waiting for the user's go)
The user wants man-made things cel-shaded but detailed, with a diorama vibe; trees and landscape stay as they are; LOD for speed.
- Style example: `docs/house-style-before-after.png`, rendered by `tools/proto/cel.js` + `cel_page.js` (standalone, uses the game's mesh helpers).
  - Lighting: two-tone toon light (warm lit, cool shadow, hard shadow edge).
  - Ink: screen-space lines from depth, normal and a part id; the line colour is a dark version of the local colour; nature gets no ink.
  - A light tilt-shift.
- Steps:
  - A: cel pipeline in the game, building LOD, new houses with gardens, village streets that grow with the village.
  - B: all other buildings in the style.
  - C: railway and roads (track, signals, crossings, bridges, tunnels, road hierarchy).
  - D: vehicles plus bus logic (former run 2) plus detailed people.
  - E: terrain (meandering rivers instead of straight D8 canyons, valleys with banks, faster generation).
  - F: polish (seasons and night for the new models, leftover mesh flicker, UI).

## Request of 5 Nov 2026 (two runs)
- **Run 1, done in 3.1.0**: signals, boarding and doors, 30 s stops, longer platforms, locomotive plus individual wagons (mixed allowed), fast forward, build UI tabs, hold-to-hide camera, trip card, village upgrade bar.
- **Run 2, next**:
  - buses: a per-bus ordered stop list showing the distance of each leg and of one round, a bus list button, driving in a lane on the roads, queuing instead of clipping;
  - more detailed people when the camera is close.
- **OpenTTD gap list**: given to the user, not started (see the end of this section).

## Done in 3.1.0 (run 1)
- **Signals are always obeyed**:
  - `Net.occAll` (block → set of trains) replaces the single-train `occ` check; the old check missed a second train in the same block.
  - An automatic train reserves the block beyond a green signal (`tr.resB`) once it is within normal braking distance plus 25 m, so two trains never claim one block.
  - `Net.sigAhead` serves every train, driven ones too: `tr.redAt` is the distance to a red signal.
  - In `Trains.step`, when stopping 3 m short of a red signal needs more than 0.9 m/s², the train brakes as hard as it takes (`tr.ebrake`, status 'Emergency stop: red signal').
  - The lamp shows what the approaching train sees (`Net.face`): green when it may go, red behind a train.
  - Test: `tools/signal_check.js` (sudden red at 40 m and 72 km/h, a normal red, the block clearing, a driven train, the lamp).
- **Boarding**:
  - Coaches are entered over their open end platforms through the end door.
  - `Life.doorPath(pose, si, end)` = platform edge beside the end platform → on the end platform (coach floor height) → through the door.
  - Walkers follow `w.bp` (points with an explicit height `w.y`), then go on as before.
  - Alighting walkers come out the same way, then cross the platform.
  - `doorOpenMesh` is now an open end door: a dark doorway and the leaf swung inside. It used to stand on the side walls, where the coach has no door, at the wrong height.
  - Boarders are paced (`w.spd`, 1.5–4.2 m/s) to be aboard before the stop ends; stragglers miss the train.
  - Test: `tools/board_check.js` (stop time, nobody inside a coach body, screenshots).
- **30 s stops**: `dwell` default 30 (10–90). The timetable is off by default (it held trains up to 30 game minutes). Saves before 3.1 move dwell to 30 and switch the timetable off.
- **Fast forward**: the corner button `#btnFF` cycles 1, 2, 4, 8 × (`App.ff`, not saved). Trains and cranes take substeps of ≤ 0.05 s (up to 16 a frame); life, weather, money, goods and the clock get dt × ff.
- **Longer platforms**:
  - Stations tab tools 'Longer platform' and 'Shorter platform' change it in 16 m steps (`st.len`, 44–172 m, €4000 a step when money is on).
  - Extra 4 m platform pieces (`platPieceMesh`, vehicle meshes 32/33, lamp and bench on every third) follow the track beyond the 44 m station.
  - Trains stop centred on the platform: `stopAt` base = min(len/2 − 3, train/2).
  - People wait and stand along the whole platform (`si.half`).
- **Trains wagon by wagon**:
  - One 'Add locomotive' button places a loco and tender. The trains list opens with the wagon picker: every kind (coach, timber, grain, produce, mail, gold/silver/diamond ore), any mix, added at the rear, '−' takes the last one off.
  - The picker shows the consist in order and its length.
  - Mixed trains board passengers at village stations and do goods at every station.
- **Build UI**:
  - Tabs with labels: Track (method row: Pieces, Draw, Route), Stations (signals, stations, platform length), Roads.
  - The profile, bridge and tunnel row (`#bTrackOpts`) and 'Remove track' show only on the Track tab.
  - New icons: `pieceKit`, `longer`, `shorter`.
- **Camera hold**: holding the drive bar's camera button for 500 ms hides the drive bar and keeps the camera. `#cine` shows a camera-mode button (cycles the modes) and an exit button that brings the controls back.
- **Trip card** (`TripFX`): when a train unloads at a village station, a card pops up over the station. The fare counts up, the village's growth bar toward the next size fills with this stop's points, sparks fly, and a level-up line appears when the village grows. Only within 420 m of the camera; gone after 6 s.
- **Village label**: a thin bar toward the next upgrade the village can buy (`VillageUI.nextUpg`: half growth toward the size it needs, half passengers carried). It turns gold once one can be bought.
- **Tests**: `tools/ui_checks.js` covers the tabs, a mixed train, a long platform, the trip card, the camera hold and the village bars.

## OpenTTD gap list (given to the user, not started)
See the reply of 5 Nov. In short:
- train orders (a stop list with full load / unload / non-stop);
- one-way and path signals with passing loops;
- a station catchment preview;
- station ratings;
- per-train profit and running costs;
- depots, breakdowns and servicing;
- industries that grow and close;
- subsidies;
- news;
- clone train;
- a minimap;
- terraforming;
- an era with new locomotives.

## Plan agreed with the user (3 steps, each tested on the phone before the next)
1. **Done in 2.8.0**: sawmill redesign (logs, no planks), wooden travelling gantry crane loading timber wagons in the yard, per-train wagon editor, sunbathers off the squares, squares only once a village has grown.
2. **Done in 2.9.0**: upgrades, all €1 for now but keeping their unlock requirements (size, transport), each with a badge like farming:
   - sawmill;
   - gold, silver or diamond mine (60% of villages get one random type);
   - bank (available at town size; mines deliver to it);
   - docks with the steamboat for lake villages (bought per village; the steamboat runs once a lake has two docks).
   - Castles become bus destinations: fares, and growth points for the village where the passengers boarded.
3. **Done in 3.0.0**: 8 × 8 km default world, a guaranteed big lake with two lake villages, two castles per map (Neuschwanstein, Hohenzollern), summer-only hot-air balloons, new default settings.

## Done in 3.0.0 (step 3)
- **Settings defaults**:
  - World size 8 × 8 km.
  - Map resolution 'Auto' (`mapRes` 0): 8 m cells, so 256 at 2 km, 512 at 4 km and 1024 at 8 km.
  - Automatic resolution targets 55 fps, and a 90 fps option was added.
  - MSAA off (the low and medium presets too; high keeps 4×).
  - Saves from before build 3 move autoRes 30 → 55 and MSAA 4 → 0 once, in `applySnapshot`.
- **8 km checks**:
  - The village count scales with area (`villages` is now "per 4 × 4 km"); more village names.
  - The road distance texture is 3072² above 4 km, and the old texture is now deleted on regenerate (it leaked).
  - Lakeside village streets are pulled back to dry land (they used to end in the lake, so country roads from those ends found no route; 4 failed at 8 km).
  - Generation takes about 28 s in headless desktop Chromium (erosion about 11 s); expect 1–2 minutes on the phone.
  - The 170k tree cap is reached (warning only).
- **Big lake**:
  - If the biggest lake is under min(40 ha, 2.5% of the map), `carveLakeBowl` digs a bowl in the lowest suitable basin and `genWater` runs again.
  - The biggest lake (>15 ha) gets at least two villages within 110–190 m of its shore. Shore candidates replace crowding villages, and villages are renamed afterwards.
- **Castles**:
  - `castleMesh()` is a new Neuschwanstein (~13k tris): plinth, gatehouse, Knights' House, Square Tower, Palas with dormers, Throne Hall apse, 60 m stair tower and the Bower.
  - `hohenzollernMesh()` (mesh key `castle2`, ~12k tris): bastion ring with bartizans, Eagle Gate, three Gothic blocks, chapel, four named towers.
  - Setting `castleCount` (2–4, default 2) replaced the castle chance setting. Kinds alternate neu, hoh.
  - Sites are on summits at least min(1500 m, 35% of W) apart, with a second, relaxed pass.
  - The gate faces the nearest village, with a road to it.
  - Mines keep 130 m away from castles; castle buses use `castleList()`.
- **Hot-air balloons**:
  - `balloonMesh(v)` in three liveries: a 16-gore envelope, rigging, a wicker basket and the burner.
  - `Life.updateBalloons` spawns them only in summer, 6:30–19:30, with no rain or snow and wind below 1.6.
  - They appear 0.5–1.4 km from the focus, at 120–340 m above the ground, drift with `windDir`, and bob slowly.
  - Setting `balloons` (0–3, default 1) sets the maximum number (2 × value).
  - They vanish when the conditions end or once they are 3.2 km from the focus.
- **Tools**: `tools/lake_check.js` (biggest lake, its villages, castles, steamers, docks, mines); `boot.js` takes `WS` (world size) and `MR` (map resolution) env vars.

## Done in 2.9.0 (step 2)
- **Village upgrades** (`Life.UPG`: farm, saw, mine, bank, docks):
  - Each has an owned flag on the village (`farmOwned`, `sawOwned`, `mineOwned`, `bankOwned`, `docksOwned`, all saved), an unlock level and a passenger count:

    | Upgrade | Unlocks at | Passengers |
    |---|---|---|
    | Farm | Village | 40 |
    | Sawmill | any size | 15 |
    | Mine | Village | 60 |
    | Bank | Town | — |
    | Docks | any size | 20 |

  - Each costs €1 and gives growth.
  - `upgHas`, `upgState` (none, locked, available, owned) and `buyUpg`; `farmState`/`buyFarm` remain as wrappers.
  - The label shows owned icons and a pulsing badge with the first available icon (plus a count).
  - The panel lists every upgrade the village can have: what it is, what it still needs, or a Buy button.
- **Sawmill upgrade**: a sawmill exists and works only once its village owns it (`Life.indOn`).
  - Gated on that: drawing, its lane, wood production, slot markers, label, station attachment and the crane.
  - Its clearing stays as an empty site until it is bought.
  - Saves whose sawmill stations predate this need the €1 upgrade before the crane works.
- **Mines**:
  - At generation, 60% of villages get a gold, silver or diamond mine (own random stream, so the rest of a seed's world is unchanged). It sits 160–540 m out, preferring higher ground, on a levelled 34 × 26 plot with a lane, and is stored as `Life.mines` and `v.mine`.
  - `mineMesh(kind)`: timber headframe with sheave wheels and cables to the winding drum; brick engine house with stack and boiler house; shaft house; sorting house on stilts with chutes; tub track with tubs and a miner; waste dump and ore pile with glints; assay office; powder magazine; water tank; lamps; fence; a gate sign with the mine's emblem.
  - Industry code is shared: `Life.inds()`, slots at back −38 and sides ±34, `nearSawSlot`, `indName` ("X Gold Mine"), the ⛏️ label and info.
  - No lorry bays at mines: ore goes by rail.
- **Ore goods** (`ORE`, `Goods.T`: gold 260, silver 180, diamond 420 per unit-km):
  - Produced only at stations attached to an owned mine (+0.16/s), and accepted only by villages with a bank.
  - The panel's "Accepts" line lists them.
- **Ore loading station** (`oreYardMesh`, vehicle mesh 31) for stations attached to a mine:
  - A timber ore bunker on trestle bents spanning the track, with a roof and nine pockets with spouts between the bents.
  - An inclined covered conveyor gallery from the ore yard, lamps and a weigh hut.
  - The yard stockpile (`oreHeapMesh`) grows with the stock.
  - `Crane.runOre`: the pocket over a wagon of the mine's ore opens, ore pours (`oreStreamMesh`, dust) until the hopper is full (20) or the bunker is empty, then it closes. The train waits ("loading ore").
  - Trains stop with the first ore hopper at the far end (`Crane.stopAt` by kind), and the station pad is 24 m wide.
- **Ore hopper wagon** (`oreWagonMesh`, mesh 21, `VEH.ore` length 11.4 on bogies), after the user's photo of the long-haul ore trains:
  - Body: a tall rust-red steel box with close U-stiffeners, corner posts, a heavy top chord and a belt rail; sloping discharge hoppers with doors underneath.
  - Couplers and fittings: centre couplers with knuckles and hoses, step plates, a handbrake wheel with column on the A end, end and side ladders, grab irons, an air reservoir.
  - Bogies: cast side frames, coil-spring nests, axleboxes, wheels on axles.
  - The heaped load (`oreLoadMesh` per kind) rises with the fill.
  - The wagon editor offers ore hoppers for the ore kinds that exist on the map.
- **Bank**: at generation, the fourth house nearest the square is the bank site (`h.bank`).
  - Until bought it is an ordinary house; once bought, `bankMesh` replaces it: a stone building on a plinth with a portico of four columns under a pediment, a gilded frieze and medallion, a panelled door with a fanlight, arched windows, a cornice with a balustrade, and a flag.
- **Docks and steamboat**: docks show (mesh, waiting people) only for villages that bought them.
  - A lake's steamboat appears and sails once two or more of its docks are owned (`st.off` otherwise); it starts moored at the first one.
- **Cargo-only stations** (attached to a sawmill, workshop or mine, `si.cargo`):
  - No walkers queue there, and no station road is built.
  - Passenger trains neither stop there nor rotate to them (`Net.destOf`/`arrived` skip them).
  - Bays have no waiting passengers, and passenger buses skip them.
- **Castle buses**: a stop within 450 m of a castle (`Life.castleList()`, ready for step 3's several castles) is a castle stop and is named "Castle gate".
  - 40% of passengers from village stops ride there; the fare is ×1.6.
  - Each visitor adds 0.8 growth and 1 passenger to the village they boarded in (`p.fv`); visitors trickle back from the castle.
- **Tests**: `WS=2048 node tools/boot.js trein.html out tools/step2_checks.js` (upgrade states; buying a mine for €1; a mine station filling ore hoppers; the bank switching on ore acceptance; docks and the steamboat; screenshots of the station, wagons, mine and panel).
  - A 15-minute castle bus simulation gave 32 visitors, +49 growth for the village and €47k in fares.
- **Not tested on the phone**: ore pour pacing (1.4 units/s × crane speed), mine placement on 8 km worlds, and how the panel reads with five upgrade rows.

## Done in 2.8.0
- **Sawmill** (`sawmillMesh`, plot 40 × 30, +x faces the village) shows the round-wood process. It ships logs, not planks.
  - Mill pond with floating logs and a jack ladder up to a roller conveyor.
  - Open timber saw shed with a steam-driven pendulum cross-cut saw (thin toothed blade, arm, belt), line shaft and pulleys.
  - Brick engine house with a slate roof, arched windows, flywheel and a long belt to the shed; a brick stack that smokes in the working day (`Crane.update`).
  - Water tank on a trestle; cold deck on skids; a horse skidding a log in, with a teamster (`oMerge` copies `horseMesh`/`personMesh` into a scene).
  - Cut-log stacks by the gate (`oLogStack`); office with porch, lit window and stovepipe; a gate sign with a saw-blade emblem and a fence.
  - Props: sawdust chute and heap, bark heap, grindstone, chopping block with axe, cant hooks, wheelbarrow.
  - New helpers: `oLog` (bark sides, pale end grain) and `oGable(...,roofMat,wallMat)`. Pass `0,0` for fixed colours; materials 5/4 take random house colours.
  - Sawmill and workshop now cast shadows (they were drawn after the shadow pass returned).
- **Loading sides moved to the plot edge**: `sawSlots` now sit at back −35, left +30 and right −30, because each station brings its own 14 m yard toward the mill.
- **Crane stations**: stations attached to a sawmill or workshop turn to face it (`st._f`, set in `updateStations`).
  - They draw `loadStageMesh` instead of the passenger station: stone footings, two runway rails, a timber loading platform with ramps, stack bearers, two lamp posts where the station lights are, and a tally hut.
  - No station hall stands beside a yard. The pad is levelled 21 m to each side instead of 17.
  - A train counts as arrived when any vehicle is within 22 m.
  - Placing or removing a signal or station now rebuilds the earthworks at once.
- **Wooden travelling gantry** (`gantryMesh`, `trolleyMesh`, `cableMesh`, `hookMesh`, rows `logRowMesh(k[,chains])`; vehicle meshes 10–20):
  - Two timber trestles on wheel trucks; a Howe-truss bridge with chords, posts, diagonals, ties, trolley rails, a walkway and handrail; a ladder; a steam winch house that smokes while working.
  - The trolley carries a winch drum. Ropes are stretched in the draw matrix; the hook block hangs a spreader beam with chain slings.
  - It runs in the station frame: x along the track, z across, yard on −z (`CRN` holds the dimensions).
- **Crane logic** (`Crane`):
  - One state machine per loading point. Phases: lift, travel to the stack, lower, hook, lift, travel to the wagon, lower, release, lift.
  - Rows of `CRN.unit` (20/3) units: a timber wagon holds 3 rows = 20.
  - The stacks show the station's wood stock, one row per unit.
  - Sawmill: it loads timber wagons standing within ±21 m of the yard centre, nearest first; wagons beyond the yard are not filled.
  - Workshop: it unloads onto its stacks, and `Goods.deliver` pays as each bundle is set down. The stacks are used up, one row per 45 s.
  - Lorry bays get the same gantry. It does one visual cycle per lorry visit, and lorries dwell 36 s there.
  - If the train leaves mid-cycle, the bundle goes back onto its stack.
  - Auto trains draw up with their first timber wagon at the far end of the yard (`Crane.stopAt`). They wait while the crane works or has work for them (`Crane.holds`, status "loading logs" or "unloading logs").
  - New setting **Timber crane speed** (`craneSpeed`, Trains tab, default 2.5×).
  - `Goods.trainStop` leaves wood to the crane at crane stations.
  - The old yellow derrick crane, jib, swung bundle and log pile meshes are removed.
- **Timber wagons** (`wagonMesh(3)`) are drawn empty. Their logs are drawn row by row from `v.n` in `drawTrains`.
- **Wagon editor**: the selected train's row in the train list shows its count and add buttons (timber, grain, produce, mail for goods trains; coach for passenger trains) plus "−" to take the last one off.
  - Uses `Trains.car`, `addCar` (which checks for room behind) and `removeCar`.
- **Saving goods trains**: they used to be saved as passenger trains, so they came back as coaches after a reload. `serialize` now writes `cons` (each wagon's kind, load and origin), and `load` rebuilds it.
- **Sunbathers on the square**: the beach ray started at the village centre, so a lake close to a village put the beach (towels, sunbathers, parasols) on the square. The shore point is now the last dry step, at least 14 m beyond the square.
- **Squares**: the square disc and its corner lamps are now level 1 (Village), so hamlets have only a crossroads.
- The HUD (money and its buttons) sits above the village labels.
- **Tests**: `WS=2048 node tools/boot.js trein.html out tools/crane_e2e.js` (sawmill siding, station, 3 timber wagons, full yard) and `tools/step1_checks.js` (workshop unloading pays, save round trip, wagon editor).
  - Headless runs at about 1–2 frames per second, and the game clamps a step to 0.1 s, so the tests set the crane speed to 60.
  - A 2 km boot screenshot timed out even with the old build until `--ignore-gpu-blocklist` was dropped from `boot.js`.
- **Not tested on the phone**: crane pacing (default 2.5×), how the loading stage sits on uneven ground (stone footings hide small steps), and existing saves whose sawmill stations were placed at the old slot positions (they still attach by index and turn toward the mill).

## Done in 2.7.0
**Tools** (in the repo under `tools/`; Playwright + the preinstalled Chromium):
- `node tools/meshcheck.js trein.html out [regex]` renders every mesh builder from 4 angles into `out/<name>.png` (flicker in magenta) and writes `out/report.json`. It flags:
  - z-fighting: each view is drawn twice with opposite per-triangle depth nudges; pixels that change are flicker;
  - floating parts: a connected part that does not touch the ground or the rest within 6 cm (sampled points against triangles, plus box containment);
  - degenerate and NaN triangles.
- `node tools/boot.js trein.html out [tools/e2e.js]` boots a 1 km world at 412×915 and prints page errors plus ERR/WRN log lines. `e2e.js` lays a line with 2 stations, a passenger and a goods train, and screenshots it by day and night.

**Mesh fixes** (all models now pass the checker; the remaining flicker is a few pixels):
- **Open tubes**: `oLimb` never capped its ends, so wheels, discs and logs were hollow and see-through: tractor, trailer, lorry, bus and wagon wheels, the head-saw blade, sign discs (bus stop H, bread, saw blade), station-hall clock faces, harrow discs, round bales, log ends, and the bus roof dome ends. It now caps limbs ≥ 10 cm (param `caps`; `false` keeps an open rim, as on the cart wheels).
- **Roofs hovering over walls**: the eaves now drop with the pitch, so roofs rest on the walls:
  - hip roof, 11 cm (inn); shop roofs, 27 cm (bakery, restaurant);
  - barn, 55 cm; castle Palas and bower, 70 cm (castle `roof()` now takes the wall size plus overhang, with gables on the end walls);
  - sawmill, 27 cm; sawmill office, 20 cm; workshop office, 27 cm (gables moved onto its walls);
  - station house, 33 cm (gables now reach the ridge, chimney clears it).
  - The shed's side walls stuck 0.6 m through its mono-pitch roof; they now follow the slope.
- **Missing or misplaced roofs and gables**:
  - The silo loading shed had no roof: `roofGable` had no centre, so the roof hung around the elevator. It now takes `cx, cz`.
  - The sawmill engine house and office were missing gable triangles.
- **Floating parts**:
  - Log rows: sawmill deck, side piles, `logPileMesh`, the timber wagon and the timber flat wagon now rest on each other. The deck has skids.
  - Lumber stacks: the stickers now fill the gaps and the bottom layer sits on bearers.
  - Workshop and furniture: the restaurant chairs have legs; the outfeed roller table has legs; workshop chairs turn their seat and back with their legs.
  - Lights and fittings: the bakery bread sign; the windmill gallery posts, which now also have a rail; the loco lamps, whistle and handrail stanchions (which now reach the boiler); the signal cap.
  - Animals and boats: the sheep head now sits on a neck past the grazing pivot; the sailboat jib now runs along a forestay; the steamer's upper bulwark.
  - Machines and frames: tractor axle housings and front bolster; the combine feeder house; the boom counterweight; axles on the loco, tender, wagons and coach bogies; tender and wagon springs; coach queen posts.
- **Coplanar faces**:
  - St Andrew's cross: rebuilt from flat boards, with the white faces 1 cm proud.
  - Castle: the gatehouse roof was flush with the wall top, and the square tower was flush with the terrace side.
  - Loco: the backhead now stands 2 cm in front of the boiler's end cap (it flickered in the cab view); the valances now sit below the footplate edge.
  - Houses: ground-floor windows under a door are skipped (`wins(..., door)`).
  - Other: the sail lattice, the mail-van yellow band and planks, the coach lining, the towel stripe, and the shed wall top.
- **Wrong placement or shape**:
  - Castle: the plinth is now an oblong that carries the whole terrace; arched window and gate tops are now flat arches (`oArch`), where they used to be vertical drums sticking out; the throne-hall bay now reaches the terrace; turret windows now stay on the turrets, which also get corbels; the square-tower pyramid is turned 45° to match the tower.
  - Windmill: the door and window now follow the tapered wall; they used to float 0.3–0.4 m off it.
  - Sawmill: the mill house has a real open infeed end with the head saw visible inside (a thin blade, a carriage and a log); the sawhorses and bow saw were inside the closed building and are now outside; the wall sign touches the wall.
  - Workshop: the doors were inside the office block; the shop now has a real north doorway with a lit bench inside. The sawtooth roof is now a proper north-light profile. The trade sign now hangs from a bracket, with the chair on top.
  - Station: the lamps now hang under the canopy; their posts used to run up through it.
  - Other: the bakery's lit window is now in front of its frame, which used to hide it; the loco spectacle plate no longer has open slots; the hopper wagon shows its grain inside an open rim.
- **Fewer triangles**: degenerate cap triangles in `vcyl` are gone (new `vt`), and the horizontal wheel spoke no longer has zero width. The loco went from 3332 to 2760 triangles despite its new axles.
- Bridges in all six styles were checked through `buildTrackMesh`: no flicker, no degenerate triangles.

**Pictogram buttons**:
- Main bar, sound, sky sheet (speed, season, weather, music), build modes and tools, roads, signals, route, profile, bridges and tunnels, drive controls, train list rows, and the settings close button now show 24-px line icons (`ICONS`, `svgIcon`).
- Mark a button with `data-ic="name"`. `iconize()` keeps the button's text as caption, tooltip and aria-label.
- Use `setCap(btn, label, value)` and `setIcon(btn, name)` to change an iconized button; never set its `textContent`, which would wipe the icon.
- Values stay visible under the icon (camera mode, autopilot speed). Place and Build it keep their caption (`.keepcap`). Add buttons get a "+" badge (`.add`), and Generate gets a red dot when settings changed.
- New setting **Words under the button icons** (`btnCaps`, File tab, default off).
- A long press on an icon button names it in a toast and does not trigger it (`IconHint`). The whistle is excluded.
- Hints that named buttons now describe the icons.

**Oversights fixed**:
- Bars, the sky sheet and panels are now layered above the village and industry labels. A label used to cover the sky sheet's Snow button and could take taps meant for the build bar.
- Reset everything now asks first, and also clears roads, bus stops, buses, village growth and money. Remove train now asks first.
- A removed or cleared train no longer keeps whistling.
- The sound button follows the real audio state (`Sfx.syncBtn`); it used to say "Sound on" even when audio had not started.
- Audio pauses while the tab is hidden. Held keys are released on window blur.
- The money log and the drive readout no longer rewrite the DOM every frame.
- Opening Trains with no train keeps the free camera; it used to fly to a meaningless follow view.
- The unused road-ribbon program (`VS_ROAD`/`FS_ROAD`/`drawRoads`) and the dead `sheepMeshOld`/`cowMesh` are removed, so one fewer shader compiles at boot.
- Names from save files are escaped before they go into HTML (`esc`).
- A closed village's panel hides when its village is regenerated away.
- The garbled "Out of money: repay nothing more can be borrowed" toast is fixed.
- The HUD stats line wraps instead of running under the corner buttons.

**Tested headless**: the boot has no errors; the e2e run has two trains running with no errors; the captions setting and long press work. **Not tested on the phone**: the icon legibility at Pixel 9a density, and the long-press timing (480 ms).

## Done in 1.1.0-a (step 1, fixes)
See handoff 2. In short:
- Water depth is now computed analytically; the water skirts are gone.
- The bank level is extended outward (`R.waterRender`).
- Depth buffer is DEPTH_COMPONENT32F.
- Smoothed normal map `uNorm` (unit 12) picks the terrain materials.
- Shadow bias is in metres.
- Tunnel cover: `T.tunMask`, a cut-and-cover mound, and `TUN_PORTAL`.
- Mist cards face the camera.

## Done in 1.1.0-b
- **Tunnels, tested headless:**
  - Cuttings no longer fill with phantom water. Dry cells now get level H−30; the bank extension is tagged a=0.25.
  - The water texture is re-uploaded in `R.updateTerrain`.
  - The portal face top now follows the hillside per column (`topAt`), sampled 2.5 m into the hill.
- **Contact-hardening shadows:**
  - `uShadowRaw` (unit 13) reads the same shadow texture through a sampler object with compare mode NONE (`R.bindSh`).
  - Blocker search (6 taps), then a penumbra from the blocker distance, then 8-tap PCF.
  - Shadows are sharp at trunks and soft further away or under overcast skies.
- **Lighting:**
  - `lightS(alb,N,W,ao,sh,rough)`: normalized Blinn-Phong sun specular, Fresnel sky reflection, and wetness lowers roughness.
  - `light()` uses rough .82; `lightD()` is diffuse-only (water, and the vehicles' own reflections).
- **Sky light and bounce:** sky light is brighter on the sun side. Ground bounce is green and scales with the sun (`gndA` in `R.atmos`).
- **Object AO:** objects darken near the ground, and tree canopies darken underneath.
- **Height haze:** aerial perspective in `fogc`; haze is thick in valleys and thin over peaks and in high views.
- **Auto exposure:** new setting `autoExpo` (Look tab), eye adaptation based on sun plus sky light.
- **GPU reset handling:**
  - No automatic reload any more. On reset it saves to `trein.recover` and shows a Restart button after 4 s; it reloads if the context comes back.
  - Boot retries WebGL2 up to 6 times on a fresh canvas, then explains that the tab must be closed.

## Village growth plan (agreed, 3 prompts)
1. **Done in 2.1.0** (this prompt): levels, labels, village panel with instant growth, tap-a-train.
2. **Done in 2.2.0**: agriculture becomes an upgrade (no spontaneous fields, pastures, herds, farmstead or tractors). Unlocked once a village has reached a size and done some transport; then a visual cue (badge on the label) shows it can be bought. Buying gives growth points.
3. **Done in 2.3.0**: level effects beyond houses: more people and passenger/bus/train demand; unlock buildings (church, inn, market, station hall), market stalls on the square, bakeries, restaurants.

## Done in 2.6.1 (touch camera, from the user's touch log)
- **What the log showed** (2.6.0, ~45 fps): 136 two-finger frames in mode "-" (no response until 14 px had built up), then a hard lock to either `twist` (872 frames: rotate + zoom) or `tilt` (117), never both. One-finger pan moved the target by a fixed scale (dist·0.0016 per px), so the ground slid under the finger.
- **One finger (free camera)**: `grabPan` keeps the ground point under the finger under the finger. It intersects rays with the horizontal plane through the target (`groundUnder`, no ray-march), caps a step at dist·0.25, and falls back to `camPan` near the horizon. It tracks a smoothed velocity (`Input.pv`); lifting within 90 ms of the last move hands it to `Input.vel`, and the momentum decays at exp(−3.5 t).
- **Two fingers**: no mode lock and a 4 px dead zone. Every frame applies all of:
  - rotation (da, gated above 0.25 px of arc);
  - zoom (ds, gated similarly), which also pulls the target toward the ground under the pinch centre so the point between the fingers stays put;
  - tilt from parallel vertical motion (both fingers moving the same way: sign × min |dy|) × 0.0065.
  - Build mode keeps the old pinch / rotate / pan.
- Logged as tilt / twist / tilt+twist (`Input.prev` holds per-finger positions; `Input.live` is the dead-zone flag).
- Tested headless with synthetic pointer events: the grab-pan ground error is 0.00 m and momentum is set on release; one twist-and-slide gesture changed yaw +0.36 and pitch +0.28 together.

## Done in 2.6.0
- **Industries are generic**: `Life.nearSawSlot` searches sawmills and workshops (returns kind, mi, k, slot, m); `Life.indName`. Attachments use `st[kind]` / `stop[kind]` = {mi, k} (`sawmill` or `workshop`); the save keeps both on bus stops.
- **Station tool** (Build → Signals → Station):
  - Free sides of sawmills and workshops show the post markers only while this tool (or Roads → Bus stop) is active.
  - A tap within 38 m of a free side snaps there: the station goes on track already along that side, or else on a new 70 m siding laid along the side (`Build.makeSiding`: two nodes, one straight segment, `App.trackChanged`, €7,700 when money is on).
  - A tap away from any track also lays a siding, parallel to the nearest track within 200 m, otherwise across the view, so stations can go anywhere; join its free ends to the line.
- **Wood workshops** (generate, before sledding): about one per 3 villages, the largest villages first, not near a sawmill, on open ground (lowest tree density) 50–220 m outside the village; levelled, with a gravel lane.
  - `workshopMesh` (joinery, cartwright and cooper): brick shop with a 4-tooth north-light sawtooth roof (glazed), chimney, open double doors on a lit workbench, long side window; half-timbered gable office with a lit window and a projecting trade sign topped by a big chair; open timber-drying lean-to with racked planks; sticker-stacked delivery stack; outside: chairs and a table, barrels, cart wheels against the wall, a finished hay cart, a sawhorse, a shavings heap.
- **Wood now goes only to workshops**: `Goods.woodSink(k, x, z)` is true for points attached to a workshop or within 250 m of one; villages no longer accept wood. Cranes stand at attached workshop sides too, and swing while a goods train or lorry is there (same animation).
- **Levelled plots** (`Life.levelPlot`): the average height over the oriented footprint goes into T.H and the flat mask, blended over a 9 m margin with smoothstep. Used for sawmills (20 × 15) and workshops (17 × 13). Instances use the levelled y.
- **Industry labels** (`IndUI`): round gold badges, 🪚 sawmill and 🪑 workshop, above each within 2.6 km (hidden in track-building modes other than Signals/Roads). A tap opens the shared `#vPanel` with what it does and its loading sides.
- **Sawmill extras**: 3 more log decks around the yard, 2 sawhorses with logs and a bow saw, a two-man crosscut saw resting on posts, a timber wagon loaded with logs, a big circular saw-blade sign with teeth on the mill gable.
- Tested headless: workshop and sawmill render with their badges. Snapping a station siding and the workshop cranes not checked by eye.

## Done in 2.5.0
- **Chimney smoke bug**: `Life.smoke` looped over all houses (only skipping `gone`), so hidden higher-level houses smoked. It now uses `houseOn(h)` and skips shops.
- **Sawmill redesign** (`sawmillMesh`, plot 40 × 30, +x faces the village):
  - Log deck on skids feeding an inclined jack ladder with a log on it into a long board-and-batten mill house (corrugated gable roof, windows, open infeed end showing the big circular head saw on its carriage, lumber outfeed rollers with boards).
  - Brick engine house with a tall brick stack and spark arrester.
  - Sawdust heap and slab pile; 4 sticker-stacked lumber drying piles on bearers; timber office with a porch and a lit window.
  - Generation: flat check radius 24, levelling r 26, clearing r 36.
- **Loading sides**: `Life.sawSlots(m)` = back (local −24, 0), left (0, +18), right (0, −18), each with an orientation and an inner pile point.
  - Rail: a station placed within 45 m of a slot attaches (`Life.attachSawmill` on creation: `st.sawmill` = {mi, k}, named "<village> Sawmill").
  - Lorry: the Bus stop tool tapped within 32 m of a free slot snaps a loading bay there (€12,000), building a 20 m gravel apron plus a gravel road to the nearest road if needed (`stop.sawmill`).
  - Attached points get +0.18 wood/s on top of the normal sawmill reach.
  - In build mode the free slots show white-and-orange post markers (`slotMarkMesh`).
- **Log cranes**: at each attached side, a yellow derrick crane (`craneBaseMesh`: lattice mast, winch house) with a swinging jib (`craneJibMesh`, instance yaw), and a log pile at the inner point (`logPileMesh`).
  - While a goods train (`atSt`, wagons) or a lorry (dwell at that stop) is loading, the jib cycles every 8 s: hook at the pile, swing with a log bundle (`logBundleMesh` at the tip), set down at the vehicle side, swing back. Otherwise it rests over the pile.
  - Computed in the dynamic part of `prepare`; `near` isn't defined in the static block.
- **Classic tractor** (`tractorMesh`): big rear tyres with 14 lugs and paint-coloured rims, narrow front axle with small wheels, transmission housing, long bonnet with a slatted grille, headlamps, fuel tank and radiator cap, upright exhaust with a rain cap, open platform with fenders and footboards, pan seat on a spring post, angled steering column and wheel, drawbar and 3-point links. Paint via mat 20.
- Tested headless: sawmill with a lorry bay on its left side, crane, pile and road; the tractor parked in a farm yard looks like a 1950s tractor.

## Done in 2.4.0 (goods)
- **Goods** (`Goods`), setting `goodsRate`:
  - Loading points are train stations (`'st:'+id`) and bus stops (`'bs:'+id`), each with stock {grain, produce, mail, wood}, capped at 60, produced every second.
  - Production within reach: farming villages' farmsteads within 650 m give grain 0.05/s and produce 0.035/s; villages within 500 m give mail 0.02·(level + 1)/s; sawmills within 650 m give wood 0.06/s.
  - Acceptance (`accepts`): grain and produce need village level ≥ 1 (bakery or market); mail and wood any village.
  - `deliver` pays units × Manhattan km × rate (grain 60, produce 80, mail 120, wood 50) × fareRate, adds 0.6 growth per unit to the receiving village, and shows a floating "−5 🌾 3 ✉️". `load` fills the hold (origin recorded per type) and shows "+…".
  - The village panel shows accepted goods and what's waiting at its stations and stops.
- **Goods trains**: "Add goods train" in the Trains bar (`Drive.goodsNext`) → `Trains.goodsConsist(n)` = loco, tender, then (n + 2, at least 4) two-axle wagons cycling grain hopper / covered van (produce) / mail van (PTT green, yellow band) / timber flat with logs. Meshes 6–9 (`wagonMesh(t)`), `VEH.wagon` len 9.4. Capacity 20 per wagon; cargo on the wagon objects (`ctype`, `n`, `fx`, `fz`, `from`).
  - At stations `Life.stop` hands goods trains to `Goods.trainStop` (no passenger boarding). Seated passengers aren't drawn in goods trains.
- **Lorries**: "Add lorry" in Build → Roads. They are `Buses` entries with `goods:true` (same routing and driving); at stops `Goods.lorryStop`: deliver, then load up to 16 units spread over the four types. `lorryMesh`: blue 1950s cab with rounded bonnet, flatbed with canvas tilt, headlights. Drawn as `lorries`, split from buses.
- **Sawmills** (generate, before sledding): about one per 3 villages, at the densest forest 120–380 m from a village (32 m tree grid), flat and clear of water, roads, track, houses and fields; levelled, cleared, with a gravel lane to the village. `sawmillMesh`: open saw shed with a circular saw, timber office, brick boiler chimney, log piles, plank stacks. `Life.sawmills`.
- Tested headless (money on): a lorry between Hoogveld (farm bought) and Dennenburg (town) earned €1,010 and gave Dennenburg 7.8 growth; 3 sawmills; screenshot of a sawmill. Goods trains and wagons not visually checked (no track in the test).

## Done in 2.3.0 (village growth part 3)
- **Demand by level** (lv 0/1/2):
  - Walkers heading to a station: spawn chance 0.18·(1 + 0.7·lv), queue cap 6 + 6·lv.
  - Bus stops: waiting rate 0.05·people·(1 + 0.9·lv), cap 16 + 12·lv.
  - Houses (and so strollers) grow with the level as before.
- **Shops**: at generation the 3 plain houses nearest the square (r ≤ 6.5) become shops: bakery (lvl 1), restaurant (lvl 2), second bakery/café (lvl 2). Flag `h.shop`; they're excluded from the house instances and drawn as `bakeryMesh` (brick, lit shop window, striped awning, hanging bread sign, crates of loaves, bench) or `restaurantMesh` (plastered, lit dining windows, green awning, terrace with 5 tables, chairs and parasols, menu board). The front is local −z, like houses.
- **Market** (static, rebuilt on level change): stalls on the square ring (plaza r − 3.2), skipping the street axes. Village: 4 stalls (one per quadrant); town: 16. `stallMesh`: posts, counter, produce crates, striped awning (mat 20 colours). Between 7 and 19 h vendors stand behind the stalls and some shoppers in front (`marketPeople`, via the people list).
- **Station hall**: stations whose village is a town get `stationHallMesh` (20 × 8 brick hall, tall lit arched windows, slate roof, central clock tower with 4 clock faces and a spire, platform canopy on columns), placed 9.6 m out on the platform side, rotation + π so the canopy faces the track. Recomputed each frame from `stInfo`.
- The village panel row lists what the level brings.
- Tested headless: a town square with a full ring of market stalls and vendors, the church, and the restaurant terrace. The station hall isn't visually checked (no station in the test).

## Done in 2.2.0
- **Transport grows villages**: every passenger boarding or alighting at a station (train `Life.stop`) or bus stop (`Buses.update`) belonging to a village adds 1 to `v.trans` and 0.5 growth points.
- **Farming upgrade**:
  - `Life.FARM` = {level 1 (Village), trans 40, cost 60000, growth 60}.
  - `Life.farmState(v)` returns none (no fields planned) / locked / available / owned; `Life.buyFarm(v)` (charges when money is on) sets `v.farmOwned`, re-uploads fields, reschedules farm work and adds 60 growth.
  - `Life.farmOn(f)` gates everything agricultural: `R.uploadFields` skips fields of non-farming villages (their land stays meadow, and field-work texels have no effect), herds and animals (update and draw), fences (now carry `f`), farmstead buildings (static upload), farm lane and yard (`vRoads.farmOf`), and tractors (want = 0 unless owned). Jobs on unowned fields are never taken.
  - Saved per village (`farm`, `trans`) and restored with `pendingV`.
- **Cues**:
  - The village label gets a pulsing gold 🌾 badge when the upgrade is available, and "· farming" once owned.
  - The panel shows the requirement with progress (size ✓ and passengers n/40), or a highlighted "Farming upgrade available — Buy €60.000", or the owned summary.
  - Test button "+20 passengers (test)" alongside the growth buttons.
- Tested headless: Hoogveld locked → (grow to village and 45 passengers) available → bought: owned, 1 tractor, 3 herds active, growth 100 → 160.

## Done in 2.1.0
- **Levels** (`Life.LEVELS`: Hamlet 0, Village 100, Town 300 growth points). `v.gp` and `v.level` are saved in the snapshot as `villages` and restored via `Life.pendingV` once villages exist. Every village starts as a hamlet.
- **What a level reveals**:
  - Houses get `h.lvl` at generation from their placement order (first 35% → 0, next 35% → 1, rest → 2; houses on side lanes are at least 1). The church and inn are lvl 1.
  - Streets: main and cross street lvl 0, side lanes lvl 1 (`vRoads` entries carry `vil` and `lvl`).
  - Lamps: lvl by street and position. `Life.houseOn(h)` = not gone and lvl ≤ village level; it is used for house instances, walker spawning and garden paths. Roads and lamps are filtered by level in `rebuildRoads` and the static upload.
  - `Life.addGrowth(v, pts)` recomputes the level, re-uploads, sets `roadsDirty` and toasts. `Life.growNow(v)` jumps to the next level.
- **Village labels** (`VillageUI`): DOM pills (name in gold serif, level below) projected above each village within 3.2 km, faded with distance, hidden while building. A tap flies the camera there; a 480 ms hold opens `#vPanel` (houses, growth points with progress bar, +10, +50, Grow to next level now, a note about future growth sources).
- **Tap a train**: `pickTrain(sx, sy)` finds the nearest projected vehicle centre (34–80 px). Outside build/drive a single tap selects it and opens the Trains controls; in drive mode it switches the selected train.
- Tested headless: labels over villages; Dalwijk grown hamlet → town; the panel shows 23 houses, 300 points, fully grown.

## Done in 2.0.0
- **Build → Roads** mode (`#mRoads`, `Roads` module): tools Road (follow land) / Straight / Bus stop / Remove, plus Start over and Add bus. Hooked via `Build.tap` (`mode==='roads'`), `Build.ui`, `Build.hint`.
  - Road: tap points in a chain. Each leg uses `Life.routePath` (5 m grid, prefers existing roads 0.6, bridges, maxG 0.32), or a straight line in Straight mode or when routing fails. Taps snap to roads within 6 m.
  - Roads are stored in `Roads.list` {p, w 1.4, kind 1, player} and join `Life.roads` in `rebuildRoads` (decal, bridges, level crossings) and are stamped into `roadKill` (`Life.stampRoad`) so routing prefers them. Saved in the snapshot as `roads`.
  - Cost €45/m (money mode).
- **Gravel look**: the road distance-field texture's G channel now carries the surface kind (0 cobbles, 1 gravel). `FS_TERRAIN` gravel: pebble noise, two darker wheel ruts (0.42 m in from each edge), a grass crown, darker when wet; only half the snow-clearing of cobbled streets.
- **Bus stops**: tap a road; the stop goes 1.6 m beside the road edge, named after the nearest village (within 500 m), €8,000. `busStopMesh`: yellow-green "H" sign on a pole, glazed shelter with bench. People wait (accumulating 0.06·people per second near a village, max 24); up to 6 are shown standing.
- **Buses** (`Buses`, Add bus €35,000; needs 2+ stops):
  - Each bus visits all stops in order, routing along roads (routePath road 0.12, cached per start/stop) and driving 0.75 m right of centre: up to 11 m/s, braking 1.2 m/s² into the stop, 8 s dwell.
  - At each stop passengers whose destination it is get off and pay a fare (same `Money.fare` as trains: distance × speed factor) with "−" icons; then up to 30 aboard, destinations random other stops, "+" icons.
  - `busMesh`: 1950s two-tone (red lower, cream rounded roof), window band with pillars, chrome strip, front grille, headlights (glow at night), destination board. Kind 16, pitched on slopes.
  - The bus count is saved; buses are re-created at load.
- Tested headless (money on): a gravel road leg built; 2 stops (Dalwijk, Meerhaven); a bus over 300 s simulated earned €9,874 (+€3,052, +€3,591, +€1,077 …); screenshot shows the bus at a stop with waiting people and the income log.

## Done in 1.9.4
- **Forest on 8 km worlds**: `genVegetation` has a 170k tree cap (maxT) and scanned the grid row by row, so on 8 km the cap was hit partway down and the rest stayed bare. For W > 4096 the grid is now visited in a scrambled deterministic order (idx = kk·1000003 mod total), so a cap thins the forest evenly everywhere. Worlds ≤ 4 km keep the old order (same trees as before). The cap itself is unchanged (performance; user to decide).
- **Castle** (setting `castle`, chance 0.6, apply life):
  - Site: 900 random samples, keeping summits above 35% of max height whose 24 m ring varies < 14 m, scored by height plus drop to the 70 m ring.
  - The site is levelled at the summit (r 32), trees cleared (r 48), and a winding road (routePath, maxG 0.32) runs from 30 m out of the gate to the nearest village street end if that village is within 1.8 km.
  - `castleMesh`: rock plinth and terrace; ochre-brick gatehouse with crenellations, 2 corner towers and an arched gate; courtyard walls; white Palas (26 × 13 × 26 m) with 5 storeys of arched windows (some glowing at night, mat 9) and a steep slate roof with white gables; 4 corner turrets; Throne Hall bay with balcony and conical roof; tall slender stair tower (~44 m + spire); square tower with pyramid roof; bower wing with 2 turrets; gilded finials. +x is the gate side.
  - Static instance `castle`, drawn with the barns (casts shadows). `Life.castle` = {x, z, y, rot}.
- Tested headless: the castle sits on a summit and reads clearly as Neuschwanstein-like (white palace, slate spires, red gatehouse).

## Done in 1.9.3
- **Rain**: drop count max 6000 → 3200, streak alpha 0.35 → 0.17.
- **World size**: option 8192 "8 × 8 km (experimental)" added. Nothing else changed (user asked to be consulted first on performance). With mapRes 512 the height map cell becomes 16 m (coarser terrain); vegetation, rocks, fields and villages scale with area (generation time and memory roughly 4× the 4 km world); the road distance field (2048²) gives 4 m/texel and the lamp map (1024²) 8 m/texel; the mist map (128²) 64 m cells. Proposed (not done): scale mapRes to 1024 for 8 km, cap vegetation counts, raise road/lamp map sizes.
- **Street lights**: lamps were part of the 24 nearest dynamic lights (sorted by distance to the focus), so far ones were dark. All lanterns are now rasterised into `R.lampTex` (1024² RGBA16F, unit 27 `uLampMap`, rebuilt with the static instances), and `pools()` samples it × uMisc.x (night window factor). The 24 slots stay for stations and train headlights.
- **Destination dropdown**: `Drive.tick` rebuilt the train list every 30 frames, closing the native picker. It now skips while a select inside `#trainList` is focused, and blurs after a change. Styled as `select.dsel` (dark green, gold border, rounded, custom arrow).
- **Farmsteads** (generate, after fields; fields now carry `f.v`):
  - Placement: one per village with arable fields, on the village edge toward its fields' centroid (40 tries; flat within 8 m; clear of water, roads, track, houses and fields).
  - Ground levelled within 20 m, trees cleared within 30 m, a cobbled yard disc and a lane to the nearest street.
  - `v.farm` = {barn, shed, silo, yard, unload, rot}.
  - Meshes: `barnMesh` (brick, steep tiled gable roof, green doors with white X-braces, windows, loft door, weathervane), `shedMesh` (open machine shed, mono-pitch roof), `siloMesh` (2 corrugated silos with cones, ladders, red bucket elevator with spouts, a loading shed).
- **Farm work** (`updateFarm` rewritten):
  - Tractors live at the farm yard. They only take jobs when home (preferring their own village's fields), hitch the matching implement (`TOOL`: harvest → combine, plough → plough, sow → seed drill, harrow → disc harrow), drive out along roads, and drive home after each job, where the implement is unhitched.
  - Spring is now harrow (ploughed → harrowed), then sow.
  - Harvest: a grain cart (tractor + red tipping trailer) escorts the combine 5.5 m to the side. When the field is done it drives to the silos' unload point, tips for 8 s (dust), then goes home.
  - Straw bales are scattered on the stubble after harvest; the plough removes those within 7 m as it passes.
  - New meshes: harrow, trailer, bale.
- Tested headless (2 km): 6 farmsteads; screenshots show the barn, silos, shed and yard with a tractor, and the combine with its grain cart in an autumn field.

## Done in 1.9.2
- **Exterior check**: rendered the new loco and coaches headless. Smokebox front, lamps, copper-capped chimney, brass dome, green boiler, red buffer beam, coach windows with passengers inside and clerestory roof all show.
  - Test-harness gotchas: `Build.pc.slope` must be one of auto/level/up/up2/down/down2 (unknown values fall through to steep down, so the track went 60 m underground); call `carveTrack(T); R.updateTerrain(T)` after building in tests.
- **Terminus**: reversing at the buffers keeps `lastStation` (only reset when there is a single station), so trains no longer stop twice at the end station.
- **Docks**: trees and rocks within 11 m of the dock hut and 6 m of the shore end are removed (`T.veg` arrays, scale 0) when docks are placed, after the main tree clearing.
- **Country roads**: third routing attempt (700 m margin, coarse grid, steeper allowed) for the long way round a lake, then a straight lane for pairs under 500 m with no lake on the line. The test world's Hoogveld–Dennenburg (238 m) and Meerhaven–Steenrijk (552 m) still fail; likely separated by water. Logged as WRN.

## Done in 1.9.1
- **Money end-to-end test (headless)**: a 9-piece line beside a village, 2 stations, an auto train, money on, timetable off, people 2×, 450 s simulated.
- **Root cause of zero income**: nobody ever boarded. `Life.stInfo` is rebuilt every frame (new station-info objects), but boarding and the station queue compared `w.st===si` by object identity, which never matched after the first frame. So trains ran empty and no fares were paid. Both checks now compare station ids (`w.st.st.id===si.st.id`).
- **After the fix**: 11 passengers boarded at Oost, rode to West and paid €272. Walkers then went home, and the next walkers queued up.
- **Fare tuning**: the expected trip time now allows for boarding and dwell (d/15 + 75 s instead of d/18 + 25 s). Short hops were paying the minimum 0.25 speed factor.
- **Note**: at a terminus the train stops at the last station, reverses at the buffer and stops there again (`lastStation` resets on reversal). Harmless but costs time.

## Done in 1.9.0
- **Loco** (`locoMesh`, same wheel and rod anim hooks and positions):
  - Footplate with red valances; splashers with brass beading over the drivers; cab steps.
  - Boiler with 4 brass bands and handrails on stanchions.
  - Smokebox with saddle, door (ring, dart handle, hinges) and brass number plate.
  - Flared chimney with copper cap; dome on a base; Ramsbottom-style safety valves and whistle.
  - Sandboxes; cylinders with covers and valve chests.
  - Cab: front plate with 2 glazed spectacle windows (brass rims), open side cut-outs, double roof, wooden floor (mat 7), backhead with a glowing firehole (mat 4) and gauges.
  - Buffer beam with sprung buffers and hook; 3 oil lamps.
- **Tender**: axleboxes and leaf springs, red valance, flared coal rails, heaped coal, gold lining panels, water filler, toolboxes, handrails, rear buffers and lamp.
- **Coach** (`coachMesh`, body ±6.75 with balconies to ±7.2):
  - Walls built around 8 real window openings per side: outer panels in livery c1/c2, inner wood panelling, gold lining.
  - Panelled end walls with a glazed door; end balconies with railings.
  - Arched roof plus clerestory (livery) with small windows and lamp pots; cream ceiling.
  - Interior: 8 bays × 2 sides of facing upholstered benches (back to back between bays), luggage racks, 4 ceiling lamps (mat 4).
- **Glass**:
  - `FS_VEH` `uGlass`: 2 = opaque train pass (panes discarded), 1 = glass-only blended pass (alpha 0.14 + 0.75·Fresnel, a bit more at night; premultiplied), 0 = everything else (stations and signals keep opaque glass).
  - Panes don't cast shadows.
  - The silhouette passengers on glass are disabled (uOcc 0).
- **mat 7 (interiors)**: lit with 1.5·ambient + 0.22·sun + warm lamplight at night, so cabins aren't black inside the roof's shadow.
- **Seated passengers** (`seatedMesh`, instances `seated`): up to 64 seats per coach within 260 m of the camera. A seat is occupied when a hash is below occupancy = 0.15 + pax/(coaches·16), capped at 0.9. Placed with the full pose basis (X, Y, Z), facing their bench.
- **Coach seat camera**: CAMS gets "Coach seat". The eye is at bay 3, aisle side, 2.4 m above the rail, in the first coach, looking out of the window by default. Drag to look around (`lookYaw`/`lookPitch`, like the cab); near plane 0.12; bokeh reduced.
- Tested headless: compiles; the coach view shows the wood interior, red benches and a seated passenger. The exterior shot was blocked by trees in my test spot, so the new loco and coach exteriors are not visually verified.

## Done in 1.8.5
- **Auto trains didn't stop at stations — three causes, all fixed** (verified headless with a built line, 2 stations and an auto train: it brakes from 5.9 m/s and stands "At Alpha"):
  1. The stop point is the marker + min(18, L/2), but the scan drops the station event once the head passes the marker, so the target vanished mid-braking. Now `tr.stopTgt` {id, o, rem} keeps counting down the remaining distance after the event is gone. It's cleared on departure or 20 m past.
  2. Throttle had a +0.12 bias, so near the braking curve it kept pulling. Now throttle is 0 whenever braking for something and |v| > vt − 0.4.
  3. Since the slip fix (1.7.4) brakes are adhesion-limited, so the planned 0.6 m/s² wasn't reachable. `autoDrive` sets `tr.vCap = vt` (when braking for something) and physics clamps nv to the cap, shedding at most 1.4 m/s² — physics uses its own captured `v`, so the clamp has to sit in physics, not in autoDrive.
- **Boarding**:
  - Doors at both coach ends on the platform side (`door()` uses `pose.X`·±6.75 + platform normal·1.75).
  - Open doors are drawn on every coach of a train standing at a station (`dooropen` mesh: dark doorway, door leaf slid along the side, step), oriented to the platform side.
  - Walkers inside the platform rectangle (|along| < 22.5, 1.2 < lateral < 5.9) stand at rail + 0.85, so they're no longer clipped into the platform.
  - Alighting walkers stay hidden until they step out of the door.
  - `Icons`: a floating green "+" with an SVG person when someone boards, and an orange "−" when someone gets off (DOM, `Cam.toScreen`, 2.2 s, max 40).
- **Next (requested, not started)**: redesign the steam loco and coaches with real detail; period interior; transparent windows; an in-coach/cab camera to look around and out of the windows.

## Done in 1.8.4
- **White spots (bug from 1.7.0)**: the patchy-snow threshold used centred noise `(n−.5)`, so flat cells with low noise got snow even at snowCover 0. It now uses `sw = cover·1.45 − slope·.95 − n2·.45 − n1·.3`, which is never positive without snow.
- **Draw mode looping**: the pure-pursuit look-ahead was Rmin·0.4 (8 m at the new 20 m radius), so the target fell behind and the fit circled. Now the look-ahead is clamp(Rmin·1.2, 18, 50), trail points behind the current heading are skipped, and fitting stops if the signed turn over the last 70 steps (280 m) exceeds 1.6π.
- **Tunnel mounds**: the cut-and-cover earth over portals ended in a cliff at d = 20 m and was all-or-nothing above a 16 m rise (spikes next to the portals). It now blends into the hillside with a smoothstep over 5–8.5 → 20 m and caps the rise at 14 m. Not visually verified (my headless tunnel test didn't frame the portal).
- **Station pads** (`carveTrack`): around every station not on a bridge or in a tunnel, the ground within 28 m along the track and 17 m from it is levelled to rail − 0.18 m, blending over the outer 5–6 m and marked in the track mask.
- **Sternwheeler** (replaces the side-wheel steamer):
  - About 32 m long: low hull with a pointed bow, main deck with windows and promenade posts, saloon deck, pilot house, tall twin stacks with crowns forward (connected by a brace), flagpole, wheel frame arms aft.
  - The wheel (`sternwheelMesh`: 12 red buckets, spokes, 2 rims, axle) is a separate instance 16.6 m behind the boat at axle height 2.45 m, turning with speed (kind 21; `iB.y` = −(angle mod 30°)/1.45).
  - Smoke now comes from the stack tops.
- **Not done this round**: the remaining plan items (phone test pass, further tuning).

## Done in 1.8.3
- **Docks** (in `spawnCritters`, per steamer lake): every village gets a dock if a ray from it hits that lake within 600 m and the pier can reach water with 8 m of open clearance within 46 m.
  - Docks are skipped within 25 m of the village's beach.
  - Dock data: shore point, direction to the water, length, head `px`/`pz`, berth `bx`/`bz` (6 m back from the head, 5.8 m to the side).
  - Mesh (`R.buildDocks`, built in `rebuildRoads`, drawn with the bridges): plank deck on a pile frame, edge beams, railings with a gap at the berth side, bollards, 2 lantern posts, ticket hut with a red roof, door and sign.
  - 2–4 people wait on each dock in daytime outside winter (added to the people list via `beachStand`).
- **Steamer behaviour** (`updateSteamers`):
  - With 2+ docks it cycles dock to dock. `setCourse` uses `waterPath`, a lake-grid A* with a shore-proximity penalty and 3× Chaikin, ending at an approach point 32 m out, then 12 m out, then the berth. It decelerates (a = 0.12 m/s²), moors bow-to-shore for 25–45 s with a little idle smoke, then leaves.
  - With 1 dock it cruises the loop in summer; with 0 docks, the loop as before.
  - In winter (season or ice > 0.3) it heads to the nearest dock and is laid up there. If ice > 0.5 catches it under way, it snaps to the target berth.
- Tested headless: 3 docks on one lake; the steamer cycled 1 → 2 → 0 → 1 (15 min simulated, routing 234 ms total) and was laid up at a dock in winter. Screenshot: moored beside the dock with people waiting.
- Note: the dock-site tree clearing in `spawnCritters` uses a local `clearZones` (spawnCritters runs after tree clearing), so a tree can still stand by a dock hut.

## Done in 1.8.2
- **Lakes as areas**: in generate, a flood fill over lake cells (water and shore ≥ 0.99) gives `Life.lakes` [{cells, area, cx, cz, lvl}] and `Life.lakeComp` (cell → lake id).
- **Lakeside villages**: candidates with a big lake (> 6 ha) within 110 or 190 m get +1.4 score (other terms total ~2.7), so villages tend to sit on big lakes.
- **Steamers** (setting `steamers`, chance per lake, default 0.7):
  - Lakes over 15 ha whose centroid has 18 m clearance get a paddle steamer: black hull, white strake, saloon with windows, wheelhouse, 2 funnels with red bands, paddle boxes, mast and flag.
  - Route: a closed loop of 32 rays from the centroid at 72% of the clear radius, smoothed.
  - Cruises at 4.2 m/s, stops when frozen, smoke from both funnels. Kind 14 (bobbing).
- **Beaches** (setting `beaches`, chance per village, default 0.7):
  - At generation each village rays outward for the nearest gentle lake shore within 450 m (`v.beach` {x, z, nx, nz toward the water, lvl}); trees are cleared around it.
  - On fine summer days (9–19 h, no rain, cover < 0.75) beaches within 1100 m of the focus fill with 16–28·people items: towels plus sunbathers (`lierMesh`), some with parasols (mat 18 colours); swimmers (head and shoulders, kind 14) paddling around inside the lake; people standing at the waterline (added to the people list via the sled-walker list, with their sled hidden at y −999).
- **Sledding slopes**: `findHills(gen=true, fieldId)` now runs during generate (before tree clearing), skipping fields. Trees are cleared within 8 m of every run (`sledKill`), so the open slopes exist from the start. Test world: 16 runs (was 2).
- Tested headless: 4 big lakes, 1 steamer (looks good), 5 beaches, 16 sled runs. The new village layout left 2 country-road pairs without a route (logged).

## Done in 1.8.1
- Pieces mode can now build junctions. Before, it only built from free ends, and junctions could only be made in Draw/Route mode by ending a line on existing track.
- New "Junction" button (`#pBranch`) → `Build.branchMode()`. The next tap on track → `Build.branchAt(h)`, which uses `Net.nearestOnTrack` (it lives on Net, not Build).
  - Mid-segment: `pc.cur` is a state at that point heading along the track, with `sj:{sid,t}`, and the first curve defaults to gentle left. The split happens only at commit (`commit`: `p.start.sj` → `Net.split` → start at the new node), so a cancelled junction leaves nothing behind. `plan_` now carries `sj` in `p.start`.
  - Within 5 m of a node: a node with 2 links is used directly; a free end just builds from it; a node with 3 links refuses.
  - Tapping the junction again (within 6 m) flips the branch to the other direction.
  - The new leg leaves tangentially, so `Net.junction` classifies it as a branch, and auto-routing (1.7.3) handles it.
- Tested in the page: laid 4 straight pieces, put a junction mid-way, placed a curve, and got one valid junction with 6 segments. Not tested by hand on the phone.

## Done in 1.8.0
- **Bridge styles**: bridge spans store their style as `sp[3]` (0 stone arch, 1 brick arch, 2 steel truss, 3 steel plate girder, 4 concrete beam, 5 timber trestle), taken from the setting `bridgeType` when the span is classified. `Net.split` keeps the style. Old saves (no `sp[3]`) are stone. The build bar has a style cycler button `#bBridgeType` next to Bridges.
- **Geometry** in `buildTrackMesh`:
  - Helpers: `prism` (capped), `box` (track-aligned), `bar` (member between two points), `along` (member following the track), and `pier` (battered, capped, with a plinth, skipped over track below).
  - Stone/brick: the arch walls as before, plus a voussoir ring band, parapet coping, string course, and capped piers. This fixes the open pier tops. Brick uses closer, near-semicircular arches.
  - Truss: Warren through truss, 5.4 m high, with verticals, top chords, portal and top lateral bracing, a steel floor, on capped stone piers with concrete caps. Spans 24–48 m.
  - Plate girder: two I-girders (web plus flanges, depth = span/12) with stiffeners both sides, cross-frames, walkways, handrails and posts, on stone piers.
  - Concrete: trapezoid box girder (depth = span/16), concrete parapets, single columns with hammerhead caps.
  - Trestle: bents every 4.5 m (4 battered posts, cap, girts every 5.5 m with X-bracing), stringers and guard timbers.
- **New FS_TRACK materials**: 6 brick, 7 painted steel (with rust streaks), 8 concrete (formwork bands, staining), 9 weathered timber.
- **Money** (`Money`, setting `money` default off, `fareRate`):
  - Start €200k; loan up to €500k in €50k steps (Borrow/Repay buttons in the HUD); 5% yearly interest charged per game day.
  - `check()` runs every second. New track costs €110/m plus a bridge style cost per metre (tunnel €1400/m); stations €25k; trains €40k + €15k per vehicle. Removed track refunds 50% of what was paid; split pieces carry their paid cost across. Costs that overrun cash borrow automatically.
  - `Build.commit` is refused when cash ≤ 0 and the loan is maxed.
  - Fares are paid at alighting: €350·fareRate per passenger-km (Manhattan distance between boarding and alighting stations), times a speed factor clamp(1.6 − 0.6·T/expected, 0.25, 1.3), where expected = d/18 m/s + 25 s.
  - Passengers record their origin and time at boarding (`pax.fx`, `fz`, `t0`).
  - Floating "+€" labels rise above stations (`Cam.toScreen`), with a HUD log of the last entries. Saved in the snapshot as `money`.
- Tested headless: all six styles rendered over a lake (screenshots looked right; brick colour toned down afterwards). Money unit-tested: building, station, refund, fare and HUD all correct. Not tested in real play (no track to drive on headless).

## Done in 1.7.4 (round 3d, part)
- **Audit**: scanned every line for code hidden behind a `//` comment. Found one from an earlier session in the train physics: `adh=...;// grip uses real gravity...tr.slip=...` had disabled wheel slip entirely. Fixed. No others found by the scan (pattern: `//` followed by `;`/`{` plus a statement on the same line).
- **Automatic resolution** (setting `autoRes`: Off / 25 / 30 / 45 / 55 fps, default 30):
  - `AutoRes.tick` runs from the main loop using the last 45 frame times.
  - Below 90% of the target it multiplies `AutoRes.dyn` by 0.88, at most every 3 s, down to an absolute scale of 0.4.
  - Above 130% of the target it raises dyn by 6% (slower), up to 1. It never goes above the chosen `renderScale`.
  - `resizeCanvas` multiplies by dyn. The first big drop shows a toast mentioning heat.
  - Not testable headless (no frames between evaluates).
- **Steep pieces**: Pieces mode already has Up/Down (buildGrade) and steep Up/Down (`up2`/`down2` = maxGrade, now up to 100% = 45°). Nothing to add.
- **Still open in 3d**: nicer railway bridges (waiting for feedback on what looks wrong), and testing on the phone.

## Done in 1.7.3 (junction routing)
- Junctions (3-way nodes with switches, `Net.junction`) already existed: they are built by ending a line on existing track and choosing "junction" after lifting the finger, and switches are flipped by tapping. Trains used to just follow the switch state.
- **Destinations**:
  - `Net.destOf(tr)` returns the programmed `tr.destId`, or else rotation: `tr.autoDest` starts at station (train index + 1) and moves to the next station in `Track.stations` order on arrival (`Net.arrived`, called when the train departs).
  - A programmed destination clears once it's reached, and rotation continues.
  - The UI train list has a destination select ("Next station in turn" or a station; shown when there are 2+ stations) and shows "→ Dest" in the row.
- **Routing**:
  - `Net.distMap(station)` runs a reverse Dijkstra over states (segment, direction). Successors: straight on, both branches when facing a junction from the trunk, trunk only when trailing, reverse at buffer stops for +30 m. Cached per station and cleared on `Net.changed()`.
  - `Net.autoRoute(tr)` (start of `autoDrive`) walks up to 300 m ahead along the current switch states. At each facing junction it throws the points toward the branch with the smaller distance, unless another train is within 14 m of the points. `scan` and `next` then simply follow the switches.
- New setting `stopAll` (default on): off means auto trains only stop at their destination.
- Unit-tested in the page with a synthetic Y layout: the points set to the right branch for each destination; distances correct, including reversal at buffers; rotation advances. Not tested with a running train or the UI select on the phone.

## Done in 1.7.2 (round 3c, part)
- **Falling leaves** (setting `leaves`, Life tab):
  - In autumn (`seasonW[2]` > 0.3), trees within ±80 m of the point between the camera and focus shed leaves at 60·leaves·autumn·(0.5 + wind·1.2) per second.
  - Trees are found through a 40 m grid hash of `T.veg.trees`, cached in `Life.treeGrid` and reset on generate.
  - Particle type 4: falls at 0.85 m/s with reduced wind drift, lifetime = drop height/0.8 so leaves expire as they land.
  - VS spins and flutters the quad (squashed by a sine) with a sideways sway; FS draws a pointed leaf with a midrib in orange, yellow, red or brown, opaque, without the smoke noise path.
- **Music ducking** (setting `musicDuck`): music drops to 50% while any train whistles, by up to 35% when a moving loco is within ~15–75 m of the camera, and to 85% at night.
- **Not done (needs phone feedback)**: look and weather tuning. Leaves were confirmed spawning in tree crowns headless, but not seen on screen (no frames run between evaluates).

## Done in 1.7.1 (round 3b)
- **Timetable** (settings `timetable` default on, `ttInterval` default 30 game minutes):
  - At each station stop the auto-driver picks the next departure slot on the game clock (`P.timeOfDay`), at or after now + dwell. Trains are staggered by list index·7 min.
  - It waits until that time, with a 240 s real-time cap in case the clock is paused.
  - Status reads "At X · departs HH:MM · boarding".
  - A train never leaves while walkers are still boarding it (25 s grace beyond dwell).
  - `tr.depT` resets on departure.
- **Passenger check fix**: a walker reaching the door after their train has left now goes back to waiting on the platform. Before, they were added to the departed train's `pax`.
- **Window passengers** (`FS_VEH`, `uOcc` = occupancy, seed): VS passes object-space `vL`. On coach glass (mat 2, outer faces) every window has two seats, each occupied when a hash of window/side/train/seat is below the occupancy. Silhouettes (head plus shoulders SDF) are drawn dark by day and cut out of the warm night glow. Occupancy = 0.12 + pax/(coaches·12), capped at 0.95. Locos and other meshes get 0.
- Tested headless: compiles, no errors. Not tested with a running train (the default world has no track): boards, departure times, silhouettes.

## Done in 1.7.0 (round 3a, winter)
- **Snow cover** (`Weather.snowCover`, setting `snowRate`):
  - Builds while it snows at dt/360·snow·rate (about 6 min of heavy snow to full).
  - Stays through winter, losing only dt/3000 (8× faster in rain).
  - Melts outside winter over roughly 90–210 s scaled by warmth. The old auto-fill to 0.75 in winter is gone.
- **Terrain coverage**: patchy build-up, threshold = cover·1.3 − slope − two noise octaves, so flats and noisy patches go white first.
- **Roads**: `Life.roadClear` (0–1) drops while it snows and rises while villagers shovel. The terrain shader clears road interiors (with a per-area noise threshold, so some streets are done before others) and piles banks along the road edges. `uRoadClear` is a per-program uniform set in `drawTerrain`.
- **Shovellers** (`Life.shovel`): about 3 per village near the camera while roads aren't clear (fewer at night). They walk the village streets at 0.45 m/s, offset ±1 m, throwing snow puffs to the side every 1.3 s. Mesh: person with shovel and beanie, kind 13.
- **Track**: 256² `R.tcTex` (R8, unit 26 `uTrackClear`). Every train vehicle stamps 1 (3×3 cells) and snowfall decays it. `FS_TRACK` hides the snow on sleepers and rails where it's cleared. Locos faster than 3 m/s on snowy track throw plough spray sideways from 6 m ahead (particle type 3).
- Tested headless: snowy village with the square and streets shovelled, banks at the edges. Plough spray and track clearing not seen with a running train.

## Done in 1.6.3 (round 2 loose ends)
- **Router options**: `maxG` (grade limit, default 0.3) and `road` (cost on road cells; off-road cells cost 1.8, and rivers under roads count as bridges).
- **Country roads**: a failed route is retried with a coarser, wider, steeper search (maxG 0.55), and any remaining failure is logged as WRN. Test world: 8 links built, 1 pair (467 m, likely across a lake) still fails. If that pair was an MST edge, the network is split there.
- **Tractors** route to their field with `routePath(...,{road:0.3})`, so they keep to the roads, and follow the waypoints (`t.path`, `t.pi`) at 7·speed m/s. On bridge decks they use `deckY`.
- **Level crossings** (`findCrossings`):
  - Every non-pending track segment is sampled every 2 m into a 16 m hash; each road segment is intersected with it.
  - Crossings are skipped where the track is more than 2.2 m above or below the ground (bridges, cuttings, tunnels), and merged within 10 m.
  - Each crossing gets a plank deck (`R.buildCrossings`, 8 alternating planks, top at track y + 0.1, drawn with the bridges in `drawVehicles`), two St Andrew's crosses (`xbuckMesh`) on opposite corners, and two red-white booms (`boomMesh`, kind 21: angle = `iB.y`·1.45 rad about the pivot).
  - Booms lower when any train's first or last vehicle is within 110 m (`updateCrossings`, 0.8 rad/s).
  - `R.rebuildTrackMesh` sets `Life.xingDirty`, which re-runs only the crossing search, not the road distance field.
- Tested headless with an injected test segment: the deck, crosses and raised booms render. Not tested with real built track or a passing train.

## Done in 1.6.2 (round 2c)
- **New settings**: `fieldSize` (scales field rectangles, apply life), `tractors` per village (0–3, default 1, live), `farmSpeed` (default 2×).
- **Field work**: field texel row 1 `.w` = base·1000 + result·100 + progress·99, where 0 = seasonal crop look (`cropCol`), 1 = ploughed furrows, 2 = straw stubble, 3 = harrowed. `GLSL_FIELDWORK.fieldCol` shows the result on the worked part: 4 m lanes driven boustrophedon along the field's local z, matching `Life.fieldPose`. `R.setFieldWork(k, f)` writes one texel.
- **Season jobs** (`farmSchedule`, triggered when `P.season` changes; on first load the progress is randomised):
  - Spring: ploughed → sow (shows the crop when done).
  - Summer: no overrides.
  - Autumn: grain/maize/flowers get harvest (stubble), which chains into plough; potatoes and tulips get plough only.
  - Winter: everything shows as ploughed.
  - Pastures are never worked.
- **Tractors** (`updateFarm`): per village they take the nearest open job, drive straight to the field (8·speed m/s), then work at 2.2–2.8·speed m/s (lane turns are included in the pace). The field texel updates every 0.25 s. Exhaust puffs come from the stack, and dust trails behind in dry weather (not when sowing).
- **Meshes** (kind 16, pitched on slopes; mat 20 = paint red/green/blue/orange): tractor (big rear wheels, cab, exhaust, headlight), combine (header, cab, unloading pipe), plough (4 bodies), seed drill (hopper, coulters). The combine replaces the tractor during harvest; the plough or drill trails 2.6 m behind.
- Tested headless (autumn): a tractor ploughing with the furrows appearing lane by lane behind it.
- Not tested: spring sowing and harvest views, or many tractors driving straight across villages and lakes on their way to fields (they don't follow roads yet).

## Done in 1.6.1 (round 2b)
- New settings: `pastures` (share of farm fields, 0.35), `fences` (check); `sheep` relabelled "Herd size". CROPS weight for crop 2 = pastures, the other crops are scaled.
- **Herds** (`spawnCritters`, `updateHerds`):
  - One herd per pasture: sheep 40%, cows 35%, horses 25%, sized by area. 35% of horses get a foal (scale 0.62) that follows its mother.
  - The herd centre drifts to a new random spot every 25–100 s.
  - States: graze (head down, nibbling forward), walk back within the herd radius (sheep 6, cows 11, horses 18 m), rest (cows, head up), trot (horses, 12% of moves, 3.2 m/s across the pasture).
  - Soft separation within a herd; targets clamped inside the field (`inFieldClamp`).
- **Shader**: kinds 17 cow, 18 horse, 19 sheep. Head and neck beyond a pivot rotate down by `iB.y` (graze 0–1, with a chewing bob); legs below the leg-top swing with `iB.w` (gait rate: walk 5–7, trot 11). mat 19 = horse coats (bay, dark, grey, cream).
- **New meshes**: horseMesh (mane, tail, ears, hooves), cowMesh2 (neck, head, horns, udder, tail, spots), sheepMesh rebuilt with a separate head.
- **Fences**: post-and-rail 3 m panels (`fenceMesh`, kind 16 pitched on slopes, scaled to fit each side) 1.5 m outside every pasture, with a gate gap on the side nearest the village. Built in `spawnCritters` (`Life.fences`) and uploaded with the static instances.
- Country links: candidate distance raised to 2600 m with a coarser grid for long roads, but the test world still routes only 5 links (not investigated).
- Tested headless: 10 herds, 64 animals, 620 fence panels; horses of different coats with a foal inside a fence.

## Done in 1.6.0 (round 2a)
- **Country roads**, setting `countryRoads` (None / Tree / Tree + scenic loops, default 2, apply life):
  - Kruskal MST over village pairs closer than 1900 m, plus up to 2 extra edges under 1100 m.
  - Each road joins the closest pair of street ends.
  - Routed with `Life.routePath`: binary-heap A* on a 7 m grid with up to 280² cells. Costs: slope (blocked above 0.3), a two-octave value-noise wander, lakes and houses blocked, river cells crossable at cost 14 when bridges are allowed. The result gets 3× Chaikin.
  - Stored in `vRoads` (link: true, half-width 1.55) and `Life.links`.
- **roadKill mask** (all village roads plus links): trees and rocks are cleared along roads, and fields keep off roads (`onRoad` in `fieldFree`).
- **Station roads** now use the same router (5 m grid, bridges allowed).
- **Bridges** (`Life.findBridges`, rebuilt in `rebuildRoads`):
  - Wet runs along any road (2–70 m) get a bridge with a hump that clears the water level by 0.9 m.
  - Road × mountain-stream crossings (segment intersection via a 16 m hash) get a short bridge (4.5–10 m, small hump).
  - Mesh (`R.buildBridges`, vmesh/vq, drawn in `drawVehicles` in both passes): cobble-coloured deck, underside, parapets 0.75 m high, and piers at the ends (plus mid-span for bridges longer than 14 m).
  - `Life.deckY` lifts walkers onto bridge decks.
- Tested headless (2 km): 5 links, 38 bridges, a winding road with trees cleared, and a humped stone bridge over a gorge river.
- Not checked: why only 5 of the expected 7+ links routed (likely >1900 m apart, or A* failing on the grid cap), bridges where roads meet tracks (no level-crossing visuals yet), and fps impact (minor).

## Done in 1.5.1
- **Churches**: in 1.5.0 the driveway code ended in a `//` comment that swallowed `if(vt===3)church=true;if(vt===4)inn=true;` on the same line, giving 12–17 churches per village. This is the third time this trap happened: never append a `//` comment to an inserted one-liner.
- **Village plan**:
  - Square (brink) of radius 10 + 5·√size at the centre (`v.plaza`, a disc in `vRoads`).
  - The church and inn are placed first on two opposite diagonal corners, facing the square, each with a path to it.
  - No houses within the square.
  - Zoned house types: townhouses near the square, cottages in the middle, farmhouses and tiny cottages at the edges.
  - 4 lamps at the square corners.
  - Street `stampLine` (sandy halo) removed.
- **Roads as a decal**: `R.buildRoads` now rasterises a 2048² RG16F signed distance-to-road-edge field (segments plus discs, min-union, water removed); uRoad is texture unit 25. `FS_TERRAIN` paints the setts (Voronoi with fuller jitter, mortar, kerb band, distance fade to an average colour, wet darkening) where the distance is below 0, with fwidth-antialiased edges. No more clipping, and joins merge cleanly. The ribbon mesh (`FS_ROAD` / `drawRoads`) is no longer drawn.
- **SSR banding** (visible on mirror ice from above): rays heading back toward the camera fade out (dot with view forward); thickness tightened to st·0.9 + 0.6.
- Tested headless: no errors; one church on the square with the inn opposite; roads lie flat in the ground.

## Done in 1.5.0
- **Defaults**: renderScale 0.54, vegBudget 40000 (the plant budget), villageSize 2.5, villages 8.
- **Smoke fix**: the noise used to be sampled at (centre + N·size)/size, so it swam through the puff as the puff moved and grew. It is now in puff-local coordinates (N·0.47 + seed) with a slow churn. Fade-in is over 18% of life and fade-out over the last 50%.
- **Objects**:
  - kind 15 = skaters: side-to-side roll with stride (`iB.w` = stride rate rad/s, `iB.y` = wobble amount) and a push-out of the outer foot.
  - kind 16 = sleds: pitch from `iB.y` (0.5 = level).
  - mat 18 = beanie/helmet colours.
  - New meshes: skater (beanie with pompom, boots, blades), hockeyP (helmet and stick), speedskater (crouched, arms on back, long blades), hgoal, puck, sled, sledder.
  - Cute lantern street light replaces the old lamp; its light sits at y + 3.3.
- **Skating** (`Life.sk`, `spawnGroup` / `nextSeg` / `updateSkaters`):
  - Group leaders follow chained cubic Béziers (`bzP` / `bzD`); each new segment is checked on ice via `iceOK` with a margin. Followers sample the leader's history (one point per 0.25 m).
  - Group types: loner, couple (side by side), family (adult(s) plus 1–2 wobbly kids at 0.62–0.72 scale), train (4–8 in a line), speed (3–6 Elfstedentocht-style pack, 7.5–10 m/s, long 60–150 m curves, at most 2 packs).
  - Target ~170·people·daylight skaters.
  - Hockey (`startHockey` / `updateHockey`): 34×17 m rink fully on ice, 2 teams of 5 (goalie plus 4); the nearest player chases the puck, others hold support spots, shots and passes, goals reset the puck. Two goals and a puck are drawn.
- **Sledding** (winter with snowCover > 0.25): `findHills` traces steepest descent from points 40–240 m around each village (≥ 30 m long, mean grade 12–75%, away from houses and water, open slopes only via a tree grid hash), up to 2 per village. Sledders ride down with gravity, friction and drag, wait at the bottom, walk back up 2.6 m to the side pulling the sled (walker plus `sleds` instance), wait at the top, then repeat.
- **Roads**:
  - Villages larger than R 60 get 2 extra side lanes.
  - `Life.vRoads` = streets (half-width 1.75 main/cross, 1.4 lanes) plus a garden path from every house front to its street (0.6).
  - Lamps every 18 m along streets.
  - `R.buildRoads` drapes ribbons on Hr +0.06 in 2 m steps and drops pieces over water. `FS_ROAD` = Voronoi setts (0.3 m) with mortar, kerb stones, fading to an average colour in the distance, darker when wet, partly snow-covered. Drawn opaque right after the terrain with polygon offset (−1, −3).
- **Station roads**: in `updateStations`, every station with a village gets `routeRoad` (A* on a 5 m grid, slope-weighted, max grade 0.4, around water and houses, 3× Chaikin) from 3 m outside the platform to the nearest street point. Cached per station position in `Life.stRoads`; removed stations drop their road. Lamps every 22 m. Walkers going to the station follow it (`w.wp`), and alighting passengers walk it to the village.
- `Life.roadsDirty` → `rebuildRoads()`, also set from `R.chunkBounds` (terrain edits, houses removed for track).
- Tested headless (2 km): no errors; 8 villages, 251 houses, 283 road pieces; hockey game plus groups on the ice; sledders on an open slope.
- Not tested: a station road being built live, skater groups at speed (the Bézier look), many churches per village at size 2.5 (existing house-variant logic), and phone fps with more villages and lamps.

## Done in 1.4.1
- **Track limits**: `maxGrade` up to 100% (= 45°), default 100. `buildGrade` up to 100%. `minRadius` min and default 20 m (code floors are already 20). `curveRadius` min 20.
- **Toy physics**: new `toyGrades` (default on) caps the grade force at ±5%, so trains climb any grade.
- **Smoke** (`FS_PART`, setting `smokeQuality`: Simple / Billowy):
  - Billowy puffs = sphere thickness eroded by the cloud noise volume (`uNoise3`), churning with age.
  - Lit using the noise gradient toward the sun plus self-shading; steam glows when backlit (HG); lightning flashes.
  - VS now passes the puff centre, size, seed and age.
- **Chase/cab smoke**: `uSmk.x` = `chaseSmoke` (default 0.2) when `Cam.mode` is not free or follow; near-lens fade starts at 6 m (2.5 m otherwise).
- **Ice**: cracks and snow patches removed. Light-blue body; 3-octave bump map rippling the reflections; Fresnel raised (0.25 base) so the ice reads as a mirror; sharp glint.
- **Ice skaters** (`Life.updateSkaters`): when `Weather.ice` > 0.5, up to 170·people·daylight skaters on up to 14 "rinks" (10–30 m circles fully on lake, within 800 m of the focus). They mostly circle anticlockwise, drift in and out, and wobble. They are drawn with the person mesh, appended to the `people` instance list. Rinks beyond 1300 m are dropped; the lake cell list is cached in `Life.lakeIdx`.
- Tested headless: no errors; skaters gather on mirror ice with the mountain reflected; billowy smoke column.
- Not tested: a train on a 45° grade (vehicle pitch, bridges/tunnels), chase-view smoke while driving, skater animation (they use the walk cycle).

## Done in 1.4.0 (lake water model from ocean-tank-5, reflections, ice, river foam fix)
- **`Waves` module** (GPU Tessendorf FFT, ported from the ocean tank): fetch-limited JONSWAP wind sea plus Hasselmann spreading.
  - U = 1 + 11·E.wind; fetch = `lakeFetch` km (default 15, so storms look sea-like).
  - Peak wavelength is capped at L0/2.
  - The spectrum is rebuilt when U changes by more than 3% or the settings change.
  - Cascades L = 96/24/6 m (64²) or 96/17/3 m (128²).
  - Passes per frame: time, then 2·log2N Stockham passes (MRT), then per-cascade assemble into RGBA16F 2D arrays with mips (disp: Dx, h, Dz, foam with persistence; deriv: hx, hz, Dxx, Dzz).
  - Texture units: uWDisp 19, uWDeriv 21, FFT temporaries 22–24 (20 is SCRATCH_TU). Uniform `uDepth` clashed with TU, hence `uWDep`.
- **Render copy A**: lakes = 1. `R.hasLake` is set in `waterRender`.
- **Coarse water VS**: lake vertices displaced by `waveD` low-passed to the mesh spacing (`uSpc`); river sine waves are switched off on lakes.
- **Near-camera lake patch** (`VS_LAKE` + same `FS_WATER`, `R.lakePatch`): Medium 140 m square, 112² grid; High 220 m, 192². It sits in front of the camera, snapped to 2× spacing, and only draws when the camera is less than 2.2·R above the focus. Its LOD blends to the coarse LOD over the outer 30% so the seam matches. FS discard via `uLakeP` (w = 1 for the patch pass): the patch draws only lake inside the square, the coarse mesh skips lake inside it.
- **`FS_WATER`**:
  - Lake slopes come from the FFT derivatives, sampled at the undisplaced position.
  - Whitecaps from Jacobian foam; light through wave crests.
  - Beckmann sun glint widened by the normal variation within each pixel; it applies to all water.
  - **SSR**: marches the reflected ray against the depth copy and takes colour from `R.sceneTex` (full-res copy blitted right after the depth copy). Steps 12/20/32 with growth 1.6/1.3/1.2.
- **Ice**: `iceF` = ice, but fast water stays partly open (look replaced in 1.4.1). Lake waves are zeroed under ice.
- **River foam fix**: the flow map now uses a per-cycle random offset, cycles staggered by low-frequency noise, sin² cross-fade, a slower ~5.9 s cycle, and contrast-preserving noise blending. Previously the same pattern restarted every 4 s.
- New settings (Water tab): `waterModel` (Simple / Low / Medium / High, default Medium), `reflQuality` (Sky only / Mirror low / medium / high, default medium), `lakeWaves`, `lakeFetch`, `lakeChop`, `lakeFoam`.
- Tested headless (2 km): no GL errors; wavy lake with mountain reflections; storm makes it rough and dark; winter gives frozen ice with snow patches.
- Not verified: the 3D waves on the near patch up close, the patch seam, phone fps (FFT plus SSR plus patch), and whether SSR is strong enough on calm days.
- Headless note: frames don't advance between `evaluate` calls; set `Cam.setMode('free')` and the weather state directly (`Weather.cur={...WX.storm}`, `Weather.ice`).

## Done in 1.3.1 (round 1 step 4b: streams + run-off)
- **Generation** (end of `genWater`): D8 paths for cells with catchment ≥ thr·0.035 that are not river or lake. Cells ≥ thr·0.14/`streams` are streams; the rest are run-off rills. `T.streams` = Float32Array per path of (x, z, area km²), with area > 0 for stream and < 0 for run-off. Paths end where they join water or another path. Capped at 60k points. 2 km test: 205 paths, about 4.3k points.
- **Mesh** `R.buildStreams` (called from `R.chunkBounds`, so it rebuilds on world upload and terrain edits): one Chaikin pass, ribbons draped on `Hr` +0.07 m and built 1.8× (stream) or 1.4× (run-off) wider so the shader can widen them. Vertex = pos3 + (u, s metres, half-width, kind + slope·0.99). Sources taper over 15 m.
- **`FS_STREAM`**: streams always flow; they widen 70% and turn brown with `Weather.flood`. Run-off shows only when wet (max(rain·1.2, flood)) × `runoff`. Flow streaks scroll faster on steep parts, with whitewater there; sky reflection, glint, ice in winter.
- Drawn right after water with polygon offset (−1, −4), no depth write.
- New settings (Water tab): `streams` (density, needs a water regen) and `runoff` (live).
- Tested headless (2 km): no errors; a thin blue stream winds through a village to the lake; with flood=1 it widens and browns, and extra rills appear.
- Watch: streams cross villages and roads (round 2 roads may need culverts or bridges); cost of about 50k indices; dry streams may look too faint from far away.

## Done in 1.3.0 (round 1 step 4a: waterfalls + swelling rivers)
- **Render-copy A channel re-encoded** in `R.waterRender`: dry 0 | bank 0.1+0.3·w | lake 1 | river 2 | fall 3. w = flood weight (rivers 1, lakes 0, banks inherit from neighbours). Lakes are told apart by `T.shore`≥0.99. Terrain shader still uses step(.5,a) and VS waves min(pr,1), so both still work.
- **Flood state** `Weather.flood` (`updateFlood`): target = rain·0.8·floodAmt; rises over ~2 min, falls over ~7 min.
- **VS_WATER**: surface rises by w·flood·`floodRise` (bank cells rise too, so rivers widen onto low banks); passes `vFall`.
- **FS_WATER**: faster flow and more rapids foam with flood; brown water (`rm` = river mask from flow slope); churned streaks; plunge-pool foam rings from the 8 nearest `T.emitters` (`uFallP[8]`, strength 0.6+str·1.2); white streaky curtain on fall cells (`vFall` × steepness).
- **Spray**: `Weather.updateSpray` spawns particle type 3 (soft white, rises slowly, alpha .32) at emitters within 700 m, more in flood, max 14 per frame.
- New settings (Water tab): `floodAmt` (Rain swells rivers), `floodRise` (0.9 m), `fallSpray`.
- Tested headless (2 km world): no errors; flood=1 makes the river wider, brown and churned; cascade shows white streaks.
- Notes: the 1 km default seed has only 2 emitters (both at the board edge), and gen's emitter strength is small (0.2–0.5), hence the 0.6 floor. Spray is barely visible headless; tune on the phone.

## Done in 1.2.2 (round 1 step 3, mist banks)
- **Mist map** (`Weather.initMistMap` / `updateMistMap`): 128² RGBA16F over the board, unit 17 (`uMistMap`).
  - R = bank density, G = floor (ground or water surface, 4× blurred), B = thickness.
  - The 90 mist spots splat drifting gaussian blobs into it every 0.2 s; bank strength = E.mist·1.5·(0.45..1).
  - `mm.lo`/`mm.hi` bound the march slab; `mm.on` is false when there is no mist.
- **`FS_VMIST`**: raymarch at 1/3 or 1/2 res into `R.mTex`.
  - Density = exp(−height above floor / thickness), capped at 3 thicknesses, eroded by `uNoise3` and drifting with `uWind`.
  - Rays that hit the ground march only from the local mist top down to the hit (keeps thin layers sharp from high views); other rays march uniformly, capped at 3 km.
  - Lit once per pixel at the density-weighted point: sun with HG phase, `shadowAt`, `cloudSh`, ambient, lamp `pools`, flash; distance haze.
- **`FS_MCOMP`**: depth-aware (bilateral) 4-tap upsample, so objects in front of mist get no halo.
- New setting `mistQuality` (Sky): Old cards / Low (1/3, 10 steps) / Medium (1/2, 16, default) / High (1/2, 24). Cards are only drawn on Old cards.
- `fogc` ground-mist layer from 1.2.1 is kept underneath.
- Tested headless at 1 km: no errors; banks over lakes and valley floors from above, soft wisps hugging slopes from low down.
- Not tested on the phone: cost, and whether mist climbs slopes too far at bank edges (could flatten the top toward an inversion level).

## Done in 1.2.1 (round 1 step 3, partly)
- `R.waterRender` now also stores a flow field (downhill slope of the water surface, m/m) in the G and B channels of the render copy only.
- `FS_WATER` rewritten:
  - Smooth analytic ripple normals (5 wave trains) instead of facets.
  - Flow-map advection along rivers (two cross-faded phases).
  - Rain speckle.
  - Beer-law depth colour.
  - Muddy run-off in rivers during rain.
  - Fresnel sky reflection that includes the cloud deck from the cloud map.
  - Sharp sun glint.
  - Foam at the shoreline and in rapids; rivers run faster and foam more in rain.
- Ground mist in `fogc`: an exponential layer below `mistTop`, integrated along the view ray and broken into drifting banks by noise. It works from any camera angle.
- Tested headless: rapids looked over-foamed, so foam was toned down afterwards (untested after the tweak).
- Mist banks: done in 1.2.2. Still to do: tuning on the phone.

## Done in 1.2.0
- **Defaults** taken from the user's state: seed 39536, world 4096, saturation 1, grade golden.
- **Viaduct piers:** `trackUnder()` skips a pier when another track (committed or preview) passes within reach of it and below its top. This is checked on every mesh rebuild, so it works whichever track was built first.
- **Volumetric clouds**
  - The low-poly clouds are no longer drawn (old code is still in Weather but unused).
  - `Clouds` module: a 96² cloud map over the board plus a 30% margin. It is advected by a wind field that slides around terrain above the cloud layer (`flow()`, obstacle deflection plus smoothing).
  - Clouds grow on windward slopes (`up` > 0) and dissolve in the lee. New weather blows in from the upwind edge, with a slow pull toward the coverage target.
  - Map channels: R = density, G = towering, B = terrain height. Clouds lift partly over high ground.
  - 64³ Perlin-Worley 3D noise (RG8, unit 15) in `Clouds.initGL`.
  - `FS_VCLOUD` raymarches at 1/3 or 1/2 resolution. It uses 14, 24 or 40 steps plus 3 light samples, two-lobe HG phase, scene-depth clipping (mountains cut through clouds), haze and lightning glow. `FS_CCOMP` composites the result.
  - Clouds cast shadows on the ground via `cloudSh()` in `lightS`.
  - UBO gained `uBolt`, `uCld`, `uCld2` (U length 336).
  - New settings `cloudQuality` (Off/Low/Medium/High) and `cloudSpeed`.
- **Lightning**
  - A fractal main channel (7 subdivisions) with 3–7 branches, starting at the cloud base.
  - 1–5 return strokes (`boltI`).
  - In-cloud sheet flashes (`sheet()`).
  - Drawn as camera-facing ribbons: a violet glow plus a white core, additive.
  - Clouds light up around the strike; thunder is delayed by distance.
- **Two-finger gestures**
  - Applied once per frame in `Input.tick` from both fingers' latest positions. Before, each finger's event was applied separately, which made the angle and centre zigzag.
  - The gesture locks to *tilt* (both fingers moving vertically) or *twist* (rotate plus pinch) after 14 px. Tilting no longer yaws.
  - In Build mode the two-finger pan is kept.
- **Touch log:** Settings > Export touch log. It records raw pointer events, per-frame G2 gesture deltas with the mode, and per-frame camera state while touching (`TouchLog`).

## Not verified
- The synthetic two-finger test in headless Chrome timed out (4 km generation in SwiftShader is slow), so the gesture fix is untested. Test it on the phone and send a touch log.
- The clouds render headless (screenshot OK) but their cost on the phone is unknown. If the frame rate drops, use Cloud quality Low.
- The bolt is not yet seen headless.

## Done in 1.1.0-c
- **4 km crash.** The 4096 m world has about 163k plants, all sent to the GPU in both the main pass and the shadow pass. This caused GPU resets on the Mali (log 1228: context lost 0.7 s after generating 4096 m, at 2.2M tris).
  - New setting `vegBudget` (Quality tab, default 70k).
  - Far-ring plants are thinned per chunk with distance (`fr`), and survivors are scaled up slightly to keep coverage.
  - One global factor `g` keeps the total inside the budget.
  - Plants are shuffled per chunk in `uploadVeg` so a thinned prefix is an even sample.
  - List buffers are reused (`R.vegScr`) to avoid GC hitches.
  - Headless 4 km overview: 0.8M tris, about 13k plants.
- **Sluggish camera.**
  - Ground-follow lag went from dt·2.5 to dt·14, using a wider 9-point average. The camera used to keep drifting for about 0.5 s after you let go.
  - The canvas backing store is now rendered at `renderScale` and the browser upscales it. Before, the final pass and compositing ran at the full 1079×1935, which queued more GPU work and added input lag.
- **Light finished.**
  - Sky shader: the horizon haze band equals the land haze, and the Mie sun glow fades under overcast.
  - New setting `nightBright` (Look tab) caps auto-exposure at night.
  - Shadow cascades were not built on purpose. The focus-centred map already gives 0.14 to 0.6 m texels where you look, and a second shadow pass would cost about 30% GPU on a phone that was already resetting. It can become an optional setting later.

## Log 20261030-1203 analysis
The boot failed after 35 ms: `getContext('webgl2')` returned null.
- Most likely cause: after a GPU reset, Chrome blocks WebGL for the page. The 1.1.0-a auto-reload after 1.8 s walked straight into that block.
- The trigger of the reset is unknown, because the log starts at the failed boot.
- Fixed in 1.1.0-b as described above.
- If it happens again, ask for the log from the session *before* the reset; `trein.recover` holds its last 60 lines and replays them on the next good boot.

## Watch for
- Headless only: one frame showed a dark box (possibly a NaN through bloom); not reproducible. If it shows on the phone, look for NaN in `lightS` / `shadowAt`.
- Performance of PCSS on the phone. It costs 6 taps on lit pixels and 14 in shadow (was 8).
- 32F depth with MSAA 4×: check whether it relates to the GPU resets.

## Still to do
**Round 1**
- Step 3 (water, clouds and mist):
  - Water: reflections, normal-mapped ripples, flow along rivers, refraction and foam.
  - Ground fog and mist banks: done (1.2.2). Soft smoke still to do.
- Step 4 (hydrology):
  - 4a waterfalls + swelling rivers: done (1.3.0).
  - 4b streams + run-off: done (1.3.1). Round 1 is complete apart from phone tuning.

**Round 2: land and life**
- Continuous village roads.
- No houses on main roads.
- Winding scenic roads between nearby villages: done (1.6.0).
- Pastures with cows and horses that walk and graze: done (1.6.1).
- Fields with tractors through the seasons: done (1.6.2).
- Spawn settings for fields and pastures.

**Round 3: winter and finishing**
- Snow that builds up slowly, trains that push it aside, and villagers who clear the roads.
- Open items from handoff 1:
  - schedules
  - auto resolution / heat check
  - falling leaves
  - people in coach windows
  - an end-to-end passenger check
  - steep pieces in Pieces mode
  - bridge visuals
  - music balance
  - look and weather tuning
- A full audit and a final quality pass.
