# Artwork and discovery audit
24 November 2026

Dedicated terrain, discovery and input matrix passed for ae15d8f (run 45538102033). Previous combined suite and deployment passed for 9e53e51; latest combined suite was still running at review.

New artwork renderer uses exact recorded image URL, decoded natural dimensions, responsive bounded width/height, uncropped contain, no filters or tint, no enlargement beyond original dimensions. A failed or missing image displays a title in the panel; floating preview is hidden until the actual image decodes. Portrait and landscape images receive appropriate proportions. Film title, director, year and available published form/language remain readable outside the image. The floating preview adds director/year. Tests inspect decoded dimensions, ratio, fit, filter and opacity, and exercise exact themed film navigation and return when a bridge exists.

Outstanding: physical Mac Safari pinch, visual review of screenshots, legacy flat-interface test reconciliation. No image URLs or catalog records changed.