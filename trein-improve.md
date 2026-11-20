# Trein — what to improve (analysis, 20 Nov 2026, v4.38.0)

Pick steps by number. Size: S = an hour or two, M = a session, L = several sessions.

## What I measured
- **New 8 km Mountain-islands world, from nothing: 25.6 s until playable** (desktop CPU in my test container; a phone is probably slower).
  - Building the house models: 3.1 s
  - Erosion: 7.9 s
  - Villages: 5.0 s
  - Terrain: 2.7 s
  - Water and maps: 2.6 s
  - Trees: 0.8 s
  - Uploading the world: 0.5 s
  - Roads and bridges: 0.7 s
- **All of that runs on the main thread**, so the screen freezes in steps. No Web Worker is used for generating.
- **The game is 1.84 MB of unminified script** in 16 separate files sharing one global scope.
  - Biggest files: life.js 215 kB, render.js 134 kB, core.js 123 kB, train.js 120 kB.
- **Phone-sized screen (412 px wide)**:
  - The bottom bar runs off the screen; the Save button is cut off.
  - The debug stats line is on by default and runs under the top-right buttons.
  - A new Mountain-islands world opens looking at empty sea (the centre of the map).
- **Messages and settings**:
  - 187 different toast messages are the main way the game explains things; each disappears after a few seconds.
  - 337 settings in 15 tabs.
  - 13 browser `confirm()` pop-ups.
- **Earlier phone benchmark**: the shadow pass was the biggest single cost, about half the frame.
- **Bugs seen in this session's screenshots**:
  - a dashed white seam on the sea along the shore;
  - a pale jagged "wall" on the sea horizon;
  - a brook drawn over an airstrip;
  - a test fishing boat ran aground leaving harbour in a straight line;
  - the boat's view from the helm looks into the solid mast and wheelhouse.

## A. Loading and performance
1. **Generate the world in a Web Worker** (L). Erosion, water, villages and trees run off the main thread, with a real progress bar. No more frozen screen. Expected: the same total time, but it never freezes; on a phone with several cores, a bit faster.
2. **Faster erosion** (M). *Done in 4.41 the simple way: rain on land only; erosion 7.2 → 2.8 s on 8 km Mountain islands.* Run it on the GPU (a shader that runs many droplets in parallel), or at half resolution plus a detail pass. Erosion is the biggest single cost (7.9 of 20 s); target under 2 s.
3. **Build the house models once** (M). *Done in 4.40: built in a worker, Continue 5.6 → 3.4 s. Measured in 4.39: this is now the biggest part of Continue (2.8 of 5.5 s). All types and levels share one 135 MB buffer, so the fix is building them in a worker or the detailed level on demand, not a cache.* The 3.1 s spent at every start goes; they are stored in the browser cache, built only when a building type is first needed, and with fewer triangles at the highest detail (a cottage is 85k triangles).
4. **Instant Continue** (S–M). *Measured in 4.39 (8 km world, served from localhost so the world file works): first start 23.7 s, Continue 5.5 s (house models 2.8 s, reading the 33 MB world file 0.6 s, upload 0.6 s, the rest start-up). The stored world is used as it should be; what is left is step 3.* Check that Continue always loads the stored world file (OPFS) and cache instead of generating again, measure it on your phone, and show the world while the rest (roads, bridges, lighthouses) fills in.
5. **Cheaper shadows** (M). A static shadow map for the land and buildings, rebuilt only when the sun has moved; only moving things are drawn into a small extra map each frame. This targets the largest phone cost.
6. **Fewer draw calls** (M). Merge each village's static houses, fences and lamps into one mesh per chunk; draw distant trees as flat impostors. Bridges are 175k triangles for 47 bridges; give them a far detail level.
7. **Bundle and minify** (S). *Measured in 4.39 and dropped: minifying saves only 18 % after compression (625 → 512 kB), not 3×, and loading time is generation, not download. Not worth a build step to keep in sync. (It found a duplicate `tunnel` icon, removed.)* A small build step (esbuild) makes one minified file, about 3× smaller: faster download and start, and the service worker caches one file.
8. **Phone frame-rate pass** (M). Profile on your Pixel with the built-in benchmark. Cap the resolution sensibly, skip off-screen work (labels, gulls, wildlife, particles far away), and spread the per-frame jobs (village growth, road rebuilds) over frames so nothing stutters.

## B. Models and mesh problems
9. **Mesh-glitch sweep** (M). Fix:
   - the shore seam on the sea;
   - the horizon wall;
   - brooks over airstrips;
   - houses floating or sunk on slopes;
   - stations, quays and helipads on sloping ground.

   I'd add an automatic check that flies the camera round every kind of object and saves pictures to compare.
10. **People** (M). Today people are boxes everywhere: walkers, crew, fishermen, rescue victims. One better person model with joints (arms, legs, head, clothing colours) and simple walk, sit, wave and work animations, used everywhere.
11. **Fishing boats** (M). A real wheelhouse with windows and a door, a net drum, gantry, masts with lights, crew on deck, and nets that come up full; the helm view from inside the wheelhouse.
12. **Harbours** (M). A proper quay with steps and bollards, a fish auction hall, a crane, stacked crates and lamps, so harbours look like places and not a slab.
13. **Ground detail** (M). Steep slopes show as large flat beige areas. Add rock strata and scree, cliff faces with depth, grass that thins with slope, and beaches with wet sand.
14. **Airfield and helipad** (S–M). A hangar for the helicopter, a fuel truck, wind sock and lights at the pad, and a rescue base building with crew.
15. **One art style** (S to decide, L to apply). Today very detailed houses (85k triangles) stand next to box people and blocky boats. Choose a style (detailed toy diorama, or clean low-poly), write it down, and bring the weakest models up to it in order: people, boats, animals, cars, trees.
16. **Vehicles at sea and in the air** (M). Boats that rise and fall over waves with a real wake and spray, a rotor wash ring on water and grass under the helicopter, and wheel tracks on the grass strip.

## C. Interface
17. **Fix the phone layout** (S). The bottom bar fits 412 px, the stats line is off by default, nothing overlaps the top-right buttons, and new worlds start at the biggest village.
18. **One panel style** (M). Today each feature has its own panel: airfield, missions, harbour, store, bus, plane choice. They become one component: the same header, close and back behaviour and place on screen, opened from one "Places" or "Tasks" button, and in-game confirm dialogs instead of the browser's.
19. **Messages that stay** (M). A small task panel showing the current goal (for example "Winch the hiker up: 320 m"), a message log you can open, and toasts only for short news.
20. **Simpler settings** (M). The 337 settings become: Quality (Low, Medium, High, Ultra, plus Auto from the phone's speed), a handful of common options, and an "Advanced" drawer for the rest.
21. **One control scheme** (M). Plane, helicopter, bus and boat each have their own stick and buttons. Make them share one layout: left side speed, right stick steering, actions top-left. Controller support for bus, lorry and boat too.
22. **Icons** (S). Replace emoji, which look different on every phone, with one SVG icon set.
23. **A first-time tutorial** (M). Five short steps: build track, place a station, buy a train, watch a village grow, take a mission. You can skip it.

## D. Gameplay that hangs together
24. **One economy that links everything** (L). Villages need goods and produce goods:
    - farms make grain, sawmills timber, mines ore, harbours fish;
    - you carry the goods by train, lorry, boat or plane;
    - delivered goods make villages grow and unlock buildings.

    Fishing and missions then feed the same loop (fish to the towns by train, supplies to cut-off villages).
25. **Goals and progress per world** (M). Milestones with rewards and unlocks, for example:
    - connect two villages by rail;
    - build an airfield;
    - link two islands;
    - every village at level 3.

    It gives a reason to use each vehicle and a sense of finishing a map.
26. **Between the islands** (L). With Mountain islands as the only style, the sea needs crossings: train ferries, long sea bridges and causeways, and cargo ships on routes between harbours (set up like bus routes).
27. **Balance pass** (S–M). Today's money:

    | What | Money |
    |---|---|
    | A fishing trip | about €4,800 |
    | A rescue | €25,000–50,000 |
    | An airstrip costs | €60,000 |
    | The helicopter costs | €600,000 |
    | You start with | €200,000 |

    Set costs and income so each activity is worth doing and the order of unlocks makes sense.
28. **Events and weather that matter** (M). Storms ground planes and keep boats in harbour but bring more rescue calls; fog over the sea; night missions with the searchlight; shoals that move with the seasons.
29. **Save everything** (S). Missions in progress, the boats and their catch, and the winch load are lost when you load a save today.
30. **Sound** (M). Its own sounds for the helicopter (rotor slap, turbine whine, winch motor), the boat engine, gulls, harbour noise, the ambulance siren and the radio voice for a mission call.

## E. Keeping it solid
31. **Automatic smoke test in the repo** (S). The test scripts I write each time become a committed script:
    - load a world;
    - fly, drive, sail;
    - do one mission;
    - save and load;
    - take pictures and fail on errors.

    I run it before every push.
32. **Lint** (S). A checker that catches the kind of bug where `window.Plane` was always empty (undefined names, typos), run with the smoke test.
33. **Split the largest files** (M). life.js (215 kB) and render.js into smaller parts by subject, so changes are safer and faster to make. This can be combined with step 7.

## Suggested order
- **Quick wins first:** 17, 29, 31, 32, 7, 4.
- **Then the biggest felt improvements:** 1, 2, 3 (loading); 5, 8 (frame rate); 9 (glitches); 18, 19 (interface).
- **Then the depth:** 24, 25, 26 (gameplay); 10, 11, 15 (models).
