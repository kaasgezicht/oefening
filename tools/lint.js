#!/usr/bin/env node
'use strict';
// tools/lint.js — checks the game's scripts for names that are never defined and for window.X where X is a top-level const/let/class
// (those are not properties of window, so window.X is always undefined: the bug that broke plane mist clearing, the Fly button and more).
// The scripts are classic scripts sharing one global scope, so they are joined in trein.html's load order and checked as one file.
// Usage: node tools/lint.js            (needs eslint 8 reachable: `npm i --no-save eslint@8` anywhere above, or ESLINT=path/to/eslint)
// Exit code 1 when something is found.
const fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'trein.html'),'utf8');
const files=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(f=>!/^https?:/.test(f));
let joined='',map=[],line=1;
for(const f of files){const src=fs.readFileSync(path.join(root,f),'utf8')+'\n';map.push({f,from:line});joined+=src;line+=src.split('\n').length-1;}
const where=l=>{let m=map[0];for(const q of map)if(q.from<=l)m=q;return `${m.f}:${l-m.from+1}`;};
let bad=0;
// 1. window.X of a top-level lexical name
const lex=new Set();for(const m of joined.matchAll(/^(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm))lex.add(m[1]);
joined.split('\n').forEach((t,i)=>{for(const m of t.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)/g))if(lex.has(m[1])){bad++;console.log(`${where(i+1)}  window.${m[1]} is always undefined: ${m[1]} is a top-level const/let/class (use typeof ${m[1]}!=='undefined')`);}});
// 2. undefined names (eslint no-undef over the joined file)
// globals made with window.X=… count as defined; a few names are used only behind a guard on purpose
const glob=new Set(['module'/* gen.js exports for node tests, behind typeof */,'RT_TUNE'/* route.js debug hook, set from the console */]);for(const m of joined.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=[^=]/g))glob.add(m[1]);
const tmp=path.join(os.tmpdir(),'trein-lint-'+process.pid+'.js');fs.writeFileSync(tmp,'/* global '+[...glob].join(', ')+' */'+joined);
const cand=[process.env.ESLINT,path.join(root,'node_modules/.bin/eslint'),'eslint'].filter(Boolean);let out=null;
for(const e of cand){try{out=cp.execFileSync(e,['--no-eslintrc','--env','browser,es2022','--parser-options','ecmaVersion:2022','--rule','no-undef:error','--format','unix',tmp],{encoding:'utf8',stdio:['ignore','pipe','pipe']});break;}
  catch(err){if(err.stdout&&/:\d+:\d+:/.test(err.stdout)){out=err.stdout;break;}if(err.code==='ENOENT')continue;out=null;}}
fs.unlinkSync(tmp);
if(out===null)console.log('(eslint 8 not found: only the window.X check ran. Install with `npm i --no-save eslint@8` or set ESLINT)');
else for(const l of out.split('\n')){const m=l.match(/:(\d+):(\d+):\s*(.*)$/);if(!m)continue;bad++;console.log(`${where(+m[1])}:${m[2]}  ${m[3]}`);}
console.log(bad?`${bad} problem(s)`:`lint: ${files.length} scripts, no problems`);process.exit(bad?1:0);
