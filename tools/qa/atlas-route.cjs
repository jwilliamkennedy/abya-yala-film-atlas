'use strict';
const assert=require('node:assert/strict');
const {resolve}=require('../../beta/assets/atlas-route.js');
const base='https://example.test/abya-yala-film-atlas/beta/';
const cases=[
 ['',true,''],
 ['index.html',true,''],
 ['?constellate=1&globe=1&weave=61b22ae4-4801-4379-a456-62c23b984561#view=filmmakers&browse=1',true,''],
 ['?constellate=1&globe=1&at=-91,12,2&territories=off',true,'?at=-91%2C12%2C2&territories=off'],
 ['?menu=find',true,'?menu=find'],
 ['?maker=DIR-0007&film=FILM-0008',true,'?film=FILM-0008&maker=DIR-0007'],
 ['#view=films&maker=DIR-0007&film=FILM-0008',true,'?maker=DIR-0007&film=FILM-0008'],
 ['?globe=0',false,'?globe=0'],
 ['?constellate=1',false,'?constellate=1'],
 ['?c=example',false,'?c=example'],
 ['?dial=1995',false,'?dial=1995'],
 ['#view=filmmakers&browse=1',false,'#view=filmmakers&browse=1'],
 ['?at=1,2,3#weave=abc',true,'?at=1%2C2%2C3#weave=abc']
];
for(const [suffix,globe,expected] of cases){const result=resolve(base+suffix);assert.equal(result.globe,globe,suffix);assert.equal(result.canonical,base+expected,suffix);if(globe){const q=new URL(result.inbound).searchParams;assert.equal(q.get('globe'),'1');assert.equal(q.get('constellate'),'1');}}
console.log('Atlas route checks passed:',cases.length);
