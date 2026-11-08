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
