# Trein plan (9 Nov 2026, after 4.1.0)

One step per "continue". Every item has a number (step.item) so the user can say "skip 3.4" or "extra attention to 8.3".
Every step ends the same way: regression suites, before/after pictures compared with `tools/imgdiff.py`, check pictures sent,
a short list of what to look at on the phone, version bump, handoff, commit and push. Questions for a step are asked at its start.

## What the phone measurement showed (Pixel 9a, Mali-G715, Medium, town view)
- Frame 41–51 ms (20–24 fps). **Buildings ("kit") cost 20–26 ms: half the frame.** Terrain 6–10, shadows 4–6, trains 3–6, trees 3–5.
- Skipping things outside the view: −19 to −21 %. Near things first: a further −3 to −6 %. Shadows every other frame: about −5 %.
  Sharper upscaling: no measurable cost.
- Buildings already have 3 detail levels (switching at 110 m and 350 m, fixed) and people already have a far version. So missing LODs
  are not the cause; the cost is most likely in shading the buildings' pixels (heavy procedural shader, pixels shaded that end up
  hidden, no back-face culling). Step 2 measures this on the phone before changing anything.
- Negative numbers in the table (clouds −5 ms) are measurement noise; step 1 makes the table repeat and average.

## Why the water kept going wrong
The banding, the stripy foam and the dotted edges show on the phone and not on the test machine. Likely cause (found while writing
this plan): the shaders ask for high precision for numbers but not for texture reads (`sampler2D` defaults to low precision in
WebGL2). Desktop GPUs ignore that; the Mali GPU does not. The water reads the scene depth and the terrain heights from textures, so on
the phone those arrive rounded: depth in steps of metres (bands), flickering per screen row (stripes). Step 1 fixes and proves this.
The square in the lake is a different thing: the edge of the finer wave mesh near the camera (step 8.4).

---

## Step 1 — DONE in 4.2.0 (waiting for the user's phone check of the lake spots)
## Step 1 — Phone-only water bug, and the proven switches on by default  (effort: medium)
- 1.1 High precision for every texture read in every shader (`precision highp sampler2D` and the other sampler types).
- 1.2 A "low precision" test mode in my tools (depth copy and height textures stored at 16 bits) so phone-only rounding shows up on
      the test machine. Used from now on in every water test.
- 1.3 Experimental → debug views to screenshot on the phone: water depth, shore distance, foam mask, flow direction.
- 1.4 On by default: near things first. Sharper upscaling on by default at render scales below 1 (question 1a). Shadows every other
      frame stays an option.
- 1.5 "Measure on this phone": three runs per line, median shown, spread shown; a line per building detail level.
- Check on the phone: the three lake/river spots from the screenshots (bands, stripes, dotted edges).
- Question 1a: sharper upscaling on by default?

## Step 2 — DONE in 4.3.0 (see the handoff: the building shader had no discard; far sides of closed blocks are skipped instead; 3.2 done early)
## Step 2 — Buildings: half the frame on the phone  (effort: high)
- 2.1 Split the building shader: the solid version without `discard` (with it, the phone GPU cannot throw away hidden pixels early);
      glass stays a separate blended pass.
- 2.2 Back-face culling for buildings. Parts that are really one-sided (fences, awnings, flags, leaves) are marked and drawn
      double-sided in their own batch. Proven identical with the image comparison.
- 2.3 Buildings sorted near to far per type, and a depth-only first pass for buildings as an experimental switch (the expensive
      shader then runs once per visible pixel).
- 2.4 Shadow pass: buildings beyond the shadow distance and fully inside other buildings' shadows are not drawn into the shadow map.
- 2.5 Each of 2.1–2.3 as its own line in "Measure on this phone", so the phone decides what stays on.
- Check on the phone: the benchmark table in the same town view as before.

> Inserted before step 3 (the user's request, done in 4.4.0): the **benchmark world** (Experimental → Enter benchmark world): a fixed, repeatable, playable world with notes and fixed-view measurement. From now on, every step is checked in it: `Measure all places` before and after.

## Step 3 — DONE in 4.5.0 (middle level, size-on-screen switching, thinner roof tiles; see the handoff)
## Step 3 — Building detail levels (LOD)  (effort: high)
- 3.1 Audit table of every building and piece: triangles per level, switch distances. Old non-kit models (castles 13k, sawmill shed,
      workshop, mines, barns, windmills, bakery, restaurant, stalls, bus stops) get proper lower levels where they lack them.
- 3.2 Quality → "Building detail distance" (a slider that scales the switch distances; Low/Medium/High presets set it).
- 3.3 Switch by size on screen instead of plain distance (a grand station and a culvert do not switch at the same distance), with a
      margin so levels do not flip back and forth while the camera moves.
- 3.4 The grand station close up is 331k triangles: an in-between level (about 100k) and removal of detail that can never be seen
      (inside faces, undersides on the ground).
- 3.5 Shader detail by distance: fine brick/stone/roof texture detail fades out where it is smaller than a pixel (cheaper and less
      shimmer). Checked with the image comparison at the switch distances so the change is not visible as a pop.
- 3.6 A picture sheet of every building at each level at its switch distance, side by side.
- Question 3a: is a slight visible switch acceptable on Low, as long as Medium and High show none?

## Step 4 — People, animals and vehicles LOD  (effort: medium)
- 4.1 Three levels for people: near (full figure, moving limbs), middle (about 40 % of the triangles, same walk), far (the existing
      simple figure). Same for horses, cows, sheep.
- 4.2 Quality → "People detail distance".
- 4.3 Far level skips the limb animation maths in the vertex shader.
- 4.4 Buses, lorries, tractors, boats, and far trains: a low level each.
- 4.5 A crowd budget on Low (the farthest people are left out first).

## Step 5 — Station placement with a 3D ghost  (effort: high)
- 5.1 The real station model, translucent green (red where it cannot stand), instead of the outline.
- 5.2 Drag it over the ground. Near a track it snaps onto the track; away from track it stands free with its own piece of track
      (question 5a). A rotate handle when it stands free; ⇅ for the other side when on a track.
- 5.3 ✓ places it for good, ✕ cancels. Nothing in the world changes before ✓ (the ground is levelled then).
- 5.4 A lighter outline shows the room it will need when it grows: the grand station, the second track and its platforms.
- 5.5 The reason is shown when it is red (too close to the village centre, on water, too steep, on a building or a road).
- Question 5a: away from a track, should it stand free with its own piece of track (as tapping the ground does now), or only ever
  sit on existing track?

## Step 6 — Stations and villages never run into each other  (effort: high)
- 6.1 A station (with its future grand size, second track, forecourt and road) cannot be placed inside the village core at its full
      size: market square, green, church, the innermost streets.
- 6.2 The village reserves the station's full future footprint: no houses, stalls or market inside it, ever.
- 6.3 Existing saves where they already overlap (the market through the station): the stalls and market move out; the station stays.
- 6.4 Tests in both orders (station first then the village grows; grown village then the station), both sides of the line, with the
      second track.

## Step 7 — A footbridge that makes sense  (effort: high)
- 7.1 Rule: railings run unbroken along every edge, with an opening exactly where a stair meets the deck and where it meets the
      platform. No blocked stair, no open edge.
- 7.2 One track: stairs down to the building platform and to the platform across; the deck's end toward a future second track is
      closed by a railing.
- 7.3 Second track built: that railing opens, the deck continues to the outer platform, stairs to the island and outer platforms.
- 7.4 An automatic check that every walking route over the bridge keeps clear of all railings and passes through the openings.
- 7.5 The floating timber deck beside the platform ramp in the screenshot: find out what it is and fix it.
- 7.6 Pictures of each variant from four sides, and in the game with people walking.

## Step 8 — Lakes built on the ocean tank code  (effort: xhigh)
- 8.1 Compare ocean-tank_2 with what the game ported earlier; list every difference; port the tank's water as it is: colour from
      absorption and scattering by depth, exact Fresnel, roughness from wave statistics (no sparkle noise), foam from the simulation
      with a foam texture, rain rings, light through wave crests.
- 8.2 The scene behind the water stored with its distance (as the tank does), so depth through the water no longer comes from the
      depth buffer.
- 8.3 Shores (the tank has walls, the game has beaches): waves die down with depth, a wet band on the sand, foam where waves break
      in the shallows, all from the terrain height (smooth, high precision), nothing from noise thresholds.
- 8.4 One continuous water mesh with detail rings around the camera that blend into each other; the visible square is gone.
- 8.5 Quality → Lake water Low/Medium/High: wave grid size, number of wave scales, mesh density, reflections, caustics.
- 8.6 Ice, snow, night, rain, storms, steamboats, swimmers, ducks, docks keep working (checklist).
- 8.7 Test sheet: 3 zoom levels × 4 times of day × clear/rain × the low-precision mode; phone screenshots of the same three spots.

## Step 9 — Rivers and streams, part 1: where the water is  (effort: xhigh)
How it is built now: lakes and big rivers are 8 m grid cells with a water level; small streams are separate ribbons laid on the
ground with their own shader. They meet badly because they are two unrelated systems with square ends.
New build: one river network, one mesh family, one shader (shared with the lakes).
- 9.1 The network: every river and stream as a centre line with, at each point, discharge → width, depth and bank height; a tree with
      confluences and mouths. Built from the existing flow simulation, so rivers stay where they are.
- 9.2 Smooth centre lines (bends no tighter than the width allows), real meanders kept.
- 9.3 A channel in the land: bed below the banks with a cross-section, using the fine terrain patches made for the culvert ditches,
      near the camera. The water lies in the land, not on top of it.
- 9.4 The surface: a ribbon per reach with a level that only ever goes downhill smoothly, width following the discharge, vertex
      density by bend and distance.
- 9.5 Confluences: the tributary's level meets the main river's level, its mesh is stitched into the main river's edge (no overlap,
      no square end), and its flow turns into the main flow.
- 9.6 Mouths: the last stretch widens, its level equals the lake's, and it hands over to the lake surface with the same shading.
- 9.7 Brooks and rain rills use the same system at small widths; culverts, bridges, the sawmill flume and tailrace, docks move over.
- Pictures: every confluence and mouth type from above and at eye level.

## Step 10 — Rivers and streams, part 2: how the water looks and moves  (effort: xhigh)
- 10.1 The lake optics with depth from the channel: clear shallows over a pebble bed, darker in the deep outer bends.
- 10.2 Flow: faster in the middle and on the outside of bends, ripples carried by a two-phase flow map (no sliding-texture look).
- 10.3 Foam only where water makes it: rapids by slope, behind rocks, the shear line below a confluence, under waterfalls. Banks get
       a soft wet edge, not a foam line.
- 10.4 Waterfalls and rapids joined to the same surface (lip, curtain, plunge pool, mist).
- 10.5 Quality → Rivers Low/Medium/High: mesh density, channel detail, ripple layers, reflections.
- 10.6 Budget: at most 3 ms on the phone at Medium, measured with "Measure on this phone".
- 10.7 Test sheet as 8.7, plus flood and drought.

## Step 11 — Loading and building without waits  (effort: high)
- 11.1 Laying track or placing a station recalculates only the changed part of the land (now the whole 8 km map each time).
- 11.2 World generation in the background with a progress bar that keeps moving (erosion is a third of the loading time).
- 11.3 The generated world is stored on the phone, so opening the game again with the same world takes seconds.
- 11.4 Village growth and road rebuilds spread over several frames where they still hitch (measured with `tools/cpuprof.js`).

## Step 12 — Smaller things seen in the screenshots  (effort: medium)
- 12.1 The autumn ground near the station looks like a checkerboard of 8 m squares: make it organic (question 12a: or is it meant?).
- 12.2 Blocky mist pixels along edges of objects (mist is drawn at a third of the resolution): edge-aware upscaling.
- 12.3 Lamp posts, stalls and awnings clipping platforms and ramps: placement rules.
- 12.4 Anything the user reports while testing steps 1–11.

## Step 13 — Wrap-up  (effort: medium)
- 13.1 Phone benchmark before/after table for the whole plan.
- 13.2 Quality presets retuned for the Pixel 9a from the measurements.
- 13.3 Handoff, cleanup of test switches that did not earn their place.

## Order and dependencies
1 first (it may already fix most water complaints and it sharpens the measuring). 2–4 are the village frame rate. 5–7 are stations.
8 before 9–10 (rivers reuse the lake shader). 11 can move earlier if waiting bothers more than frame rate.
