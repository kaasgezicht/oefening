# Copies buildings/kit.js and the building models into trein.html between the BUILDINGS markers (run after editing buildings/*.js).
import re,sys
fn='trein.html';s=open(fn).read()
parts=[open('buildings/'+f).read() for f in ['kit.js','cottage.js','tavern.js','farmhouse.js','shop.js','church.js','bridge.js','station.js','sawmill.js','farm.js']]
block='// ===== buildings.js (generated from buildings/*.js by tools/embed_buildings.py: edit those files, then re-run)\n/*@@BUILDINGS@@*/\n'+'\n'.join(parts)+'\n/*@@END_BUILDINGS@@*/\n'
if '/*@@BUILDINGS@@*/' in s:
  i=s.index('// ===== buildings.js');j=s.index('/*@@END_BUILDINGS@@*/')+len('/*@@END_BUILDINGS@@*/\n');s=s[:i]+block+s[j:]
else:
  a="const VS_OBJ=GLSL_HEAD+GLSL_BASE+`";assert s.count(a)==1;s=s.replace(a,block+a)
open(fn,'w').write(s);print('embedded',len(block))
