/* patches-catalog.js: Catalog and map corrections (formerly ten files, in this order).
   Each section is one former file, run in its own scope, in the original order; an error in one section is
   reported and the next still runs, as with separate files. Edit the section; there is no other copy. */

/* ==== artwork-presentation59.js ==== */
try{(function(){
/* Display aliases only: catalog records and source credits remain unchanged. */
'use strict';
(()=>{
 const groups=[
 ['FILM-0188','FILM-0189'],
 ['REVIEWFILM-20261008-001-01','REVIEWFILM-20261008-002-01'],
 ['REVIEWFILM-20261008-008-01','REVIEWFILM-20261008-009-01'],
 ['SA50-20261014-59f87a2e3ce5-WORK-01','SA50-20261014-0eb675abc594-WORK-01','SA50-20261014-3646d5d9be66-WORK-02'],
 ['SA50-20261014-6e4c85b67329-WORK-01','SA50-20261014-ebfdde5694a3-WORK-01','SAB2-20261014-a56923e1ac7e-WORK-01','SAB2-20261014-2bb01fb41c3a-WORK-01','SAB2-20261014-1c023b64bff0-WORK-01','SAB2-20261014-1578a82f9243-WORK-01'],
 ['SA50-20261014-3646d5d9be66-WORK-01','SA50-20261014-eee8df9ab785-WORK-01','SAB2-20261014-0aef6d0ac10e-WORK-01','SAB2-20261014-cc42652768df-WORK-01','SAB2-20261014-c9a2bcfd4699-WORK-01'],
 ['SA50-20261014-14e876264d18-WORK-01','SAB2-20261014-4af382f5d619-WORK-01'],
 ['SAB2-20261014-5b6dc34f3c55-WORK-01','SAB2-20261014-df9a2b0fb783-WORK-01'],
 ['SAB2-20261014-e3499178f69e-WORK-01','SAB2-20261014-bcdd867e2132-WORK-01']
 ];
 const aliases=new Map(groups.flatMap(g=>g.map(id=>[id,g[0]])));
 const workKey=x=>{const id=x.film||x.f?.id||x.id;return aliases.get(id)||id;};
 function uniqueFilms(films,current){const g=new Map();for(const f of films){const k=workKey(f);if(!g.has(k)||f.id===current?.id)g.set(k,f);}return [...g.values()];}
 function groupCredits(items,currentRecord,currentFilm){const g=new Map();for(const x of items){const k=workKey(x.f);if(!g.has(k))g.set(k,[]);g.get(k).push(x);}return [...g.values()].map(credits=>({...credits.find(x=>x.r.id===currentRecord&&x.f.id===currentFilm)||credits[0],credits}));}
 function imageForItem(x){if(x.type!=='film')return '';const r=window.Atlas?.recordById(x.record),f=r?.films.find(f=>f.id===x.film);return f?window.Atlas.mediaForFilm(f)?.image||'':x.image||'';}
 function registerWorkGroups(extra){for(const group of extra){if(group.length<2||group.some(id=>typeof id!=='string'))throw Error('Invalid reviewed work group');const canonical=group.map(id=>aliases.get(id)).find(Boolean)||group[0];for(const id of group)aliases.set(id,canonical);groups.push([...group]);}}
 window.AtlasArtwork={registerWorkGroups,workKey,uniqueFilms,groupCredits,imageForItem,groups};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== films-merge-20261107.js ==== */
try{(function(){
/* Beta, 2026-11-07: a film credited to several filmmakers shows as one row in the Films list, with every director.
   Rows already merge when they share a film ID; this also merges copies of the same title from different records
   when their years agree (or one is missing). Short or generic titles merge only when both years are present and equal. */
(()=>{'use strict';const A=window.AtlasArtwork;if(!A||typeof A.groupCredits!=='function')return;
const base=A.groupCredits.bind(A);
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
A.groupCredits=(items,currentRecord,currentFilm)=>{
 const groups=base(items,currentRecord,currentFilm),out=[],byTitle=new Map(),byMain=new Map();
 const main=t=>norm(String(t||'').split(/\s+\/\s+|:\s/)[0]);
 for(const g of groups){const t=norm(g.f.title),y=g.f.year||null,list=byTitle.get(t)||[];
  let match=list.find(o=>{const oy=o.f.year||null;if(y&&oy)return y===oy;return t.length>=10;});
  const mk=main(g.f.title)+'|'+(y||'');if(!match&&y&&mk.length>8)match=byMain.get(mk);
  if(match){for(const c of g.credits)if(!match.credits.some(x=>x.r.id===c.r.id))match.credits.push(c);
   if(!match.f.year&&y)match.f=Object.assign({},match.f,{year:y});
   if(g.credits.some(x=>x.r.id===currentRecord&&x.f.id===currentFilm)){match.r=g.r;match.f=Object.assign({},g.f,{year:g.f.year||match.f.year});}
   continue;}
  list.push(g);byTitle.set(t,list);if(y)byMain.set(mk,g);out.push(g);}
 return out;};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== map-label-layout.js ==== */
try{(function(){
'use strict';
// Screen-space placement keeps names inside the visible part of their source geometry.
window.AtlasMapLabelLayout=(()=>{
 const baseCache=new Map(),baseName=s=>{const k=String(s||'');let v=baseCache.get(k);if(v===undefined){v=k.replace(/\s*\([^)]*\)\s*/g,' ').trim().normalize('NFD').replace(/[’‘ʻʼ`]/g,"'").replace(/\p{Diacritic}/gu,'').toLowerCase();baseCache.set(k,v);}return v;};
 function sourceMatches(name,source){
  const a=baseName(name),b=baseName(source);
  // The source explicitly lists Binnizá among its names; this is a spelling relay, not an affiliation inference.
  return a===b||(a==='binniza'&&b.split('/').some(part=>part.trim()==='binniza'))||(a==="maaya'"&&/maya \(yucateco\)/i.test(source));
 }
 function clipRing(points,box){
  let out=points;
  const edges=[{axis:0,value:box.left,greater:true},{axis:0,value:box.right,greater:false},{axis:1,value:box.top,greater:true},{axis:1,value:box.bottom,greater:false}];
  for(const edge of edges){const input=out;out=[];if(!input.length)break;const inside=p=>edge.greater?p[edge.axis]>=edge.value:p[edge.axis]<=edge.value;
   let a=input[input.length-1];for(const b of input){const ai=inside(a),bi=inside(b);if(ai!==bi){const t=(edge.value-a[edge.axis])/(b[edge.axis]-a[edge.axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}if(bi)out.push(b);a=b;}
  }return out;
 }
 function visibleAnchor(features,{project,invert,contains,centroid,centroidInside,bounds,viewport}){
  const inside=p=>p&&p.every(Number.isFinite)&&p[0]>=viewport.left&&p[0]<=viewport.right&&p[1]>=viewport.top&&p[1]<=viewport.bottom;
  const belongs=(f,p)=>inside(p)&&contains(f,invert(p));
  const center=project(centroid(features));if(inside(center)&&(centroidInside?centroidInside():features.some(f=>belongs(f,center))))return center;
  const candidates=[];
  for(const feature of features){
   const b=bounds(feature),lo=[Math.max(viewport.left,b[0][0]),Math.max(viewport.top,b[0][1])],hi=[Math.min(viewport.right,b[1][0]),Math.min(viewport.bottom,b[1][1])];
   if(lo[0]>=hi[0]||lo[1]>=hi[1])continue;
   const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
   for(const rings of polygons){const ring=clipRing(rings[0].map(project).filter(p=>p?.every(Number.isFinite)),viewport);if(ring.length<3)continue;
    const point=d3.polygonCentroid(ring),area=Math.abs(d3.polygonArea(ring));if(belongs(feature,point))candidates.push({point,area,feature});
   }
   // Concave shapes and holes may exclude the clipped centroid. Use interior samples.
   if(!candidates.some(c=>c.feature===feature))for(const fy of [.5,.25,.75,.1,.9])for(const fx of [.5,.25,.75,.1,.9]){const point=[lo[0]+fx*(hi[0]-lo[0]),lo[1]+fy*(hi[1]-lo[1])];if(belongs(feature,point))candidates.push({point,area:(hi[0]-lo[0])*(hi[1]-lo[1])*.01,feature});}
  }
  return candidates.sort((a,b)=>b.area-a.area)[0]?.point||null;
 }
 return {baseName,sourceMatches,clipRing,visibleAnchor};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== community-label-corrections.js ==== */
try{(function(){
'use strict';
// Additive credit correction; private master files are untouched.
(()=>{const record='DIR-0216',film={id:'FILM-NUDO-MIXTECO-2021',title:'Nudo mixteco',year:2021,medium:'Feature',languages:null,notes:null,review:false,credit:'Director',sourceURL:'https://moreliafilmfest.com/realizadores/cruz-angeles',checkedOn:'2026-10-30',checkedFields:['title','director','year']};
 const pilot=window.ATLAS_PILOT_CATALOG;
 if(pilot&&!pilot.credits.some(c=>c.record===record&&c.film.id===film.id))pilot.credits.push({record,film});
 const catalog=window.ATLAS_COLLECTION_CATALOG;
 if(catalog&&!catalog.some(c=>c.record===record&&c.type==='film'&&c.title.toLowerCase()===film.title.toLowerCase()))catalog.push({id:'film:'+record+':'+film.id,type:'film',record,film:film.id,title:film.title,maker:'Ángeles Cruz',community:'Ñuu Savi · Villa Guadalupe Victoria, Oaxaca',year:2021,image:'',imageTitle:'',href:'./#view=films&maker='+record+'&film='+film.id});
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== geographic-base51.js ==== */
try{(function(){
'use strict';
window.AtlasGeographicBase={base({geo,path,world}){
 if(window.AtlasOpenBasemap?.active){geo.selectAll('image.natural-earth-image').remove();return;}
 const b=path.bounds({type:'Sphere'}),url='assets/earth-'+(world?'world':'americas')+'-57.png';
 const image=geo.selectAll('image.natural-earth-image').data([world]).join('image').attr('class','natural-earth-image').attr('x',b[0][0]).attr('y',b[0][1]).attr('width',b[1][0]-b[0][0]).attr('height',b[1][1]-b[0][1]).attr('preserveAspectRatio','none').attr('pointer-events','none').lower();
 image.on('error.geography',()=>{geo.attr('data-geography-fallback','true');image.style('visibility','hidden');}).on('load.geography',()=>{geo.attr('data-geography-fallback','false');image.style('visibility',null);});
 if(image.attr('href')!==url){geo.attr('data-geography-fallback','true');image.style('visibility',null).attr('href',url);}
}};

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== country-review60.js ==== */
try{(function(){
'use strict';
window.AtlasCountryReview=(()=>{
 const reviews=[
  {
    "record": "DIR-0182",
    "codes": [
      "COL",
      "VEN"
    ],
    "source": "https://www.firelightmedia.tv/filmmakers/david-hernandez-palmar",
    "evidence": "Firelight Media explicitly associates the filmmaker with Colombia and Venezuela. Both country references are retained.",
    "primary": "COL",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "DIR-0098",
    "codes": [
      "GRL"
    ],
    "source": "https://www.anorakfilm.gl/",
    "evidence": "The filmmaker’s own production company identifies him as a filmmaker and visual artist from Greenland. Replaces the unsupported Canada catalog assignment.",
    "primary": "GRL",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-ece62656570c",
    "codes": [
      "GRL"
    ],
    "source": "https://www.inuks.dk/",
    "evidence": "The filmmaker’s own website states that he works out of Greenland. This is a documented professional country association, not a citizenship claim.",
    "primary": "GRL",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-797d6554404b",
    "codes": [
      "GTM"
    ],
    "source": "https://www.imcine.gob.mx/media/2025/1/bol._resultados_ecamc_2025.pdf",
    "evidence": "IMCINE’s 2025 ECAMC results explicitly list this filmmaker with Guatemala. The location is a country browsing reference.",
    "primary": "GTM",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-65d746d4dc9c",
    "codes": [
      "GTM"
    ],
    "source": "https://www.imcine.gob.mx/media/2025/1/bol._resultados_ecamc_2025.pdf",
    "evidence": "IMCINE’s 2025 ECAMC results explicitly list this filmmaker with Guatemala. The location is a country browsing reference.",
    "primary": "GTM",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-4a3766c88a25",
    "codes": [
      "MEX"
    ],
    "source": "https://www.imcine.gob.mx/media/2025/1/bol._resultados_ecamc_2025.pdf",
    "evidence": "IMCINE’s 2025 ECAMC results explicitly list this filmmaker with Puebla, Mexico. The location is a country browsing reference.",
    "primary": "MEX",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-ab671ab16445",
    "codes": [
      "MEX"
    ],
    "source": "https://www.imcine.gob.mx/media/2025/1/bol._resultados_ecamc_2025.pdf",
    "evidence": "IMCINE’s 2025 ECAMC results explicitly list this filmmaker with Oaxaca, Mexico. The location is a country browsing reference.",
    "primary": "MEX",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-e5a5fc385de7",
    "codes": [
      "MEX"
    ],
    "source": "https://www.imcine.gob.mx/media/2025/1/bol._resultados_ecamc_2025.pdf",
    "evidence": "IMCINE’s 2025 ECAMC results explicitly list this filmmaker with Durango, Mexico. The location is a country browsing reference.",
    "primary": "MEX",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-5234fdc3fab5",
    "codes": [
      "MEX"
    ],
    "source": "https://www.imcine.gob.mx/media/2025/1/bol._resultados_ecamc_2025.pdf",
    "evidence": "IMCINE’s 2025 ECAMC results explicitly list this filmmaker with Oaxaca, Mexico. The location is a country browsing reference.",
    "primary": "MEX",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-94635ab3c837",
    "codes": [
      "MEX"
    ],
    "source": "https://www.imcine.gob.mx/media/2025/1/bol._resultados_ecamc_2025.pdf",
    "evidence": "IMCINE’s 2025 ECAMC results explicitly list this filmmaker with Estado de México, Mexico. The location is a country browsing reference.",
    "primary": "MEX",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-0334a6520d9e",
    "codes": [
      "USA"
    ],
    "source": "https://www.sundance.org/blogs/announcing-the-fellows-for-the-2025-sundance-institute-directors-screenwriters-and-native-labs/",
    "evidence": "Sundance explicitly lists Isabella Dionne Madrigal among the U.S.-based Native Lab fellows. Professional country association.",
    "primary": "USA",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-910d2e1ea6f9",
    "codes": [
      "USA"
    ],
    "source": "https://www.sundance.org/blogs/announcing-the-fellows-for-the-2025-sundance-institute-directors-screenwriters-and-native-labs/",
    "evidence": "Sundance identifies Jared Lank as a filmmaker from Maine and lists him among the U.S.-based fellows.",
    "primary": "USA",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-81777bdb8c45",
    "codes": [
      "CAN"
    ],
    "source": "https://www.sundance.org/blogs/announcing-the-fellows-for-the-2025-sundance-institute-directors-screenwriters-and-native-labs/",
    "evidence": "Sundance identifies Jordan Waunch as the fellow from Canada, selected with the Indigenous Screen Office.",
    "primary": "CAN",
    "checkedOn": "2026-10-31"
  },
  {
    "record": "NEW-5a7d1437fd07",
    "codes": [
      "CAN"
    ],
    "source": "https://www.sundance.org/blogs/sundance-institute-announces-2022-fellows-for-directors-screenwriters-and-native-labs/",
    "evidence": "Sundance lists Justin Ducharme and Positions under Canada and describes his community and work in its biography. Catalog country reference, not citizenship.",
    "primary": "CAN",
    "checkedOn": "2026-10-31"
  }
];
 function apply(records,countries){const names=new Map(countries.map(c=>[c.code,c.name]));for(const review of reviews){const r=records.find(r=>r.id===review.record);if(!r||review.codes.some(code=>!names.has(code)))throw new Error('Invalid country review '+review.record);r.previousCountry=r.country;r.country=review.primary;r.countryCodes=[...review.codes];r.countryName=review.codes.map(code=>names.get(code)).join(' / ');r.countryBasis=review.evidence;r.countrySource=review.source;r.countryReview={...review};if(!r.sources.some(s=>s.url===review.source&&s.type==='Country reference'))r.sources.push({url:review.source,type:'Country reference',evidence:review.evidence,authority:'Primary source',checkedOn:review.checkedOn});}for(const r of records)if(!r.countryCodes)r.countryCodes=r.country?[r.country]:[];}
 return {reviews,apply};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== catalog-audit61.js ==== */
try{(function(){
'use strict';
window.AtlasCatalogAudit61=(()=>{
 const data={
  "countryReviews": [
    {
      "record": "NEW-e6c05f35e08e",
      "codes": [
        "USA"
      ],
      "primary": "USA",
      "source": "https://www.polariscastillo.com/",
      "note": "Self-description: Indigenous Mexican-American; the published filmmaker biography locates him in California. No Mexican citizenship is inferred.",
      "supportingSource": "https://www.rednationff.com/dorina-sueno-americano/"
    },
    {
      "record": "DIR-0322",
      "codes": [
        "SLV",
        "CAN"
      ],
      "primary": "SLV",
      "source": "https://filmfreeway.com/SamuelLopez",
      "note": "Self-profile identifies Kuskatan, El Salvador, and a filmmaking company in Toronto. Both country references are retained."
    },
    {
      "record": "NEW-ec7f745e784a",
      "codes": [
        "CAN"
      ],
      "primary": "CAN",
      "source": "https://nsi-canada.ca/media_release/meet-the-2020-nsi-indigidocs-students/",
      "note": "NSI locates Miranda Currie in Yellowknife, Northwest Territories."
    },
    {
      "record": "NEW-8671d0c8d6ab",
      "codes": [
        "CAN"
      ],
      "primary": "CAN",
      "source": "https://nsi-canada.ca/media_release/meet-the-2020-nsi-indigidocs-students/",
      "note": "NSI locates Peter Brass in Regina, Saskatchewan."
    },
    {
      "record": "NEW-d9e2f69c6a40",
      "codes": [
        "CAN"
      ],
      "primary": "CAN",
      "source": "https://nsi-canada.ca/media_release/meet-the-2020-nsi-indigidocs-students/",
      "note": "NSI lists Rachel Beaulieu in Winnipeg and describes her Manitoba work."
    },
    {
      "record": "NEW-790b3156f35a",
      "codes": [
        "CAN"
      ],
      "primary": "CAN",
      "source": "https://nsi-canada.ca/media_release/meet-the-2020-nsi-indigidocs-students/",
      "note": "NSI lists Steven Davies in Victoria, British Columbia; its biography supplies his full name."
    },
    {
      "record": "NEW-7cb1fcf6d3ba",
      "codes": [
        "CAN"
      ],
      "primary": "CAN",
      "source": "https://nsi-canada.ca/media_release/announcing-participants-for-the-2021-edition-of-nsi-indigidocs-as-online-training-launches-today/",
      "note": "NSI describes Whitney Horne’s studio and work in Teslin, Yukon."
    },
    {
      "record": "NEW-4116f025e6c0",
      "codes": [
        "CAN"
      ],
      "primary": "CAN",
      "source": "https://nsi-canada.ca/media_release/announcing-participants-for-the-2021-edition-of-nsi-indigidocs-as-online-training-launches-today/",
      "note": "NSI explicitly locates Kim Stadfeld in Toronto, Ontario."
    },
    {
      "record": "NEW-9a693520a54d",
      "codes": [
        "CAN"
      ],
      "primary": "CAN",
      "source": "https://nsi-canada.ca/nsi-indigidocs-phase-1-participant-reflections/",
      "note": "NSI describes Jay Cardinal Villeneuve’s origin in northern Alberta and film work in Vancouver."
    },
    {
      "record": "NEW-ea1a043758b3",
      "codes": [
        "USA"
      ],
      "primary": "USA",
      "source": "https://www.kaylabriet.com/",
      "note": "Her own biography identifies her as an American musician selected for a U.S. State Department-supported fellowship."
    }
  ],
  "recordPatches": [
    {
      "record": "DIR-0224",
      "set": {
        "community": "Nahua",
        "nation": "Nahua"
      },
      "source": "https://www.cuatlacuatl.com/about"
    },
    {
      "record": "DIR-0322",
      "set": {
        "community": "Nahuát-Nonualco"
      },
      "aliases": [
        "Nawat-Nonualco",
        "Nahuát-Nonualco",
        "Náhuat",
        "Nawat"
      ],
      "source": "https://filmfreeway.com/SamuelLopez",
      "note": "Display Nahuát-Nonualco at the user’s request; self-source spelling is Nawat-Nonualco. No Mexican Nahua territorial link is assigned."
    },
    {
      "record": "NEW-e6c05f35e08e",
      "set": {
        "identityDescription": "Indigenous Mexican-American"
      },
      "source": "https://www.polariscastillo.com/"
    }
  ],
  "filmPatches": [
    {
      "record": "NEW-c46238144cea",
      "film": "NEW-c46238144cea-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Feature",
        "languages": "English, Anishinaabemowin"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 13
    },
    {
      "record": "NEW-6481dcf12002",
      "film": "NEW-6481dcf12002-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Music Video",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 14
    },
    {
      "record": "NEW-1364b94d56f9",
      "film": "NEW-1364b94d56f9-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Documentary Feature",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 15
    },
    {
      "record": "NEW-c74dcc05c3f0",
      "film": "NEW-c74dcc05c3f0-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Feature",
        "languages": "Spanish"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 16
    },
    {
      "record": "NEW-b5c3aa388940",
      "film": "NEW-b5c3aa388940-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Short",
        "languages": "English, Nlakapamuxcheen"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 17
    },
    {
      "record": "NEW-7b37398372f9",
      "film": "NEW-7b37398372f9-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Feature",
        "languages": "Kalaallisut (Greenlandic)"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 18
    },
    {
      "record": "NEW-5ba881030fa8",
      "film": "NEW-5ba881030fa8-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 19
    },
    {
      "record": "NEW-4b48761bbc57",
      "film": "NEW-4b48761bbc57-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Short",
        "languages": "English, Navajo"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 20
    },
    {
      "record": "NEW-df0d54c464f8",
      "film": "NEW-df0d54c464f8-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English, Spanish"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 21
    },
    {
      "record": "NEW-72d1f9f5e205",
      "film": "NEW-72d1f9f5e205-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English, Spanish"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 21
    },
    {
      "record": "NEW-473fa4602c6b",
      "film": "NEW-473fa4602c6b-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Feature",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 22
    },
    {
      "record": "NEW-f64866092029",
      "film": "NEW-f64866092029-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Documentary Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 23
    },
    {
      "record": "NEW-7c78fdbe16c7",
      "film": "NEW-7c78fdbe16c7-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 24
    },
    {
      "record": "NEW-ff0e80bc0b40",
      "film": "NEW-ff0e80bc0b40-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 25
    },
    {
      "record": "NEW-49dd86e44af1",
      "film": "NEW-49dd86e44af1-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 25
    },
    {
      "record": "NEW-fbac80ee10db",
      "film": "NEW-fbac80ee10db-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 26
    },
    {
      "record": "NEW-938e5240b40b",
      "film": "NEW-938e5240b40b-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 27
    },
    {
      "record": "NEW-8cac5b92e26b",
      "film": "NEW-8cac5b92e26b-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English, Lakota, Navajo"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 28
    },
    {
      "record": "NEW-4870cf62f977",
      "film": "NEW-4870cf62f977-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Documentary Short",
        "languages": "English, Spanish, Tupí, Portuguese, Vietnamese"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 29
    },
    {
      "record": "NEW-a0c5fd50f188",
      "film": "NEW-a0c5fd50f188-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 30
    },
    {
      "record": "NEW-15d5f34b0dd7",
      "film": "NEW-15d5f34b0dd7-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 31
    },
    {
      "record": "NEW-206c1f8493c6",
      "film": "NEW-206c1f8493c6-WORK-1",
      "set": {
        "year": 2026,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 31
    },
    {
      "record": "NEW-f63c5d67dd80",
      "film": "NEW-f63c5d67dd80-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English, Secwépemctsín"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 32
    },
    {
      "record": "NEW-9be87ea2f6c9",
      "film": "NEW-9be87ea2f6c9-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 33
    },
    {
      "record": "NEW-39a09ddff30e",
      "film": "NEW-39a09ddff30e-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Dramatic Short",
        "languages": "No dialogue"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 34
    },
    {
      "record": "NEW-ea9c6fdc5105",
      "film": "NEW-ea9c6fdc5105-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Experimental Short",
        "languages": "No dialogue"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 35
    },
    {
      "record": "NEW-f31285b461ae",
      "film": "NEW-f31285b461ae-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Music Video",
        "languages": "English, Cree"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 36
    },
    {
      "record": "NEW-24d192d7169f",
      "film": "NEW-24d192d7169f-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Documentary Short",
        "languages": "Haida"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 37
    },
    {
      "record": "NEW-da58b683f110",
      "film": "NEW-da58b683f110-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Feature",
        "languages": "English, Blackfoot"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 38
    },
    {
      "record": "NEW-a26382b65f7e",
      "film": "NEW-a26382b65f7e-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Experimental Feature",
        "languages": "Payómkawichum Chaamteela, English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 39
    },
    {
      "record": "NEW-7feb9c9ffe82",
      "film": "NEW-7feb9c9ffe82-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Experimental Feature",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 40
    },
    {
      "record": "NEW-2f13bf985833",
      "film": "NEW-2f13bf985833-WORK-1",
      "set": {
        "year": 2023,
        "medium": "Dramatic Mid-Length",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 41
    },
    {
      "record": "NEW-90a93a6d6b54",
      "film": "NEW-90a93a6d6b54-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Dramatic Feature",
        "languages": "English, Ojibway"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 42
    },
    {
      "record": "NEW-86d0a18ee535",
      "film": "NEW-86d0a18ee535-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Experimental Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 43
    },
    {
      "record": "NEW-4debd18cb5d1",
      "film": "NEW-4debd18cb5d1-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Documentary Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 44
    },
    {
      "record": "NEW-11d1a00b41b7",
      "film": "NEW-11d1a00b41b7-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 45
    },
    {
      "record": "NEW-d4f5a65b029e",
      "film": "NEW-d4f5a65b029e-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 46
    },
    {
      "record": "NEW-ba0e237dc98a",
      "film": "NEW-ba0e237dc98a-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 47
    },
    {
      "record": "NEW-1567e52b3a80",
      "film": "NEW-1567e52b3a80-WORK-1",
      "set": {
        "year": 2024,
        "medium": "Dramatic Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 48
    },
    {
      "record": "NEW-315f602c7b8a",
      "film": "NEW-315f602c7b8a-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Short",
        "languages": "Ojibwe, English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 49
    },
    {
      "record": "NEW-32b9da7d3995",
      "film": "NEW-32b9da7d3995-WORK-1",
      "set": {
        "year": 2025,
        "medium": "Documentary Short",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-announces-25th-anniversary-programming/",
      "finding": 50
    },
    {
      "record": "NEW-e6c05f35e08e",
      "film": "NEW-e6c05f35e08e-WORK-1",
      "set": {
        "title": "AND THE KIDS SAY",
        "year": 2025,
        "medium": "Music Video",
        "languages": "English"
      },
      "source": "https://imaginenative.org/the-imaginenative-film-media-arts-festival-unveils-its-2026-programming/",
      "finding": 3
    }
  ],
  "workGroups": [
    [
      "NEW-902ec5c62298-WORK-1",
      "NEW-1364b94d56f9-WORK-1"
    ],
    [
      "NEW-df0d54c464f8-WORK-1",
      "NEW-72d1f9f5e205-WORK-1"
    ],
    [
      "NEW-ff0e80bc0b40-WORK-1",
      "NEW-49dd86e44af1-WORK-1"
    ],
    [
      "NEW-514e349bd362-WORK-1",
      "NEW-a0c5fd50f188-WORK-1"
    ],
    [
      "NEW-15d5f34b0dd7-WORK-1",
      "NEW-206c1f8493c6-WORK-1"
    ],
    [
      "NEW-d2ab78a4b919-WORK-1",
      "NEW-f63c5d67dd80-WORK-1"
    ]
  ],
  "edgeExclusions": [
    {
      "record": "NEW-e6c05f35e08e",
      "land": "LAND-33889"
    },
    {
      "record": "NEW-e6c05f35e08e",
      "land": "LAND-36658"
    }
  ]
};
 const checkedOn='2026-10-31';
 function addSource(r,url,type,note){r.sources=r.sources||[];if(!r.sources.some(s=>s.url===url&&s.type===type))r.sources.push({url,type,evidence:note,authority:'Primary source',checkedOn});}
 function apply(records,countries){const byId=new Map(records.map(r=>[r.id,r])),names=new Map(countries.map(c=>[c.code,c.name]));
  for(const p of data.countryReviews){const r=byId.get(p.record);if(!r||p.codes.some(c=>!names.has(c)))throw Error('Invalid reviewed country '+p.record);r.country=p.primary;r.countryCodes=[...p.codes];r.countryName=p.codes.map(c=>names.get(c)).join(' / ');r.countrySource=p.source;r.countryBasis=p.note;addSource(r,p.source,'Country reference',p.note);if(p.supportingSource)addSource(r,p.supportingSource,'Country reference',p.note);}
  for(const p of data.recordPatches){const r=byId.get(p.record);if(!r)throw Error('Missing reviewed record '+p.record);Object.assign(r,p.set);if(p.aliases)r.aliases=[...new Set([...(r.aliases||[]),...p.aliases])];addSource(r,p.source,'Identity wording review',p.note||'Display wording checked against the creator’s biography.');if(p.note)r.identityWordingNote=p.note;}
  for(const p of data.filmPatches){const r=byId.get(p.record),f=r?.films.find(f=>f.id===p.film);if(!f)throw Error('Missing reviewed credit '+p.film);Object.assign(f,p.set);f.checkedOn=checkedOn;f.checkedFields=Object.keys(p.set);f.metadataSource=p.source;f.metadataNote='Metadata follows the cited festival program; its year may differ from later distribution dates.';addSource(r,p.source,'Film metadata review','Year, format and language checked for '+f.title+'. Credit role retained.');}
 }
 function patchCollectionCatalog(){for(const x of window.ATLAS_COLLECTION_CATALOG||[]){const r=data.recordPatches.find(p=>p.record===x.record);if(r?.set.community)x.community=r.set.community;const p=data.filmPatches.find(p=>p.record===x.record&&p.film===x.film);if(p){if(p.set.title)x.title=p.set.title;if(p.set.year)x.year=String(p.set.year);}}}
 window.AtlasArtwork?.registerWorkGroups?.(data.workGroups);patchCollectionCatalog();
 return {apply,data,edgeExclusions:data.edgeExclusions};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== theme-tags62.js ==== */
try{(function(){
'use strict';
window.AtlasThemeTags=(()=>{
 const vocabulary=['water','land defense','language return','memory','kinship','migration','sovereignty','gender','healing','futurity','archives','youth','ceremony','environmental change','urban life'];
 const seeds=[
  ['Mala Junta (Bad Influence)',['youth','kinship']],
  ['ADMONGEN, Vida Mapuche en Wallmapu',['land defense','sovereignty']],
  ['El Río de los Espíritus / River of Spirits',['water','memory']],
  ['Owners of the Water',['water','land defense']],
  ['MIWENE: Reclaiming the Amazon',['land defense','environmental change']],
  ['Mamá',['kinship','gender']],
  ['Nudo Mixteco',['kinship','gender','migration']],
  ['Smoke Signals',['kinship','memory']],
  ['Kicking the Clouds',['memory','kinship']],
  ['Do You Speak Paiute?',['language return']],
  ['Anishinaabemowin',['language return']],
  ['Nũhũ yãg mũ yõg hãm - This Land Is Ours!',['land defense','memory']]
 ];
 const norm=v=>String(v||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 function clean(raw){if(!raw||typeof raw.term!=='string'||!['curator','community'].includes(raw.source))return null;const result={term:raw.term.trim().slice(0,100),source:raw.source};if(!result.term)return null;if(raw.source==='community'){if(raw.indigenousTerm)result.indigenousTerm=String(raw.indigenousTerm).slice(0,140);if(raw.gloss)result.gloss=String(raw.gloss).slice(0,200);if(raw.language)result.language=String(raw.language).slice(0,80);}return result;}
 function apply(records){for(const r of records)for(const f of r.films){const tags=(Array.isArray(f.themes)?f.themes:[]).map(clean).filter(Boolean),seed=seeds.find(([title])=>norm(title)===norm(f.title));for(const term of seed?.[1]||[])if(!tags.some(t=>t.term===term))tags.push({term,source:'curator'});f.themes=tags;}}
 return {vocabulary,seeds,clean,apply};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== weave-route62.js ==== */
try{(function(){
'use strict';
window.AtlasWeaveIncoming=location.href;

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== atlas-update-1031.js ==== */
try{(function(){
'use strict';
// 31 October 2026 update: Research Master 724 refresh, new records, merges and enrichments.
// Runs after the site's own review layers, so their corrections stay in force.
// Statuses shown on the default map layer: reviewed records plus discoveries with a sourced directing credit.
// 'Review pending', 'Candidate' and 'Verification needed' stay in the research layer.
window.ATLAS_ON_MAP=new Set(['Map Ready','Discovery · credit supported','Discovery · directing credit sourced']);
window.AtlasUpdate1031=(()=>{
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const GUF={code:'GUF',name:'French Guiana',region:'South America',coordinates:[-53.1,3.9],iso:'254',scope:'Territorial entry point',coverage:'Source-supported country association',note:'Country navigation reference, not a filmmaker location.',leads:[]};
 const stats={updated:0,filmsAdded:0,added:0,merged:0,patched:0};
 function addFilms(r,films){
  r.films=r.films||[];const have=new Set(r.films.map(f=>norm(f.title)));
  for(const f of films||[]){const k=norm(f.title);if(!k||have.has(k))continue;have.add(k);
   r.films.push({id:f.id||(r.id+'-W1031-'+(r.films.length+1)),medium:null,languages:null,notes:null,review:false,...f});stats.filmsAdded++;}
  r.filmCount=String(r.films.length);
 }
 function addSources(r,sources){r.sources=r.sources||[];const have=new Set(r.sources.map(s=>s.url));for(const s of sources||[]){if(s&&s.url&&!have.has(s.url)){have.add(s.url);r.sources.push(s);}}}
 function addAliases(r,aliases){r.aliases=r.aliases||[];const names=new Set([norm(r.director||r.name),...r.aliases.map(a=>norm(typeof a==='string'?a:a.name))]);for(const a of aliases||[]){const k=norm(typeof a==='string'?a:a.name);if(k&&!names.has(k)){names.add(k);r.aliases.push(a);}}}
 function setCountry(r,code,names){if(!code||!names.has(code))return;r.country=code;r.countryCodes=[code];r.countryName=names.get(code);}
 function apply(records,countries){
  const d=window.ATLAS_UPDATE_1031;if(!d)return stats;
  if(!countries.some(c=>c.code==='GUF'))countries.push(GUF);
  const names=new Map(countries.map(c=>[c.code,c.name]));
  const byId=new Map(records.map(r=>[r.id,r]));
  for(const [id,u] of Object.entries(d.updates)){const r=byId.get(id);if(!r)continue;
   addFilms(r,u.films);addSources(r,u.sources);addAliases(r,u.aliases);
   if(u.status)r.status=u.status;
   if(u.country&&!r.country)setCountry(r,u.country,names);
   stats.updated++;}
  for(const n of d.records){if(byId.has(n.id))continue;const r=JSON.parse(JSON.stringify(n));
   if(r.country&&!names.has(r.country))r.country=null;
   if(r.country)r.countryName=names.get(r.country);
   r.countryCodes=r.country?[r.country]:[];records.push(r);byId.set(r.id,r);stats.added++;}
  for(const m of d.merges){const r=byId.get(m.into);if(!r)continue;addFilms(r,m.films);addSources(r,m.sources);addAliases(r,m.aliases);
   r.mergedFrom=[...(r.mergedFrom||[]),{id:m.from,why:m.why,on:d.date}];stats.merged++;}
  for(const p of d.patches){const r=byId.get(p.id);if(!r)continue;
   if(p.set)Object.assign(r,p.set);
   if(p.country&&(!r.country||p.set))setCountry(r,p.country,names);
   if(p.titles)for(const f of r.films||[])if(p.titles[f.title])f.title=p.titles[f.title];
   if(p.dropFilms){const gone=new Set(p.dropFilms);r.films=(r.films||[]).filter(f=>!gone.has(f.title));r.filmCount=String(r.films.length);}
   addAliases(r,p.aliases);addFilms(r,p.films);
   for(const f of p.films||[])addSources(r,[{url:f.sourceURL,type:'Screen credit',evidence:f.credit,authority:'Source retained',checkedOn:d.date}]);
   if(p.filmYears)for(const f of r.films){for(const [t,y] of Object.entries(p.filmYears))if(norm(f.title).startsWith(norm(t))&&!f.year)f.year=y;}
   if(p.note)r.auditNote=[r.auditNote,p.note].filter(Boolean).join(' ');
   stats.patched++;}
  // Beta 95: spelling-variant duplicates fold into the earlier record and leave the list.
  for(const m of (d.folds||[])){const into=byId.get(m.into),from=byId.get(m.from);if(!into||!from)continue;addSources(into,from.sources);addAliases(into,[from.name,...(from.aliases||[])]);into.mergedFrom=[...(into.mergedFrom||[]),{id:m.from,why:m.why,on:'2026-11-01'}];const k=records.indexOf(from);if(k>=0)records.splice(k,1);byId.delete(m.from);stats.merged++;}
  // Beta 126: records removed because the filmmaker is not Indigenous; they leave every list and count.
  for(const x of (d.removals||[])){const r=byId.get(x.id);if(!r)continue;const k=records.indexOf(r);if(k>=0)records.splice(k,1);byId.delete(x.id);stats.removed=(stats.removed||0)+1;}
  for(const r of records)if(r.country==='GRL')r.countryName=names.get('GRL')||'Kalaallit Nunaat / Greenland';
  // Apply the November 5 filmography batch only after all other source layers and folds.
  // Matched existing filmmaker IDs retain their existing Indigenous biographical records and land links.
  const next=window.ATLAS_NEXT25_20261105;
  if(next&&Array.isArray(next.credits)){
   const result={submitted:next.credits.length,addedCredits:0,duplicateCredits:0,unmatched:[],items:[]};
   for(const c of next.credits){
    const r=records.find(x=>x.id===c.record);
    if(!r){result.unmatched.push({record:c.record,maker:c.maker,film:c.title});continue;}
    if((r.films||[]).some(f=>norm(f.title)===norm(c.title))){result.duplicateCredits++;continue;}
    addFilms(r,[{id:c.id,title:c.title,year:c.year,credit:c.credit,medium:'Film',languages:null,notes:c.notes,review:false,sourceURL:c.sourceURL,metadata:{sourceLayer:'mirror_work 2026-11-05',sourceStatus:'Existing filmmaker + sourced film credit',thumbnailStatus:'No cleared film-specific thumbnail linked',filmTerritory:null}}]);
    addSources(r,[{url:c.sourceURL,type:'Director-film credit',evidence:c.credit,authority:'Research mirror source retained',checkedOn:'2026-11-05'}]);
    result.addedCredits++;result.items.push({id:c.id,record:r.id,maker:r.name,title:c.title,year:c.year});
   }
   const nahua=records.find(x=>x.id==='DIR-0230');
   if(nahua){nahua.nation='Nahua';nahua.affiliation='Nahua';nahua.community='Acatlán, Chilapa de Álvarez, Guerrero (filmmaker origin)';addSources(nahua,[{url:'https://suracapulco.mx/pondera-el-documentalista-indigena-jose-luis-matias-difusion-de-problemas-sociales-mediante-el-cine/',type:'Personal Indigenous identity and origin',evidence:'Nahua; Acatlán, Chilapa, Guerrero',authority:'Filmmaker biography',checkedOn:'2026-11-05'}]);result.nahuaOriginCorrected=true;}
   window.ATLAS_NEXT25_RESULT=result;
  }
  return stats;
 }
 return {apply,stats};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}
