/* Reviewed pilot, 2026-09-27. Separate from the stable film archive.
 * Geometry IDs refer to the existing 2023 Native Land / MapMaker snapshot.
 * An affiliation is not a residence, film location, or claim to a boundary. */
window.ATLAS_CONNECTIONS = {
  communities: [
    {id:'abenaki',name:'Abenaki',land:'35947',context:'Abenaki territorial reference; not an individual location.'},
    {id:'sarayaku',name:'Kichwa · Sarayaku',land:'33220',context:'Broader Kichwa Amazónico reference. This geometry does not delimit Sarayaku.'},
    {id:'nuu-savi',name:'Ñuu Savi',land:'36528',context:'Broader Ñuu Savi reference; Cruz identifies Villa Guadalupe Victoria as her community.'},
    {id:'zapotec',name:'Zapotec · Guelatao',land:'35934',context:'Broader Zapotec reference, not the boundary of Guelatao.'},
    {id:'tsotsil',name:'Tsotsil · Chenalhó',land:'36628',context:'Broader Tsotsil reference, not the boundary of Chenalhó.'},
    {id:'dine',name:'Diné / Navajo',land:'36463',context:'Diné Bikéyah reference; filmmaker nodes are arranged for reading, not located geographically.'},
    {id:'ho-chunk',name:'Ho-Chunk',land:'35959',context:'Ho-Chunk territorial reference; no personal location is implied.'},
    {id:'pechanga',name:'Pechanga · Luiseño',land:null,context:'No matching Pechanga geometry assigned. Hopinka’s documented descent remains visible without a map anchor.'},
    {id:'choctaw',name:'Choctaw',land:'36162',context:'Broad Choctaw reference. Rector’s source reports heritage, not citizenship in a particular tribal government.'},
    {id:'seminole',name:'Seminole',land:'36573',context:'Broad Seminole reference. No specific Seminole tribal citizenship is asserted.'}
  ],
  directors: [
    {id:'DIR-0059',affiliations:[{community:'abenaki',kind:'Source-described identity',wording:'Abenaki filmmaker'}],source:'https://www.nfb.ca/directors/alanis-obomsawin/',publisher:'National Film Board of Canada'},
    {id:'DIR-0199',affiliations:[{community:'sarayaku',kind:'Community origin',wording:'Kichwa filmmaker from Sarayaku'}],source:'https://pragda.com/director/eriberto-gualinga/',publisher:'Pragda'},
    {id:'DIR-0216',affiliations:[{community:'nuu-savi',kind:'Self-described identity',wording:'Ñuu Savi woman from Villa Guadalupe Victoria, Oaxaca'}],source:'https://moreliafilmfest.com/realizadores/cruz-angeles',publisher:'Morelia International Film Festival'},
    {id:'DIR-0233',affiliations:[{community:'zapotec',kind:'Community citizenship',wording:'Zapotec; from and a citizen of the community of Guelatao'}],source:'https://hagamoslumbre.org/index.php/about/',publisher:'Lumbre collective · filmmaker biography'},
    {id:'DIR-0235',affiliations:[{community:'tsotsil',kind:'Self-described identity',wording:'Tsotsil woman from Chenalhó, Chiapas'}],source:'https://www.firelightmedia.tv/filmmakers/maria-sojob',publisher:'Firelight Media'},
    {id:'DIR-0269',affiliations:[{community:'dine',kind:'Source-described identity',wording:'Filmmaker from the Navajo Nation'}],source:'https://www.unitedstatesartists.org/artists/blackhorse-lowe',publisher:'United States Artists'},
    {id:'DIR-0305',affiliations:[{community:'dine',kind:'Self-described identity',wording:'Diné (Navajo) filmmaker'}],source:'https://www.shaandiin.com/about',publisher:'Shaandiin Tome · official biography'},
    {id:'DIR-0307',affiliations:[{community:'ho-chunk',kind:'Tribal membership',wording:'Member of the Ho-Chunk Nation of Wisconsin'},{community:'pechanga',kind:'Descent',wording:'Descendant of the Pechanga Band of Luiseño Indians'}],source:'https://www.macfound.org/fellows/class-of-2022/sky-hopinka',publisher:'MacArthur Foundation'},
    {id:'DIR-0311',affiliations:[{community:'choctaw',kind:'Source-reported heritage',wording:'Choctaw heritage'},{community:'seminole',kind:'Source-reported heritage',wording:'Seminole heritage'}],source:'https://dailydigest.uconn.edu/publicEmailSingleStoryView.php?cid=24&id=176428&iid=5228',publisher:'University of Connecticut · filmmaker event biography'},
    {id:'DIR-0331',affiliations:[{community:'dine',kind:'Source-described identity',wording:'Navajo filmmaker; grew up on the Navajo Nation'}],source:'https://www.sundance.org/blogs/straight-out-of-sundance-how-drunktowns-finest-director-sydney-freeland-found-cinema-and-pursued-her-dream/',publisher:'Sundance Institute'}
  ]
};
