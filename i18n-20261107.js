/* Interface languages for the beta map, 2026-11-07: English, Español, Português, Français.
   Only the interface is translated (menus, buttons, labels, the map key). Filmmakers' names, film titles,
   peoples, lands and quoted sources stay exactly as recorded. Choice is remembered; ?lang=es|pt|fr also works. */
(()=>{'use strict';
const LANGS={en:'English',es:'Español',pt:'Português',fr:'Français'};
// [English, Español, Português, Français]
const T=[["Films you add from filmmaker pages, the timeline and Watch gather here, kept in this browser. Reorder them, add notes, and copy the list into a syllabus.","Las películas que agregas desde las páginas de cineastas, la cronología y Ver se reúnen aquí, guardadas en este navegador. Reordénalas, agrega notas y copia la lista en un programa de curso.","Os filmes que você adiciona nas páginas de cineastas, na linha do tempo e em Assistir ficam reunidos aqui, guardados neste navegador. Reordene-os, acrescente notas e copie a lista para um programa de curso.","Les films que vous ajoutez depuis les pages des cinéastes, la chronologie et Regarder se rassemblent ici, conservés dans ce navigateur. Réordonnez-les, ajoutez des notes et copiez la liste dans un plan de cours."],["Copy as syllabus","Copiar como programa","Copiar como programa","Copier comme plan de cours"],["Download CSV","Descargar CSV","Baixar CSV","Télécharger le CSV"],["Clear list","Vaciar la lista","Limpar a lista","Vider la liste"],["Filmmakers, communities and researchers can correct a record or suggest a filmmaker or film the atlas is missing.","Cineastas, comunidades e investigadores pueden corregir un registro o sugerir un cineasta o una película que falte en el atlas.","Cineastas, comunidades e pesquisadores podem corrigir um registro ou sugerir um cineasta ou filme que falte no atlas.","Cinéastes, communautés et chercheurs peuvent corriger une fiche ou signaler un cinéaste ou un film absent de l’atlas."],["Corrections and additions","Correcciones y adiciones","Correções e acréscimos","Corrections et ajouts"],["On the map","En el mapa","No mapa","Sur la carte"],["Plays here","Se reproduce aquí","Toca aqui","Lecture ici"],["All themes","Todos los temas","Todos os temas","Tous les thèmes"],["Language","Idioma","Idioma","Langue"],["Another film","Otra película","Outro filme","Un autre film"],["Filmmaker A–Z","Cineasta A–Z","Cineasta A–Z","Cinéaste A–Z"],["Newest first","Más recientes primero","Mais recentes primeiro","Plus récents d’abord"],["Title A–Z","Título A–Z","Título A–Z","Titre A–Z"],["Search films, filmmakers, peoples","Buscar películas, cineastas, pueblos","Buscar filmes, cineastas, povos","Chercher des films, cinéastes, peuples"],["Something wrong or missing?","¿Algo está mal o falta?","Algo errado ou faltando?","Une erreur ou un oubli ?"],["films by filmmakers on the atlas.","películas de cineastas del atlas.","filmes de cineastas do atlas.","films de cinéastes de l’atlas."],["play here.","se ven aquí.","podem ser vistos aqui.","se regardent ici."],["▶ Play on Watch","▶ Reproducir en Ver","▶ Reproduzir em Assistir","▶ Lire dans Regarder"],["Film credits","Créditos","Créditos","Crédits"],
["How can films encounter each other?", "¿Cómo pueden encontrarse las películas?", "Como os filmes podem se encontrar?", "Comment les films peuvent-ils se rencontrer ?"],
["Map", "Mapa", "Mapa", "Carte"],
["Zoom to selection", "Acercar a la selección", "Aproximar da seleção", "Zoomer sur la sélection"],
["Zoom to the selected land or filmmaker", "Acercar a la tierra o al cineasta seleccionado", "Aproximar da terra ou do cineasta selecionado", "Zoomer sur le territoire ou le cinéaste sélectionné"],
["Filmmakers here", "Cineastas aquí", "Cineastas aqui", "Cinéastes ici"],
["Drag to move the map", "Arrastra para mover el mapa", "Arraste para mover o mapa", "Faites glisser pour déplacer la carte"],
["Point at a land to preview it; click to open", "Apunta a una tierra para verla; haz clic para abrir", "Aponte para uma terra para pré-visualizar; clique para abrir", "Pointez un territoire pour l’aperçu ; cliquez pour l’ouvrir"],
["Film", "Película", "Filme", "Film"],
["Show", "Mostrar", "Mostrar", "Afficher"],
["All filmmakers", "Todos los cineastas", "Todos os cineastas", "Tous les cinéastes"],
["Show these lands on the map →", "Mostrar estas tierras en el mapa →", "Mostrar estas terras no mapa →", "Afficher ces territoires sur la carte →"],
["Clear this weave…", "Borrar este tejido…", "Limpar esta tecelagem…", "Effacer ce tissage…"],
["This weave", "Este tejido", "Esta tecelagem", "Ce tissage"],
["More list tools", "Más herramientas de la lista", "Mais ferramentas da lista", "Autres outils de la liste"],
["Switch to the night theme", "Cambiar al tema nocturno", "Mudar para o tema noturno", "Passer au thème de nuit"],
["Switch to the day theme", "Cambiar al tema diurno", "Mudar para o tema diurno", "Passer au thème de jour"],
["Browse the atlas by", "Recorrer el atlas por", "Percorrer o atlas por", "Parcourir l’atlas par"],
["Watch.", "Ver.", "Assistir.", "Regarder."],
["Films by filmmakers at this land that can be watched in full. Shown when you point at a land or zoom in.", "Películas de cineastas de esta tierra que se pueden ver completas. Aparece al apuntar a una tierra o al acercar el mapa.", "Filmes de cineastas desta terra que podem ser assistidos na íntegra. Aparece ao apontar para uma terra ou ao aproximar o mapa.", "Films de cinéastes de ce territoire visibles en entier. Apparaît quand vous pointez un territoire ou zoomez."],
["Weave films into threads by what they share: a theme, a land, a question. Each thread runs across the map from film to film, to read, play and share.", "Teje películas en hilos según lo que comparten: un tema, una tierra, una pregunta. Cada hilo recorre el mapa de película en película, para leerlo, reproducirlo y compartirlo.", "Teça filmes em fios pelo que compartilham: um tema, uma terra, uma pergunta. Cada fio percorre o mapa de filme em filme, para ler, reproduzir e compartilhar.", "Tissez des films en fils selon ce qu’ils partagent : un thème, une terre, une question. Chaque fil traverse la carte de film en film, à lire, dérouler et partager."],
["Add films", "Añadir películas", "Adicionar filmes", "Ajouter des films"],
["Link them, and say why", "Vincúlalas y di por qué", "Ligue-os e diga por quê", "Reliez-les et dites pourquoi"],
["Read, play or share", "Leer, reproducir o compartir", "Ler, reproduzir ou compartilhar", "Lire, dérouler ou partager"],
["Start from a theme", "Empezar por un tema", "Começar por um tema", "Partir d’un thème"],
["Every film on the thread shares the theme, taken from its published synopsis.", "Cada película del hilo comparte el tema, tomado de su sinopsis publicada.", "Cada filme do fio compartilha o tema, tirado de sua sinopse publicada.", "Chaque film du fil partage le thème, tiré de son synopsis publié."],
["Start from a film", "Empezar por una película", "Começar por um filme", "Partir d’un film"],
["Choose one film. Films that share a documented theme with it are suggested next.", "Elige una película. Se sugieren después las que comparten con ella un tema documentado.", "Escolha um filme. Os que compartilham com ele um tema documentado são sugeridos em seguida.", "Choisissez un film. Les films qui partagent avec lui un thème documenté sont proposés ensuite."],
["Search a film or filmmaker…", "Busca una película o cineasta…", "Busque um filme ou cineasta…", "Cherchez un film ou un cinéaste…"],
["See an example", "Ver un ejemplo", "Ver um exemplo", "Voir un exemple"],
["Four films that share a theme, already woven, to read and change.", "Cuatro películas que comparten un tema, ya tejidas, para leer y cambiar.", "Quatro filmes que compartilham um tema, já tecidos, para ler e mudar.", "Quatre films qui partagent un thème, déjà tissés, à lire et à modifier."],
["Open the example", "Abrir el ejemplo", "Abrir o exemplo", "Ouvrir l’exemple"],
["Or explore the theme web →", "O explora la red de temas →", "Ou explore a rede de temas →", "Ou explorez la toile des thèmes →"],
["Open a saved weave", "Abrir un tejido guardado", "Abrir uma tecelagem salva", "Ouvrir un tissage enregistré"],
["Link them", "Vincularlas", "Ligá-los", "Les relier"],
["Read and share", "Leer y compartir", "Ler e compartilhar", "Lire et partager"],
["Add next", "Añadir después", "Adicionar em seguida", "Ajouter ensuite"],
["Films that could come next", "Películas que podrían seguir", "Filmes que podem vir em seguida", "Films qui pourraient suivre"],
["Connect two films", "Conectar dos películas", "Conectar dois filmes", "Relier deux films"],
["Read the weave", "Leer el tejido", "Ler a tecelagem", "Lire le tissage"],
["Search films", "Buscar películas", "Buscar filmes", "Chercher des films"],
["See films that could come next", "Ver películas que podrían seguir", "Ver filmes que podem vir em seguida", "Voir les films qui pourraient suivre"],
["Play on the map", "Reproducir en el mapa", "Reproduzir no mapa", "Dérouler sur la carte"],
["Back to building", "Volver a construir", "Voltar a construir", "Revenir à la construction"],
["Done drawing", "Terminar el trazo", "Concluir o traçado", "Terminer le tracé"],
["Clear weave", "Borrar el tejido", "Limpar a tecelagem", "Effacer le tissage"],
["Add the first film: search, or click a film on the map.", "Añade la primera película: busca o haz clic en una película del mapa.", "Adicione o primeiro filme: busque ou clique em um filme no mapa.", "Ajoutez le premier film : cherchez, ou cliquez sur un film de la carte."],
["Add a second film. Films that share a documented theme with this one are listed below.", "Añade una segunda película. Abajo aparecen las que comparten con esta un tema documentado.", "Adicione um segundo filme. Abaixo estão os que compartilham com este um tema documentado.", "Ajoutez un deuxième film. Les films qui partagent avec celui-ci un thème documenté sont listés ci-dessous."],
["Click films on the map in the order the thread should run. Choose Done drawing to finish.", "Haz clic en las películas del mapa en el orden del hilo. Elige Terminar el trazo para acabar.", "Clique nos filmes do mapa na ordem do fio. Escolha Concluir o traçado para terminar.", "Cliquez sur les films de la carte dans l’ordre du fil. Choisissez Terminer le tracé pour finir."],
["Each shares a theme with this film in its published synopsis. Add next puts it on the thread.", "Cada una comparte un tema con esta película en su sinopsis publicada. Añadir después la pone en el hilo.", "Cada um compartilha um tema com este filme em sua sinopse publicada. Adicionar em seguida o coloca no fio.", "Chacun partage un thème avec ce film dans son synopsis publié. Ajouter ensuite le place sur le fil."],
['Skip to index','Saltar al índice','Pular para o índice','Aller à l’index'],
['Abya Yala and Turtle Island','Abya Yala e Isla Tortuga','Abya Yala e Ilha da Tartaruga','Abya Yala et l’Île de la Tortue'],
['About','Acerca de','Sobre','À propos'],['Filmmakers','Cineastas','Cineastas','Cinéastes'],['Films','Películas','Filmes','Films'],
['Land','Tierra','Terra','Territoire'],['Watch','Ver','Assistir','Regarder'],['▸ Watch','▸ Ver','▸ Assistir','▸ Regarder'],['More','Más','Mais','Plus'],
['Filmmakers A–Z','Cineastas A–Z','Cineastas A–Z','Cinéastes A–Z'],['Timeline','Cronología','Linha do tempo','Chronologie'],
['Globe (preview)','Globo (vista previa)','Globo (prévia)','Globe (aperçu)'],['Screening list','Lista de proyección','Lista de exibição','Liste de projection'],
['Data','Datos','Dados','Données'],['Suggest a correction','Sugerir una corrección','Sugerir uma correção','Suggérer une correction'],
['films','películas','filmes','films'],['filmmakers','cineastas','cineastas','cinéastes'],['Theme','Tema','Tema','Thème'],
['Sage & cochineal','Salvia y cochinilla','Sálvia e cochonilha','Sauge et cochenille'],['Starry night','Noche estrellada','Noite estrelada','Nuit étoilée'],
['← Clear selection','← Borrar selección','← Limpar seleção','← Effacer la sélection'],['AMERICAS','AMÉRICAS','AMÉRICAS','AMÉRIQUES'],
['Fit selection','Ajustar a la selección','Ajustar à seleção','Cadrer la sélection'],['Map overview','Vista general','Visão geral','Vue d’ensemble'],
['Surprise me','Sorpréndeme','Surpreenda-me','Surprenez-moi'],['Disappear map','Desaparecer el mapa','Ocultar o mapa','Faire disparaître la carte'],
['Return map','Volver al mapa','Mostrar o mapa','Rétablir la carte'],['Countries','Países','Países','Pays'],
['Filmmakers and films indexed by country','Cineastas y películas por país','Cineastas e filmes por país','Cinéastes et films par pays'],
['Find a country','Buscar un país','Buscar um país','Trouver un pays'],['Order','Orden','Ordem','Ordre'],['Most films','Más películas','Mais filmes','Plus de films'],
['Most filmmakers','Más cineastas','Mais cineastas','Plus de cinéastes'],['By region','Por región','Por região','Par région'],
['Include not yet indexed','Incluir los aún sin indexar','Incluir os ainda não indexados','Inclure les pays non indexés'],
['No country matches.','Ningún país coincide.','Nenhum país corresponde.','Aucun pays ne correspond.'],['Layers','Capas','Camadas','Calques'],
['Land names','Nombres de tierras','Nomes das terras','Noms des territoires'],['Country markers','Marcadores de país','Marcadores de país','Marqueurs de pays'],
['Curved Relations layout','Relaciones en curva','Relações em curva','Relations en courbes'],['Territories','Territorios','Territórios','Territoires'],
['Off','Apagado','Desligado','Désactivé'],['Soft','Suave','Suave','Léger'],['Strong','Fuerte','Forte','Fort'],['Strength','Intensidad','Intensidade','Intensité'],
['Native Land Digital / MapMaker references, not definitive boundaries.','Referencias de Native Land Digital / MapMaker, no límites definitivos.','Referências de Native Land Digital / MapMaker, não limites definitivos.','Références de Native Land Digital / MapMaker, et non des frontières définitives.'],
['Native Land overlay','Capa de Native Land','Camada Native Land','Superposition Native Land'],['Basemap','Mapa base','Mapa base','Fond de carte'],
['Outline every territory','Delinear todos los territorios','Contornar todos os territórios','Tracer tous les territoires'],
['Index ↓','Índice ↓','Índice ↓','Index ↓'],['Whole world','Todo el mundo','Mundo inteiro','Monde entier'],['Map key','Leyenda','Legenda','Légende'],
['Land names.','Nombres de tierras.','Nomes das terras.','Noms des territoires.'],
['Larger names have more linked filmmakers. Indigenous scripts are kept. Point to preview; select to open.','Los nombres más grandes tienen más cineastas vinculados. Se conservan las escrituras indígenas. Apunta para ver una vista previa; selecciona para abrir.','Nomes maiores têm mais cineastas vinculados. As escritas indígenas são mantidas. Aponte para pré-visualizar; selecione para abrir.','Les noms plus grands ont plus de cinéastes liés. Les écritures autochtones sont conservées. Survolez pour un aperçu; sélectionnez pour ouvrir.'],
['Territory.','Territorio.','Território.','Territoire.'],
['Native Land Digital / MapMaker reference (2023), not a definitive boundary. Strength is in Layers.','Referencia de Native Land Digital / MapMaker (2023), no un límite definitivo. La intensidad está en Capas.','Referência de Native Land Digital / MapMaker (2023), não um limite definitivo. A intensidade fica em Camadas.','Référence de Native Land Digital / MapMaker (2023), et non une frontière définitive. L’intensité se règle dans Calques.'],
['Outlined territory.','Territorio delineado.','Território contornado.','Territoire tracé.'],
['The one under your pointer, or the land you selected.','El que está bajo el puntero, o la tierra que seleccionaste.','O que está sob o ponteiro, ou a terra que você selecionou.','Celui sous le pointeur, ou le territoire sélectionné.'],
['Picture at a land.','Imagen en una tierra.','Imagem numa terra.','Image sur un territoire.'],
['A still or portrait for a linked filmmaker.','Un fotograma o retrato de un cineasta vinculado.','Um fotograma ou retrato de um cineasta vinculado.','Un photogramme ou un portrait d’un cinéaste lié.'],
['Country marker.','Marcador de país.','Marcador de país.','Marqueur de pays.'],
['Opens that country’s filmmakers and films. Counts don’t establish identity, citizenship or residence.','Abre los cineastas y películas de ese país. Los conteos no establecen identidad, ciudadanía ni residencia.','Abre os cineastas e filmes desse país. As contagens não estabelecem identidade, cidadania ou residência.','Ouvre les cinéastes et les films de ce pays. Les décomptes n’établissent ni l’identité, ni la citoyenneté, ni la résidence.'],
['Solid line.','Línea continua.','Linha contínua.','Ligne continue.'],['Affiliation with a source.','Afiliación con fuente.','Afiliação com fonte.','Affiliation sourcée.'],
['Dashed line.','Línea discontinua.','Linha tracejada.','Ligne pointillée.'],
['Catalog match awaiting review.','Coincidencia de catálogo pendiente de revisión.','Correspondência de catálogo aguardando revisão.','Correspondance de catalogue en attente de révision.'],
['search ·','buscar ·','buscar ·','rechercher ·'],['countries ·','países ·','países ·','pays ·'],['layers ·','capas ·','camadas ·','calques ·'],
['key ·','leyenda ·','legenda ·','légende ·'],['whole world ·','todo el mundo ·','mundo inteiro ·','monde entier ·'],['surprise ·','sorpresa ·','surpresa ·','surprise ·'],
['close','cerrar','fechar','fermer'],['Full notes','Notas completas','Notas completas','Notes complètes'],['Reading the atlas','Cómo leer el atlas','Como ler o atlas','Lire l’atlas'],
['Solid lines have an affiliation source. Dashed lines are catalog matches awaiting review. The lines connect index references, not filmmakers’ residences.','Las líneas continuas tienen una fuente de afiliación. Las discontinuas son coincidencias de catálogo pendientes de revisión. Las líneas unen referencias del índice, no residencias de los cineastas.','As linhas contínuas têm uma fonte de afiliação. As tracejadas são correspondências de catálogo aguardando revisão. As linhas ligam referências do índice, não residências dos cineastas.','Les lignes continues ont une source d’affiliation. Les lignes pointillées sont des correspondances de catalogue en attente. Les lignes relient des références de l’index, non les lieux de résidence des cinéastes.'],
['Territorial source and attribution ↗','Fuente territorial y atribución ↗','Fonte territorial e atribuição ↗','Source territoriale et attribution ↗'],
['Native Land’s separate language constellation ↗','La constelación de lenguas de Native Land ↗','A constelação de línguas da Native Land ↗','La constellation des langues de Native Land ↗'],
['All films →','Todas las películas →','Todos os filmes →','Tous les films →'],['Threads','Hilos','Fios','Fils'],['Add to a Constellate thread…','Añadir a un hilo de Constellate…','Adicionar a um fio do Constellate…','Ajouter à un fil de Constellate…'],['Read','Leer','Ler','Lire'],['Play','Reproducir','Reproduzir','Lecture'],
['Share','Compartir','Compartilhar','Partager'],['Clear','Borrar','Limpar','Effacer'],['Fit map to threads','Ajustar el mapa a los hilos','Ajustar o mapa aos fios','Cadrer la carte sur les fils'],
['Show timeline','Mostrar cronología','Mostrar linha do tempo','Afficher la chronologie'],['Show atlas markers','Mostrar marcadores del atlas','Mostrar marcadores do atlas','Afficher les marqueurs'],
['Show every card','Mostrar todas las tarjetas','Mostrar todos os cartões','Afficher toutes les fiches'],['Compare two threads','Comparar dos hilos','Comparar dois fios','Comparer deux fils'],
['Exit','Salir','Sair','Quitter'],['Begin with a question.','Empieza con una pregunta.','Comece com uma pergunta.','Commencez par une question.'],
['Or start from a theme','O empieza por un tema','Ou comece por um tema','Ou partez d’un thème'],['← Previous','← Anterior','← Anterior','← Précédent'],
['Next →','Siguiente →','Próximo →','Suivant →'],['Close ×','Cerrar ×','Fechar ×','Fermer ×'],['Constellations','Constelaciones','Constelações','Constellations'],
['Theme-weaving','Tejido de temas','Tecelagem de temas','Tissage de thèmes'],
['Constellations of Indigenous Cinema','Constelaciones del cine indígena','Constelações do cinema indígena','Constellations du cinéma autochtone'],
['Play the weave','Reproducir el tejido','Reproduzir a tecelagem','Dérouler le tissage'],['Read it','Leerlo','Ler','Le lire'],
['← Back','← Atrás','← Voltar','← Retour'],['Forward →','Adelante →','Avançar →','Avancer →'],['Map ↑','Mapa ↑','Mapa ↑','Carte ↑'],
['One result · press Enter to open','Un resultado · pulsa Intro para abrir','Um resultado · pressione Enter para abrir','Un résultat · appuyez sur Entrée pour ouvrir'],
['All names →','Todos los nombres →','Todos os nomes →','Tous les noms →'],['Close list ×','Cerrar lista ×','Fechar lista ×','Fermer la liste ×'],
['Choose a land on the map, search a name, or start with a letter.','Elige una tierra en el mapa, busca un nombre o empieza por una letra.','Escolha uma terra no mapa, busque um nome ou comece por uma letra.','Choisissez un territoire sur la carte, cherchez un nom ou commencez par une lettre.'],
['Filters','Filtros','Filtros','Filtres'],['Recent','Recientes','Recentes','Récents'],['Saved','Guardados','Salvos','Enregistrés'],
['Save view','Guardar vista','Salvar vista','Enregistrer la vue'],['Copy link','Copiar enlace','Copiar link','Copier le lien'],
['Show on map','Mostrar en el mapa','Mostrar no mapa','Afficher sur la carte'],['Browse list','Ver lista','Ver lista','Parcourir la liste'],
['All entries','Todas las entradas','Todas as entradas','Toutes les entrées'],
['Affiliation sources checked','Fuentes de afiliación verificadas','Fontes de afiliação verificadas','Sources d’affiliation vérifiées'],
['Specific affiliation unresolved','Afiliación específica sin resolver','Afiliação específica não resolvida','Affiliation précise non résolue'],
['Named collectives','Colectivos nombrados','Coletivos nomeados','Collectifs nommés'],['No land link yet','Aún sin vínculo a una tierra','Ainda sem vínculo com uma terra','Pas encore lié à un territoire'],
['No film credit yet','Aún sin crédito de película','Ainda sem crédito de filme','Pas encore de film crédité'],['Same-name records','Registros homónimos','Registros homônimos','Fiches homonymes'],
['From year','Desde el año','Do ano','À partir de'],['To year','Hasta el año','Até o ano','Jusqu’à'],
['Include undated works','Incluir obras sin fecha','Incluir obras sem data','Inclure les œuvres non datées'],['Film language','Idioma de la película','Idioma do filme','Langue du film'],
['Any language','Cualquier idioma','Qualquer idioma','Toutes les langues'],['Indigenous languages','Lenguas indígenas','Línguas indígenas','Langues autochtones'],
['Other languages','Otras lenguas','Outras línguas','Autres langues'],['Film form','Forma','Forma','Forme'],['Any theme','Cualquier tema','Qualquer tema','Tous les thèmes'],['Languages','Lenguas','Línguas','Langues'],['Themes','Temas','Temas','Thèmes'],['Any form','Cualquier forma','Qualquer forma','Toutes les formes'],
['Film order','Orden','Ordem','Ordre'],['Title','Título','Título','Titre'],['Year','Año','Ano','Année'],
['Include research candidates','Incluir candidatos en investigación','Incluir candidatos em pesquisa','Inclure les candidats à l’étude'],
['Clear filters','Borrar filtros','Limpar filtros','Effacer les filtres'],['Done','Listo','Pronto','Terminé'],
['Saved views and recent selections','Vistas guardadas y selecciones recientes','Vistas salvas e seleções recentes','Vues enregistrées et sélections récentes'],
['Clear recent','Borrar recientes','Limpar recentes','Effacer les récents'],['No saved views yet.','Aún no hay vistas guardadas.','Ainda não há vistas salvas.','Aucune vue enregistrée.'],
['View link','Enlace de la vista','Link da vista','Lien de la vue'],['Current selection','Selección actual','Seleção atual','Sélection actuelle'],
['Locate','Ubicar','Localizar','Localiser'],['Overview','Vista general','Visão geral','Vue d’ensemble'],['View','Vista','Visualização','Affichage'],['Show on map','Ver en el mapa','Ver no mapa','Voir sur la carte'],['Filmmaker page','Página del cineasta','Página do cineasta','Page du cinéaste'],['Data and downloads','Datos y descargas','Dados e downloads','Données et téléchargements'],['Browse','Explorar','Explorar','Parcourir'],['Your list','Tu lista','Sua lista','Votre liste'],['About the data','Sobre los datos','Sobre os dados','À propos des données'],['Clear selection','Borrar selección','Limpar seleção','Effacer la sélection'],
['Explore land on the map · select a name','Explora la tierra en el mapa · selecciona un nombre','Explore a terra no mapa · selecione um nome','Explorez le territoire sur la carte · choisissez un nom'],
['MAP PREVIEW','VISTA PREVIA DEL MAPA','PRÉVIA DO MAPA','APERÇU DE LA CARTE'],['Land references','Referencias de tierra','Referências de terra','Références territoriales'],
['Fit affiliations on map →','Ajustar afiliaciones en el mapa →','Ajustar afiliações no mapa →','Cadrer les affiliations →'],
['Films A–Z','Películas A–Z','Filmes A–Z','Films A–Z'],['All films','Todas las películas','Todos os filmes','Tous les films'],['Page','Página','Página','Page'],
['Contact sheet','Hoja de contactos','Folha de contatos','Planche contact'],['Linked filmmakers','Cineastas vinculados','Cineastas vinculados','Cinéastes liés'],
['Sourced affiliations and provisional catalog matches. Membership, community origin and ancestry remain distinct in the record details.','Afiliaciones con fuente y coincidencias provisionales de catálogo. Membresía, origen comunitario y ascendencia se distinguen en los detalles de cada registro.','Afiliações com fonte e correspondências provisórias de catálogo. Pertencimento, origem comunitária e ascendência permanecem distintos nos detalhes de cada registro.','Affiliations sourcées et correspondances provisoires de catalogue. L’appartenance, l’origine communautaire et l’ascendance restent distinctes dans le détail des fiches.'],
['Search filmmakers, films, lands…','Buscar cineastas, películas, tierras…','Buscar cineastas, filmes, terras…','Chercher cinéastes, films, territoires…'],
['Search filmmakers, films and lands','Buscar cineastas, películas y tierras','Buscar cineastas, filmes e terras','Chercher cinéastes, films et territoires'],
['Watch online','Ver en línea','Assistir online','Regarder en ligne'],['Cite','Citar','Citar','Citer'],['Correct','Corregir','Corrigir','Corriger'],
['Zoom in','Acercar','Aproximar','Zoom avant'],['Zoom out','Alejar','Afastar','Zoom arrière'],['Close','Cerrar','Fechar','Fermer'],['Minimize','Minimizar','Minimizar','Réduire'],
['Preview land · select to explore · drag to pan','Vista previa de la tierra · selecciona para explorar · arrastra para mover','Prévia da terra · selecione para explorar · arraste para mover','Aperçu du territoire · sélectionnez pour explorer · faites glisser pour déplacer'],
['. Native Land Digital · overlapping territorial references.','. Native Land Digital · referencias territoriales superpuestas.','. Native Land Digital · referências territoriais sobrepostas.','. Native Land Digital · références territoriales qui se chevauchent.'],
['Close (Esc)','Cerrar (Esc)','Fechar (Esc)','Fermer (Esc)'],['Director','Dirección','Direção','Réalisation'],['Interface language','Idioma de la interfaz','Idioma da interface','Langue de l’interface']
];
const IDX={es:1,pt:2,fr:3};
const DICT={};for(const row of T)DICT[row[0]]=row;
const PAT=[
 [/^([\d,]+) filmmakers on the public map, each with a permanent page you can cite\.$/,["$1 cineastas en el mapa público, cada uno con una página permanente que se puede citar.", "$1 cineastas no mapa público, cada um com uma página permanente que pode ser citada.", "$1 cinéastes sur la carte publique, chacun avec une page permanente que l’on peut citer."]],
 [/^([\d,]+) dated films on the public map, by decade\. ([\d,]+) more film credits have no year recorded yet\.$/,["$1 películas con fecha en el mapa público, por década. Otros $2 créditos aún no tienen año registrado.", "$1 filmes datados no mapa público, por década. Outros $2 créditos ainda não têm ano registrado.", "$1 films datés sur la carte publique, par décennie. $2 autres crédits n’ont pas encore d’année."]],
 [/^Download the public atlas as spreadsheets\. Exported ([\d-]+)\. ([\d,]+) films by ([\d,]+) filmmakers; a film with two directors has one row for each\.$/,["Descarga el atlas público en hojas de cálculo. Exportado el $1. $2 películas de $3 cineastas; una película con dos directores tiene una fila para cada uno.", "Baixe o atlas público em planilhas. Exportado em $1. $2 filmes de $3 cineastas; um filme com dois diretores tem uma linha para cada um.", "Téléchargez l’atlas public en tableurs. Exporté le $1. $2 films de $3 cinéastes ; un film à deux réalisateurs a une ligne pour chacun."]],
 [/^([\d,]+) Indigenous languages across ([\d,]+) films with a recorded language, of ([\d,]+) films on the public map\. Each language links to its Glottolog entry; where a credit names a language group rather than one variety, the group is linked\. Languages are recorded only as a film’s credits or synopsis state them\. Updated ([\d-]+)\.$/,["$1 lenguas indígenas en $2 películas con lengua registrada, de $3 películas en el mapa público. Cada lengua enlaza a su entrada en Glottolog; cuando un crédito nombra un grupo de lenguas y no una variedad, se enlaza el grupo. Las lenguas se registran solo como las indican los créditos o la sinopsis de la película. Actualizado el $4.", "$1 línguas indígenas em $2 filmes com língua registrada, de $3 filmes no mapa público. Cada língua leva à sua entrada no Glottolog; quando um crédito nomeia um grupo de línguas e não uma variedade, o grupo é indicado. As línguas são registradas apenas como os créditos ou a sinopse do filme as indicam. Atualizado em $4.", "$1 langues autochtones dans $2 films dont la langue est connue, sur $3 films de la carte publique. Chaque langue renvoie à sa fiche Glottolog ; quand un crédit nomme un groupe de langues plutôt qu’une variété, c’est le groupe qui est lié. Les langues ne sont notées que telles que les crédits ou le synopsis du film les indiquent. Mis à jour le $4."]],
 [/^([\d,]+) of ([\d,]+) films on the public map are tagged so far, each from a published synopsis whose link is kept with the tag\. A film can carry several themes; its primary theme is listed first in the data\. Tagging continues\. Updated ([\d-]+)\.$/,["$1 de $2 películas del mapa público tienen temas por ahora, cada uno tomado de una sinopsis publicada cuyo enlace se guarda con el tema. Una película puede tener varios temas; su tema principal aparece primero en los datos. El etiquetado continúa. Actualizado el $3.", "$1 de $2 filmes do mapa público já têm temas, cada um tirado de uma sinopse publicada cujo link fica guardado com o tema. Um filme pode ter vários temas; o tema principal aparece primeiro nos dados. A marcação continua. Atualizado em $3.", "$1 des $2 films de la carte publique ont déjà des thèmes, chacun tiré d’un synopsis publié dont le lien est conservé avec le thème. Un film peut avoir plusieurs thèmes ; son thème principal figure en premier dans les données. L’indexation se poursuit. Mis à jour le $3."]],
 [/^([\d,]+) filmmakers & collectives$/,['$1 cineastas y colectivos','$1 cineastas e coletivos','$1 cinéastes et collectifs']],
 [/^([\d,]+) filmmakers with land links(.*)$/,['$1 cineastas con vínculos a tierras$2','$1 cineastas com vínculos a terras$2','$1 cinéastes liés à des territoires$2']],
 [/^([\d,]+) filmmakers linked to ([\d,]+) land entries$/,['$1 cineastas vinculados a $2 tierras','$1 cineastas vinculados a $2 terras','$1 cinéastes liés à $2 territoires']],
 [/^([\d,]+) entries$/,['$1 entradas','$1 entradas','$1 entrées']],
 [/^([\d,]+) films$/,['$1 películas','$1 filmes','$1 films']],
 [/^Film language|^Any language/,null]
];
let lang='en';
try{lang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('atlas-ui-lang')||'en';}catch(e){}
if(!LANGS[lang])lang='en';
const orig=new WeakMap(),origAttr=new WeakMap();
const SKIP='#atlas,#map-caption,#map-tip,#country-rail>button span,script,style,.land-word-label';
const DATA_ZONE='#index-list,#search-relay,#selection-crumbs,#featured-weave .fw-body';
function tr(en){
 const k=en.trim();if(!k)return null;const i=IDX[lang];
 const row=DICT[k];if(row)return en.replace(k,row[i]);
 if(k.includes(' · ')){const parts=k.split(' · ');if(parts.every(p=>DICT[p]||/^[\d,]+$/.test(p)))return en.replace(k,parts.map(p=>DICT[p]?DICT[p][i]:p).join(' · '));}
 for(const [re,out] of PAT){if(out&&re.test(k))return en.replace(k,k.replace(re,out[i-1]));}
 return null;
}
function textNode(n){
 const p=n.parentElement;if(!p||p.closest(SKIP))return;
 if(p.closest(DATA_ZONE)&&!p.closest('button,summary,label,select,option,optgroup,.index-tools,#index-tools'))return;
 let o=orig.get(n);const cur=n.nodeValue;
 if(o===undefined||(cur!==o&&cur!==n.__atlasT)){o=cur;orig.set(n,o);}
 if(lang==='en'){if(cur!==o)n.nodeValue=o;return;}
 const t=tr(o);if(t!=null&&cur!==t){n.__atlasT=t;n.nodeValue=t;}
}
function attrs(e){
 if(e.closest(SKIP))return;
 for(const a of ['placeholder','aria-label','title','label']){if(!e.hasAttribute(a))continue;
  let m=origAttr.get(e);if(!m){m={};origAttr.set(e,m);}const cur=e.getAttribute(a);
  if(m[a]===undefined||(cur!==m[a]&&cur!==m['_'+a]))m[a]=cur;
  if(lang==='en'){if(cur!==m[a])e.setAttribute(a,m[a]);continue;}
  const t=tr(m[a]);if(t!=null&&cur!==t){m['_'+a]=t;e.setAttribute(a,t);}}
}
function walk(root){
 if(!root)return;
 if(root.nodeType===3){textNode(root);return;}
 if(root.nodeType!==1)return;
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))textNode(n);
 if(root.matches?.('[placeholder],[aria-label],[title],optgroup[label]'))attrs(root);
 root.querySelectorAll?.('[placeholder],[aria-label],[title],optgroup[label]').forEach(attrs);
}
let pending=new Set(),raf=0;
const mo=new MutationObserver(list=>{for(const m of list){if(m.type==='characterData')pending.add(m.target);else if(m.type==='attributes')pending.add(m.target);else m.addedNodes.forEach(x=>pending.add(x));}
 if(!raf)raf=requestAnimationFrame(()=>{raf=0;const s=pending;pending=new Set();if(lang==='en'&&!document.documentElement.dataset.i18nTouched)return;for(const x of s)walk(x.nodeType===2?x.ownerElement:x);});});
function apply(next){
 lang=next;try{localStorage.setItem('atlas-ui-lang',lang);}catch(e){}
 document.documentElement.lang=lang;if(lang!=='en')document.documentElement.dataset.i18nTouched='1';
 walk(document.body);const sel=document.getElementById('ui-lang');if(sel)sel.value=lang;
}
function switcher(){
 const nav=document.querySelector('header nav.primary');if(!nav||document.getElementById('ui-lang'))return;
 const wrap=document.createElement('label');wrap.className='ui-lang';
 wrap.innerHTML=`<span class="visually-hidden">Interface language</span><select id="ui-lang" aria-label="Interface language">${Object.entries(LANGS).map(([k,v])=>`<option value="${k}" lang="${k}">${k.toUpperCase()} · ${v}</option>`).join('')}</select>`;
 nav.after(wrap);const sel=wrap.querySelector('select');sel.value=lang;sel.addEventListener('change',()=>apply(sel.value));
}
function start(){switcher();mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title','label']});if(lang!=='en')apply(lang);
 setTimeout(()=>{switcher();if(lang!=='en')walk(document.body);},2500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.AtlasI18n={set:apply,get:()=>lang};
})();
