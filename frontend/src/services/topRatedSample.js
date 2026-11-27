// Datos provisionales de los mejor valorados, hasta que Bookia tenga reseñas propias.
// Son las valoraciones reales de Open Library (openlibrary.org/works/…/ratings.json) de la obra
// de cada libro del catálogo de demostración, consultadas el 24/10/2026. El orden sigue una
// media ponderada (como la de IMDb, con 50 votos de referencia y la media global, 4,15), para
// que una nota alta con pocas reseñas no supere a otra casi igual con cientos; se muestra la
// media real.
export const TOP_RATED_SAMPLE = [
  { isbn: '9788416998722', title: 'Watchmen', average: 4.47, count: 243 },
  { isbn: '9788439720713', title: 'Maus', average: 4.5, count: 169 },
  { isbn: '9788467935110', title: 'Demon Slayer: Kimetsu no Yaiba 1', average: 4.48, count: 69 },
  { isbn: '9788498381498', title: 'El principito', average: 4.35, count: 256 },
  { isbn: '9788401022524', title: 'El nombre del viento', average: 4.34, count: 259 },
  { isbn: '9786073136594', title: 'Matilda', average: 4.33, count: 282 },
  { isbn: '9789681902551', title: 'Momo', average: 4.5, count: 38 },
  { isbn: '9788408053040', title: 'Cosmos', average: 4.6, count: 25 },
  { isbn: '9789877254112', title: 'Dune', average: 4.31, count: 455 },
  { isbn: '9789683901804', title: 'Calvin y Hobbes', average: 4.47, count: 34 },
  { isbn: '9788419275738', title: 'Percy Jackson y el ladrón del rayo', average: 4.29, count: 423 },
  { isbn: '9788466328319', title: 'Largo camino hacia la libertad', average: 4.57, count: 21 },
];
