'use strict';
// ===== core.js
// ===================================================================
// CORE — debug log, parameter registry (every slider), panel UI,
// save / load / JSON export / import. Step 1 plumbing that later steps plug into.
// ===================================================================
const VERSION='4.16.0 (Opel Blitz lorry, double-decker, tap a bus or lorry to follow, re-route or drive it)';
const SAVE_VERSION=2;
const $=s=>document.querySelector(s);
const IS_TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0;

// ---------- debug log
const Log=(()=>{
  const lines=[],MAX=4000,t0=performance.now();
  function add(lv,msg){const t=((performance.now()-t0)/1000).toFixed(3);const l=`[${t}] ${lv} ${msg}`;lines.push(l);if(lines.length>MAX)lines.splice(0,lines.length-MAX);
    (lv==='ERR'?console.error:lv==='WRN'?console.warn:console.log)(l);}
  return{info:m=>add('INF',m),warn:m=>add('WRN',m),err:m=>add('ERR',m),lines,text:()=>lines.join('\n')};
})();
window.addEventListener('error',e=>Log.err(`onerror: ${e.message} @ line ${e.lineno}:${e.colno}`));
window.addEventListener('unhandledrejection',e=>Log.err('unhandled rejection: '+(e.reason&&e.reason.stack||e.reason)));

// ---------- parameters
// apply: live = read every frame | world = needs Generate | water/veg = auto-rebuild that stage
//        tex = regenerate ground textures | shadow = rebuild shadow maps | trees = rebuild tree models
const P={},PDEF={},PORDER=[];
const TABS=[['world','World'],['erosion','Erosion'],['water','Water'],['look','Look'],['sky','Sky'],['life','Life'],['trees','Trees'],['track','Track'],['trains','Trains'],['sound','Sound'],['quality','Quality'],['exp','Experimental'],['file','File']];
const TAB_HINT={world:'Changes here rebuild the whole landscape when you press Generate.',erosion:'Erosion runs when you press Generate. Turn it off to compare with raw noise.',
  water:'Lake and river shape rebuild automatically (a second or two). Look settings are live.',trees:'Placement sliders replant automatically. Distances are live.',
  track:'Lay track with the Build button. Bed width and slopes reshape existing track straight away.',look:'How the diorama looks. Everything here is live.',
  sky:'Time, seasons and weather. Weather on Auto changes by itself; seasons can roll on with the days.',life:'Villages, windmills, animals and people. Changes here rebuild the villages straight away.',
  sound:'Music follows the season, the time of day and the weather when set to Follows the world.',quality:'Presets set several sliders at once; touching any slider switches to Custom.'};
function def(id,o){o.id=id;o.kind=o.kind||'range';PDEF[id]=o;PORDER.push(id);P[id]=o.def;}
// --- World
def('seed',{tab:'world',label:'Seed',min:1,max:99999,step:1,def:39536,apply:'world'});
def('worldSize',{tab:'world',label:'World size',kind:'select',options:[[1024,'1 × 1 km'],[2048,'2 × 2 km'],[3072,'3 × 3 km'],[4096,'4 × 4 km'],[8192,'8 × 8 km'],[16384,'16 × 16 km (heavy)']],def:8192,apply:'world'});
def('mapStyle',{tab:'world',label:'Map style',kind:'select',options:[['land','Land'],['island','Island in the ocean'],['islands','Many islands']],def:'land',apply:'world'});
def('landShare',{tab:'world',label:'Island size (share of land)',min:0.15,max:0.85,step:0.01,def:0.5,apply:'world'});
def('mapRes',{tab:'world',label:'Height map detail',kind:'select',options:[[0,'Auto (8 m cells, 1024 at 8 km)'],[256,'256 (fast)'],[512,'512'],[1024,'1024 (slow)'],[2048,'2048 (very slow)']],def:0,apply:'world'});
def('maxHeight',{tab:'world',label:'Mountain height',min:80,max:1200,step:10,def:480,unit:' m',apply:'world'});
def('featureScale',{tab:'world',label:'Feature size',min:250,max:3000,step:10,def:1100,unit:' m',apply:'world'});
def('octaves',{tab:'world',label:'Detail layers',min:3,max:9,step:1,def:7,apply:'world'});
def('roughness',{tab:'world',label:'Roughness',min:0.3,max:0.65,step:0.01,def:0.48,apply:'world'});
def('lacunarity',{tab:'world',label:'Detail spacing',min:1.7,max:2.4,step:0.01,def:2.0,apply:'world'});
def('warp',{tab:'world',label:'Domain warp',min:0,max:1.5,step:0.01,def:0.55,apply:'world'});
def('mountains',{tab:'world',label:'Mountain amount',min:0,max:1,step:0.01,def:0.55,apply:'world'});
def('ridgeSharp',{tab:'world',label:'Ridge sharpness',min:0.6,max:3,step:0.05,def:1.1,apply:'world'});
def('valleyFlat',{tab:'world',label:'Valley flatness',min:1,max:3,step:0.05,def:1.35,apply:'world'});
def('strata',{tab:'world',label:'Rock ledges',min:0,max:1,step:0.01,def:0.35,apply:'world'});
def('strataStep',{tab:'world',label:'Ledge height',min:4,max:60,step:1,def:18,unit:' m',apply:'world'});
def('edgeMountains',{tab:'world',label:'Edge mountains',min:0,max:1,step:0.01,def:0.35,apply:'world'});
def('bigMtns',{tab:'world',label:'Big mountains',min:0,max:3,step:1,def:0,apply:'world'});
def('bigMtnHeight',{tab:'world',label:'Big mountain height',min:200,max:3000,step:50,def:1200,unit:' m',apply:'world'});
def('bigMtnBase',{tab:'world',label:'Big mountain base width',min:400,max:6000,step:50,def:2400,unit:' m',apply:'world'});
def('bigMtnLong',{tab:'world',label:'Big mountain shape (round peak → long ridge)',min:0,max:1,step:0.01,def:0.2,apply:'world'});
for(const k of [1,2,3]){def('bigMtnX'+k,{tab:'world',label:`Mountain ${k}: east-west (0 = from the seed)`,min:0,max:100,step:1,def:0,unit:' %',apply:'world'});
  def('bigMtnZ'+k,{tab:'world',label:`Mountain ${k}: north-south (0 = from the seed)`,min:0,max:100,step:1,def:0,unit:' %',apply:'world'});
  def('bigMtnDir'+k,{tab:'world',label:`Mountain ${k}: ridge direction (0 = from the seed)`,min:0,max:180,step:1,def:0,unit:'°',apply:'world'});}
def('tilt',{tab:'world',label:'Regional tilt',min:0,max:1.5,step:0.01,def:0.5,apply:'world'});
def('erosionOn',{tab:'erosion',label:'Erosion',kind:'check',def:1,apply:'world'});
def('dropletsPerCell',{tab:'erosion',label:'Raindrops per cell',min:0,max:3,step:0.05,def:1.2,apply:'world'});
def('erodeRate',{tab:'erosion',label:'Erosion speed',min:0,max:1,step:0.01,def:0.4,apply:'world'});
def('depositRate',{tab:'erosion',label:'Deposition speed',min:0,max:1,step:0.01,def:0.3,apply:'world'});
def('capacity',{tab:'erosion',label:'Sediment capacity',min:1,max:12,step:0.1,def:4,apply:'world'});
def('evaporation',{tab:'erosion',label:'Evaporation',min:0.002,max:0.06,step:0.001,def:0.015,apply:'world'});
def('inertia',{tab:'erosion',label:'Droplet inertia',min:0,max:0.4,step:0.01,def:0.05,apply:'world'});
def('gravity',{tab:'erosion',label:'Gravity',min:1,max:12,step:0.1,def:4,apply:'world'});
def('erosionRadius',{tab:'erosion',label:'Erosion brush',min:1,max:5,step:1,def:3,unit:' cells',apply:'world'});
def('maxLife',{tab:'erosion',label:'Droplet lifetime',min:10,max:90,step:1,def:45,unit:' steps',apply:'world'});
def('thermalIter',{tab:'erosion',label:'Rockfall passes',min:0,max:60,step:1,def:15,apply:'world'});
def('talus',{tab:'erosion',label:'Rockfall angle',min:20,max:55,step:1,def:34,unit:'°',apply:'world'});
// --- Water
def('waterOn',{tab:'water',label:'Show water',kind:'check',def:1,apply:'live'});
def('lakeFill',{tab:'water',label:'Lake fill',min:0.1,max:1,step:0.01,def:0.92,apply:'water'});
def('maxLakeDepth',{tab:'water',label:'Max lake depth',min:2,max:60,step:1,def:14,unit:' m',apply:'water'});
def('minLakeArea',{tab:'water',label:'Min lake area',min:200,max:30000,step:100,def:2500,unit:' m²',apply:'water'});
def('minLakeDepth',{tab:'water',label:'Min lake depth',min:0.2,max:6,step:0.1,def:0.8,unit:' m',apply:'water'});
def('riverThreshold',{tab:'water',label:'River catchment',min:0.02,max:1.5,step:0.01,def:0.12,unit:' km²',apply:'water'});
def('riverWidth',{tab:'water',label:'River width',min:0.4,max:3,step:0.05,def:1,unit:'×',apply:'water'});
def('riverDepth',{tab:'water',label:'River depth',min:0.3,max:4,step:0.1,def:1.4,unit:' m',apply:'water'});
def('floodAmt',{tab:'water',label:'Rain swells rivers',min:0,max:2,step:0.05,def:1,apply:'live'});
def('floodRise',{tab:'water',label:'Flood rise',min:0,max:3,step:0.1,def:0.9,unit:' m',apply:'live'});
def('fallSpray',{tab:'water',label:'Waterfall spray',min:0,max:2,step:0.05,def:1,apply:'live'});
def('streams',{tab:'water',label:'Mountain streams',min:0,max:3,step:0.05,def:1,apply:'water'});
def('runoff',{tab:'water',label:'Rain run-off',min:0,max:1.5,step:0.05,def:1,apply:'live'});
def('waterModel',{tab:'water',label:'Lake water',kind:'select',options:[[0,'Simple ripples'],[1,'Low: FFT waves'],[2,'Medium: FFT + 3D waves near camera'],[3,'High: finer FFT + larger 3D area']],def:2,apply:'live'});
def('reflQuality',{tab:'water',label:'Reflections',kind:'select',options:[[0,'Sky only'],[1,'Mirror: low'],[2,'Mirror: medium'],[3,'Mirror: high']],def:2,apply:'live'});
def('lakeWaves',{tab:'water',label:'Lake wave size',min:0,max:2.5,step:0.05,def:1,apply:'live'});
def('lakeFetch',{tab:'water',label:'Lake fetch (sea-likeness)',min:0.5,max:40,step:0.5,def:15,unit:' km',apply:'live'});
def('lakeChop',{tab:'water',label:'Wave choppiness',min:0,max:1.6,step:0.05,def:0.9,apply:'live'});
def('lakeFoam',{tab:'water',label:'Whitecaps',min:0,max:2,step:0.05,def:1,apply:'live'});
def('fallSlope',{tab:'water',label:'Waterfall steepness',min:0.2,max:2,step:0.05,def:0.45,apply:'water'});
def('waterGreen',{tab:'water',label:'Water colour (blue ↔ green)',min:0,max:1,step:0.01,def:0.35,apply:'live'});
def('waveStrength',{tab:'water',label:'Ripples',min:0,max:1.5,step:0.01,def:0.6,apply:'live'});
def('foam',{tab:'water',label:'Shore foam',min:0,max:2,step:0.05,def:1,apply:'live'});
// --- Look (toy diorama)
def('terrainSmooth',{tab:'look',label:'Bigger facets (smooths the land)',min:0,max:1,step:0.01,def:0.55,apply:'smooth'});
def('saturation',{tab:'look',label:'Colour',min:0.4,max:1.6,step:0.01,def:1,apply:'live'});
def('exposure',{tab:'look',label:'Brightness',min:-2,max:2,step:0.05,def:0,unit:' EV',apply:'live'});
def('grade',{tab:'look',label:'Colour look',kind:'select',options:[['story','Storybook'],['natural','Natural'],['pastel','Pastel'],['vivid','Vivid'],['golden','Golden'],['film','Old film'],['noir','Black and white']],def:'golden',apply:'live'});
def('gradeAmt',{tab:'look',label:'Colour look strength',min:0,max:1,step:0.01,def:1,apply:'live'});
def('bokeh',{tab:'look',label:'Diorama blur (tilt-shift)',min:0,max:1,step:0.01,def:0.45,apply:'live'});
def('bloom',{tab:'look',label:'Glow around lights',min:0,max:1,step:0.01,def:0.45,apply:'live',q:1});
def('vignette',{tab:'look',label:'Dark corners',min:0,max:1,step:0.01,def:0.3,apply:'live'});
def('fogDensity',{tab:'look',label:'Haze in the distance',min:0,max:2,step:0.05,def:0.6,apply:'live'});
def('aoStrength',{tab:'look',label:'Valley shading',min:0,max:2,step:0.05,def:1,apply:'live'});
def('autoExpo',{tab:'look',label:'Auto exposure (eye adapts to light)',kind:'check',def:1,apply:'live'});
def('nightBright',{tab:'look',label:'Night brightness',min:0,max:2,step:0.05,def:1,apply:'live'});
def('shadowSoft',{tab:'look',label:'Shadow softness',min:0,max:1,step:0.01,def:0.45,apply:'live'});
def('grassHue',{tab:'look',label:'Grass (lush ↔ dry)',min:-1,max:1,step:0.01,def:0,apply:'live'});
def('grassVar',{tab:'look',label:'Grass colour variation',min:0,max:2,step:0.05,def:1,apply:'live'});
def('grassMaxSlope',{tab:'look',label:'Rock starts at slope',min:15,max:60,step:1,def:36,unit:'°',apply:'live'});
def('snowLine',{tab:'look',label:'Snow caps above',min:0.4,max:1.2,step:0.01,def:0.86,unit:'× height',apply:'live'});
def('sandShore',{tab:'look',label:'Sand on lake shores',min:0,max:2,step:0.05,def:1,apply:'live'});
def('tableOn',{tab:'look',label:'Model table under the world',kind:'check',def:1,apply:'live'});
def('fascia',{tab:'look',label:'Table edge',kind:'select',options:[['green','Painted green'],['wood','Oak'],['black','Black']],def:'green',apply:'live'});
// --- Sky: time, seasons, weather, clouds
def('timeOfDay',{tab:'sky',label:'Time of day',min:0,max:24,step:0.05,def:10.5,unit:' h',apply:'live'});
def('timeSpeed',{tab:'sky',label:'Time speed',min:0,max:600,step:1,def:30,unit:'×',apply:'live'});
def('season',{tab:'sky',label:'Season',kind:'select',options:[['spring','Spring'],['summer','Summer'],['autumn','Autumn'],['winter','Winter']],def:'summer',apply:'live'});
def('snowRate',{tab:'sky',label:'Snow build-up speed',min:0.2,max:4,step:0.1,def:1,unit:'×',apply:'live'});
def('autoSeason',{tab:'sky',label:'Seasons change by themselves',kind:'check',def:1,apply:'live'});
def('daysPerSeason',{tab:'sky',label:'Days per season',min:1,max:10,step:1,def:1,apply:'live'});
def('weather',{tab:'sky',label:'Weather',kind:'select',options:[['auto','Changes by itself'],['clear','Clear'],['fair','Fair'],['cloudy','Cloudy'],['overcast','Overcast'],['mist','Mist'],['rain','Rain'],['storm','Thunderstorm'],['snow','Snow']],def:'auto',apply:'live'});
def('weatherBlend',{tab:'sky',label:'Weather change-over',min:5,max:240,step:5,def:35,unit:' s',apply:'live'});
def('weatherPace',{tab:'sky',label:'Auto weather changes every',min:30,max:900,step:10,def:150,unit:' s',apply:'live'});
def('precip',{tab:'sky',label:'Rain and snow amount',min:0,max:2,step:0.05,def:1,apply:'live'});
def('cloudAmt',{tab:'sky',label:'Clouds',min:0,max:2,step:0.05,def:1,apply:'live'});
def('cloudHeight',{tab:'sky',label:'Cloud height',min:0.3,max:1.8,step:0.01,def:0.9,unit:'× mountains',apply:'live'});
def('cloudQuality',{tab:'sky',label:'Cloud quality',kind:'select',options:[[0,'Off'],[1,'Low'],[2,'Medium'],[3,'High']],def:2,apply:'live'});
def('cloudSpeed',{tab:'sky',label:'Cloud speed',min:0,max:4,step:0.05,def:1,apply:'live'});
def('cloudSize',{tab:'sky',label:'Cloud size',min:0.4,max:2.2,step:0.01,def:1,apply:'live'});
def('mistAmt',{tab:'sky',label:'Mist banks',min:0,max:2,step:0.05,def:1,apply:'live'});
def('mistQuality',{tab:'sky',label:'Mist quality',kind:'select',options:[[0,'Old cards'],[1,'Low'],[2,'Medium'],[3,'High']],def:2,apply:'live'});
def('windStrength',{tab:'sky',label:'Wind',min:0,max:2,step:0.01,def:0.55,apply:'live'});
def('windDir',{tab:'sky',label:'Wind direction',min:0,max:360,step:1,def:60,unit:'°',apply:'live'});
def('lightning',{tab:'sky',label:'Lightning and thunder',kind:'check',def:1,apply:'live'});
def('rainbow',{tab:'sky',label:'Rainbows after rain',kind:'check',def:1,apply:'live'});
def('sunElevMax',{tab:'sky',label:'Midday sun height',min:15,max:80,step:1,def:52,unit:'°',apply:'live'});
def('sunRotate',{tab:'sky',label:'Compass rotation',min:0,max:360,step:1,def:30,unit:'°',apply:'live'});
// --- Life
def('villages',{tab:'life',label:'Villages per 4 × 4 km',min:0,max:12,step:1,def:8,apply:'life'});
def('countryRoads',{tab:'life',label:'Roads between villages',kind:'select',options:[[0,'None'],[1,'Tree (fewest roads)'],[2,'Tree + scenic loops']],def:2,apply:'life'});
def('villageSize',{tab:'life',label:'Village size',min:0.4,max:2.5,step:0.05,def:2.5,unit:'×',apply:'life'});
def('windmills',{tab:'life',label:'Windmills',min:0,max:16,step:1,def:6,apply:'life'});
def('fields',{tab:'life',label:'Farm fields',min:0,max:1.5,step:0.05,def:0.7,apply:'life'});
def('people',{tab:'life',label:'People',min:0,max:2,step:0.05,def:1,apply:'live'});
def('balloons',{tab:'life',label:'Hot-air balloons (summer days)',min:0,max:3,step:0.5,def:1,apply:'live'});
def('castleCount',{tab:'life',label:'Castles on the mountains',min:2,max:4,step:1,def:2,apply:'life'});
def('steamers',{tab:'life',label:'Steamers on big lakes',min:0,max:1,step:0.05,def:0.7,apply:'life'});
def('beaches',{tab:'life',label:'Beaches at lakeside villages',min:0,max:1,step:0.05,def:0.7,apply:'life'});
def('sheep',{tab:'life',label:'Herd size (sheep, cows, horses)',min:0,max:2,step:0.05,def:1,apply:'life'});
def('fieldSize',{tab:'life',label:'Field size',min:0.5,max:2,step:0.05,def:1,unit:'×',apply:'life'});
def('tractors',{tab:'life',label:'Tractors per village',min:0,max:3,step:1,def:1,apply:'live'});
def('farmSpeed',{tab:'life',label:'Farm work speed',min:0.5,max:6,step:0.1,def:2,unit:'×',apply:'live'});
def('pastures',{tab:'life',label:'Pastures (share of farm fields)',min:0,max:1,step:0.05,def:0.35,apply:'life'});
def('fences',{tab:'life',label:'Fences around pastures',kind:'check',def:1,apply:'life'});
def('ducks',{tab:'life',label:'Ducks and swans',min:0,max:2,step:0.05,def:1,apply:'life'});
def('boats',{tab:'life',label:'Boats on the lakes',min:0,max:2,step:0.05,def:1,apply:'life'});
def('birds',{tab:'life',label:'Flocks of birds',min:0,max:3,step:0.1,def:1,apply:'live'});
def('leaves',{tab:'life',label:'Falling leaves in autumn',min:0,max:3,step:0.1,def:1,apply:'live'});
def('chimneySmoke',{tab:'life',label:'Chimney smoke',min:0,max:2,step:0.05,def:1,apply:'live'});
def('lampsOn',{tab:'life',label:'Lamps and lit windows at night',kind:'check',def:1,apply:'live'});
// --- Trees
def('treesOn',{tab:'trees',label:'Show trees and rocks',kind:'check',def:1,apply:'live'});
def('forestCover',{tab:'trees',label:'Forest cover',min:0,max:1,step:0.01,def:0.4,apply:'veg'});
def('forestScale',{tab:'trees',label:'Forest patch size',min:100,max:1500,step:10,def:420,unit:' m',apply:'veg'});
def('treeDensity',{tab:'trees',label:'Tree density',min:0.1,max:1.4,step:0.01,def:0.34,apply:'veg'});
def('coniferShare',{tab:'trees',label:'Conifers vs broadleaf',min:0,max:1,step:0.01,def:0.5,apply:'veg'});
def('treeLine',{tab:'trees',label:'Tree line',min:0.3,max:1.1,step:0.01,def:0.8,unit:'× height',apply:'veg'});
def('treeMaxSlope',{tab:'trees',label:'Max slope for trees',min:15,max:55,step:1,def:38,unit:'°',apply:'veg'});
def('treeSize',{tab:'trees',label:'Tree size',min:0.4,max:2,step:0.01,def:0.85,apply:'veg'});
def('bushes',{tab:'trees',label:'Bushes',min:0,max:2,step:0.05,def:0.6,apply:'veg'});
def('rocks',{tab:'trees',label:'Boulders',min:0,max:2,step:0.05,def:0.7,apply:'veg'});
def('treeLod',{tab:'trees',label:'Simple trees beyond',min:100,max:2000,step:10,def:520,unit:' m',apply:'live',q:1});
def('vegBudget',{tab:'quality',label:'Plant budget (drawn per frame)',min:20000,max:200000,step:5000,def:40000,apply:'live'});
def('treeDist',{tab:'trees',label:'Tree draw distance',min:300,max:5000,step:50,def:3200,unit:' m',apply:'live',q:1});
// --- Track
def('minRadius',{tab:'track',label:'Minimum curve radius',min:20,max:400,step:5,def:20,unit:' m',apply:'live'});
def('maxGrade',{tab:'track',label:'Maximum grade (100% = 45°)',min:0.5,max:100,step:0.5,def:100,unit:' %',apply:'live'});
def('curveRadius',{tab:'track',label:'Curve radius (curve + straight)',min:20,max:600,step:5,def:160,unit:' m',apply:'live'});
def('toyGrades',{tab:'track',label:'Toy physics: trains climb any grade',kind:'check',def:1,apply:'live'});
def('bridgeType',{tab:'track',label:'Bridge style for new track',kind:'select',options:[[0,'Stone arch viaduct'],[1,'Brick arch viaduct'],[2,'Steel truss'],[3,'Steel plate girder'],[4,'Concrete beam'],[5,'Wooden trestle']],def:0,apply:'live'});
def('trackBridges',{tab:'track',label:'Automatic bridges',kind:'check',def:1,apply:'live'});
def('trackTunnels',{tab:'track',label:'Automatic tunnels',kind:'check',def:1,apply:'live'});
def('bridgeMin',{tab:'track',label:'Bridge when higher than',min:3,max:30,step:0.5,def:5,unit:' m',apply:'live'});
def('tunnelMin',{tab:'track',label:'Tunnel when deeper than',min:5,max:40,step:0.5,def:8,unit:' m',apply:'live'});
def('trackProfile',{tab:'track',label:'New track height',kind:'select',options:[['follow','Follows the ground'],['grade','Even grade']],def:'follow',apply:'live'});
def('buildGrade',{tab:'track',label:'Grade of Up / Down pieces (100% = 45°)',min:0.5,max:100,step:0.5,def:5,unit:' %',apply:'live'});
def('formationWidth',{tab:'track',label:'Track bed width',min:4,max:12,step:0.5,def:5,unit:' m',apply:'track'});
def('embSlope',{tab:'track',label:'Embankment steepness',min:0.3,max:1.5,step:0.05,def:0.65,apply:'track'});
def('cutSlope',{tab:'track',label:'Cutting steepness',min:0.5,max:3,step:0.05,def:1.2,apply:'track'});
// --- Trains
def('trainCars',{tab:'trains',label:'Coaches on new trains',min:0,max:8,step:1,def:3,apply:'live'});
def('locoPower',{tab:'trains',label:'Locomotive power',min:200,max:3000,step:10,def:1100,unit:' kW',apply:'live'});
def('locoTE',{tab:'trains',label:'Starting pull (tractive effort)',min:40,max:400,step:5,def:180,unit:' kN',apply:'live'});
def('adhesion',{tab:'trains',label:'Wheel grip',min:0.2,max:2,step:0.05,def:1,apply:'live'});
def('brakeStrength',{tab:'trains',label:'Brake strength',min:0.1,max:2.5,step:0.05,def:1,apply:'live'});
def('rollingRes',{tab:'trains',label:'Rolling resistance',min:0.0005,max:0.02,step:0.0005,def:0.002,apply:'live'});
def('gravityScale',{tab:'trains',label:'Gravity',min:0.2,max:3,step:0.05,def:0.5,unit:'×',apply:'live'});
def('autoSpeed',{tab:'trains',label:'Auto driver speed',min:10,max:120,step:5,def:45,unit:' km/h',apply:'live'});
def('derail',{tab:'trains',label:'Derail when too fast in curves',kind:'check',def:0,apply:'live'});
def('derailAccel',{tab:'trains',label:'Curve speed tolerance',min:1,max:8,step:0.1,def:3,unit:' m/s²',apply:'live'});
def('stopStations',{tab:'trains',label:'Auto trains stop at stations',kind:'check',def:1,apply:'live'});
def('timetable',{tab:'trains',label:'Run to a timetable',kind:'check',def:0,apply:'live'});
def('ttInterval',{tab:'trains',label:'Timetable: a departure every',min:5,max:120,step:5,def:30,unit:' min',apply:'live'});
def('stopAll',{tab:'trains',label:'Stop at every station on the way',kind:'check',def:1,apply:'live'});
def('money',{tab:'trains',label:'Money: earn fares, pay for building (OpenTTD style)',kind:'check',def:1,apply:'live'});
def('fareRate',{tab:'trains',label:'Fare level',min:0.25,max:4,step:0.05,def:1,unit:'×',apply:'live'});
def('goodsRate',{tab:'trains',label:'Goods production',min:0.2,max:4,step:0.1,def:1,unit:'×',apply:'live'});
def('dwell',{tab:'trains',label:'Station stop time',min:10,max:90,step:1,def:30,unit:' s',apply:'live'});
def('smoke',{tab:'trains',label:'Smoke and steam',kind:'check',def:1,apply:'live'});
def('smokeQuality',{tab:'trains',label:'Smoke look',kind:'select',options:[[0,'Simple puffs'],[1,'Billowy (cloud noise)']],def:1,apply:'live'});
def('chaseSmoke',{tab:'trains',label:'Smoke opacity in chase / cab view',min:0.05,max:1,step:0.05,def:0.2,apply:'live'});
// --- Sound and music
def('volume',{tab:'sound',label:'Master volume',min:0,max:1.5,step:0.01,def:0.8,apply:'live'});
def('chuffVol',{tab:'sound',label:'Chuffs',min:0,max:2,step:0.01,def:1,apply:'live'});
def('clickVol',{tab:'sound',label:'Rail clicks and squeal',min:0,max:2,step:0.01,def:1,apply:'live'});
def('whistleVol',{tab:'sound',label:'Whistle',min:0,max:2,step:0.01,def:1,apply:'live'});
def('whistlePitch',{tab:'sound',label:'Whistle pitch',min:0.6,max:1.6,step:0.01,def:1,apply:'live'});
def('ambVol',{tab:'sound',label:'Wind and birds',min:0,max:2,step:0.01,def:1,apply:'live'});
def('music',{tab:'sound',label:'Music',kind:'check',def:1,apply:'live'});
def('musicVol',{tab:'sound',label:'Music volume',min:0,max:1.5,step:0.01,def:0.55,apply:'live'});
def('musicStyle',{tab:'sound',label:'Music style',kind:'select',options:[['auto','Follows the world'],['pastoral','Pastoral'],['waltz','Folk waltz'],['piano','Piano'],['musicbox','Music box'],['ambient','Ambient']],def:'auto',apply:'live'});
def('musicDuck',{tab:'sound',label:'Music makes room for whistles and nearby trains',kind:'check',def:1,apply:'live'});
def('musicTempo',{tab:'sound',label:'Music tempo',min:0.6,max:1.4,step:0.01,def:1,unit:'×',apply:'live'});
// --- Quality
def('preset',{tab:'quality',label:'Preset',kind:'select',options:[['low','Low'],['medium','Medium'],['high','High'],['custom','Custom']],def:IS_TOUCH?'medium':'high',apply:'preset'});
def('autoRes',{tab:'quality',label:'Automatic resolution: keep at least',kind:'select',options:[[0,'Off'],[25,'25 fps'],[30,'30 fps'],[45,'45 fps'],[55,'55 fps'],[90,'90 fps']],def:55,apply:'live'});
def('renderScale',{tab:'quality',label:'Render resolution',min:0.3,max:1,step:0.01,def:0.54,unit:'×',apply:'live',q:1});
def('msaa',{tab:'quality',label:'Smooth edges (MSAA)',kind:'select',options:[[0,'Off'],[2,'2×'],[4,'4×']],def:0,apply:'live',q:1});
def('maxDpr',{tab:'quality',label:'Screen sharpness (pixel density limit)',kind:'select',options:[[1,'1× (fastest)'],[1.25,'1.25×'],[1.5,'1.5×'],[2,'2×'],[3,'Full']],def:1.5,apply:'live',q:1});
def('terrainQ',{tab:'quality',label:'Ground detail',kind:'select',options:[[1,'Full (grass tufts, flowers, ruts, pebbles)'],[0,'Simple (faster)']],def:1,apply:'live',q:1});
def('labelRate',{tab:'quality',label:'Labels move',kind:'select',options:[[1,'Every frame'],[2,'Every 2nd frame'],[3,'Every 3rd frame']],def:1,apply:'live',q:1});
def('ffDetail',{tab:'quality',label:'Fast forward: life details',kind:'select',options:[[1,'Full'],[0,'Reduced (smoother at 4× and 8×)']],def:0,apply:'live',q:1});
def('frameCap',{tab:'quality',label:'Frame cap',kind:'select',options:[[0,'None'],[30,'30 fps'],[60,'60 fps']],def:0,apply:'live'});
def('riverQ',{tab:'quality',label:'Rivers, streams and culverts',kind:'select',options:[[0,'Low'],[1,'Medium'],[2,'High']],def:1,apply:'streams',q:1});
// ---- Experimental: performance switches. The ones that are on give the same picture (checked against screenshots) and can be turned
// off if something looks wrong; the ones that are off can change the picture a little.
def('fxUpscale',{tab:'exp',label:'Sharper upscaling: render at the resolution scale, upscale and sharpen to the full screen (FSR-style). Costs a full-screen pass: on the High preset only',kind:'check',def:0,apply:'live'});
def('dbgWater',{tab:'exp',label:'Water debug view (for screenshots to the developer)',kind:'select',options:[[0,'Off'],[1,'Depth'],[2,'Distance to shore'],[3,'Foam'],[4,'Flow']],def:0,apply:'live'});
def('optOrder',{tab:'exp',label:'Draw near things before the ground (same picture)',kind:'check',def:1,apply:'live'});
def('optInvalidate',{tab:'exp',label:'Tell the phone GPU which buffers it can drop (same picture, less memory traffic)',kind:'check',def:1,apply:'live'});
def('optShadowHalf',{tab:'exp',label:'Update sun shadows every other frame (moving shadows lag one frame)',kind:'check',def:0,apply:'live'});
def('optBackface',{tab:'exp',label:'Skip the far sides of building blocks (same picture)',kind:'check',def:1,apply:'live'});
def('optPrepass',{tab:'exp',label:'Buildings depth-first (same picture; may help or hurt, measure)',kind:'check',def:0,apply:'live'});
def('worldCache',{tab:'exp',label:'Keep the generated land in a cache (fast start; regenerated when settings or the game change)',kind:'check',def:1,apply:'live'});
def('optCull',{tab:'exp',label:'Skip buildings and objects outside the view (same picture)',kind:'check',def:1,apply:'live'});
def('peopleLod',{tab:'quality',label:'People detail distance',min:0.3,max:2,step:0.05,def:1,unit:' ×',apply:'live',q:1});
def('kitLod',{tab:'quality',label:'Building detail distance',min:0.1,max:2,step:0.05,def:1,unit:' ×',apply:'live',q:1});
def('terrainLod',{tab:'quality',label:'Terrain detail distance',min:60,max:800,step:10,def:260,unit:' m',apply:'live',q:1});
def('shadowRes',{tab:'quality',label:'Shadows',kind:'select',options:[[0,'Off'],[1024,'1024'],[2048,'2048'],[4096,'4096']],def:2048,apply:'shadow',q:1});
def('nightLights',{tab:'quality',label:'Light pools at night',min:0,max:32,step:1,def:16,apply:'live',q:1});
// --- File / debug
def('showStats',{tab:'file',label:'Show stats',kind:'check',def:1,apply:'live'});
def('craneSpeed',{tab:'trains',label:'Timber crane speed',min:0.5,max:6,step:0.5,def:2.5,unit:'×',apply:'live'});
def('btnCaps',{tab:'file',label:'Words under the button icons',kind:'check',def:0,apply:'live'});

const PRESETS={
  low:{renderScale:0.7,msaa:0,shadowRes:0,peopleLod:0.5,terrainLod:120,treeDist:1600,treeLod:260,bloom:0,bokeh:0,nightLights:8,riverQ:0,maxDpr:1,labelRate:2,ffDetail:0,terrainQ:0,kitLod:0.5,vegBudget:25000,cloudQuality:1,mistQuality:1,reflQuality:0,fxUpscale:0},
  medium:{renderScale:0.75,msaa:0,shadowRes:2048,peopleLod:1,terrainLod:220,treeDist:3000,treeLod:480,bloom:0.4,bokeh:0.45,nightLights:16,riverQ:1,maxDpr:1.5,labelRate:1,ffDetail:0,terrainQ:1,kitLod:1,vegBudget:40000,cloudQuality:2,mistQuality:2,reflQuality:1,fxUpscale:0},
  high:{renderScale:0.9,msaa:4,shadowRes:4096,peopleLod:1.4,terrainLod:420,treeDist:5000,treeLod:900,bloom:0.45,bokeh:0.45,nightLights:24,riverQ:2,maxDpr:2,labelRate:1,ffDetail:1,terrainQ:1,kitLod:1.4,vegBudget:70000,cloudQuality:3,mistQuality:2,reflQuality:2,fxUpscale:1}
};
function applyPreset(name,silent){const pr=PRESETS[name];if(!pr)return;for(const k in pr){const old=P[k];P[k]=pr[k];if(old!==P[k]&&!silent)paramChanged(k,true);}P.preset=name;UI.refreshAll();}

// ---------- change routing
const Pending={world:false,water:false,veg:false,tex:false,shadow:false,trees:false,track:false,life:false,smooth:false};
let pendTimer=0;
function paramChanged(id,fromPreset){
  const d=PDEF[id];if(!d)return;
  if(d.q&&!fromPreset&&P.preset!=='custom'){P.preset='custom';UI.refresh('preset');}
  if(id==='btnCaps')UI.caps();
  /* an ocean gets sea-like water: long fetch, bigger waves and whitecaps; back to the lake values on land */
  if(id==='mapStyle'){const sea=P.mapStyle!=='land';const set=(k,v)=>{P[k]=v;UI.refresh&&UI.refresh(k);};set('lakeFetch',sea?40:PDEF.lakeFetch.def);set('lakeWaves',sea?1.7:PDEF.lakeWaves.def);set('lakeFoam',sea?1.4:PDEF.lakeFoam.def);set('lakeChop',sea?1.1:PDEF.lakeChop.def);}
  switch(d.apply){
    case 'world':Pending.world=true;UI.markGenerate(true);break;
    case 'water':case 'veg':case 'tex':case 'shadow':case 'trees':case 'track':case 'life':case 'smooth':case 'streams':Pending[d.apply]=true;clearTimeout(pendTimer);pendTimer=setTimeout(()=>App.applyPending(),450);break;
    case 'preset':applyPreset(P.preset);break;
  }
}

// ---------- UI
// ---------- pictogram buttons: [data-ic] buttons get an icon; their text becomes the caption, tooltip and accessible name
// pictograms for the Trein buttons: 24×24 line icons drawn with currentColor (stroke 2, round joins), a few filled details
const ICONS=(()=>{const F=' fill="currentColor" stroke="none"';
  const gear=(()=>{let d='';const n=8;for(let k=0;k<n*4;k++){const a=(k/(n*4))*Math.PI*2-Math.PI/n/4,r=(k%4<2)?9.6:7.2,x=12+Math.cos(a)*r,y=12+Math.sin(a)*r;d+=(k?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);}return`<path d="${d}Z"/><circle cx="12" cy="12" r="3"/>`;})();
  const sun=(r,cx,cy,ray)=>{cx=cx||12;cy=cy||12;let s=`<circle cx="${cx}" cy="${cy}" r="${r}"/>`;for(let k=0;k<8;k++){const a=k*Math.PI/4,c=Math.cos(a),q=Math.sin(a);s+=`<path d="M${(cx+c*(r+2)).toFixed(2)} ${(cy+q*(r+2)).toFixed(2)}L${(cx+c*(r+2+ray)).toFixed(2)} ${(cy+q*(r+2+ray)).toFixed(2)}"/>`;}return s;};
  const cloud=(dy)=>`<path d="M7 ${17+dy}h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 9.2 4 4 0 0 0 7 ${17+dy}z"/>`;
  const loco=`<path d="M2 15.5h19M4 15.5V10h9v5.5M13 15.5V6h6.5v9.5M12 6h8.5M5.5 10V6.5H8V10"/><circle cx="7" cy="18.5" r="2"/><circle cx="12.5" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/>`;
  return{
    gear,
    home:`<path d="M3.5 11.5L12 4l8.5 7.5"/><path d="M6 10v9.5h4.5V14h3v5.5H18V10"/>`,
    map:`<path d="M3 6l6-2.5 6 2.5 6-2.5v14l-6 2.5-6-2.5-6 2.5z"/><path d="M9 3.5v14M15 6v14"/>`,
    build:`<path d="M4 20l9-9" stroke-width="2.6"/><path d="M10.2 7.8l5-5 6 6-5 5z" fill="currentColor"/>`,
    trains:loco,
    generate:`<path d="M2.5 20l6-9 4 5.2 2.8-3.4 6.2 7.2z"/><path d="M20.2 6.4a4 4 0 1 1-1.4-3"/><path d="M19.6 1.6v2.9h-2.9"/>`,
    save:`<path d="M5 3h11.5L20 6.5V21H5z"/><path d="M8.5 3v5h6.5V3M8.5 21v-6h8v6"/>`,
    soundOn:`<path d="M4 9h4l5-4.5v15L8 15H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.3a8 8 0 0 1 0 11.4"/>`,
    soundOff:`<path d="M4 9h4l5-4.5v15L8 15H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>`,
    pause:`<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>`,
    play:`<path d="M8 5.5l10 6.5-10 6.5z"/>`,
    fast:`<path d="M3 6.5l8 5.5-8 5.5zM12 6.5l8 5.5-8 5.5z"/>`,
    faster:`<path d="M1.5 7.5l6 4.5-6 4.5zM9 7.5l6 4.5-6 4.5zM16.5 7.5l6 4.5-6 4.5z"/>`,
    spring:`<path d="M12 21v-8M12 17.5c-1.6-2-3.6-2.4-5.2-1.6M12 15.5c1.4-1.6 3.2-2 4.6-1.4"/><circle cx="12" cy="8.5" r="1.8"/><circle cx="12" cy="4.6" r="2.1"/><circle cx="15.7" cy="7.3" r="2.1"/><circle cx="14.3" cy="11.6" r="2.1"/><circle cx="9.7" cy="11.6" r="2.1"/><circle cx="8.3" cy="7.3" r="2.1"/>`,
    summer:`<path d="M2.5 11.5a9.5 7.5 0 0 1 19 0z"/><path d="M12 11.5v9.5M8.5 21h7M12 4V2.5M7.5 11.5a4.5 7.5 0 0 1 9 0"/>`,
    autumn:`<path d="M4.5 19.5C4.5 10.5 10.5 4 20 4c0 9.5-6.5 15.5-15.5 15.5z"/><path d="M4.5 19.5L14 10M10 14h-4M13 11V7.5"/>`,
    winter:`<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/><path d="M9.5 3.8L12 6.3l2.5-2.5M9.5 20.2l2.5-2.5 2.5 2.5M3.4 10.6l3.4-.9-.9-3.4M20.6 13.4l-3.4.9.9 3.4M3.4 13.4l3.4.9-.9 3.4M20.6 10.6l-3.4-.9.9-3.4"/>`,
    wxAuto:`<path d="M19.5 9A8 8 0 0 0 5 7.5M4.5 15A8 8 0 0 0 19 16.5"/><path d="M5 3.5v4h4M19 20.5v-4h-4"/><path d="M9.3 15.5L12 8.5l2.7 7M10.2 13.3h3.6"/>`,
    clear:sun(4,12,12,2.8),
    fair:sun(2.6,9,8.5,1.8)+`<path d="M9 19.5h9.5a3 3 0 0 0 .3-6A4.6 4.6 0 0 0 10 13a3.3 3.3 0 0 0-1 6.5z" fill="var(--btnbg,#1e3b30)"/>`,
    cloudy:cloud(0),
    mist:`<path d="M3 8h18M5 12h15M3 16h16M7 20h12"/>`,
    rain:cloud(-3)+`<path d="M8.5 17.5l-1.5 4M12.5 17.5l-1.5 4M16.5 17.5l-1.5 4"/>`,
    storm:cloud(-3)+`<path d="M13 14.5l-3 4h4l-2.5 4.5"/>`,
    snow:cloud(-3)+`<circle cx="8.5" cy="19" r="1"${F}/><circle cx="12.5" cy="21" r="1"${F}/><circle cx="16.5" cy="19" r="1"${F}/>`,
    music:`<path d="M9 18V5.5l11-2.5v13"/><circle cx="6.3" cy="18" r="2.7"/><circle cx="17.3" cy="16" r="2.7"/>`,
    musicOff:`<path d="M9 18V5.5l11-2.5v13"/><circle cx="6.3" cy="18" r="2.7"/><circle cx="17.3" cy="16" r="2.7"/><path d="M3 3l18 18"/>`,
    close:`<path d="M6 6l12 12M18 6L6 18"/>`,
    pieceKit:`<path d="M3.5 20.5A17 17 0 0 1 20.5 3.5"/><path d="M8.5 20.5a12 12 0 0 1 12-12"/><path d="M3 20.5h6.5M20.5 3v6" stroke-width="1.6"/>`,
    pieces:`<path d="M8 2.5v19M16 2.5v19"/><path d="M5.5 5.5h13M5.5 10h13M5.5 14.5h13M5.5 19h13" stroke-width="1.6"/>`,
    draw:`<path d="M4 20l1.2-4.6L16.4 4.2a2.1 2.1 0 0 1 3 3L8.2 18.4z"/><path d="M14.3 6.3l3.4 3.4"/>`,
    route:`<path d="M6.5 17c0-6 11-4 11-10.5" stroke-dasharray="2.2 2.4"/><circle cx="6.5" cy="19" r="2"/><path d="M17.5 9.5s-3.5-3.2-3.5-5.6a3.5 3.5 0 0 1 7 0c0 2.4-3.5 5.6-3.5 5.6z"/>`,
    signals:`<path d="M12 21.5V12M8.5 21.5h7"/><rect x="8.5" y="2.5" width="7" height="9.5" rx="1.5"/><circle cx="12" cy="5.4" r="1.2"${F}/><circle cx="12" cy="9" r="1.2"${F}/>`,
    roads:`<path d="M7.5 21.5L10.5 2.5M16.5 21.5L13.5 2.5"/><path d="M12 4.5v2M12 10v2.5M12 16.5v3" stroke-width="1.6"/>`,
    newLine:`<path d="M12 21.5s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><path d="M12 7.5v6M9 10.5h6"/>`,
    junction:`<path d="M9.5 21.5V14L5 2.5M14.5 21.5V14L19 2.5"/><path d="M9.5 14L14.5 2.5" stroke-width="1.6"/>`,
    demolish:`<path d="M9 5h11.5v14H9l-6.5-7z"/><path d="M12.5 9l5 6M17.5 9l-5 6"/>`,
    place:`<path d="M12 3v11.5M7 9.5l5 5 5-5"/><path d="M4 19.5h16M7 22h10" stroke-width="1.6"/>`,
    undo:`<path d="M9 14.5L4 9.5l5-5"/><path d="M4 9.5h10.5a5 5 0 0 1 0 10H11"/>`,
    eraser:`<path d="M8 20.5L3.5 16a1.5 1.5 0 0 1 0-2.1L13.4 4a1.5 1.5 0 0 1 2.1 0l4.5 4.5a1.5 1.5 0 0 1 0 2.1L10.2 20.5zM8.5 9l6.5 6.5M10.2 20.5H21"/>`,
    trash:`<path d="M3.5 6.5h17M9.5 6.5V3.5h5v3M6 6.5l1 14.5h10l1-14.5M10 10.5v7M14 10.5v7"/>`,
    done:`<path d="M4.5 12.5l5 5 10-11"/>`,
    hammerCheck:`<path d="M3.5 20.5l7-7" stroke-width="2.4"/><path d="M8.6 10.6l4.6-4.6 4.4 4.4-4.6 4.6z" fill="currentColor"/><path d="M14.5 19l2.5 2.5 5-5.5"/>`,
    busStop:`<circle cx="12" cy="8" r="5.5"/><path d="M12 13.5v8M8.5 21.5h7M10 5.5v5M14 5.5v5M10 8h4"/>`,
    roadBend:`<path d="M6.5 21.5c0-6 11-5 11-10S6.5 7 6.5 2.5" stroke-width="3.2"/><path d="M6.5 21.5c0-6 11-5 11-10S6.5 7 6.5 2.5" stroke="var(--btnbg,#1e3b30)" stroke-width="1" stroke-dasharray="1.6 2"/>`,
    straight:`<path d="M4.5 19.5l15-15"/><path d="M2 17l5 5M17 2l5 5"/>`,
    restart:`<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 3.5V9H10"/>`,
    bus:`<path d="M2.5 16V8.5A2.5 2.5 0 0 1 5 6h12.5a3.5 3.5 0 0 1 3.5 3.5V16z"/><path d="M2.5 11h18.5M8 6v5M13.5 6v5"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>`,
    lorry:`<path d="M2 5.5h11.5v10.5H2zM13.5 9h4.3l3.2 4v3h-7.5z"/><circle cx="6" cy="18" r="1.9"/><circle cx="17" cy="18" r="1.9"/>`,
    station:`<path d="M3 21V10.5L12 4l9 6.5V21z"/><path d="M10 21v-4.5h4V21"/><circle cx="12" cy="11.2" r="2.2"/><path d="M1.5 21h21"/>`,
    scenic:`<path d="M4 21c0-7 8-5 8-10S6 6 9 2.5"/><path d="M17 12.5c-2.2 0-3.5-1.8-3.5-3.8S15.5 4 17 2.5c1.5 1.5 3.5 4 3.5 6.2s-1.3 3.8-3.5 3.8zM17 12.5V18"/>`,
    direct:`<path d="M4.5 19.5l15-15M10 4.5h9.5V14"/>`,
    follow:`<path d="M2 17c3-6 5.5-6.5 8.5-2.5S16 18 22 9"/><path d="M2 21h20" stroke-width="1.4"/>`,
    grade:`<path d="M2 18.5l20-11"/><path d="M2 21h20" stroke-width="1.4"/>`,
    bridge:`<path d="M1.5 8.5h21M3 8.5V21M21 8.5V21"/><path d="M6.5 21v-3.5a5.5 5.5 0 0 1 11 0V21"/>`,
    longer:`<path d="M2 17h20"/><path d="M6.5 9.5H2.5M2.5 9.5l2.5-2.5M2.5 9.5l2.5 2.5M17.5 9.5h4M21.5 9.5L19 7M21.5 9.5L19 12"/><path d="M9 9.5h6"/>`,
    shorter:`<path d="M5 17h14"/><path d="M2.5 9.5h5M7.5 9.5L5 7M7.5 9.5L5 12M21.5 9.5h-5M16.5 9.5L19 7M16.5 9.5L19 12"/>`,
    tunnel:`<path d="M1.5 20.5C3 9 21 9 22.5 20.5z"/><path d="M8.5 20.5V17a3.5 3.5 0 0 1 7 0v3.5" fill="var(--btnbg,#1e3b30)"/>`,
    reverse:`<path d="M20 12H4.5M10.5 5.5L4 12l6.5 6.5"/>`,
    neutral:`<path d="M7.5 18.5V5.5l9 13v-13"/>`,
    forward:`<path d="M4 12h15.5M13.5 5.5L20 12l-6.5 6.5"/>`,
    whistle:`<path d="M9.5 21.5V10h5v11.5M8 10h8M12 10V7"/><path d="M8.5 5.5C6.5 4 6.8 1.8 9 2M15.5 5.5c2-1.5 1.7-3.7-.5-3.5M12 4.5V1.5" stroke-width="1.6"/>`,
    camera:`<path d="M3 7.5h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13.5" r="3.5"/>`,
    auto:`<path d="M3.5 17.5a8.5 8.5 0 1 1 17 0"/><path d="M12 17.5l4.5-6"/><path d="M6.2 11.5l1.4 1M12 7.5v1.7M17.8 11.5l-1.4 1" stroke-width="1.6"/>`,
    next:`<path d="M5 5.5l9 6.5-9 6.5zM18 5.5v13"/>`,
    rerail:`<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>`,
    list:`<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.3"${F}/><circle cx="4.5" cy="12" r="1.3"${F}/><circle cx="4.5" cy="18" r="1.3"${F}/>`,
    loco:loco,
    wagon:`<path d="M3 5.5h18v10H3zM1.5 15.5h21"/><path d="M9.5 5.5v10M14.5 5.5v10" stroke-width="1.4"/><circle cx="7" cy="18.5" r="2"/><circle cx="17" cy="18.5" r="2"/>`,
    goTo:`<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"${F}/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>`,
  };})();
function svgIcon(n){return'<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[n]||'')+'</svg>';}
// names from a save file go into HTML: escape them (an imported save could otherwise inject markup)
function esc(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function iconize(root){for(const b of (root||document).querySelectorAll('button[data-ic]:not(.ic)')){const t=b.textContent.trim();b.classList.add('ic');b.innerHTML=svgIcon(b.dataset.ic)+'<span class="cap"></span><span class="v" hidden></span>';setCap(b,t);}}
// label = what the button does (caption, tooltip, screen readers); val = a live value shown under the icon even without captions
function setCap(b,label,val){if(!b)return;if(!b.classList.contains('ic')){b.textContent=label+(val?' '+val:'');return;}b.querySelector('.cap').textContent=label;const v=b.querySelector('.v');v.textContent=val||'';v.hidden=!val;b.title=label+(val?': '+val:'');b.setAttribute('aria-label',b.title);}
// touch screens show no tooltips: a long press on an icon button names it in a toast and does not trigger it (the whistle is held on purpose)
const IconHint={t:0,b:null,shown:false,bind(){
  document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('button.ic');if(!b||b.id==='dWhistle')return;clearTimeout(this.t);this.b=b;this.shown=false;
    this.t=setTimeout(()=>{if(this.b!==b)return;this.shown=true;UI.toast(b.getAttribute('aria-label')||b.title||'');if(navigator.vibrate)navigator.vibrate(10);},480);},true);
  for(const ev of ['pointerup','pointercancel'])document.addEventListener(ev,()=>{clearTimeout(this.t);this.b=null;},true);
  document.addEventListener('click',e=>{if(this.shown&&e.target.closest&&e.target.closest('button.ic')){this.shown=false;e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('button.ic'))e.preventDefault();});}};
function setIcon(b,n){if(!b||!b.classList.contains('ic')||b.dataset.ic===n)return;b.dataset.ic=n;const s=b.querySelector('svg.i');if(s)s.outerHTML=svgIcon(n);}
const UI=(()=>{
  const rows={};let curTab='world';
  function fmt(d,v){if(d.kind==='select'){const o=d.options.find(o=>String(o[0])===String(v));return o?o[1]:v;}if(d.kind==='check')return v?'On':'Off';
    const st=d.step||0.01,dec=st>=1?0:st>=0.1?1:st>=0.01?2:3;return Number(v).toFixed(dec)+(d.unit||'');}
  function build(){
    iconize();IconHint.bind();const tabs=$('#tabs'),secs=$('#sections');
    for(const [id,label] of TABS){const b=document.createElement('button');b.textContent=label;b.dataset.tab=id;b.onclick=()=>show(id);tabs.appendChild(b);
      const s=document.createElement('div');s.className='sec';s.dataset.tab=id;s.hidden=true;
      if(TAB_HINT[id]){const h=document.createElement('p');h.className='hint';h.textContent=TAB_HINT[id];s.appendChild(h);}
      secs.appendChild(s);}
    for(const id of PORDER){const d=PDEF[id],sec=secs.querySelector(`.sec[data-tab="${d.tab}"]`);
      const r=document.createElement('div');r.className='row';const lab=document.createElement('label');lab.textContent=d.label;lab.htmlFor='p_'+id;
      const val=document.createElement('span');val.className='val';r.append(lab,val);let inp;
      if(d.kind==='range'){inp=document.createElement('input');inp.type='range';inp.min=d.min;inp.max=d.max;inp.step=d.step;
        inp.oninput=()=>{P[id]=parseFloat(inp.value);val.textContent=fmt(d,P[id]);paramChanged(id);};}
      else if(d.kind==='select'){inp=document.createElement('select');for(const [v,l] of d.options){const o=document.createElement('option');o.value=v;o.textContent=l;inp.appendChild(o);}
        inp.onchange=()=>{const v=inp.value;P[id]=isNaN(+v)?v:+v;val.textContent='';paramChanged(id);};r.classList.add('sel');}
      else{inp=document.createElement('input');inp.type='checkbox';inp.onchange=()=>{P[id]=inp.checked?1:0;val.textContent=fmt(d,P[id]);paramChanged(id);};r.classList.add('chk');}
      inp.id='p_'+id;r.appendChild(inp);sec.appendChild(r);rows[id]={inp,val,d};}
    // extra actions
    const w=secs.querySelector('.sec[data-tab="world"]');w.insertBefore(actions([['New random seed',()=>{P.seed=1+Math.floor(Math.random()*99998);refresh('seed');paramChanged('seed');App.generate(0);}],['Reset world sliders',()=>resetTab('world')]]),w.children[1]);
    const f=secs.querySelector('.sec[data-tab="file"]');
    f.insertBefore(actions([['Save',()=>App.save()],['Load save',()=>App.load()],['Export JSON',()=>App.exportJSON()],['Import JSON',()=>$('#file').click()],['Export debug log',()=>App.exportLog()],['Export touch log',()=>TouchLog.export()],['Reset everything',()=>App.resetAll()]]),f.firstChild);
    const info=document.createElement('p');info.className='hint';info.id='worldinfo';f.appendChild(info);
    {const tr=secs.querySelector('.sec[data-tab="trains"]');if(tr)tr.insertBefore(actions([['Fly the Staggerwing (biplane)',()=>{$('#panel').classList.remove('open');$('#bar').classList.remove('hide');Plane.spawn();}]]),tr.firstChild);}
    {const ex=secs.querySelector('.sec[data-tab="exp"]');if(ex){ex.insertBefore(actions([['Enter benchmark world',()=>Bench.enter()],['Measure on this phone',()=>PhoneBench.run()],['Copy results',()=>PhoneBench.copy()]]),ex.firstChild);const pre=document.createElement('pre');pre.id='benchOut';pre.className='hint';pre.style.whiteSpace='pre-wrap';pre.style.fontSize='11px';
      pre.textContent='Benchmark world: the same fixed world, town, station, trains and people every time, on a fixed clock, playable; there you can also note problems and measure fixed views. Measure: GPU time of the current view with each switch, about 30 s. Take a screenshot of the result for the developer.';ex.insertBefore(pre,ex.children[1]);}}
    $('#file').onchange=e=>{const fl=e.target.files[0];if(fl)App.importJSON(fl);e.target.value='';};
    refreshAll();show('world');
  }
  function actions(list){const d=document.createElement('div');d.className='actions';for(const [t,fn] of list){const b=document.createElement('button');b.textContent=t;b.onclick=fn;d.appendChild(b);}return d;}
  function resetTab(tab){for(const id of PORDER)if(PDEF[id].tab===tab){P[id]=PDEF[id].def;refresh(id);paramChanged(id);}}
  function show(tab){curTab=tab;for(const b of document.querySelectorAll('#tabs button'))b.classList.toggle('on',b.dataset.tab===tab);
    for(const s of document.querySelectorAll('.sec'))s.hidden=s.dataset.tab!==tab;$('#sections').scrollTop=0;}
  function refresh(id){const r=rows[id];if(!r)return;const v=P[id];if(r.d.kind==='check')r.inp.checked=!!v;else r.inp.value=v;r.val.textContent=r.d.kind==='select'?'':fmt(r.d,v);}
  function refreshAll(){for(const id in rows)refresh(id);caps();}
  function caps(){document.body.classList.toggle('caps',!!P.btnCaps);}
  function markGenerate(on){const b=$('#btnGen');b.classList.toggle('attn',on);setCap(b,on?'Generate (settings changed)':'Generate');}
  let toastT=0;function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2200);}
  function progress(on,frac,label){const p=$('#prog');p.style.display=on?'block':'none';if(on){$('#progLabel').textContent=label||'';$('#progBar').style.width=Math.round(frac*100)+'%';}}
  return{build,refresh,refreshAll,markGenerate,toast,progress,show,caps};
})();

// ---------- state: save / load / export / import
// ===================================================================
// MONEY (optional, OpenTTD-like): start with €200k, building costs, a loan up to €500k with interest,
// fares = distance × passengers × speed factor, paid when passengers get off
// ===================================================================
const Money={cash:200000,loan:0,inited:false,paid:new Map(),paidSt:new Set(),paidTr:new Set(),maxLoan:500000,flo:[],year:{inc:0,exp:0},
  on(){return !!P.money;},fmt(v){return Math.round(v).toLocaleString('nl-NL');},
  init(){if(this.inited)return;this.inited=true;for(const q of Track.segs)if(!q.pend&&!this.paid.has(q.id))this.paid.set(q.id,0);for(const q of Track.stations)this.paidSt.add(q.id);for(const t of Trains.list)this.paidTr.add(t.id);this.hud();},
  segCost(q){let c=q.L*110;for(const sp of q.spans||[]){const L=sp[1]-sp[0];c+=sp[2]==='t'?L*1400:L*[900,850,1150,950,1000,520][sp[3]|0];}return c;},
  paidSeg(a,b,old){const c=old&&this.paid.has(old.id)?this.paid.get(old.id):0,tot=(a.L+b.L)||1;this.paid.set(a.id,c*a.L/tot);this.paid.set(b.id,c*b.L/tot);if(old)this.paid.delete(old.id);},
  canBuild(){return !this.on()||this.cash>0||this.loan<this.maxLoan;},
  spend(c,why){if(c<=0)return;this.cash-=c;this.year.exp+=c;if(this.cash<0&&this.loan<this.maxLoan){const b=Math.min(this.maxLoan-this.loan,Math.ceil(-this.cash/50000)*50000);this.loan+=b;this.cash+=b;UI.toast(`Borrowed €${this.fmt(b)} to pay for ${why}`);}
    this.note(-c,why);this.hud();},
  earn(c,where,x,y,z){this.cash+=c;this.year.inc+=c;this.note(c,where,x,y,z);this.hud();},
  // OpenTTD-ish: €/passenger-km, full pay up to an expected trip time (65 km/h + stops), less when slow
  fare(p,si){if(p.fx==null)return 0;const d=Math.abs(si.x-p.fx)+Math.abs(si.z-p.fz),T=App.time-(p.t0||App.time),exp=d/15+75,f=clamp(1.6-0.6*T/exp,0.25,1.3);return 350*P.fareRate*(d/1000)*f;},
  check(){if(!this.on()){this.hud();return;}this.init();let cost=0,refund=0;const live=new Set();
    for(const q of Track.segs){if(q.pend)continue;live.add(q.id);if(!this.paid.has(q.id)){const c=this.segCost(q);this.paid.set(q.id,c);cost+=c;}}
    for(const [id,c] of this.paid)if(!live.has(id)){refund+=c*0.5;this.paid.delete(id);}
    for(const st of Track.stations)if(!this.paidSt.has(st.id)){this.paidSt.add(st.id);cost+=25000;}
    for(const t of Trains.list)if(!this.paidTr.has(t.id)){this.paidTr.add(t.id);cost+=40000+t.veh.length*15000;}
    if(cost>refund)this.spend(Math.round(cost-refund),'building');else if(refund>cost){this.cash+=refund-cost;this.note(refund-cost,'demolition refund');this.hud();}},
  newDay(){if(!this.on()||!this.loan)return;const i=this.loan*0.05/(4*Math.max(1,P.daysPerSeason));this.cash-=i;this.year.exp+=i;this.hud();},
  borrow(){if(this.loan>=this.maxLoan){UI.toast('The bank will not lend more');return;}const b=Math.min(50000,this.maxLoan-this.loan);this.loan+=b;this.cash+=b;this.hud();},
  repay(){const r=Math.min(50000,this.loan,Math.max(0,this.cash));if(r<=0){UI.toast(this.loan?'Not enough cash to repay':'No loan');return;}this.loan-=r;this.cash-=r;this.hud();},
  note(v,txt,x,y,z){this.flo.push({v,txt,x,y,z,t:0});if(this.flo.length>6){const o=this.flo.shift();if(o.el)o.el.remove();}},
  hud(){let el=document.getElementById('money');if(!el){el=document.createElement('div');el.id='money';el.style.cssText='margin-top:4px;font:600 14px system-ui;color:#fff;text-shadow:0 1px 2px #000;pointer-events:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap';
      const hud=document.getElementById('hud');if(!hud)return;hud.appendChild(el);el.innerHTML='<span id="mCash" role="button" title="Tap for the bank: borrow or repay" style="cursor:pointer"></span><button id="mBor" hidden style="font-size:12px;padding:2px 8px">Borrow</button><button id="mRep" hidden style="font-size:12px;padding:2px 8px">Repay</button><div id="mLog" style="width:100%;font-weight:500;font-size:12px"></div>';
      /* the bank's buttons show only after a tap on the money, and hide again after a while */
      const bank=on=>{el.querySelector('#mBor').hidden=!on;el.querySelector('#mRep').hidden=!on;clearTimeout(this.bankT);if(on)this.bankT=setTimeout(()=>bank(false),8000);};
      el.querySelector('#mCash').onclick=e=>{e.stopPropagation();bank(el.querySelector('#mBor').hidden);};
      el.querySelector('#mBor').onclick=e=>{e.stopPropagation();this.borrow();bank(true);};el.querySelector('#mRep').onclick=e=>{e.stopPropagation();this.repay();bank(true);};}
    el.hidden=!this.on();if(!this.on())return;const c=el.querySelector('#mCash');c.textContent=`€ ${this.fmt(this.cash)}`+(this.loan?`  ·  loan € ${this.fmt(this.loan)}`:'');c.style.color=this.cash<0?'#ff9a8a':'#fff';},
  tick(dt){if(!this.on())return;this.acc=(this.acc||0)+dt;if(this.acc>1){this.acc=0;this.check();}
    const lg=document.getElementById('mLog');if(lg){this.flo.forEach(f=>{f.t+=dt;if(f.t>=6&&f.el)f.el.remove();});this.flo=this.flo.filter(f=>f.t<6);const h=this.flo.map(f=>`<div style="color:${f.v>=0?'#bff5b0':'#ffb3a6'}">${f.v>=0?'+':'−'}€ ${this.fmt(Math.abs(f.v))} ${f.txt}</div>`).join('');if(h!==this.logH){this.logH=h;lg.innerHTML=h;}}
    // floating income above the station, like OpenTTD
    for(const f of this.flo){if(f.x==null)continue;let d=f.el;if(!d){d=f.el=document.createElement('div');d.style.cssText='position:fixed;pointer-events:none;font:700 15px system-ui;color:#c9ffb8;text-shadow:0 1px 3px #000;transform:translate(-50%,-50%)';document.body.appendChild(d);d.textContent=`+€ ${this.fmt(f.v)}`;}
      const p=Cam.toScreen(f.x,f.y+8+f.t*3,f.z);if(p){d.style.left=p[0]+'px';d.style.top=p[1]+'px';d.style.opacity=String(clamp(1.5-f.t/4,0,1));}else d.style.opacity='0';}}
};
// screen-space pick of a train: nearest vehicle centre to the tap, projected
function pickTrain(sx,sy){let best=-1,bd=Math.max(34,Math.min(80,6000/Math.max(Cam.dist||100,1)));Trains.list.forEach((t,i)=>{if(!t.poses)return;for(const p of t.poses){if(!p)continue;const q=Cam.toScreen(p.c[0],p.c[1]+2,p.c[2]);if(!q)continue;const d=Math.hypot(q[0]-sx,q[1]-sy);if(d<bd){bd=d;best=i;}}});return best;}
// ===================================================================
// GOODS: grain and produce from farming villages' farms, mail from every village, wood from sawmills. Loading points
// (train stations, bus stops) collect what is produced within reach; goods trains and lorries carry it to places that
// accept it (grain: villages with a bakery, produce: with a market, mail and wood: any village). Pay = units × km × rate.
// ===================================================================
const Goods={T:{grain:{icon:'🌾',rate:60},produce:{icon:'🥕',rate:80},mail:{icon:'✉️',rate:120},wood:{icon:'🪵',rate:50},gold:{icon:'🥇',rate:260},silver:{icon:'🥈',rate:180},diamond:{icon:'💎',rate:420}},stock:new Map(),acc:0,
  get(k){let s=this.stock.get(k);if(!s){s={grain:0,produce:0,mail:0,wood:0,gold:0,silver:0,diamond:0};this.stock.set(k,s);}return s;},
  accepts(v,t){if(!v)return false;if(ORE[t])return !!v.bankOwned;const lv=v.level|0;return t==='mail'||((t==='grain'||t==='produce')&&lv>=1);},
  woodSink(k,x,z){const id=+k.slice(3);if(k[0]==='s'){const st=Track.stations.find(q=>q.id===id);if(st&&st.workshop)return true;}else{const bs=Buses.stops.find(q=>q.id===id);if(bs&&bs.workshop)return true;}return (Life.workshops||[]).some(m=>Math.hypot(m.x-x,m.z-z)<250);},
  src(x,z){const r={grain:0,produce:0,mail:0,wood:0,gold:0,silver:0,diamond:0};for(const v of Life.villages||[]){if(v.farmOwned){const f=v.farm||v;if(Math.hypot(f.x-x,f.z-z)<650){r.produce+=0.035;}}/* grain only at the farm's own grain station */if(Math.hypot(v.x-x,v.z-z)<500)r.mail+=0.02*((v.level|0)+1);}
    for(const m of Life.sawmills||[])if(Life.indOn('sawmill',m)&&Math.hypot(m.x-x,m.z-z)<650)r.wood+=0.06;return r;},
  tick(dt){this.acc+=dt;if(this.acc<1)return;const a=this.acc*P.goodsRate;this.acc=0;const pts=[];for(const si of Life.stInfo||[])pts.push(['st:'+si.st.id,si.x,si.z,si.st]);for(const s of Buses.stops)pts.push(['bs:'+s.id,s.x,s.z,s]);
    for(const [k,x,z,o] of pts){const S=this.get(k),r=this.src(x,z);if(o.sawmill){const m=Crane.ind('sawmill',o.sawmill);if(m&&Life.indOn('sawmill',m))r.wood+=0.18;}if(o.mine){const m=Crane.ind('mine',o.mine);if(m&&Life.indOn('mine',m))r[m.type]+=0.16;}if(o.farm){const fm=Life.farmOf(o);if(fm&&fm.v.farmOwned)r.grain+=0.22;}for(const t in r)S[t]=Math.min(60,S[t]+r[t]*a);}},
  deliver(k,x,z,v,hold,where,label){let pay=0,units=0;const parts=[];for(const t in hold){const c=hold[t];if(!c||c.n<1||c.from===k||!(t==='wood'?this.woodSink(k,x,z):this.accepts(v,t)))continue;const km=(Math.abs(x-c.fx)+Math.abs(z-c.fz))/1000;pay+=c.n*km*this.T[t].rate*P.fareRate;units+=c.n;parts.push(`${Math.floor(c.n)} ${this.T[t].icon}`);c.n=0;}
    this.lastPay=(this.lastPay||0)+(Money.on()&&units?Math.round(pay):0);if(units){if(Money.on()&&pay>0)Money.earn(Math.round(pay),`${label} → ${where}`,x,R.sampleHr(R.world,x,z),z);if(v)Life.addGrowth(v,units*0.6);Icons.add(x,R.sampleHr(R.world,x,z)+4,z,'−'+parts.join(' '));}return units;},
  load(k,x,z,hold,caps){const S=this.get(k),parts=[];for(const t in caps){const c=hold[t]||(hold[t]={n:0,fx:x,fz:z,from:k});const take=Math.min(caps[t]-c.n,Math.floor(S[t]));if(take<1)continue;if(c.n<1){c.fx=x;c.fz=z;c.from=k;}c.n+=take;S[t]-=take;parts.push(`${take} ${this.T[t].icon}`);}
    if(parts.length)Icons.add(x,R.sampleHr(R.world,x,z)+5,z,'+'+parts.join(' '));},
  trainStop(tr,si){const k='st:'+si.st.id,crane=!!(si.st.sawmill||si.st.workshop),mn=si.st.mine?Crane.ind('mine',si.st.mine):null,skip=w=>(crane&&w.ctype==='wood')||(mn&&w.ctype===mn.type)||(si.st.farm&&w.ctype==='grain'),hold={},caps={};for(const w of tr.veh)if(w.k==='wagon'&&!skip(w)){hold[w.ctype]=hold[w.ctype]||{n:0,fx:si.x,fz:si.z,from:null};}
    const W=tr.veh.filter(w=>w.k==='wagon'&&!skip(w));for(const t in hold){const ws=W.filter(w=>w.ctype===t);const n=ws.reduce((a,w)=>a+(w.n||0),0);if(n>0){hold[t]={n,fx:ws[0].fx,fz:ws[0].fz,from:ws[0].from};}caps[t]=ws.length*20;}
    this.deliver(k,si.x,si.z,si.v,hold,si.st.name,tr.name);this.load(k,si.x,si.z,hold,caps);
    for(const t in hold){let left=hold[t].n;for(const w of W.filter(w=>w.ctype===t)){w.n=Math.min(20,left);left-=w.n;w.fx=hold[t].fx;w.fz=hold[t].fz;w.from=hold[t].from;}}},
  lorryStop(b,s){const k='bs:'+s.id;b.cargo=b.cargo||{};this.deliver(k,s.x,s.z,s.v,b.cargo,s.name,b.name);const used=Object.values(b.cargo).reduce((a,c)=>a+(c.n||0),0),free=Math.max(0,16-used),caps={};
    for(const t of ['mail','produce','grain','wood'])caps[t]=(b.cargo[t]?b.cargo[t].n:0)+Math.floor(free/4);this.load(k,s.x,s.z,b.cargo,caps);},
  summary(v){const S={grain:0,produce:0,mail:0,wood:0,gold:0,silver:0,diamond:0};for(const si of Life.stInfo||[])if(si.v===v){const g=this.get('st:'+si.st.id);for(const t in S)S[t]+=g[t];}for(const s of Buses.stops)if(s.v===v){const g=this.get('bs:'+s.id);for(const t in S)S[t]+=g[t];}return S;}};
const Icons={L:[],
  add(x,y,z,k){if(this.L.length>40)return;const d=document.createElement('div');d.style.cssText='position:fixed;pointer-events:none;transform:translate(-50%,-50%);display:flex;align-items:center;gap:1px;font:800 17px system-ui;text-shadow:0 1px 2px #000;opacity:0';
    if(k.length>1){d.innerHTML=`<span style="color:${k[0]==='+'?'#9cf28a':'#ffd27a'};font-size:15px">${k}</span>`;document.body.appendChild(d);this.L.push({x,y,z,t:-0.6,d});return;}
    const col=k==='+'?'#5ee35e':'#ffb04d';d.innerHTML=`<span style="color:${col}">${k==='+'?'+':'−'}</span><svg width="12" height="18" viewBox="0 0 12 18"><circle cx="6" cy="3" r="2.6" fill="${col}"/><path d="M2 7h8v6h-2v5H4v-5H2z" fill="${col}"/></svg>`;
    document.body.appendChild(d);this.L.push({x,y,z,t:0,d});},
  tick(dt){for(const q of this.L){q.t+=dt;const p=Cam.toScreen(q.x,q.y+q.t*1.2,q.z);if(p){q.d.style.left=p[0]+'px';q.d.style.top=p[1]+'px';q.d.style.opacity=String(clamp(Math.min(q.t*4,2.2-q.t),0,1));}else q.d.style.opacity='0';}
    for(const q of this.L)if(q.t>2.2)q.d.remove();this.L=this.L.filter(q=>q.t<=2.2);}};
// ===================================================================
// ROADS (player-built gravel roads) and BUSES (stop to stop along any road, fares like the trains)
// ===================================================================
const Roads={list:[],tool:'build',a:null,undoL:[],nid:0,ver:0,
  // the open ends of roads you built (gold rings to build on from): an end that does not meet another road
  ends(){const key=this.list.length+':'+this.ver+':'+((Life.roads||[]).length);if(this.endKey===key)return this.endC;const out=[],all=new Set([...(Life.roads||[]),...this.list]);
    for(const r of this.list){if(!r.id)r.id=++this.nid;const p=r.p,n=p.length/2;if(n<2)continue;for(const e of [0,1]){const k=e?n-1:0,k2=e?n-2:1,x=p[k*2],z=p[k*2+1],h=Math.atan2(z-p[k2*2+1],x-p[k2*2]);
      let joined=false;for(const o of all){if(o===r||o.disc||!o.p||o.h)continue;const q=o.p;for(let i=0;i+3<q.length&&!joined;i+=2)if(VG.segDist([q[i],q[i+1],q[i+2],q[i+3]],x,z)[0]<2.5)joined=true;if(joined)break;}
      if(!joined)out.push({id:'r'+r.id+(e?'b':'a'),x,z,y:ground0(x,z)+0.4,h,g:0,road:r,end:e});}}
    this.endKey=key;this.endC=out;return out;},
  // a planned road (pieces from Build) becomes a gravel road: points every 4 m or less along it
  commitPlan(p){const pts=[];for(const pc of p.pieces){const n=Math.max(1,Math.ceil(pc.L/4)),k0=pts.length?1:0;for(let i=k0;i<=n;i++){const q=segPoint(pc,pc.L*i/n);const l=pts[pts.length-1];if(l&&Math.hypot(q[0]-l[0],q[1]-l[1])<0.5)continue;pts.push([q[0],q[1]]);}}
    if(pts.length<2)return null;this.undoL.push(JSON.stringify(this.list.map(r=>({p:Array.from(r.p),w:r.w,kind:r.kind,id:r.id}))));if(this.undoL.length>60)this.undoL.shift();
    let L=0;for(let k=1;k<pts.length;k++)L+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);const r={p:pts.flat(),w:1.4,kind:1,player:true,id:++this.nid};this.list.push(r);this.ver++;
    Life.roadsDirty=true;Buses.G=null;Buses.legCache=null;if(Money.on())Money.spend(Math.round(L*45),'road');Log.info(`road built (${Build.mode}): ${L.toFixed(0)} m`);Sfx.clunk&&Sfx.clunk();return r;},
  undo(){const u=this.undoL.pop();if(!u){UI.toast('Nothing to undo');return false;}this.list=JSON.parse(u).map(r=>({...r,player:true}));this.nid=Math.max(this.nid,...this.list.map(r=>r.id||0));this.ver++;Life.roadsDirty=true;Buses.G=null;Buses.legCache=null;return true;},
  hint(){return this.tool==='build'?'':this.tool==='stop'?'Tap on a road to put a bus stop there (near a village, people will come).':this.tool==='remove'?'Tap a road you built, or a bus stop, to remove it.':this.a?'Tap the next point. The road continues from the last one; ↺ starts it somewhere else.':'Tap where the road should start (on an existing road joins it).';},
  nearestRoad(x,z,maxd){let best=null,bd=maxd;const LR=Life.roads||[];for(const r of LR.concat(this.list.filter(q=>!LR.includes(q)))){if(r.disc)continue;const p=r.p;for(let i=0;i+3<p.length;i+=2){const ax=p[i],az=p[i+1],ex=p[i+2]-ax,ez=p[i+3]-az,ll=ex*ex+ez*ez;if(ll<1e-6)continue;const t=clamp(((x-ax)*ex+(z-az)*ez)/ll,0,1),qx=ax+ex*t,qz=az+ez*t,d=Math.hypot(x-qx,z-qz);
      if(d<bd){bd=d;const l=Math.sqrt(ll);best={x:qx,z:qz,dx:ex/l,dz:ez/l,w:r.w,road:r};}}}return best;},
  tap(h){if(!h)return;const T=R.world;
    if(this.tool==='stop'){const sw=Life.nearSawSlot(h[0],h[2],32);if(sw&&sw.kind==='mine'){UI.toast('Ore goes by rail: build a station at the mine');return;}if(sw&&sw.kind==='farm'){UI.toast('Grain goes by rail: build a station at the farm');return;}if(sw&&!Buses.stops.some(q=>q[sw.kind]&&q[sw.kind].mi===sw.mi&&q[sw.kind].k===sw.k)){const sl=sw.slot,dx=Math.cos(sl.t),dz=Math.sin(sl.t);
        const nr=this.nearestRoad(sl.p[0],sl.p[1],400);if(nr&&Math.hypot(nr.x-sl.p[0],nr.z-sl.p[1])>4){const pts=Life.routePath([sl.p[0],sl.p[1]],[nr.x,nr.z],{cs:5,margin:60,bridge:true,wind:0.1,road:0.6,maxG:0.32});if(pts){this.list.push({p:pts.flat(),w:1.4,kind:1,player:true});}}
        this.list.push({p:[sl.p[0]-dx*10,sl.p[1]-dz*10,sl.p[0]+dx*10,sl.p[1]+dz*10],w:2.2,kind:1,player:true});Life.roadsDirty=true;
        Buses.stops.push({id:Buses.nextId++,x:sl.p[0],z:sl.p[1],rx:sl.p[0],rz:sl.p[1],rot:sl.t,v:sw.m.v,name:Life.indName(sw),waiting:0,[sw.kind]:{mi:sw.mi,k:sw.k}});Buses.stopAdded(Buses.stops[Buses.stops.length-1]);if(Money.on())Money.spend(12000,'loading bay');Build.info(`Lorry loading bay at the ${sw.kind==='sawmill'?'sawmill':'wood workshop'} placed.`);return;}
      const q=this.nearestRoad(h[0],h[2],14);if(!q){UI.toast('Tap on a road to place a bus stop');return;}if(!Money.canBuild()){UI.toast('Out of money');return;}
      const v=Life.nearestVillage(q.x,q.z,500),side=1,n=Buses.stops.filter(s=>s.v===v).length,cs=Life.castleList().find(c=>Math.hypot(c.x-q.x,c.z-q.z)<450);Buses.stops.push({id:Buses.nextId++,x:q.x-q.dz*(q.w+1.6)*side,z:q.z+q.dx*(q.w+1.6)*side,rx:q.x,rz:q.z,rot:Math.atan2(q.dz,q.dx),v,name:cs?(cs.name||'Castle')+' gate':v?v.name+(n?' '+(n+1):''):'Halte',waiting:0});if(cs)Build.info('Castle bus stop: visitors from the villages on the line ride here; their villages grow.');
      Buses.stopAdded(Buses.stops[Buses.stops.length-1]);if(Money.on())Money.spend(8000,'bus stop');Sfx.clunk&&Sfx.clunk();Build.info(`Bus stop ${Buses.stops[Buses.stops.length-1].name} placed.`);return;}
    if(this.tool==='remove'){let bi=-1,bd=10;Buses.stops.forEach((s,i)=>{const d=Math.hypot(s.x-h[0],s.z-h[2]);if(d<bd){bd=d;bi=i;}});if(bi>=0){const rs=Buses.stops.splice(bi,1)[0];Buses.stopRemoved(rs);Build.info('Bus stop removed.');return;}
      const q=this.nearestRoad(h[0],h[2],8);if(q&&this.list.includes(q.road)){this.undoL.push(JSON.stringify(this.list.map(r=>({p:Array.from(r.p),w:r.w,kind:r.kind,id:r.id}))));this.list.splice(this.list.indexOf(q.road),1);this.ver++;Life.roadsDirty=true;Build.info('Road removed.');}else Build.info('Only roads you built can be removed.');return;}
    let p=[h[0],h[2]];const snap=this.nearestRoad(p[0],p[1],6);if(snap)p=[snap.x,snap.z];if(!this.a){this.a=p;Build.info(this.hint());return;}
    if(!Money.canBuild()){UI.toast('Out of money');return;}
    let pts=this.tool==='route'?Life.routePath(this.a,p,{cs:5,margin:80,bridge:true,wind:0.15,road:0.6,maxG:0.32}):null;if(!pts){const L=Math.hypot(p[0]-this.a[0],p[1]-this.a[1]),n=Math.max(1,Math.ceil(L/6));pts=[];for(let k=0;k<=n;k++)pts.push([this.a[0]+(p[0]-this.a[0])*k/n,this.a[1]+(p[1]-this.a[1])*k/n]);}
    let L=0;for(let k=1;k<pts.length;k++)L+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);this.list.push({p:pts.flat(),w:1.4,kind:1,player:true});Life.roadsDirty=true;
    if(Money.on())Money.spend(Math.round(L*45),'road');Build.info(`Gravel road ${L.toFixed(0)} m built. Tap the next point, or ↺ to start somewhere else.`);this.a=p;}};
// BUSES AND LORRIES: every vehicle has its own ordered list of stops (new stops join it until you edit it) and drives the road network
// (a graph of all roads but garden paths, junctions joined within 7 m) in the right-hand lane, slows for bends and queues behind the vehicle
// ahead in its lane, also at a stop that is taken. Off the network it falls back to a path over the land.
const Buses={stops:[],list:[],nextId:1,pending:0,pendingList:null,G:null,legCache:null,
  isCargo(s){return !!(s&&(s.sawmill||s.workshop||s.mine||s.farm));},
  stopById(id){return this.stops.find(s=>s.id===id)||null;},
  route(b){return (b.stops||[]).map(id=>this.stopById(id)).filter(Boolean);},
  cur(b){const R2=this.route(b);return R2.length?R2[b.leg%R2.length]:null;},
  defaultStops(goods){const S=this.stops.filter(s=>goods||!this.isCargo(s));if(!S.length)return[];const out=[S[0]],left=S.slice(1);
    while(left.length){const a=out[out.length-1];let bi=0,bd=1e9;left.forEach((q,i)=>{const d=Math.hypot(q.x-a.x,q.z-a.z);if(d<bd){bd=d;bi=i;}});out.push(left.splice(bi,1)[0]);}return out.map(s=>s.id);},
  make(goods,name,stops,k){const S=stops?stops.filter(id=>this.stopById(id)):this.defaultStops(goods),s0=this.stopById(S[0])||this.stops[0],nb=this.list.filter(q=>!!q.goods===!!goods).length+1;
    const r0=s0?s0.rot:0,kq=s0?this.list.filter(q=>Math.hypot(q.x-s0.rx,q.z-s0.rz)<12+10*this.list.length).length:0,x0=s0?s0.rx-Math.sin(r0)*1.15-Math.cos(r0)*10*kq:0,z0=s0?s0.rz+Math.cos(r0)*1.15-Math.sin(r0)*10*kq:0;
    return{id:this.nextId++,goods:!!goods,type:goods?'blitz':'bus',earned:0,trips:0,cargo:{},name:name||(goods?`Lorry ${nb}`:`Bus ${nb}`),stops:S,allStops:!stops,leg:0,x:x0,z:z0,rot:r0,v:0,st:'dwell',wait:4+(k||0)*5,pax:[],hash:Math.random()};},
  add(goods,type){if(!Money.canBuild()){UI.toast('Out of money');return;}const b=this.make(goods);if(type==='dd'){b.type='dd';const nd=this.list.filter(q=>q.type==='dd').length+1;b.name=`Double-decker ${nd}`;}
    if(b.stops.length<2){UI.toast(goods?'Place at least two stops first (Build → Roads → Bus stop)':'Place at least two bus stops first (Build → Roads → Bus stop)');return;}
    b.wait=4+6*this.list.filter(q=>q.st==='dwell'&&Math.hypot(q.x-b.x,q.z-b.z)<10).length;this.list.push(b);if(Money.on())Money.spend(RV[RoadVeh.type(b)].price,goods?'lorry':'bus');UI.toast(`${b.name} serves ${b.stops.length} stops`);BusUI.refresh();},
  remove(b){this.list=this.list.filter(q=>q!==b);if(RoadVeh.sel===b||RoadVeh.drv===b)RoadVeh.close();BusUI.refresh();},
  stopAdded(s){for(const b of this.list)if(b.allStops&&(b.goods||!this.isCargo(s)))b.stops.push(s.id);this.legCache=null;BusUI.refresh();},
  stopRemoved(s){for(const b of this.list){const i=b.stops.indexOf(s.id);if(i>=0){b.stops.splice(i,1);if(b.leg>i||b.leg>=b.stops.length)b.leg=Math.max(0,b.leg-1);b.path=null;}}this.legCache=null;BusUI.refresh();},
  edited(b){b.allStops=false;b.path=null;if(b.leg>=b.stops.length)b.leg=0;this.legCache=null;BusUI.refresh();},
  restore(){if(this.pendingList){for(const q of this.pendingList){const b=this.make(q.goods,q.name,q.stops,this.list.length);b.allStops=!!q.allStops;if(q.type==='dd')b.type='dd';b.earned=+q.earned||0;b.trips=+q.trips||0;if(b.stops.length)this.list.push(b);}this.pendingList=null;this.pending=0;}
    else if(this.pending&&this.stops.length>1){for(let k=0;k<this.pending;k++){const b=this.make(false,null,null,k);if(b.stops.length>1)this.list.push(b);}this.pending=0;}},
  // ---- the road network as a graph: polyline points (long pieces split to 8 m), shared points merged, loose road ends joined to the nearest other road
  graph(){if(this.G)return this.G;const N=[],E=[],H=new Map(),PI=[],key=(x,z)=>Math.round(x/1.5)+','+Math.round(z/1.5);
    const node=(x,z,pi)=>{const k=key(x,z);let i=H.get(k);if(i===undefined){i=N.length;N.push([x,z]);E.push([]);PI.push(pi);H.set(k,i);}return i;},link=(a,b)=>{if(a===b||E[a].some(e=>e[0]===b))return;const d=Math.hypot(N[a][0]-N[b][0],N[a][1]-N[b][1]);E[a].push([b,d]);E[b].push([a,d]);};
    const ends=[];(Life.roads||[]).forEach((r,pi)=>{if(r.disc||r.h||!r.p||r.p.length<4)return;let prev=-1;for(let i=0;i+1<r.p.length;i+=2){const x=r.p[i],z=r.p[i+1];if(prev>=0){const px=N[prev][0],pz=N[prev][1],L=Math.hypot(x-px,z-pz),n=Math.max(1,Math.ceil(L/8));
          for(let k=1;k<=n;k++){const q=node(px+(x-px)*k/n,pz+(z-pz)*k/n,pi);link(prev,q);prev=q;}}else prev=node(x,z,pi);if(i===0||i+3>=r.p.length)ends.push([prev,pi]);}});
    const GR=new Map(),gk=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16);N.forEach((p,i)=>{const k=gk(p[0],p[1]);if(!GR.has(k))GR.set(k,[]);GR.get(k).push(i);});
    const nearest=(x,z,r,skip)=>{let b=-1,bd=r;for(let kz=Math.floor((z-r)/16);kz<=Math.floor((z+r)/16);kz++)for(let kx=Math.floor((x-r)/16);kx<=Math.floor((x+r)/16);kx++)for(const i of GR.get(kx+','+kz)||[]){if(skip&&skip(i))continue;const d=Math.hypot(N[i][0]-x,N[i][1]-z);if(d<bd){bd=d;b=i;}}return b;};
    for(const [e,pi] of ends){if(E[e].length>1)continue;const j=nearest(N[e][0],N[e][1],7,i=>PI[i]===pi||i===e);if(j>=0)link(e,j);}
    return this.G={N,E,nearest};},
  roadPath(a,b){const G=this.graph(),s0=G.nearest(a[0],a[1],25),s1=G.nearest(b[0],b[1],25);if(s0<0||s1<0)return null;const n=G.N.length,g=new Float64Array(n).fill(1e30),pr=new Int32Array(n).fill(-1),hk=[],hv=[];
    const push=(v,k)=>{hk.push(k);hv.push(v);let i=hv.length-1;while(i>0){const p=(i-1)>>1;if(hv[p]<=hv[i])break;[hv[p],hv[i]]=[hv[i],hv[p]];[hk[p],hk[i]]=[hk[i],hk[p]];i=p;}};
    const pop=()=>{const k=hk[0],lv=hv.pop(),lk=hk.pop();if(hv.length){hv[0]=lv;hk[0]=lk;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<hv.length&&hv[l]<hv[m])m=l;if(r<hv.length&&hv[r]<hv[m])m=r;if(m===i)break;[hv[m],hv[i]]=[hv[i],hv[m]];[hk[m],hk[i]]=[hk[i],hk[m]];i=m;}}return k;};
    g[s0]=0;push(0,s0);while(hv.length){const v0=hv[0],k=pop();if(v0>g[k])continue;if(k===s1)break;for(const [j,d] of G.E[k]){const ng=g[k]+d;if(ng<g[j]){g[j]=ng;pr[j]=k;push(ng,j);}}}
    if(s0!==s1&&pr[s1]<0)return null;const pts=[];for(let k=s1;k>=0;k=pr[k]){pts.push(G.N[k].slice());if(k===s0)break;}pts.reverse();pts.unshift([a[0],a[1]]);pts.push([b[0],b[1]]);return pts;},
  plen(p){let L=0;for(let k=1;k<p.length;k++)L+=Math.hypot(p[k][0]-p[k-1][0],p[k][1]-p[k-1][1]);return L;},
  // road distance from stop a to stop b (cached), and whether it follows the roads
  legLen(a,b){this.legCache=this.legCache||new Map();const k=a.id+'>'+b.id;if(this.legCache.has(k))return this.legCache.get(k);const p=this.roadPath([a.rx,a.rz],[b.rx,b.rz]),r=p?{len:this.plen(p),road:true}:{len:Math.hypot(a.rx-b.rx,a.rz-b.rz)*1.3,road:false};this.legCache.set(k,r);return r;},
  // the lane: the road line rounded off once, then 0.9 m to the right; the last point pulls in at the stop
  plan(b,t){let p=this.roadPath([b.x,b.z],[t.rx,t.rz]);b.onRoad=!!p;if(!p)p=Life.routePath([b.x,b.z],[t.rx,t.rz],{cs:5,margin:140,bridge:true,wind:0,road:0.12,maxG:0.4})||[[b.x,b.z],[t.rx,t.rz]];
    const q=[p[0]];for(let i=0;i<p.length-1;i++){const a=p[i],c=p[i+1];if(Math.hypot(c[0]-a[0],c[1]-a[1])<0.3)continue;q.push([a[0]*.75+c[0]*.25,a[1]*.75+c[1]*.25],[a[0]*.25+c[0]*.75,a[1]*.25+c[1]*.75]);}q.push(p[p.length-1]);
    const n=q.length,L=[];for(let i=0;i<n;i++){const a=q[Math.max(0,i-1)],c=q[Math.min(n-1,i+1)];let dx=c[0]-a[0],dz=c[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const o=i===0?0:i===n-1?1.15:0.9;L.push([q[i][0]-dz*o,q[i][1]+dx*o]);}
    b.path=L;const c=[0];for(let k=1;k<L.length;k++)c.push(c[k-1]+Math.hypot(L[k][0]-L[k-1][0],L[k][1]-L[k-1][1]));b.cum=c;b.len=c[c.length-1];b.ps=0;b.pi=1;},
  at(b,s){const c=b.cum;let i=Math.max(1,b.pi||1);while(i<c.length-1&&c[i]<s)i++;while(i>1&&c[i-1]>s)i--;const a=b.path[i-1],e=b.path[i],u=clamp((s-c[i-1])/Math.max(1e-6,c[i]-c[i-1]),0,1);return{x:a[0]+(e[0]-a[0])*u,z:a[1]+(e[1]-a[1])*u,h:Math.atan2(e[1]-a[1],e[0]-a[0]),i};},
  arrive(b,t){b.st='dwell';b.v=0;b.trips=(b.trips||0)+1;if(b.goods){b.wait=t.sawmill||t.workshop?36:10;Goods.lastPay=0;Goods.lorryStop(b,t);b.earned=(b.earned||0)+(Goods.lastPay||0);return;}b.wait=b.type==='dd'?11:8;let off=0,inc=0;const R2=this.route(b);
    b.pax=b.pax.filter(p=>{if(p.dest===t.id||!R2.some(q=>q.id===p.dest)||Math.random()<0.08){off++;if(Money.on())inc+=Money.fare(p,t)*(t.castle?1.6:1);if(t.castle&&p.fv){p.fv.trans=(p.fv.trans||0)+1;Life.addGrowth(p.fv,0.8);t.visits=(t.visits||0)+1;}return false;}return true;});
    for(let k=0;k<Math.min(off,6);k++)Icons.add(t.x+(Math.random()-0.5)*2,R.sampleHr(R.world,t.x,t.z)+3,t.z+(Math.random()-0.5)*2,'-');if(inc>0){b.earned=(b.earned||0)+Math.round(inc);}if(inc>0)Money.earn(Math.round(inc),`${b.name} → ${t.name}`,t.x,R.sampleHr(R.world,t.x,t.z),t.z);
    const o=R2.filter(q=>q!==t&&!q.cargo),oc=o.filter(q=>q.castle),n=Math.min(Math.floor(t.waiting),RV[RoadVeh.type(b)].cap-b.pax.length);
    for(let k=0;k<n&&o.length;k++){const d=!t.castle&&oc.length&&Math.random()<0.4?oc[Math.floor(Math.random()*oc.length)]:o[Math.floor(Math.random()*o.length)];b.pax.push({dest:d.id,fx:t.x,fz:t.z,t0:App.time,fv:t.v});if(k<6)Icons.add(t.x+(Math.random()-0.5)*2,R.sampleHr(R.world,t.x,t.z)+3,t.z+(Math.random()-0.5)*2,'+');}
    t.waiting-=Math.max(0,n);if(t.v&&(off||n>0)){t.v.trans=(t.v.trans||0)+off+Math.max(0,n);Life.addGrowth(t.v,(off+Math.max(0,n))*0.5);}},
  status(b){const t=this.cur(b);if(!t)return'No stops';if(b.st==='dwell')return(b.goods?'Loading at ':'At ')+t.name;if(b.queued)return'Waiting behind '+b.queued+' → '+t.name;return'→ '+t.name+(b.onRoad===false?' (off the roads)':'');},
  update(dt){const ST=this.stops,CS=Life.castleList();for(const s of ST){s.cargo=this.isCargo(s);s.castle=!s.cargo&&CS.some(c=>Math.hypot(c.x-s.x,c.z-s.z)<450);const lv=s.v?(s.v.level|0):0;
      s.waiting=s.cargo?0:s.castle?Math.min(20,s.waiting+dt*0.03*P.people):Math.min(16+lv*12,s.waiting+dt*(s.v?0.05*P.people*(1+lv*0.9):0.01));}
    for(const b of this.list){if(b.manual)continue;/* driven by the player (RoadVeh) */const R2=this.route(b);if(R2.length<2){b.v=0;b.st='dwell';continue;}const t=R2[b.leg%R2.length];
      if(b.st==='dwell'){b.v=0;b.wait-=dt;/* leave once nobody with right of way is about to move off right beside it. A vehicle queued behind this one (waiting for
        it to leave) never holds it: that used to lock two or three vehicles at the same stop for good. After 20 s of waiting it goes anyway. */
        if(b.wait<=0&&(b.wait<-20||!this.list.some(o=>o!==b&&o.st==='drive'&&o.v<2&&!o.queued&&Math.hypot(o.x-b.x,o.z-b.z)<9.5&&o.id<b.id&&((o.x-b.x)*Math.cos(b.rot)+(o.z-b.z)*Math.sin(b.rot))>-1))){b.leg=(b.leg+1)%R2.length;b.st='drive';b.path=null;}continue;}
      if(!b.path)this.plan(b,t);
      const rem=b.len-b.ps;let vt=Math.min(11,Math.sqrt(2*1.2*Math.max(0,rem))+0.5);
      {const p0=this.at(b,b.ps),p1=this.at(b,Math.min(b.len,b.ps+14));const turn=Math.abs(wrapPi(p1.h-p0.h));vt=Math.min(vt,11-7*clamp(turn/0.9,0,1));}
      b.queued=null;const fx=Math.cos(b.rot),fz=Math.sin(b.rot);for(const o of this.list){if(o===b)continue;const dx=o.x-b.x,dz=o.z-b.z;if(Math.abs(dx)>30||Math.abs(dz)>30)continue;
        const a=dx*fx+dz*fz,l=-dx*fz+dz*fx;if((a>0.05||(a>-0.05&&o.id<b.id&&o.st==='drive'))&&a<30&&Math.abs(l)<1.8&&Math.cos(o.rot-b.rot)>0.2){const lim=a<9.5?0:Math.sqrt(2*2*(a-9.5));if(lim<vt){vt=lim;if(lim<0.5)b.queued=o.name;}}}
      b.v+=clamp(vt-b.v,-3*dt,1.2*dt);if(b.v<0)b.v=0;b.ps=Math.min(b.len,b.ps+b.v*dt);
      if(b.len-b.ps<0.8&&!b.queued){this.arrive(b,t);continue;}
      const q=this.at(b,b.ps);b.pi=q.i;b.x=q.x;b.z=q.z;b.rot=lerpAng(b.rot,q.h,Math.min(1,dt*5));}}};
// ---- the bus list (Build → Roads → Bus list): every bus and lorry with its stops in order, the road distance of each leg and of a round
const BusUI={open:false,ed:null,
  toggle(){this.open=!this.open;this.refresh();},
  fmt(m){return m>=1000?(m/1000).toFixed(2)+' km':Math.round(m)+' m';},
  refresh(){let p=this.el;if(!p){p=this.el=document.createElement('div');p.id='busPanel';document.body.appendChild(p);
      p.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const i=+t.dataset.i,b=Buses.list[i];
        if(t.dataset.a==='x'){this.open=false;}else if(!b)return;else if(t.dataset.a==='go'){Cam.setMode('free');Cam.flyTo([b.x,R.sampleHr(R.world,b.x,b.z),b.z],40);}
        else if(t.dataset.a==='ed'){this.ed=this.ed===b?null:b;}else if(t.dataset.a==='del'){Buses.remove(b);return;}
        else{const k=+t.dataset.k;if(t.dataset.a==='up'&&k>0){[b.stops[k-1],b.stops[k]]=[b.stops[k],b.stops[k-1]];Buses.edited(b);return;}if(t.dataset.a==='dn'&&k<b.stops.length-1){[b.stops[k+1],b.stops[k]]=[b.stops[k],b.stops[k+1]];Buses.edited(b);return;}
          if(t.dataset.a==='rm'){b.stops.splice(k,1);Buses.edited(b);return;}}this.refresh();});
      p.addEventListener('change',e=>{const t=e.target;if(t.dataset.a!=='add'||!t.value)return;const b=Buses.list[+t.dataset.i];if(b){b.stops.push(+t.value);Buses.edited(b);}});}
    p.hidden=!this.open;const rb=$('#rBusList');if(rb)rb.classList.toggle('on',this.open);if(!this.open)return;
    let h=`<div class="vp-h"><div><b>Buses and lorries</b><span>${Buses.list.length} vehicles · ${Buses.stops.length} stops</span></div><button data-a="x" aria-label="Close" title="Close">✕</button></div>`;
    if(!Buses.list.length)h+=`<div class="bp-note">No buses yet. Place bus stops on roads, then add a bus (Build → Roads).</div>`;
    Buses.list.forEach((b,i)=>{const RS=Buses.route(b);let round=0,allRoad=true;const legs=RS.map((s,k)=>{const a=RS[(k-1+RS.length)%RS.length],L=RS.length>1?Buses.legLen(a,s):{len:0,road:true};round+=L.len;if(!L.road)allRoad=false;return L;});
      h+=`<div class="bp-v"><div class="bp-h"><div><b>${b.goods?'🚚':'🚌'} ${esc(b.name)}</b><span>${esc(Buses.status(b))}${b.goods?'':' · '+b.pax.length+' aboard'}</span></div><button data-a="go" data-i="${i}">Go to</button><button data-a="ed" data-i="${i}" class="${this.ed===b?'on':''}">Stops</button></div>`;
      h+=`<div class="bp-sum">${RV[RoadVeh.type(b)].name} · ${RS.length} stops · round ${allRoad?'':'≈ '}${this.fmt(round)} · earned € ${Money.fmt(Math.round(b.earned||0))}</div>`;
      if(this.ed===b){h+=`<div class="bp-cap">in driving order · distance by road from the stop before</div><ol class="bp-s">`+RS.map((s,k)=>`<li${k===b.leg%RS.length?' class="cur"':''}><span>${esc(s.name)}</span><em>${RS.length>1?(legs[k].road?'':'≈ ')+this.fmt(legs[k].len):''}</em><button data-a="up" data-i="${i}" data-k="${k}" aria-label="Earlier">↑</button><button data-a="dn" data-i="${i}" data-k="${k}" aria-label="Later">↓</button><button data-a="rm" data-i="${i}" data-k="${k}" aria-label="Remove">✕</button></li>`).join('')+`</ol>`;
        const cand=Buses.stops.filter(s=>b.goods||!Buses.isCargo(s));h+=`<div class="bp-f"> <select data-a="add" data-i="${i}"><option value="">Add a stop…</option>${cand.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><button data-a="del" data-i="${i}">Remove ${b.goods?'lorry':'bus'}</button></div>`;}
      h+=`</div>`;});
    p.innerHTML=h;},
  tick(){if(this.open&&this.el&&(this.t=(this.t||0)+1)%45===0){const ae=document.activeElement;if(!(ae&&ae.tagName==='SELECT'&&ae.closest('#busPanel')))this.refresh();}}};
// trip card: when a train unloads at a village station, a card pops up over the station: the fare counting up, and the village's
// growth bar toward its next size filling with the points this stop brought (with a few sparks). Only shown when the camera is near.
// ---- load at a glance: a train standing at a station shows how full it is (seats, and each cargo kind in its wagons), running up and down
// as people board and goods are loaded; every station near the camera shows what is still waiting there (people and goods)
const SEATS=24,GOOD_IC={grain:'🌾',produce:'🥕',mail:'✉️',wood:'🪵',gold:'🥇',silver:'🥈',diamond:'💎'};
// ---- "busy" card for work that holds the game for a moment (rebuilding roads and bridges after a village grows, laying out a station):
// shown first, the work runs two frames later so the card is on screen; its spinner is a CSS transform animation, which keeps turning
// on the compositor while the script is busy
const Busy={n:0,run(text,fn){if(Bench.sync){/* benchmark world: heavy work runs at once, at a fixed simulation step, not whenever the next frame comes */try{fn();}catch(e){Log.err('busy task failed: '+(e.stack||e));}return;}const el=$('#busy');if(el){$('#busyText').textContent=text||'Updating…';el.hidden=false;}this.n++;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{try{fn();}catch(e){Log.err('busy task failed: '+e);}finally{if(--this.n<=0){this.n=0;const e2=$('#busy');if(e2)e2.hidden=true;}}}));}};
const LoadUI={tr:new Map(),st:new Map(),
  bar(ic,n,cap,full){const f=cap>0?clamp(n/cap,0,1):0;return`<div class="ld-r"><span>${ic}</span><i><b style="width:${(f*100).toFixed(0)}%" class="${f>0.98?'full':''}"></b></i><em>${Math.round(n)}/${cap}</em></div>`;},
  tick(dt){const show=App.T&&!Build.active,cp=Cam.pos||[0,0,0],live=new Set();
    if(show)for(const tr of Trains.list){if(tr.atSt==null||(Math.abs(tr.v||0)>0.3&&!(tr.plat&&tr.plat.moving))||!tr.poses||!tr.poses.length)continue;const mid=tr.poses[Math.floor(tr.poses.length/2)];if(!mid)continue;const c=mid.c;if(Math.hypot(c[0]-cp[0],c[2]-cp[2])>700)continue;
      live.add(tr);let q=this.tr.get(tr);if(!q){q={el:document.createElement('div'),disp:{}};q.el.className='ldcard';document.body.appendChild(q.el);this.tr.set(tr,q);}
      const coaches=tr.veh.filter(v=>v.k==='coach').length,boarding=Life.walkers.filter(w=>w.state==='board'&&w.train===tr).length,goal={};
      if(coaches)goal.pax=[tr.pax.length,coaches*SEATS,'🧍',boarding];for(const v of tr.veh)if(v.k==='wagon'){const g=goal[v.ctype]||(goal[v.ctype]=[0,0,GOOD_IC[v.ctype]||'📦',0]);g[0]+=v.n||0;g[1]+=20;}
      let h=`<div class="ld-h">${esc(tr.name)}</div>`;const pl=tr.plat;
      // too long for the platform: only the coaches beside it open; the train pulls up for the rest
      if(pl&&pl.short){const done=pl.served.size,n=pl.all.length,f=n?done/n:1;h+=`<div class="ld-short"><div>⚠ Platform ${pl.len} m · train ${Math.round(pl.trainL)} m</div><div class="ld-r"><span>🚃</span><i><b style="width:${(f*100).toFixed(0)}%"></b></i><em>${done}/${n}</em></div><div class="ld-n">${pl.moving?'Pulling up for the next coaches…':pl.blocked?'No room to pull up: some coaches stay shut':done<n?`${n-done} coach${n-done>1?'es':''} beyond the platform`:'All coaches done'}</div></div>`;}
      for(const k in goal){const g=goal[k],d=q.disp[k]==null?g[0]:q.disp[k];q.disp[k]=d+(g[0]-d)*Math.min(1,dt*1.6);h+=this.bar(g[2],q.disp[k],g[1])+(k==='pax'&&g[3]?`<div class="ld-n">+${g[3]} boarding</div>`:'');}
      if(q.h!==h){q.el.innerHTML=h;q.h=h;}const p=Cam.toScreen(c[0],c[1]+7,c[2]);if(p){q.el.style.display='';q.el.style.left=p[0]+'px';q.el.style.top=p[1]+'px';}else q.el.style.display='none';}
    for(const [tr,q] of this.tr)if(!live.has(tr)){q.el.remove();this.tr.delete(tr);}
    const ls=new Set();if(show)for(const si of Life.stInfo||[]){const d=Math.hypot(si.x-cp[0],si.z-cp[2]);if(d>700)continue;const id=si.st.id;ls.add(id);let q=this.st.get(id);if(!q){q={el:document.createElement('div')};q.el.className='ldchip';document.body.appendChild(q.el);this.st.set(id,q);}
      const wait=si.cargo?0:Life.walkers.filter(w=>w.st&&w.st.st&&w.st.st.id===id&&(w.state==='wait'||w.state==='toStation')).length,g=Goods.get('st:'+id);let h=`<b>${esc(si.st.name)}</b>`;
      if(!si.cargo&&!si.parent)h+=`<span>🧍 ${wait}</span>`;{const sh=Trains.list.find(t=>t.plat&&t.plat.short&&t.plat.id===id);if(sh)h+=`<span class="warn" title="The train is longer than the platform">⚠ ${si.st.len||44} m platform, too short for ${esc(sh.name)}</span>`;}for(const k in g)if(g[k]>=1)h+=`<span>${GOOD_IC[k]||'📦'} ${Math.floor(g[k])}</span>`;if(h===`<b>${esc(si.st.name)}</b>`)h+='<span class="none">nothing waiting</span>';
      if(q.h!==h){q.el.innerHTML=h;q.h=h;}const p=Cam.toScreen(si.x,si.y+3,si.z);if(p){q.el.style.display='';q.el.style.left=p[0]+'px';q.el.style.top=p[1]+'px';}else q.el.style.display='none';}
    for(const [id,q] of this.st)if(!ls.has(id)){q.el.remove();this.st.delete(id);}}};
const TripFX={L:[],
  show(si,money,pts,v,gp0){if(!(money>0||pts>0))return;const L=Life.LEVELS,lvOf=g=>{let l=0;for(let k=0;k<L.length;k++)if(g>=L[k].need)l=k;return l;},gp1=v?v.gp||0:0,l0=lvOf(gp0),l1=lvOf(gp1),
      fr=(g,l)=>l+1<L.length?clamp((g-L[l].need)/(L[l+1].need-L[l].need),0,1):1,f0=fr(gp0,l0),f1=l1>l0?1:fr(gp1,l1);
    const el=document.createElement('div');el.className='trip';const n=this.L.filter(q=>q.si===si&&q.t<4).length;
    el.innerHTML=(money>0?`<div class="tm">€ <b>0</b></div>`:'')+(v?`<div class="tv"><span>${esc(v.name)}</span><span class="tg">+${(Math.round(pts*10)/10)} growth</span></div><div class="tb"><i class="o" style="width:${(f0*100).toFixed(1)}%"></i><i class="n" style="left:${(f0*100).toFixed(1)}%;width:0%"></i></div>`+(l1>l0?`<div class="lv">${esc(v.name)} is now a ${L[l1].name.toLowerCase()}!</div>`:`<div class="tn">${l0+1<L.length?Math.max(0,Math.ceil(L[l0+1].need-gp1))+' to '+L[l0+1].name.toLowerCase():L[l0].name}</div>`):'');
    for(let k=0;k<10;k++){const s=document.createElement('i');s.className='sp';const a=k/10*6.283+Math.random()*0.4,r=34+Math.random()*30;s.style.setProperty('--dx',(Math.cos(a)*r).toFixed(0)+'px');s.style.setProperty('--dy',(Math.sin(a)*r*0.7-12).toFixed(0)+'px');s.style.animationDelay=(0.55+Math.random()*0.25).toFixed(2)+'s';el.appendChild(s);}
    el.style.display='none';document.body.appendChild(el);this.L.push({el,si,x:si.x,y:si.y+10+n*5.5,z:si.z,t:0,money,f0,f1,grown:false});},
  tick(dt){for(const q of this.L){q.t+=dt;const p=Cam.toScreen(q.x,q.y,q.z),d=Cam.pos?Math.hypot(q.x-Cam.pos[0],q.y-Cam.pos[1],q.z-Cam.pos[2]):0;
      if(!p||d>420||Build.active){q.el.style.display='none';}else{q.el.style.display='';q.el.style.left=p[0]+'px';q.el.style.top=p[1]+'px';}
      const b=q.el.querySelector('.tm b');if(b){const u=clamp((q.t-0.25)/1.5,0,1),e=1-Math.pow(1-u,3);b.textContent=Money.fmt(q.money*e);if(u>=1&&!q.popped){q.popped=true;q.el.querySelector('.tm').classList.add('pop');}}
      if(!q.grown&&q.t>0.6){q.grown=true;const n=q.el.querySelector('.tb .n');if(n)n.style.width=(Math.min(1-q.f0,Math.max(0.07,q.f1-q.f0))*100).toFixed(1)+'%';}
      if(q.t>5.2)q.el.classList.add('out');}
    this.L=this.L.filter(q=>{if(q.t>6){q.el.remove();return false;}return true;});}};
// platform pieces of a passenger station: 4.1 m kit pieces every 4 m from end to end, following the track; inside the building's
// stretch they are plain (the building brings its own lamps and benches), beyond it they get a railing, and every third a lamp and a bench
const ST_SPAN={station:[-22,21],stationTown:[-23,23.5],stairs:{station:[9.9,19.8],stationTown:[12.5,22.4]}};
// psi (optional): a second platform's main station; its pieces are judged in the main building's frame (the stairs' foot), none plain for a building
// platform pieces along a station's track. o: sf side of the track (+1 the side of st._f), fr frame (a Life.stInfo entry whose model x
// judges the zones), span building stretch (plain pieces), stairs footbridge stair stretch, shelterX, island (edges on both sides, no railing)
function stationPieces(st,o){const out=[],L=st.len||44,sf=o.sf||1,n=Math.round(L/4),q=segPoint(segById(st.sid),st.t),fr=o.fr;
  for(let k=0;k<n;k++){const d=-L/2+2+k*(L/n);const a=advance({sid:st.sid,t:st.t,dir:1},d);if(a.blocked)continue;const i=posInfo(a.pos);if(!i)continue;const h=a.pos.dir>0?i.h:i.h+Math.PI;
    const lx=-((i.x-fr.x)*fr.dx+(i.z-fr.z)*fr.dz),k3=Math.abs(Math.round(d/4))%3===0;let v=o.island?(k3?5:4):(k3?3:2);
    if(o.span&&lx>o.span[0]-1&&lx<o.span[1]+1)v=0;if(o.stairs&&lx>o.stairs[0]-1&&lx<o.stairs[1]+1)v=o.island?4:0;if(o.shelterX!=null&&Math.abs(lx-o.shelterX)<4.6)v=o.island?4:2;
    out.push({x:i.x,y:i.y,z:i.z,rot:h+(sf>0?Math.PI:0),hash:0.5,v});}
  return out;}
// the distance along a station's track (from its centre, dir 1) nearest a world point
function alongD(st,x,z){const s=segById(st.sid);if(!s)return 0;const q=segPoint(s,st.t);return(x-q[0])*Math.cos(q[2])+(z-q[1])*Math.sin(q[2]);}
// ---- stations in the build menu: the ghost of a station about to be built (drawn on the overlay canvas every frame, with a drag handle),
// and arrow buttons at both ends of every platform to lengthen (outward arrow) or shorten (inward arrow) that end by 8 m
// ---- upgrade notifications (top right): one card per village upgrade as soon as it can be bought. Tapping it flies to the village and
// opens its panel with a short explanation of the upgrade; the card goes when it is tapped, closed, or the upgrade is bought.
const UpgNotes={L:[],seen:new Set(),t:0,
  tick(dt){this.t-=dt;if(this.t>0||!App.T)return;this.t=1;const box=$('#upNotes');if(!box)return;
    for(const v of Life.villages||[])for(const k of Object.keys(Life.UPG)){const key=v.name+'|'+k,st=Life.upgState(v,k);if(st==='available'&&!this.seen.has(key)){this.seen.add(key);this.add(v,k);}}
    for(const q of this.L.slice())if(Life.upgState(q.v,q.k)!=='available')this.drop(q);box.hidden=!!Build.active;},
  add(v,k){const box=$('#upNotes'),el=document.createElement('div');el.className='un';el.setAttribute('role','button');
    el.innerHTML=`<em>${Life.upgIcon(v,k)}</em><span>${esc(Life.upgName(v,k))} available<small>${esc(v.name)} · tap to see</small></span><button aria-label="Dismiss">✕</button>`;
    const q={v,k,el};el.onclick=()=>{this.open(q);};el.querySelector('button').onclick=e=>{e.stopPropagation();this.drop(q);};box.appendChild(el);this.L.push(q);if(this.L.length>4)this.drop(this.L[0]);Sfx.clunk&&Sfx.clunk();},
  drop(q){q.el.remove();this.L=this.L.filter(o=>o!==q);},
  open(q){const v=q.v;Cam.mode='free';Cam.flyTo([v.x,R.sampleHr(R.world,v.x,v.z),v.z],Math.max(160,v.R*3.2));VillageUI.why=q.k;VillageUI.open(v);this.drop(q);}};
// banner when a station becomes the grand one (its town has grown to its full size): what changed and what is now possible
const Banner={t:null,show(head,body,go){const el=$('#banner');if(!el)return;el.querySelector('.bn-h').textContent=head;el.querySelector('.bn-b').innerHTML=body;el.hidden=false;
    el.querySelector('.bn-ok').onclick=()=>this.hide();const sb=el.querySelector('.bn-show');sb.hidden=!go;sb.onclick=()=>{if(go)go();this.hide();};clearTimeout(this.t);this.t=setTimeout(()=>this.hide(),16000);Sfx.clunk&&Sfx.clunk();},
  hide(){const el=$('#banner');if(el)el.hidden=true;clearTimeout(this.t);},
  grand(si){const n=esc(si.st.name);this.show(`${n} is now a grand station`,`${esc(si.v?si.v.name:si.st.name)} has grown into a town, so its station was rebuilt:<ul><li>a long brick hall with a clock tower</li><li>a platform across the line as well, so trains open their doors on both sides</li><li>a footbridge with stairs over the line between the platforms</li><li><b>new:</b> a second track with an island platform: tap the green <b>+</b> beside the station in Build › Stations</li></ul>`,
    ()=>{Cam.mode='free';Cam.target=[si.x,si.y+3,si.z];Cam.dist=90;Cam.pitch=0.6;});}};
const StationUI={ghostHandle:null,ghostPoly:null,drawn:false,els:new Map(),STEP:8,
  // points along the platform: from the centre `pos` (dir 1) to ±len/2, with the side normal following the track
  band(sid,t,side,len,l0,l1,step,d0,d1){const out=[[],[]];if(d0===undefined){d0=-len/2;d1=len/2;}for(let d=d0;d<=d1+1e-6;d+=step){const a=advance({sid,t,dir:1},d),i=posInfo(a.pos);if(!i)continue;const h=a.pos.dir>0?i.h:i.h+Math.PI;// heading of the centre's direction
      const nx=Math.sin(h)*side,nz=-Math.cos(h)*side;out[0].push([i.x+nx*l0,i.y+1,i.z+nz*l0]);out[1].push([i.x+nx*l1,i.y+1,i.z+nz*l1]);}return out;},
  poly(b){const P=[];for(const p of b[0]){const q=Cam.toScreen(p[0],p[1],p[2]);if(!q)return null;P.push(q);}for(const p of b[1].slice().reverse()){const q=Cam.toScreen(p[0],p[1],p[2]);if(!q)return null;P.push(q);}return P;},
  inGhost(x,y){for(const P of [this.ghostPoly,this.ghostPoly2]){if(!P)continue;let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}if(c)return true;}return false;},
  /* the platform's and the building's outline on the ground, for a free ghost (no track yet): same bands as along a track */
  bandFree(G,l0,l1,step,d0,d1){const out=[[],[]],c=Math.cos(G.h),sn=Math.sin(G.h),side=G.side||1,nx=sn*side,nz=-c*side,T=R.world;for(let d=d0;d<=d1+1e-6;d+=step){const x=G.x+c*d,z=G.z+sn*d;
      out[0].push([x+nx*l0,sampleH(T,x+nx*l0,z+nz*l0)+0.4,z+nz*l0]);out[1].push([x+nx*l1,sampleH(T,x+nx*l1,z+nz*l1)+0.4,z+nz*l1]);}return out;},
  drawGhost(){const c=$('#ovl');if(!c)return;const g=c.getContext('2d'),G=Build.stg,on=Build.active&&Build.mode==='signals'&&G;
    if(!on){this.ghostHandle=null;this.ghostPoly=null;this.ghostPoly2=null;R.ghost=null;if(this.drawn){g.clearRect(0,0,c.width,c.height);this.drawn=false;}return;}
    if(!G.chk)G.chk=Build.stCheck(G);const ok=G.chk.ok;
    if(c.width!==innerWidth*devicePixelRatio){c.width=innerWidth*devicePixelRatio;c.height=innerHeight*devicePixelRatio;}g.clearRect(0,0,c.width,c.height);this.drawn=true;
    const side=G.side||1,pp=Build.stPos(G),town=G.free?!!(Life.nearestVillage(G.x,G.z,420)&&(Life.nearestVillage(G.x,G.z,420).level|0)>=Life.LEVELS.length-1):this.isTown(G.sid,G.t),bx=town?[-22,19.5]:[-14,5.5],bd=side>0?[-bx[1],-bx[0]]:bx;// model x runs against the track when side > 0
    /* the 3D ghost: the real building, at the same place and turn the finished station gets */
    if(pp){const c0=Math.cos(pp.h),s0=Math.sin(pp.h),cc=side<0?-c0:c0,ss=side<0?-s0:s0;R.ghost={type:town?'stationTown':'station',x:pp.x,y:pp.y,z:pp.z,rot:Math.atan2(ss,cc)+Math.PI,ok};}
    let plat,bld;if(G.free){plat=this.poly(this.bandFree(G,1.5,5.7,4,-G.len/2,G.len/2));bld=this.poly(this.bandFree(G,5.8,town?13.4:12.4,(bd[1]-bd[0])/5,bd[0],bd[1]));}
    else{plat=this.poly(this.band(G.sid,G.t,side,G.len,1.5,5.7,4));bld=this.poly(this.band(G.sid,G.t,side,0,5.8,town?13.4:12.4,(bd[1]-bd[0])/5,bd[0],bd[1]));}
    this.ghostPoly=plat;this.ghostPoly2=bld;
    g.save();g.scale(devicePixelRatio,devicePixelRatio);const t=performance.now()/1000,pulse=0.5+0.5*Math.sin(t*4),rgb=ok?'70,220,100':'240,70,50';
    const fill=(P,col,dash)=>{if(!P)return;g.beginPath();P.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle=col;g.fill();g.setLineDash(dash);g.lineDashOffset=-t*20;g.lineWidth=2.5;g.strokeStyle=ok?'#e6ffe6':'#ffe0dc';g.stroke();};
    if(G.free){/* its own piece of track: 70 m, laid with the station */const tr=this.poly(this.bandFree(G,-0.9,0.9,6,-35,35));if(tr){g.beginPath();tr.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle='rgba(235,235,235,0.55)';g.fill();}}
    fill(plat,`rgba(${rgb},${0.34+0.12*pulse})`,[6,5]);g.setLineDash([]);
    const ci=pp?{x:pp.x,y:pp.y,z:pp.z,h:pp.h}:null;this.ghostHandle=null;
    if(ci){const nx=Math.sin(ci.h)*side,nz=-Math.cos(ci.h)*side,hp=Cam.toScreen(ci.x+nx*3.6,ci.y+1.2,ci.z+nz*3.6);
      if(hp){this.ghostHandle=hp;g.beginPath();g.arc(hp[0],hp[1],22,0,6.283);g.fillStyle='#15191ae6';g.fill();g.lineWidth=3;g.strokeStyle=ok?'#9ff0a8':'#ff9a8a';g.stroke();
        g.fillStyle=ok?'#9ff0a8':'#ff9a8a';g.font='700 20px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText('✥',hp[0],hp[1]+1);
        const lp=Cam.toScreen(ci.x+nx*9,ci.y+(town?16:11),ci.z+nz*9);if(lp){g.font='600 13px system-ui';const tx=ok?`New station · ${G.len} m platform`:G.chk.msg;const w=g.measureText(tx).width+16;g.fillStyle=ok?'#15191ad9':'#4a1410e6';g.fillRect(lp[0]-w/2,lp[1]-12,w,24);g.fillStyle='#f3e9cf';g.fillText(tx,lp[0],lp[1]+1);}}}
    g.restore();},
  isTown(sid,t){const s=segById(sid);if(!s)return false;const q=segPoint(s,t),v=Life.nearestVillage(q[0],q[1],420);return !!(v&&(v.level|0)>=Life.LEVELS.length-1);},
  // the end of a platform: e = +1 front (direction of the piece), -1 back
  endPos(st,e){const a=advance({sid:st.sid,t:st.t,dir:1},e*((st.len||44)/2));return a;},
  resize(st,e,dl){const L0=st.len||44,L1=clamp(L0+dl,44,172);if(L1===L0){UI.toast(dl>0?`${st.name}: platforms go up to 172 m`:`${st.name}: 44 m is the shortest platform`);return;}
    const c=advance({sid:st.sid,t:st.t,dir:1},e*(L1-L0)/2);if(c.blocked){UI.toast('No more track at that end');return;}
    const far=advance(c.pos,e*(c.pos.dir>0?1:-1)*L1/2);if(dl>0&&far.blocked){UI.toast('No more track at that end');return;}
    if(dl>0&&Money.on()){if(!Money.canBuild()){UI.toast('Out of money');return;}Money.spend(2000,'platform');}
    if(c.pos.dir<0&&!(st.mine||st.sawmill||st.workshop||st.farm))st.side=-(st.side||1);st.sid=c.pos.sid;st.t=c.pos.t;st.len=L1;if(dl>0)Net.levelStation(st);
    const lt=Trains.list.reduce((m,t)=>Math.max(m,Trains.length(t.veh)),0);Build.info(`${st.name}: platform ${L1} m.`+(lt?` Your longest train is ${Math.round(lt)} m${lt<=L1-4?' and fits.':', still longer.'}`:''));
    Net.changed();App.trackChanged();Sfx.clunk();},
  arrows(){const box=$('#stArrows'),show=Build.active&&Build.mode==='signals'&&!Build.remove&&!Build.stg&&App.T,cp=Cam.pos||[0,0,0],live=new Set();
    if(show)for(const st of Track.stations){const s=segById(st.sid);if(!s)continue;const ci=posInfo({sid:st.sid,t:st.t,dir:1});if(!ci||Math.hypot(ci.x-cp[0],ci.z-cp[2])>Math.max(500,Cam.dist*2.5))continue;
      const f=st._f||1;for(const e of [-1,1]){const a=this.endPos(st,e),i=posInfo(a.pos);if(!i)continue;const h=a.pos.dir>0?i.h:i.h+Math.PI,fx=Math.cos(h)*e,fz=Math.sin(h)*e,nx=Math.sin(h)*f,nz=-Math.cos(h)*f;
        const P=[i.x+nx*3.6+fx*4,i.y+1.4,i.z+nz*3.6+fz*4],sp=Cam.toScreen(...P),so=Cam.toScreen(P[0]+fx*10,P[1],P[2]+fz*10);if(!sp||!so)continue;
        const key=st.id+':'+e;live.add(key);let el=this.els.get(key);if(!el){el=document.createElement('div');el.className='stArr';el.innerHTML='<button class="out" aria-label="Longer platform">➜</button><button class="in" aria-label="Shorter platform">➜</button>';
          el.querySelector('.out').onclick=ev=>{ev.stopPropagation();const q=Track.stations.find(o=>o.id===st.id);if(q)this.resize(q,e,this.STEP);};el.querySelector('.in').onclick=ev=>{ev.stopPropagation();const q=Track.stations.find(o=>o.id===st.id);if(q)this.resize(q,e,-this.STEP);};
          box.appendChild(el);this.els.set(key,el);}
        const ang=Math.atan2(so[1]-sp[1],so[0]-sp[0]);el.style.transform=`translate(${sp[0]}px,${sp[1]}px) translate(-50%,-50%)`;el.querySelector('.out').style.transform=`rotate(${ang}rad)`;el.querySelector('.in').style.transform=`rotate(${ang+Math.PI}rad)`;
        el.style.flexDirection=Math.cos(ang)<0?'row':'row-reverse';}}
    // + on the ground beside a station without a second track: lay one (with its platform) on the side away from the building
    if(show)for(const si of Life.stInfo||[]){if(si.cargo||si.parent||si.twin||!Life.stTown(si))continue;const w=Life.stW(si,0,-(KIT.TWIN_G+2));if(Math.hypot(w[0]-cp[0],w[1]-cp[2])>Math.max(500,Cam.dist*2.5))continue;
      const sp=Cam.toScreen(w[0],si.y+0.6,w[1]);if(!sp)continue;const key='plus:'+si.st.id;live.add(key);let el=this.els.get(key);
      if(!el){el=document.createElement('div');el.className='stArr stPlus';el.innerHTML='<button aria-label="Add a second track and platform">+</button>';const id=si.st.id;
        el.querySelector('button').onclick=ev=>{ev.stopPropagation();const st=Track.stations.find(o=>o.id===id);if(st)Busy.run('Laying a second track and platform…',()=>Build.addTwin(st));};box.appendChild(el);this.els.set(key,el);}
      el.style.transform=`translate(${sp[0]}px,${sp[1]}px) translate(-50%,-50%)`;}
    for(const [k,el] of this.els)if(!live.has(k)){el.remove();this.els.delete(k);}},
  tick(){this.drawGhost();Build.roadTick();if($('#stArrows'))this.arrows();}};
const IndUI={els:new Map(),
  tick(){const show=App.T&&!(Build.active&&Build.mode!=='signals'&&Build.target!=='road');const all=[];for(const [kind,L] of Life.inds())L.forEach((m,i)=>{if(Life.indOn(kind,m))all.push([kind,m,i]);});const live=new Set();
    for(const [kind,m,mi] of all){live.add(m);let el=this.els.get(m);if(!el){el=document.createElement('div');el.className='ilabel';el.innerHTML=kind==='sawmill'?'🪚':kind==='mine'?'⛏️':'🪑';document.body.appendChild(el);this.els.set(m,el);el.onclick=e=>{e.stopPropagation();this.info(kind,m,mi);};}
      const p=show?Cam.toScreen(m.x,m.y+16,m.z):null,d=Cam.pos?Math.hypot(m.x-Cam.pos[0],m.z-Cam.pos[2]):0;if(!p||d>2600){el.style.display='none';continue;}el.style.display='';el.style.left=p[0]+'px';el.style.top=p[1]+'px';}
    for(const [m,el] of this.els)if(!live.has(m)){el.remove();this.els.delete(m);}},
  info(kind,m,mi){const att=[...Track.stations.filter(q=>q[kind]&&q[kind].mi===mi).map(q=>'🚂 '+esc(q.name)),...Buses.stops.filter(q=>q[kind]&&q[kind].mi===mi).map(q=>'🚚 '+esc(q.name))];
    let p=VillageUI.panel;if(!p){p=VillageUI.panel=document.createElement('div');p.id='vPanel';document.body.appendChild(p);}VillageUI.cur=null;p.hidden=false;
    p.innerHTML=`<div class="vp-h"><div><b>${kind==='sawmill'?'🪚 Sawmill':kind==='mine'?'⛏️ '+ORE[m.type].name+' Mine':'🪑 Wood Workshop'}</b><span>${m.v?'near '+m.v.name:''}</span></div><button id="vpX" aria-label="Close" title="Close">✕</button></div>
      <div class="vp-row">${kind==='sawmill'?'Cuts logs from the woods to length. Collect them with timber wagons (the yard crane loads them) or lorries.':kind==='mine'?`Raises ${ORE[m.type].name.toLowerCase()} ore. Build a station at a marked side: the ore bunker fills ${ORE[m.type].name.toLowerCase()} ore hoppers. Take the ore to a town with a bank.`:'Joiner, cartwright and cooper: takes in wood and makes furniture, wheels and barrels. Deliver wood here.'}</div>
      <div class="vp-row">Loading sides: ${att.length?att.join(', '):'none yet'} (3 sides; with the Station tool or the Bus stop tool, tap near a marked side to snap one there)</div>`;p.querySelector('#vpX').onclick=()=>{p.hidden=true;};}};
const VillageUI={els:new Map(),panel:null,cur:null,
  tick(){const show=App.T&&!Build.active;for(const v of Life.villages||[]){let el=this.els.get(v);if(!el){el=document.createElement('div');el.className='vlabel';document.body.appendChild(el);this.els.set(v,el);this.bind(el,v);}
      const y=R.world?R.sampleHr(R.world,v.x,v.z)+28+(v.level|0)*6:0,p=show?Cam.toScreen(v.x,y,v.z):null,d=Cam.pos?Math.hypot(v.x-Cam.pos[0],v.z-Cam.pos[2]):0;
      if(!p||d>3200){el.style.display='none';continue;}el.style.display='';el.style.left=p[0]+'px';el.style.top=p[1]+'px';el.style.opacity=String(clamp(1.6-d/2400,0.35,1));
      const ks=Object.keys(Life.UPG),own=ks.filter(k=>Life.upgState(v,k)==='owned').map(k=>Life.upgIcon(v,k)).join(''),av=ks.filter(k=>Life.upgState(v,k)==='available'),nu=this.nextUpg(v),t=`<b>${v.name}</b><span>${Life.LEVELS[v.level|0].name}${own?' · '+own:''}</span>${nu?`<div class="vl-up${nu.f>=1?' ready':''}" title="${esc(nu.title)}"><em>${nu.icon}</em><i><s style="width:${(nu.f*100).toFixed(0)}%"></s></i></div>`:''}${av.length?`<i class="vl-farm" title="Upgrade available">${Life.upgIcon(v,av[0])}${av.length>1?'<sup>'+av.length+'</sup>':''}</i>`:''}`;if(el._t!==t){el.innerHTML=t;el._t=t;}}
    for(const [v,el] of this.els)if(!(Life.villages||[]).includes(v)){el.remove();this.els.delete(v);if(this.cur===v&&this.panel)this.panel.hidden=true;}},
  // progress toward the next upgrade the village can buy: half size (growth toward the size it needs), half passengers carried;
  // the upgrade closest to being ready is shown (a full gold bar once one can be bought). Rounded to 4% so the label is not rebuilt every frame.
  nextUpg(v){let best=null;for(const k of Object.keys(Life.UPG)){const s=Life.upgState(v,k);if(s==='owned'||s==='none')continue;const U=Life.UPG[k],L=Life.LEVELS;
      const fl=(v.level|0)>=U.level?1:clamp((v.gp||0)/L[U.level].need,0,1),ft=U.trans?clamp((v.trans||0)/U.trans,0,1):1,f=s==='available'?1:Math.min(0.96,(fl+ft)/2);
      if(!best||f>best.f)best={k,f:Math.round(f*25)/25,icon:Life.upgIcon(v,k),title:s==='available'?`${U.name||k}: ready to buy`:`Next upgrade: ${U.name||k} (${Math.round(f*100)}%)`};}return best;},
  bind(el,v){let tm=null,held=false;el.onpointerdown=e=>{e.stopPropagation();held=false;tm=setTimeout(()=>{held=true;if(navigator.vibrate)navigator.vibrate(15);this.why=null;this.open(v);},480);};
    el.onpointerup=e=>{e.stopPropagation();clearTimeout(tm);if(!held){Cam.flyTo([v.x,R.sampleHr(R.world,v.x,v.z),v.z]);}};el.onpointerleave=()=>clearTimeout(tm);el.oncontextmenu=e=>e.preventDefault();},
  open(v){this.cur=v;let p=this.panel;if(!p){p=this.panel=document.createElement('div');p.id='vPanel';document.body.appendChild(p);}p.hidden=false;this.refresh(v);},
  refresh(v){const p=this.panel;if(!p||p.hidden||v!==this.cur)return;const L=Life.LEVELS,lv=v.level|0,nx=L[lv+1],gp=Math.round(v.gp||0),houses=v.houses.filter(h=>Life.houseOn(h)).length,building=v.houses.filter(h=>!h.gone&&h.prog<1).length;
    const pct=nx?clamp((gp-L[lv].need)/(nx.need-L[lv].need),0,1)*100:100;
    p.innerHTML=`<div class="vp-h"><div><b>${v.name}</b><span>${L[lv].name}</span></div><button id="vpX" aria-label="Close" title="Close">✕</button></div>
      ${this.why&&Life.UPG[this.why]?`<div class="vp-why"><b>${Life.upgIcon(v,this.why)} ${esc(Life.upgName(v,this.why))}</b><br>${esc(Life.UPG_WHY[this.why](v))}</div>`:''}
      <div class="vp-row">${houses} houses${building?` (${building} being built)`:''} · ${['a few','more','many'][lv]} travellers${['',' · church, inn, bakery, small market',' · church, inn, bakery, restaurant, café, market square, station hall'][lv]}</div><div class="vp-row">Growth points: ${gp}${nx?` / ${nx.need} for ${nx.name.toLowerCase()}`:' (fully grown)'}</div><div class="vp-bar"><i style="width:${pct}%"></i></div>
      ${Object.keys(Life.UPG).map(k=>{const st=Life.upgState(v,k),U=Life.UPG[k],nm=Life.upgName(v,k),ic=Life.upgIcon(v,k);if(st==='none')return'';if(st==='owned')return`<div class="vp-farm on">${ic} ${nm}: ${U.desc}</div>`;
        if(st==='available')return`<div class="vp-farm av">${ic} ${nm} upgrade available<button class="go vpUp" data-up="${k}">Buy${Money.on()?' €'+Money.fmt(U.cost):''}</button></div>`;
        const need=[(v.level|0)>=U.level?'':`${Life.LEVELS[U.level].name.toLowerCase()} size`,(v.trans||0)>=U.trans?'':`${U.trans} passengers carried (${Math.floor(v.trans||0)}/${U.trans})`].filter(Boolean).join(' and ');return`<div class="vp-farm">${ic} ${nm}: needs ${need}</div>`;}).join('')}
      ${(()=>{const S=Goods.summary(v),acc=['grain','produce','mail','gold','silver','diamond'].filter(t=>Goods.accepts(v,t)).map(t=>Goods.T[t].icon).join(' ');const w=Object.entries(S).filter(([t,n])=>n>=1).map(([t,n])=>`${Math.floor(n)} ${Goods.T[t].icon}`).join('  ');return`<div class="vp-row">Accepts: ${acc||'—'}${w?` · waiting: ${w}`:''}</div>`;})()}
      <div class="vp-tools"><button id="vpG10">+10 growth</button><button id="vpT20">+20 passengers (test)</button><button id="vpG50">+50 growth</button><button id="vpGrow" class="go">${nx?'Grow to '+nx.name.toLowerCase()+' now':'Fully grown'}</button></div>
      <div class="vp-note">Later, growth comes from connecting ${v.name} and carrying passengers and goods.</div>`;
    p.querySelector('#vpX').onclick=()=>{p.hidden=true;this.why=null;};p.querySelector('#vpG10').onclick=()=>Life.addGrowth(v,10);p.querySelector('#vpT20').onclick=()=>{v.trans=(v.trans||0)+20;this.refresh(v);};for(const ub of p.querySelectorAll('.vpUp'))ub.onclick=()=>{Life.buyUpg(v,ub.dataset.up);this.refresh(v);};p.querySelector('#vpG50').onclick=()=>Life.addGrowth(v,50);p.querySelector('#vpGrow').onclick=()=>Life.growNow(v);}};
function snapshot(){
  return{app:'Trein',saveVersion:SAVE_VERSION,build:VERSION,savedAt:new Date().toISOString(),params:{...P},camera:Cam.state(),
    clock:{timeOfDay:P.timeOfDay},track:Track.serialize(),trains:Trains.serialize(),villages:Life.villages.map(v=>({gp:v.gp||0,level:v.level|0,farm:!!v.farmOwned,saw:!!v.sawOwned,mine:!!v.mineOwned,bank:!!v.bankOwned,docks:!!v.docksOwned,trans:v.trans||0,log:v.log||[]})),roads:Roads.list.map(r=>({p:Array.from(r.p),w:r.w,kind:r.kind})),buses:{stops:Buses.stops.map(s=>({id:s.id,x:s.x,z:s.z,rx:s.rx,rz:s.rz,rot:s.rot,name:s.name,sawmill:s.sawmill,workshop:s.workshop})),n:Buses.list.length,list:Buses.list.map(b=>({name:b.name,goods:!!b.goods,type:b.type||'',earned:Math.round(b.earned||0),trips:b.trips||0,stops:b.stops.slice(),allStops:!!b.allStops}))},money:{cash:Money.cash,loan:Money.loan,paid:[...Money.paid]}};
}
function applySnapshot(s){
  if(!s||s.app!=='Trein')throw new Error('Not a Trein save file');
  if(s.saveVersion>SAVE_VERSION)Log.warn('save is from a newer version '+s.saveVersion);
  // saves from the realistic 0.9 builds keep the landscape, track and train settings; the look starts fresh
  const v1=(s.saveVersion||1)<2,keepTabs=new Set(['world','erosion','water','track','trains','sound']),skipV1=new Set(['maxGrade','buildGrade','gravityScale','locoTE','locoPower','waterGreen','waveStrength','foam']);
  let n=0,unk=0;for(const k in s.params){if(PDEF[k]){const d=PDEF[k];if(v1&&(!keepTabs.has(d.tab)||skipV1.has(k)))continue;let v=s.params[k];
    if(d.kind==='range'){v=+v;if(!isFinite(v))continue;v=Math.min(d.max,Math.max(d.min,v));}P[k]=v;n++;}else unk++;}
  if(parseFloat(s.build)<3){if(+P.autoRes===30)P.autoRes=55;if(+P.msaa===4)P.msaa=0;}if(parseFloat(s.build)<4.2){P.optOrder=1;P.fxUpscale=1;}P.dbgWater=0;/* switches proven on the phone are on for older saves too; the debug view never comes back from a save */if(parseFloat(s.build)<3.1){if(+P.dwell<30)P.dwell=30;P.timetable=0;}
  if(unk)Log.info(`save: ${unk} settings from an older build ignored`);if(v1)Log.info('save from build '+s.build+': kept world, track and train settings, new look defaults');
  UI.refreshAll();if(s.camera)Cam.setState(s.camera);Track.load(s.track||null);App.pendingTrains=s.trains||null;
  Roads.list=(s.roads||[]).map(r=>({...r,player:true}));Buses.stops=(s.buses&&s.buses.stops||[]).map(q=>({...q,waiting:0,v:null}));Buses.nextId=1+Math.max(0,...Buses.stops.map(q=>q.id));Buses.list=[];Buses.pending=s.buses?s.buses.n:0;Buses.pendingList=s.buses&&s.buses.list||null;Life.roadsDirty=true;
  Life.pendingV=s.villages||null;
  if(s.money){Money.cash=s.money.cash;Money.loan=s.money.loan;Money.paid=new Map(s.money.paid||[]);Money.inited=false;Money.paidSt=new Set(Track.stations.map(q=>q.id));Money.paidTr=new Set();Money.loadedTrains=true;}
  Log.info(`snapshot applied: ${n} params, build ${s.build}, saved ${s.savedAt}`);
}
function download(name,text,type){const b=new Blob([text],{type:type||'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
function stamp(){const d=new Date(),z=n=>String(n).padStart(2,'0');return`${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;}
