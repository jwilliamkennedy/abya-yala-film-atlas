'use strict';
// Additive credit correction; private master files are untouched.
(()=>{const record='DIR-0216',film={id:'FILM-NUDO-MIXTECO-2021',title:'Nudo mixteco',year:2021,medium:'Feature',languages:null,notes:null,review:false,credit:'Director',sourceURL:'https://moreliafilmfest.com/realizadores/cruz-angeles',checkedOn:'2026-10-30',checkedFields:['title','director','year']};
 const pilot=window.ATLAS_PILOT_CATALOG;
 if(pilot&&!pilot.credits.some(c=>c.record===record&&c.film.id===film.id))pilot.credits.push({record,film});
 const catalog=window.ATLAS_COLLECTION_CATALOG;
 if(catalog&&!catalog.some(c=>c.record===record&&c.type==='film'&&c.title.toLowerCase()===film.title.toLowerCase()))catalog.push({id:'film:'+record+':'+film.id,type:'film',record,film:film.id,title:film.title,maker:'Ángeles Cruz',community:'Ñuu Savi · Villa Guadalupe Victoria, Oaxaca',year:2021,image:'',imageTitle:'',href:'./#view=films&maker='+record+'&film='+film.id});
})();
