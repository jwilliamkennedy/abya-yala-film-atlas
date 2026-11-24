/* Interface languages for the beta map, 2026-11-07: English, Español, Português, Français.
   Only the interface is translated (menus, buttons, labels, the map key). Filmmakers' names, film titles,
   peoples, lands and quoted sources stay exactly as recorded. Choice is remembered; ?lang=es|pt|fr also works. */
(()=>{'use strict';
const LANGS={en:'English',es:'Español',pt:'Português',fr:'Français'};
// [English, Español, Português, Français]
const T=[/* Constellate, 24 Nov 2026: Add menu, the list, reasons between films */
["No films yet. Click a land to see its films.", "Aún no hay películas. Haz clic en un territorio para ver sus películas.", "Ainda não há filmes. Clique em um território para ver seus filmes.", "Pas encore de films. Cliquez sur un territoire pour voir ses films."],
["Read: go through the constellation film by film", "Leer: recorre la constelación película por película", "Ler: percorra a constelação filme por filme", "Lire : parcourez la constellation film par film"],
["Why here?", "¿Por qué aquí?", "Por que aqui?", "Pourquoi ici ?"],
["Constellate: how can films encounter each other?", "Constellar: ¿cómo pueden encontrarse las películas?", "Constellate: como os filmes podem se encontrar?", "Constellate : comment les films peuvent-ils se rencontrer ?"],
["By year", "Por año", "Por ano", "Par année"],
["By place", "Por lugar", "Por lugar", "Par lieu"],
["Edit", "Editar", "Editar", "Modifier"],
["interpretation", "interpretación", "interpretação", "interprétation"],
["sourced", "con fuente", "com fonte", "avec source"],
["confirmed by atlas record", "confirmado por el registro del atlas", "confirmado pelo registro do atlas", "confirmé par la fiche de l’atlas"],
["Add", "Añadir", "Adicionar", "Ajouter"],
["Films of a theme", "Películas de un tema", "Filmes de um tema", "Films d’un thème"],
["Map and display", "Mapa y vista", "Mapa e exibição", "Carte et affichage"],
["New thread", "Nuevo hilo", "Novo fio", "Nouveau fil"],
["New idea card", "Nueva ficha de idea", "Nova ficha de ideia", "Nouvelle fiche d’idée"],
["Why does it follow?", "¿Por qué esta película viene después?", "Por que este filme vem depois?", "Pourquoi ce film vient-il ensuite ?"],
["← The list", "← La lista", "← A lista", "← La liste"],
["← Back to the list", "← Volver a la lista", "← Voltar à lista", "← Retour à la liste"],
["Read ▸", "Leer ▸", "Ler ▸", "Lire ▸"],
["Remove from the constellation", "Quitar de la constelación", "Remover da constelação", "Retirer de la constellation"],
["Opening note", "Nota inicial", "Nota de abertura", "Note d’ouverture"],
["shown before the first film", "se muestra antes de la primera película", "exibida antes do primeiro filme", "affichée avant le premier film"],
["No films yet. Use Add, above the map.", "Aún no hay películas. Usa Añadir, sobre el mapa.", "Ainda não há filmes. Use Adicionar, acima do mapa.", "Pas encore de films. Utilisez Ajouter, au-dessus de la carte."],
["Save", "Guardar", "Salvar", "Enregistrer"],
["Saved.", "Guardado.", "Salvo.", "Enregistré."],
["On more than one thread", "En más de un hilo", "Em mais de um fio", "Sur plusieurs fils"],
["Land marker", "Marcador de territorio", "Marcador de território", "Repère de territoire"],
["Connections", "Conexiones", "Conexões", "Liens"],
["View film", "Ver película", "Ver filme", "Voir le film"],
["View filmmaker", "Ver cineasta", "Ver cineasta", "Voir le cinéaste"],
["Focus selected thread", "Mostrar solo el hilo seleccionado", "Mostrar só o fio selecionado", "Afficher seulement le fil sélectionné"],
["Show all threads", "Mostrar todos los hilos", "Mostrar todos os fios", "Afficher tous les fils"],
["Help", "Ayuda", "Ajuda", "Aide"],
["Adding to", "Añadiendo a", "Adicionando a", "Ajout à"],
["Read", "Leer", "Ler", "Lire"],
["brings films in: search, a theme, a line drawn across the map, or the theme web.", "trae películas: una búsqueda, un tema, una línea trazada sobre el mapa o la red de temas.", "traz filmes: uma busca, um tema, uma linha traçada no mapa ou a rede de temas.", "fait entrer des films : une recherche, un thème, une ligne tracée sur la carte ou la toile des thèmes."],
["The order is the path.", "El orden es el recorrido.", "A ordem é o percurso.", "L’ordre est le parcours."],
["Drag or use ↑ ↓ to reorder. Between two films, say why one follows the other.", "Arrastra o usa ↑ ↓ para reordenar. Entre dos películas, di por qué una sigue a la otra.", "Arraste ou use ↑ ↓ para reordenar. Entre dois filmes, diga por que um vem depois do outro.", "Faites glisser ou utilisez ↑ ↓ pour réordonner. Entre deux films, dites pourquoi l’un suit l’autre."],
["goes through it film by film;", "la recorre película por película;", "percorre-a filme por filme;", "la parcourt film par film ;"],
["presents it full screen;", "la presenta a pantalla completa;", "apresenta-a em tela cheia;", "la présente en plein écran ;"],
["gives a link, a citation and downloads.", "da un enlace, una cita y descargas.", "dá um link, uma citação e downloads.", "donne un lien, une citation et des téléchargements."],
["Search the atlas and add films", "Busca en el atlas y añade películas", "Busque no atlas e adicione filmes", "Cherchez dans l’atlas et ajoutez des films"],
["Draw a line across the map: the lands it crosses give their films, in order", "Traza una línea sobre el mapa: los territorios que cruza aportan sus películas, en orden", "Trace uma linha no mapa: os territórios que ela cruza trazem seus filmes, em ordem", "Tracez une ligne sur la carte : les territoires qu’elle traverse apportent leurs films, dans l’ordre"],
["Browse the themes documented together in film synopses", "Explora los temas documentados juntos en las sinopsis", "Explore os temas documentados juntos nas sinopses", "Parcourez les thèmes documentés ensemble dans les synopsis"],
["Options: map, display and threads", "Opciones: mapa, vista e hilos", "Opções: mapa, exibição e fios", "Options : carte, affichage et fils"],
["Clear this constellation (Undo restores it)", "Vaciar esta constelación (Deshacer la restaura)", "Limpar esta constelação (Desfazer a restaura)", "Vider cette constellation (Annuler la rétablit)"],
["Split this constellation into a second thread", "Dividir esta constelación en un segundo hilo", "Dividir esta constelação em um segundo fio", "Diviser cette constellation en un second fil"],
["Go through the constellation film by film", "Recorre la constelación película por película", "Percorra a constelação filme por filme", "Parcourez la constellation film par film"],
["Back to the film list", "Volver a la lista de películas", "Voltar à lista de filmes", "Retour à la liste des films"],
["Films that could come next", "Películas que podrían venir después", "Filmes que poderiam vir depois", "Films qui pourraient suivre"],
["Map views","Vistas del mapa","Vistas do mapa","Vues de la carte"],["Open on the map","Abrir en el mapa","Abrir no mapa","Ouvrir sur la carte"],
["No saved map views yet. On the map, choose Save view to keep a selection with its filters and map position.","Aún no hay vistas guardadas. En el mapa, elige Guardar vista para conservar una selección con sus filtros y la posición del mapa.","Ainda não há vistas salvas. No mapa, escolha Salvar vista para guardar uma seleção com seus filtros e a posição do mapa.","Aucune vue enregistrée pour l’instant. Sur la carte, choisissez Enregistrer la vue pour conserver une sélection avec ses filtres et la position de la carte."],
["Remove saved view","Quitar la vista guardada","Remover a vista salva","Retirer la vue enregistrée"],["Saved view","Vista guardada","Vista salva","Vue enregistrée"],
["Watch the years pass on the map","Mira pasar los años en el mapa","Veja os anos passarem no mapa","Voir les années défiler sur la carte"],
["Timeline: every dated film, by decade","Cronología: todas las películas fechadas, por década","Linha do tempo: todos os filmes datados, por década","Chronologie : tous les films datés, par décennie"],
["About the atlas","Acerca del atlas","Sobre o atlas","À propos de l’atlas"],
["Link copied","Enlace copiado","Link copiado","Lien copié"],["Copy failed","No se pudo copiar","Não foi possível copiar","Échec de la copie"],["Share this film","Compartir esta película","Compartilhar este filme","Partager ce film"],
["Layers (changed from the usual view)","Capas (cambiadas respecto a la vista habitual)","Camadas (alteradas em relação à vista habitual)","Calques (modifiés par rapport à la vue habituelle)"],
["Lands","Tierras","Terras","Territoires"],["Search","Buscar","Buscar","Rechercher"],["Indexes","Índices","Índices","Index"],
["Your atlas","Tu atlas","Seu atlas","Votre atlas"],["The project","El proyecto","O projeto","Le projet"],["Data and CARE","Datos y CARE","Dados e CARE","Données et CARE"],
["Screening","Proyección","Exibição","Projection"],["Collapse menu","Contraer el menú","Recolher o menu","Réduire le menu"],["Expand menu","Expandir el menú","Expandir o menu","Développer le menu"],
["Atlas menu","Menú del atlas","Menu do atlas","Menu de l’atlas"],
["Why this pairing?", "¿Por qué estas dos películas?", "Por que estes dois filmes?", "Pourquoi ces deux films ?"],
["Read this thread", "Leer este hilo", "Ler este fio", "Lire ce fil"],
["Choose the other card", "Elige la otra ficha", "Escolha a outra ficha", "Choisissez l’autre fiche"],
["Select a card…", "Selecciona una ficha…", "Selecione uma ficha…", "Sélectionnez une fiche…"],
["Add another card to make a connection.", "Añade otra ficha para crear una conexión.", "Adicione outra ficha para criar uma conexão.", "Ajoutez une autre fiche pour créer un lien."],
["Most frequently tagged themes", "Temas más etiquetados", "Temas mais marcados", "Thèmes les plus fréquemment attribués"],
["Open a published constellation.", "Abre una constelación publicada.", "Abra uma constelação publicada.", "Ouvrez une constellation publiée."],
["Continue exploring","Seguir explorando","Continuar explorando","Poursuivre l’exploration"],["Shared land references · a route through the index, not evidence of collaboration or residence.","Referencias territoriales compartidas · un recorrido por el índice, no prueba de colaboración ni residencia.","Referências territoriais compartilhadas · um percurso pelo índice, não uma prova de colaboração ou residência.","Références territoriales partagées · un parcours dans l’index, sans preuve de collaboration ni de résidence."],["sourced links","vínculos documentados","vínculos documentados","liens documentés"],["includes provisional links","incluye vínculos provisionales","inclui vínculos provisórios","comprend des liens provisoires"],["Films you add from filmmaker pages, the timeline and Watch gather here, kept in this browser. Reorder them, add notes, and copy the list into a syllabus.","Las películas que agregas desde las páginas de cineastas, la cronología y Ver se reúnen aquí, guardadas en este navegador. Reordénalas, agrega notas y copia la lista en un programa de curso.","Os filmes que você adiciona nas páginas de cineastas, na linha do tempo e em Assistir ficam reunidos aqui, guardados neste navegador. Reordene-os, acrescente notas e copie a lista para um programa de curso.","Les films que vous ajoutez depuis les pages des cinéastes, la chronologie et Regarder se rassemblent ici, conservés dans ce navigateur. Réordonnez-les, ajoutez des notes et copiez la liste dans un plan de cours."],["Copy as syllabus","Copiar como programa","Copiar como programa","Copier comme plan de cours"],["Download CSV","Descargar CSV","Baixar CSV","Télécharger le CSV"],["Clear list","Vaciar la lista","Limpar a lista","Vider la liste"],["Filmmakers, communities and researchers can correct a record or suggest a filmmaker or film the atlas is missing.","Cineastas, comunidades e investigadores pueden corregir un registro o sugerir un cineasta o una película que falte en el atlas.","Cineastas, comunidades e pesquisadores podem corrigir um registro ou sugerir um cineasta ou filme que falte no atlas.","Cinéastes, communautés et chercheurs peuvent corriger une fiche ou signaler un cinéaste ou un film absent de l’atlas."],["Corrections and additions","Correcciones y adiciones","Correções e acréscimos","Corrections et ajouts"],["On the map","En el mapa","No mapa","Sur la carte"],["Plays here","Se reproduce aquí","Toca aqui","Lecture ici"],["All languages","Todas las lenguas","Todas as línguas","Toutes les langues"],["Choose a language","Elige una lengua","Escolha uma língua","Choisir une langue"],["Previous language","Lengua anterior","Língua anterior","Langue précédente"],["Next language","Lengua siguiente","Próxima língua","Langue suivante"],["Choose a theme","Elige un tema","Escolha um tema","Choisir un thème"],["Previous theme","Tema anterior","Tema anterior","Thème précédent"],["Next theme","Tema siguiente","Próximo tema","Thème suivant"],["All themes","Todos los temas","Todos os temas","Tous les thèmes"],["Language","Idioma","Idioma","Langue"],["Another film","Otra película","Outro filme","Un autre film"],["Related films","Películas relacionadas","Filmes relacionados","Films apparentés"],["Browse","Explorar","Explorar","Parcourir"],["Now showing","En pantalla","Em exibição","À l’écran"],["See all","Ver todo","Ver tudo","Tout voir"],["Newest","Lo más reciente","Mais recentes","Les plus récents"],["Short films","Cortometrajes","Curtas-metragens","Courts métrages"],["Feature films","Largometrajes","Longas-metragens","Longs métrages"],["By theme","Por tema","Por tema","Par thème"],["By country","Por país","Por país","Par pays"],["Add to screening list","Agregar a la lista de proyección","Adicionar à lista de exibição","Ajouter à la liste de projection"],["On your screening list","En tu lista de proyección","Na sua lista de exibição","Dans votre liste de projection"],["Jump to","Ir a","Ir para","Aller à"],["View","Vista","Visualização","Affichage"],["Land and Environment","Tierra y medio ambiente","Terra e meio ambiente","Terre et environnement"],["Sovereignty and Politics","Soberanía y política","Soberania e política","Souveraineté et politique"],["Knowledge and Continuity","Saberes y continuidad","Saberes e continuidade","Savoirs et continuité"],["Lives and Relations","Vidas y relaciones","Vidas e relações","Vies et relations"],["Expression and Representation","Expresión y representación","Expressão e representação","Expression et représentation"],["Filmmaker A–Z","Cineasta A–Z","Cineasta A–Z","Cinéaste A–Z"],["Newest first","Más recientes primero","Mais recentes primeiro","Plus récents d’abord"],["Title A–Z","Título A–Z","Título A–Z","Titre A–Z"],["Search films, filmmakers, peoples","Buscar películas, cineastas, pueblos","Buscar filmes, cineastas, povos","Chercher des films, cinéastes, peuples"],["Something wrong or missing?","¿Algo está mal o falta?","Algo errado ou faltando?","Une erreur ou un oubli ?"],["films by filmmakers on the atlas.","películas de cineastas del atlas.","filmes de cineastas do atlas.","films de cinéastes de l’atlas."],["play here.","se ven aquí.","podem ser vistos aqui.","se regardent ici."],["▶ Play on Watch","▶ Reproducir en Ver","▶ Reproduzir em Assistir","▶ Lire dans Regarder"],["Film credits","Créditos","Créditos","Crédits"],
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
["Three films that share a theme, already woven, to read and change.", "Tres películas que comparten un tema, ya tejidas, para leer y modificar.", "Três filmes que compartilham um tema, já tecidos, para ler e modificar.", "Trois films qui partagent un thème, déjà tissés, à lire et à modifier."],
["Open the example", "Abrir el ejemplo", "Abrir o exemplo", "Ouvrir l’exemple"],
["Or explore the theme web →", "O explora la red de temas →", "Ou explore a rede de temas →", "Ou explorez la toile des thèmes →"],
["Open a saved weave", "Abrir un tejido guardado", "Abrir uma tecelagem salva", "Ouvrir un tissage enregistré"],
["Link them", "Vincularlas", "Ligá-los", "Les relier"],
["Read and share", "Leer y compartir", "Ler e compartilhar", "Lire et partager"],
["Add next", "Añadir después", "Adicionar em seguida", "Ajouter ensuite"],
["Films that could come next", "Películas que podrían seguir", "Filmes que podem vir em seguida", "Films qui pourraient suivre"],
["Search themes","Buscar temas","Buscar temas","Rechercher des thèmes"],
 ["Search themes…","Buscar temas…","Buscar temas…","Rechercher des thèmes…"],
 ["No matching themes.","No se encontraron temas.","Nenhum tema encontrado.","Aucun thème trouvé."],
 ["Continue this weave","Continuar este tejido","Continuar esta tecelagem","Reprendre ce tissage"],
 ["Memory and Oral History","Memoria e historia oral","Memória e história oral","Mémoire et histoire orale"],
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
['Next →','Siguiente →','Próximo →','Suivant →'],['Close ×','Cerrar ×','Fechar ×','Fermer ×'],['Constellations','Constelaciones','Constelações','Constellations'],['Constellate','Constellar','Constellate','Constellate'],['Menu','Menú','Menu','Menu'],['Opening Constellate…','Abriendo Constellar…','Abrindo o Constellate…','Ouverture de Constellate…'],['Open Constellate →','Abrir Constellar →','Abrir o Constellate →','Ouvrir Constellate →'],['Leave Constellate and return to the map','Salir de Constellar y volver al mapa','Sair do Constellate e voltar ao mapa','Quitter Constellate et revenir à la carte'],['How Constellate works','Cómo funciona Constellar','Como funciona o Constellate','Comment fonctionne Constellate'],['Constellate did not start.','Constellar no se inició.','O Constellate não iniciou.','Constellate n’a pas démarré.'],['Constellate could not open','Constellar no pudo abrirse','Não foi possível abrir o Constellate','Impossible d’ouvrir Constellate'],['Added to thread. Open Constellate to follow it.','Añadido al hilo. Abre Constellar para seguirlo.','Adicionado ao fio. Abra o Constellate para segui-lo.','Ajouté au fil. Ouvrez Constellate pour le suivre.'],['Constellate toolbar','Barra de herramientas de Constellar','Barra de ferramentas do Constellate','Barre d’outils de Constellate'],
['Theme-weaving','Tejido de temas','Tecelagem de temas','Tissage de thèmes'],
['Story, memory, land','Relato, memoria, tierra','Relato, memória, terra','Récit, mémoire, terre'],
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
['Other languages','Otras lenguas','Outras línguas','Autres langues'],['North America','América del Norte','América do Norte','Amérique du Nord'],['Central America and the Caribbean','Centroamérica y el Caribe','América Central e Caribe','Amérique centrale et Caraïbes'],['South America','América del Sur','América do Sul','Amérique du Sud'],['Region not recorded','Región sin registrar','Região não registrada','Région non indiquée'],['Film form','Forma','Forma','Forme'],['Any theme','Cualquier tema','Qualquer tema','Tous les thèmes'],['Languages','Lenguas','Línguas','Langues'],['Themes','Temas','Temas','Thèmes'],['Any form','Cualquier forma','Qualquer forma','Toutes les formes'],
['Film order','Orden','Ordem','Ordre'],['Title','Título','Título','Titre'],['Year','Año','Ano','Année'],
['Include research candidates','Incluir candidatos en investigación','Incluir candidatos em pesquisa','Inclure les candidats à l’étude'],
['Clear filters','Borrar filtros','Limpar filtros','Effacer les filtres'],['Done','Listo','Pronto','Terminé'],
['Saved views and recent selections','Vistas guardadas y selecciones recientes','Vistas salvas e seleções recentes','Vues enregistrées et sélections récentes'],
['Clear recent','Borrar recientes','Limpar recentes','Effacer les récents'],['No saved views yet.','Aún no hay vistas guardadas.','Ainda não há vistas salvas.','Aucune vue enregistrée.'],
['View link','Enlace de la vista','Link da vista','Lien de la vue'],['Current selection','Selección actual','Seleção atual','Sélection actuelle'],
['Locate','Ubicar','Localizar','Localiser'],['Overview','Vista general','Visão geral','Vue d’ensemble'],['View','Vista','Visualização','Affichage'],['Show on map','Ver en el mapa','Ver no mapa','Voir sur la carte'],['Filmmaker page','Página del cineasta','Página do cineasta','Page du cinéaste'],['Data, Reuse, and CARE','Datos, reutilización y CARE','Dados, reutilização e CARE','Données, réutilisation et CARE'],['Resources','Recursos','Recursos','Ressources'],['Books, festivals, and archives','Libros, festivales y archivos','Livros, festivais e arquivos','Livres, festivals et archives'],['Festivals','Festivales','Festivais','Festivals'],['Archives and databases','Archivos y bases de datos','Arquivos e bases de dados','Archives et bases de données'],['Books','Libros','Livros','Livres'],['Made with','Hecho con','Feito com','Fait avec'],['Browse','Explorar','Explorar','Parcourir'],['Your list','Tu lista','Sua lista','Votre liste'],['About the data','Sobre los datos','Sobre os dados','À propos des données'],['Clear selection','Borrar selección','Limpar seleção','Effacer la sélection'],
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
['Close (Esc)','Cerrar (Esc)','Fechar (Esc)','Fermer (Esc)'],['Director','Dirección','Direção','Réalisation'],['Interface language','Idioma de la interfaz','Idioma da interface','Langue de l’interface'],
 ["Gather","Reunir","Reunir","Rassembler"],
 ["Draw","Dibujar","Desenhar","Dessiner"],
 ["Time","Tiempo","Tempo","Temps"],
 ["Move","Mover","Mover","Déplacer"],
 ["Pause","Pausar","Pausar","Pause"],
 ["Gather films","Reunir películas","Reunir filmes","Rassembler des films"],
 ["Link films","Vincular películas","Vincular filmes","Relier des films"],
 ["Theme web","Red de temas","Rede de temas","Toile des thèmes"],
 ["Undo","Deshacer","Desfazer","Annuler"],
 ["Redo","Rehacer","Refazer","Rétablir"],
 ["Options","Opciones","Opções","Options"],
 ["Gather and constellate films together on the map.", "Reúne y constela películas en el mapa.", "Reúna e constele filmes no mapa.", "Rassemblez et constellez des films sur la carte."],
 ["Add or gather films", "Añadir o reunir películas", "Adicionar ou reunir filmes", "Ajouter ou rassembler des films"],
 ["Every film shares the theme, from its published synopsis.", "Todas las películas comparten el tema, según su sinopsis publicada.", "Todos os filmes compartilham o tema, segundo sua sinopse publicada.", "Chaque film partage le thème, d’après son synopsis publié."],
 ["Films that share a theme with it are suggested next.", "Después se sugieren las películas que comparten un tema con ella.", "Depois são sugeridos os filmes que compartilham um tema com ele.", "Les films qui partagent un thème avec lui sont proposés ensuite."],
 ["Gather along a line", "Reunir a lo largo de una línea", "Reunir ao longo de uma linha", "Rassembler le long d’une ligne"],
 ["Draw a line across the map. The lands it crosses give their films, in the order it crosses them.", "Dibuja una línea en el mapa. Los territorios que atraviesa aportan sus películas, en el orden en que los atraviesa.", "Desenhe uma linha no mapa. Os territórios que ela atravessa oferecem seus filmes, na ordem em que os atravessa.", "Dessinez une ligne sur la carte. Les territoires qu’elle traverse apportent leurs films, dans l’ordre où elle les traverse."],
 ["Draw a line", "Dibujar una línea", "Desenhar uma linha", "Dessiner une ligne"],
 ["Examples", "Ejemplos", "Exemplos", "Exemples"],
 ["Theme web →", "Red de temas →", "Rede de temas →", "Toile des thèmes →"],
 ["One theme: Water", "Un tema: Water", "Um tema: Water", "Un thème : Water"],
 ["One land: Wayúu", "Un territorio: Wayúu", "Um território: Wayúu", "Un territoire : Wayúu"],
 ["One line: Misak → Wallmapu", "Una línea: Misak → Wallmapu", "Uma linha: Misak → Wallmapu", "Une ligne : Misak → Wallmapu"],
 ["All 30 themes…", "Los 30 temas…", "Os 30 temas…", "Les 30 thèmes…"],
 ["Open a saved constellation", "Abrir una constelación guardada", "Abrir uma constelação salva", "Ouvrir une constellation enregistrée"],
 ["Click two films and say why they connect", "Haz clic en dos películas y di por qué se relacionan", "Clique em dois filmes e diga por que se relacionam", "Cliquez sur deux films et dites ce qui les relie"],
 ["Click two films, then say why they connect.", "Haz clic en dos películas y luego di por qué se relacionan.", "Clique em dois filmes e depois diga por que se relacionam.", "Cliquez sur deux films, puis dites ce qui les relie."],
 ["Click two films, then say why they connect. Choose Done linking to finish.", "Haz clic en dos películas y luego di por qué se relacionan. Elige Terminar de vincular para acabar.", "Clique em dois filmes e depois diga por que se relacionam. Escolha Terminar vínculos para concluir.", "Cliquez sur deux films, puis dites ce qui les relie. Choisissez Terminer les liens pour finir."],
 ["Done linking", "Terminar de vincular", "Terminar vínculos", "Terminer les liens"],
 ["Done linking.", "Vínculos terminados.", "Vínculos concluídos.", "Liens terminés."],
 ["Saved. Click two more films, or Done linking.", "Guardado. Haz clic en otras dos películas, o en Terminar de vincular.", "Salvo. Clique em outros dois filmes ou em Terminar vínculos.", "Enregistré. Cliquez sur deux autres films, ou sur Terminer les liens."],
 ["Pick a reason, or write your own.", "Elige una razón o escribe la tuya.", "Escolha um motivo ou escreva o seu.", "Choisissez une raison ou écrivez la vôtre."],
 ["Say why", "Di por qué", "Diga por quê", "Dites pourquoi"],
 ["Why do they connect?", "¿Por qué se relacionan?", "Por que se relacionam?", "Qu’est-ce qui les relie ?"],
 ["Or in your own words", "O con tus propias palabras", "Ou com suas próprias palavras", "Ou avec vos propres mots"],
 ["A reason, in a few words", "Una razón, en pocas palabras", "Um motivo, em poucas palavras", "Une raison, en quelques mots"],
 ["Or click the second film on the map.", "O haz clic en la segunda película en el mapa.", "Ou clique no segundo filme no mapa.", "Ou cliquez sur le second film sur la carte."],
 ["Link films:", "Vincular películas:", "Vincular filmes:", "Relier des films :"],
 ["click two films, then pick a reason or write your own. To change a thread’s order, use its Order list.", "haz clic en dos películas y elige una razón o escribe la tuya. Para cambiar el orden de un hilo, usa su lista Orden.", "clique em dois filmes e escolha um motivo ou escreva o seu. Para mudar a ordem de um fio, use a lista Ordem.", "cliquez sur deux films, puis choisissez une raison ou écrivez la vôtre. Pour changer l’ordre d’un fil, utilisez sa liste Ordre."],
 ["answers", "responde", "responde", "répond"],
 ["echoes", "hace eco", "ecoa", "fait écho"],
 ["shares land", "comparte territorio", "compartilha território", "partage un territoire"],
 ["shares language", "comparte lengua", "compartilha língua", "partage une langue"],
 ["same collective", "mismo colectivo", "mesmo coletivo", "même collectif"],
 ["counterpoint", "contrapunto", "contraponto", "contrepoint"],
 ["Note & source", "Nota y fuente", "Nota e fonte", "Note et source"],
 ["Type", "Tipo", "Tipo", "Type"],
 ["Interpretation", "Interpretación", "Interpretação", "Interprétation"],
 ["Question", "Pregunta", "Pergunta", "Question"],
 ["Sourced note", "Nota con fuente", "Nota com fonte", "Note sourcée"],
 ["Confirmed by atlas record", "Confirmado por un registro del atlas", "Confirmado por um registro do atlas", "Confirmé par une fiche de l’atlas"],
 ["Note (optional)", "Nota (opcional)", "Nota (opcional)", "Note (facultative)"],
 ["https source (optional)", "Fuente https (opcional)", "Fonte https (opcional)", "Source https (facultative)"],
 ["Save connection", "Guardar relación", "Salvar relação", "Enregistrer le lien"],
 ["Cancel", "Cancelar", "Cancelar", "Annuler"],
 ["Connect to", "Relacionar con", "Relacionar com", "Relier à"],
 ["Choose a different card…", "Elige otra tarjeta…", "Escolha outro cartão…", "Choisissez une autre carte…"],
 ["Add the first film: search, gather films along a line, or click a film on the map.", "Añade la primera película: busca, reúne películas a lo largo de una línea o haz clic en una película del mapa.", "Adicione o primeiro filme: busque, reúna filmes ao longo de uma linha ou clique em um filme no mapa.", "Ajoutez le premier film : cherchez, rassemblez des films le long d’une ligne ou cliquez sur un film de la carte."],
 ["Connection saved.", "Relación guardada.", "Relação salva.", "Lien enregistré."],
 ["Edit connection", "Editar relación", "Editar relação", "Modifier le lien"],
 ["Now the second film", "Ahora la segunda película", "Agora o segundo filme", "Maintenant le second film"],
 ["Now click the second film.", "Ahora haz clic en la segunda película.", "Agora clique no segundo filme.", "Cliquez maintenant sur le second film."],
 ["Click the first film.", "Haz clic en la primera película.", "Clique no primeiro filme.", "Cliquez sur le premier film."],
 ["Solid line: sourced connection.", "Línea continua: relación con fuente.", "Linha contínua: relação com fonte.", "Ligne continue : lien sourcé."],
 ["Dotted line: interpretation.", "Línea punteada: interpretación.", "Linha pontilhada: interpretação.", "Ligne pointillée : interprétation."],
 ["Make a thread from this land", "Crear un hilo con este territorio", "Criar um fio com este território", "Créer un fil avec ce territoire"],
 ["+ Add", "+ Añadir", "+ Adicionar", "+ Ajouter"],
 ["Link", "Vincular", "Vincular", "Relier"],
 ["Chosen", "Elegida", "Escolhido", "Choisi"],
 ["No films yet", "Aún sin películas", "Ainda sem filmes", "Pas encore de films"],
 ["1 film", "1 película", "1 filme", "1 film"],
 ["No film on the atlas is linked to this land yet.", "Ninguna película del atlas está vinculada aún a este territorio.", "Nenhum filme do atlas está vinculado a este território ainda.", "Aucun film de l’atlas n’est encore lié à ce territoire."],
 ["Choose a film to link.", "Elige una película para vincular.", "Escolha um filme para vincular.", "Choisissez un film à relier."],
 ["Choose the second film.", "Elige la segunda película.", "Escolha o segundo filme.", "Choisissez le second film."],
 ["Click a land on the map to choose a film.", "Haz clic en un territorio del mapa para elegir una película.", "Clique em um território no mapa para escolher um filme.", "Cliquez sur un territoire de la carte pour choisir un film."],
 ["Click two films, or a land, then say why they connect.", "Haz clic en dos películas, o en un territorio, y di por qué se relacionan.", "Clique em dois filmes, ou em um território, e diga por que se relacionam.", "Cliquez sur deux films, ou sur un territoire, puis dites ce qui les relie."],
 ["Click two films, on the map or in the Order list below, or click a land to choose from its films. Then say why they connect.", "Haz clic en dos películas, en el mapa o en la lista Orden de abajo, o en un territorio para elegir entre sus películas. Luego di por qué se relacionan.", "Clique em dois filmes, no mapa ou na lista Ordem abaixo, ou em um território para escolher entre seus filmes. Depois diga por que se relacionam.", "Cliquez sur deux films, sur la carte ou dans la liste Ordre ci-dessous, ou sur un territoire pour choisir parmi ses films. Puis dites ce qui les relie."],
 ["Click a land on the map to choose a film, then a second. Then say why they connect.", "Haz clic en un territorio del mapa para elegir una película, luego una segunda. Después di por qué se relacionan.", "Clique em um território no mapa para escolher um filme, depois um segundo. Então diga por que se relacionam.", "Cliquez sur un territoire de la carte pour choisir un film, puis un second. Dites ensuite ce qui les relie."],
 ["This is now your copy. The example stays as it was under Examples.", "Ahora es tu copia. El ejemplo sigue intacto en Ejemplos.", "Agora é a sua cópia. O exemplo continua intacto em Exemplos.", "C’est maintenant votre copie. L’exemple reste intact dans Exemples."],
 ["Draw again","Volver a dibujar","Desenhar novamente","Dessiner de nouveau"],
 ["Draw or move the map","Dibujar o mover el mapa","Desenhar ou mover o mapa","Dessiner ou déplacer la carte"],
 ["Draw across lands · scroll to zoom","Dibuja sobre los territorios · desplaza para ampliar","Desenhe sobre os territórios · role para ampliar","Dessinez à travers les territoires · faites défiler pour zoomer"],
 ["Drag to move · Draw when ready","Arrastra para mover · dibuja cuando quieras","Arraste para mover · desenhe quando quiser","Faites glisser pour déplacer · dessinez quand vous voulez"],
 ["One finger draws · two move","Un dedo dibuja · dos mueven","Um dedo desenha · dois movem","Un doigt dessine · deux déplacent"],
 ["Theme to gather","Tema para reunir","Tema para reunir","Thème à rassembler"],
 ["Lands crossed by your line","Territorios atravesados por tu línea","Territórios atravessados pela sua linha","Territoires traversés par votre ligne"],
 ["Draw a line across the map to gather the films along it: the lands it crosses are listed in order, and can become a thread","Dibuja una línea en el mapa para reunir las películas a lo largo de ella: los territorios que atraviese se enumerarán en orden y podrán formar un hilo","Desenhe uma linha no mapa para reunir os filmes ao longo dela: os territórios atravessados serão listados em ordem e poderão formar um fio","Dessinez une ligne sur la carte pour rassembler les films sur son tracé : les territoires traversés seront listés dans l’ordre et pourront former un fil"],
 ["Draw a line across the map to gather the films of the lands it crosses","Dibuja una línea en el mapa para reunir las películas de los territorios que atraviesa","Desenhe uma linha no mapa para reunir os filmes dos territórios que ela atravessa","Dessinez une ligne sur la carte pour rassembler les films des territoires qu’elle traverse"],
 ["Draw a line to gather films","Dibuja una línea para reunir películas","Desenhe uma linha para reunir filmes","Dessinez une ligne pour rassembler des films"],
 ["The lands it crosses give their films, in the order it crosses them.","Los territorios que atraviesa aportan sus películas, en el orden en que los atraviesa.","Os territórios que ela atravessa oferecem seus filmes, na ordem em que os atravessa.","Les territoires qu’elle traverse apportent leurs films, dans l’ordre où elle les traverse."],
 ["No lands with films crossed. Draw again.","La línea no cruzó territorios con películas. Vuelve a dibujar.","A linha não cruzou territórios com filmes. Desenhe novamente.","La ligne n’a traversé aucun territoire avec des films. Dessinez de nouveau."],
 ["searches the atlas.","busca en el atlas.","busca no atlas.","cherche dans l’atlas."],
 ["collects the films of the lands crossed by a line you draw on the map. Large themes open with six films; you can add the rest.","trae las películas de los territorios que cruza una línea que dibujas en el mapa. Los temas grandes se abren con seis películas; puedes añadir el resto.","traz os filmes dos territórios cruzados por uma linha que você desenha no mapa. Os temas grandes abrem com seis filmes; você pode adicionar o resto.","apporte les films des territoires traversés par une ligne que vous dessinez sur la carte. Les grands thèmes s’ouvrent avec six films ; vous pouvez ajouter les autres."],
 ["Time dial","Control temporal","Seletor temporal","Curseur temporel"],
 ["See when each land’s first film appears","Ver cuándo aparece la primera película vinculada a cada territorio","Veja quando aparece o primeiro filme vinculado a cada território","Voir quand apparaît le premier film lié à chaque territoire"],
 ["Close the time dial","Cerrar el control temporal","Fechar o seletor temporal","Fermer le curseur temporel"]
];
const IDX={es:1,pt:2,fr:3};
const DICT={};for(const row of T)DICT[row[0]]=row;
const PAT=[
 [/^After (.+)$/,["Después de $1","Depois de $1","Après $1"]],
 [/^Why does (.+) follow (.+)\?$/,["¿Por qué $1 viene después de $2?","Por que $1 vem depois de $2?","Pourquoi $1 vient-il après $2 ?"]],
 [/^([\d,]+) filmmakers share index references\. Open a land reference to explore more\.$/,["$1 cineastas comparten referencias del índice. Abre una referencia territorial para explorar más.","$1 cineastas compartilham referências do índice. Abra uma referência territorial para explorar mais.","$1 cinéastes partagent des références dans l’index. Ouvrez une référence territoriale pour en explorer davantage."]],
 [/^([\d,]+) filmmakers on the public map, each with a permanent page you can cite\.$/,["$1 cineastas en el mapa público, cada uno con una página permanente que se puede citar.", "$1 cineastas no mapa público, cada um com uma página permanente que pode ser citada.", "$1 cinéastes sur la carte publique, chacun avec une page permanente que l’on peut citer."]],
 [/^([\d,]+) dated films on the public map, by decade\. ([\d,]+) more film credits have no year recorded yet\.$/,["$1 películas con fecha en el mapa público, por década. Otros $2 créditos aún no tienen año registrado.", "$1 filmes datados no mapa público, por década. Outros $2 créditos ainda não têm ano registrado.", "$1 films datés sur la carte publique, par décennie. $2 autres crédits n’ont pas encore d’année."]],
 [/^Download the public atlas as spreadsheets\. Exported ([\d-]+)\. ([\d,]+) films by ([\d,]+) filmmakers; a film with two directors has one row for each\.$/,["Descarga el atlas público en hojas de cálculo. Exportado el $1. $2 películas de $3 cineastas; una película con dos directores tiene una fila para cada uno.", "Baixe o atlas público em planilhas. Exportado em $1. $2 filmes de $3 cineastas; um filme com dois diretores tem uma linha para cada um.", "Téléchargez l’atlas public en tableurs. Exporté le $1. $2 films de $3 cinéastes ; un film à deux réalisateurs a une ligne pour chacun."]],
 [/^([\d,]+) Indigenous languages across ([\d,]+) films with a recorded language, of ([\d,]+) films on the public map\. Each language links to its Glottolog entry; where a credit names a language group rather than one variety, the group is linked\. Languages are recorded only as a film’s credits or synopsis state them\. Updated ([\d-]+)\.$/,["$1 lenguas indígenas en $2 películas con lengua registrada, de $3 películas en el mapa público. Cada lengua enlaza a su entrada en Glottolog; cuando un crédito nombra un grupo de lenguas y no una variedad, se enlaza el grupo. Las lenguas se registran solo como las indican los créditos o la sinopsis de la película. Actualizado el $4.", "$1 línguas indígenas em $2 filmes com língua registrada, de $3 filmes no mapa público. Cada língua leva à sua entrada no Glottolog; quando um crédito nomeia um grupo de línguas e não uma variedade, o grupo é indicado. As línguas são registradas apenas como os créditos ou a sinopse do filme as indicam. Atualizado em $4.", "$1 langues autochtones dans $2 films dont la langue est connue, sur $3 films de la carte publique. Chaque langue renvoie à sa fiche Glottolog ; quand un crédit nomme un groupe de langues plutôt qu’une variété, c’est le groupe qui est lié. Les langues ne sont notées que telles que les crédits ou le synopsis du film les indiquent. Mis à jour le $4."]],
 [/^Films by decade, (\d{4})s–(\d{4})s$/,["Películas por década, $1–$2", "Filmes por década, $1–$2", "Films par décennie, $1–$2"]],
 [/^(\d+) undated$/,["$1 sin fecha", "$1 sem data", "$1 sans date"]],
 [/^Add films to “(.+)”: search, or gather them along a line\.$/,["Añade películas a «$1»: busca o reúnelas a lo largo de una línea.","Adicione filmes a «$1»: busque ou reúna-os ao longo de uma linha.","Ajoutez des films à « $1 » : cherchez, ou rassemblez-les le long d’une ligne."]],
 [/^“(.+)” · (\d+) films\. Link two of them and say why they connect\.$/,["«$1» · $2 películas. Vincula dos de ellas y di por qué se relacionan.","«$1» · $2 filmes. Vincule dois deles e diga por que se relacionam.","« $1 » · $2 films. Reliez-en deux et dites ce qui les relie."]],
 [/^No lands with (.+) films crossed\. Draw again\.$/,["La línea no cruzó territorios con películas de $1. Vuelve a dibujar.","A linha não cruzou territórios com filmes de $1. Desenhe novamente.","La ligne n’a traversé aucun territoire avec des films de $1. Dessinez de nouveau."]],
 [/^There are ([\d,]+) of ([\d,]+) films tagged with a theme or themes so far, each from a published synopsis, with its source and link\. While a film can carry several themes, its primary theme is listed first in the data\. Updated ([\d-]+)\.$/,["Hay $1 de $2 películas con uno o más temas por ahora, cada uno tomado de una sinopsis publicada, con su fuente y su enlace. Aunque una película puede tener varios temas, su tema principal aparece primero en los datos. Actualizado el $3.", "Há $1 de $2 filmes com um ou mais temas até agora, cada um tirado de uma sinopse publicada, com sua fonte e seu link. Embora um filme possa ter vários temas, o tema principal aparece primeiro nos dados. Atualizado em $3.", "$1 des $2 films ont déjà un ou plusieurs thèmes, chacun tiré d’un synopsis publié, avec sa source et son lien. Si un film peut avoir plusieurs thèmes, son thème principal figure en premier dans les données. Mis à jour le $3."]],
 [/^([\d,]+) filmmakers & collectives$/,['$1 cineastas y colectivos','$1 cineastas e coletivos','$1 cinéastes et collectifs']],
 [/^([\d,]+) filmmakers with land links(.*)$/,['$1 cineastas con vínculos a tierras$2','$1 cineastas com vínculos a terras$2','$1 cinéastes liés à des territoires$2']],
 [/^([\d,]+) filmmakers linked to ([\d,]+) land entries$/,['$1 cineastas vinculados a $2 tierras','$1 cineastas vinculados a $2 terras','$1 cinéastes liés à $2 territoires']],
 [/^([\d,]+) entries$/,['$1 entradas','$1 entradas','$1 entrées']],
 [/^([\d,]+) films$/,['$1 películas','$1 filmes','$1 films']],
 [/^Film language|^Any language/,null],
 [/^Before ([\d,]+)$/,["Antes de $1","Antes de $1","Avant $1"]],
 [/^([\d,]+) films · ([\d,]+) of ([\d,]+) lands$/,["$1 películas · $2 de $3 territorios","$1 filmes · $2 de $3 territórios","$1 films · $2 territoires sur $3"]],
 [/^A land lights up in the year of the earliest dated film by a filmmaker linked to it\. ([\d,]+) films have no year recorded yet and are not counted\.$/,["Un territorio se ilumina en el año de la primera película fechada de un cineasta vinculado a él. $1 películas aún no tienen año registrado y no se cuentan.","Um território se ilumina no ano do primeiro filme datado de um cineasta a ele vinculado. $1 filmes ainda não têm ano registrado e não são contados.","Un territoire s’éclaire à l’année du premier film daté d’un cinéaste qui lui est lié. $1 films n’ont pas encore d’année enregistrée et ne sont pas comptés."]]
];
let lang='en';
try{lang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('atlas-ui-lang')||'en';}catch(e){}
if(!LANGS[lang])lang='en';
const orig=new WeakMap(),origAttr=new WeakMap();
const SKIP='#atlas,#map-caption,#map-tip,#country-rail>button span,script,style,.land-word-label';
const DATA_ZONE='#index-list,#search-relay,#selection-crumbs,#featured-weave .fw-body';
function tr(en){
 const k=en.trim();if(!k)return null;const i=IDX[lang];
 /* A live Constellate guide includes the actual theme and number of films. */
 const guide=k.match(/^“(.+?)” runs through ([\d,]+) films\. Connect two films to say how they meet: answers, echoes, shares land, or your own words\.$/);
 if(guide){
  const theme=DICT[guide[1]]?.[i]||guide[1],n=guide[2];
  const msg={
   es:'«'+theme+'» recorre '+n+' películas. Conecta dos películas para explicar cómo se relacionan: una responde a la otra, se hacen eco, comparten territorio o se vinculan con tus propias palabras.',
   pt:'«'+theme+'» percorre '+n+' filmes. Conecte dois filmes para explicar como se relacionam: um responde ao outro, ecoam, compartilham território ou se vinculam com suas próprias palavras.',
   fr:'«'+theme+'» traverse '+n+' films. Reliez deux films pour expliquer leur rencontre : réponse, écho, territoire partagé ou vos propres mots.'
  };
  return en.replace(k,msg[lang]);
 }
 const row=DICT[k];if(row)return en.replace(k,row[i]);
 if(k.includes(' · ')){const parts=k.split(' · ');if(parts.every(p=>DICT[p]||/^[\d,]+$/.test(p)))return en.replace(k,parts.map(p=>DICT[p]?DICT[p][i]:p).join(' · '));}
 for(const [re,out] of PAT){if(out&&re.test(k))return en.replace(k,k.replace(re,out[i-1]));}
 return null;
}
/* A Constellate toolbar label is split in two (.cm-a shows alone when the bar is short): translate the whole label, split at its first space. */
function cmLabel(n){
 const p=n.parentElement,l=p&&p.parentElement;if(!l||!l.classList||!l.classList.contains('cm-label')||!p.matches('.cm-a,.cm-b'))return false;
 const a=l.querySelector(':scope>.cm-a'),b=l.querySelector(':scope>.cm-b');if(!a||!b)return false;
 const cur=a.textContent+b.textContent;let o=orig.get(l);
 if(o===undefined||(cur!==o&&cur!==l.__atlasT)){o=cur;orig.set(l,o);}
 const t=lang==='en'?o:tr(o);if(t==null||cur===t)return true;
 const k=t.indexOf(' ');l.__atlasT=t;put(a,k<0?t:t.slice(0,k));put(b,k<0?'':t.slice(k));return true;
}
/* edit the text node in place: replacing it would end the walk that is visiting it */
function put(el,v){const f=el.firstChild;if(f&&f.nodeType===3&&!f.nextSibling){if(f.nodeValue!==v)f.nodeValue=v;}else if(el.textContent!==v)el.textContent=v;
}
function textNode(n){
 const p=n.parentElement;if(!p||p.closest(SKIP))return;
 if(cmLabel(n))return;
 if(p.closest(DATA_ZONE)&&!p.closest('button,summary,label,select,option,optgroup,.index-tools,#index-tools')&&!p.closest('.adjacent-visible h3,.adjacent-visible p.meta'))return;
 let o=orig.get(n);const cur=n.nodeValue;
 if(o===undefined||(cur!==o&&cur!==n.__atlasT)){o=cur;orig.set(n,o);}
 if(lang==='en'){if(cur!==o)n.nodeValue=o;return;}
 const t=tr(o);if(t!=null&&cur!==t){n.__atlasT=t;n.nodeValue=t;}
}
function attrs(e){
 if(e.closest(SKIP))return;
 for(const a of ['placeholder','aria-label','aria-valuetext','title','label']){if(!e.hasAttribute(a))continue;
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
 if(root.matches?.('[placeholder],[aria-label],[aria-valuetext],[title],optgroup[label]'))attrs(root);
 root.querySelectorAll?.('[placeholder],[aria-label],[aria-valuetext],[title],optgroup[label]').forEach(attrs);
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
function start(){switcher();mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','aria-valuetext','title','label']});if(lang!=='en')apply(lang);
 setTimeout(()=>{switcher();if(lang!=='en')walk(document.body);},2500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.AtlasI18n={set:apply,get:()=>lang};
})();
