/* Reversible beta-only 3-record test. Source manifest: private mirror_work/beta_test_2026-11-01.csv. Do not copy into stable layers. */
(()=>{
 'use strict';
 const d=window.ATLAS_UPDATE_1031;
 if(!d||!Array.isArray(d.records))return;
 const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const seen=new Set(d.records.flatMap(r=>[r.name,r.director,...(r.aliases||[])].map(v=>key(typeof v==='string'?v:v?.name)).filter(Boolean)));
 const candidates=[
  {
    "id": "BETA-T1101-VEN-01",
    "name": "Aranaga Epieyu",
    "director": "Aranaga Epieyu",
    "nation": "Wayuu",
    "community": "Wayuu (specific community not established)",
    "country": "VEN",
    "countryName": "Venezuela",
    "countryCodes": [
      "VEN"
    ],
    "films": [
      {
        "id": "BETA-T1101-VEN-01-F1",
        "title": "Wachikua: Nuestra historia",
        "year": 2014,
        "credit": "Director",
        "medium": "Documentary",
        "languages": null,
        "notes": "Wayuu director born in Maracaibo. Production sometimes dated 2012; published film analyses date the documentary 2014. Community membership beyond Wayuu not inferred.",
        "review": false,
        "sourceURL": "https://www.youtube.com/watch?v=_TnJ2PZOEDQ"
      }
    ],
    "filmCount": "1",
    "status": "Discovery · credit supported",
    "affiliation": "Wayuu",
    "entity": "Person",
    "evidence": "Source-located",
    "notes": "Wayuu director born in Maracaibo. Production sometimes dated 2012; published film analyses date the documentary 2014. Community membership beyond Wayuu not inferred.",
    "countryBasis": "Filmmaker country supported by source, not residence/land-identity inference",
    "countrySource": "https://www.youtube.com/watch?v=_TnJ2PZOEDQ",
    "affiliationSources": "[\"https://revista.cinedocumental.com.ar/category/nro-17/\"]",
    "sources": [
      {
        "url": "https://www.youtube.com/watch?v=_TnJ2PZOEDQ",
        "type": "Director credit",
        "evidence": "Individually named director and film",
        "authority": "Source retained",
        "checkedOn": "2026-11-01"
      },
      {
        "url": "https://revista.cinedocumental.com.ar/category/nro-17/",
        "type": "Indigenous identity",
        "evidence": "Source explicitly establishes director's identity",
        "authority": "Source retained",
        "checkedOn": "2026-11-01"
      }
    ],
    "issues": [],
    "aliases": [],
    "metadata": {
      "batch": "mirror_work/beta_test_2026-11-01.csv",
      "importedOn": "2026-11-01",
      "scope": "Beta-only test"
    },
    "discovery": true,
    "auditStatus": "Beta pilot · identity and director verified",
    "auditNote": "Reversible beta-only test from private mirror_work provenance; source film and identity verified; no stable file updates"
  },
  {
    "id": "BETA-T1101-PER-01",
    "name": "Rómulo Sulca Ricra",
    "director": "Rómulo Sulca Ricra",
    "nation": "Quechua",
    "community": "Quechua (specific community not established)",
    "country": "PER",
    "countryName": "Peru",
    "countryCodes": [
      "PER"
    ],
    "films": [
      {
        "id": "BETA-T1101-PER-01-F1",
        "title": "Érase una vez en los Andes",
        "year": 2023,
        "credit": "Director",
        "medium": "Feature",
        "languages": null,
        "notes": "Festival explicitly describes filmmaker as Quechua. No particular community location inferred from filming or language.",
        "review": false,
        "sourceURL": "https://dafo.cultura.pe/cinerobles/erase-una-vez-en-los-andes-en-la-sala-armando-robles-godoy"
      }
    ],
    "filmCount": "1",
    "status": "Discovery · credit supported",
    "affiliation": "Quechua",
    "entity": "Person",
    "evidence": "Source-located",
    "notes": "Festival explicitly describes filmmaker as Quechua. No particular community location inferred from filming or language.",
    "countryBasis": "Filmmaker country supported by source, not residence/land-identity inference",
    "countrySource": "https://dafo.cultura.pe/cinerobles/erase-una-vez-en-los-andes-en-la-sala-armando-robles-godoy",
    "affiliationSources": "[\"https://fliff.org/events/onceuponatimeintheandes/\"]",
    "sources": [
      {
        "url": "https://dafo.cultura.pe/cinerobles/erase-una-vez-en-los-andes-en-la-sala-armando-robles-godoy",
        "type": "Director credit",
        "evidence": "Individually named director and film",
        "authority": "Source retained",
        "checkedOn": "2026-11-01"
      },
      {
        "url": "https://fliff.org/events/onceuponatimeintheandes/",
        "type": "Indigenous identity",
        "evidence": "Source explicitly establishes director's identity",
        "authority": "Source retained",
        "checkedOn": "2026-11-01"
      }
    ],
    "issues": [],
    "aliases": [],
    "metadata": {
      "batch": "mirror_work/beta_test_2026-11-01.csv",
      "importedOn": "2026-11-01",
      "scope": "Beta-only test"
    },
    "discovery": true,
    "auditStatus": "Beta pilot · identity and director verified",
    "auditNote": "Reversible beta-only test from private mirror_work provenance; source film and identity verified; no stable file updates"
  },
  {
    "id": "BETA-T1101-CAN-01",
    "name": "Myriam Landry",
    "director": "Myriam Landry",
    "nation": "W8banaki",
    "community": "Wôlinak",
    "country": "CAN",
    "countryName": "Canada",
    "countryCodes": [
      "CAN"
    ],
    "films": [
      {
        "id": "BETA-T1101-CAN-01-F1",
        "title": "W8linaktegw ta niona",
        "year": 2022,
        "credit": "Director",
        "medium": "Documentary",
        "languages": null,
        "notes": "Festival biography explicitly identifies W8banaki First Nation membership in Wôlinak. 2022 production, 2023 festival and later 2024 showings.",
        "review": false,
        "sourceURL": "https://rpff.ca/2023/program/shorts-1/"
      }
    ],
    "filmCount": "1",
    "status": "Discovery · credit supported",
    "affiliation": "W8banaki",
    "entity": "Person",
    "evidence": "Source-located",
    "notes": "Festival biography explicitly identifies W8banaki First Nation membership in Wôlinak. 2022 production, 2023 festival and later 2024 showings.",
    "countryBasis": "Filmmaker country supported by source, not residence/land-identity inference",
    "countrySource": "https://rpff.ca/2023/program/shorts-1/",
    "affiliationSources": "[\"https://ffpe.ca/projections-rencontres-2025/\"]",
    "sources": [
      {
        "url": "https://rpff.ca/2023/program/shorts-1/",
        "type": "Director credit",
        "evidence": "Individually named director and film",
        "authority": "Source retained",
        "checkedOn": "2026-11-01"
      },
      {
        "url": "https://ffpe.ca/projections-rencontres-2025/",
        "type": "Indigenous identity",
        "evidence": "Source explicitly establishes director's identity",
        "authority": "Source retained",
        "checkedOn": "2026-11-01"
      }
    ],
    "issues": [],
    "aliases": [],
    "metadata": {
      "batch": "mirror_work/beta_test_2026-11-01.csv",
      "importedOn": "2026-11-01",
      "scope": "Beta-only test"
    },
    "discovery": true,
    "auditStatus": "Beta pilot · identity and director verified",
    "auditNote": "Reversible beta-only test from private mirror_work provenance; source film and identity verified; no stable file updates"
  }
];
 let added=0;
 for(const r of candidates){const name=key(r.name);if(!name||seen.has(name)||d.records.some(x=>x.id===r.id))continue;d.records.push(r);seen.add(name);added++;}
 window.ATLAS_BETA_TEST_1101={candidateCount:candidates.length,added};
})();
