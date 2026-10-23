// Datos de demostración. Los establecimientos son ficticios (marcados con "demo") y están
// ubicados en Huauchinango, Puebla. Los ISBN son de ediciones reales en español, comprobados en
// Open Library, y la editorial es la de esa edición. El año es el de la obra original.
import { CATALOG_BOOKS, CATALOG_STORE_BOOKS } from './demoCatalog.js';

export const DEMO_STORES = [
  {
    name: 'Librería Centro (demo)',
    address: 'Calle de ejemplo 1, Col. Centro, Huauchinango, Puebla',
    opening_hours: 'L–V 9:00–20:00; S 10:00–14:00',
    phone: '776 000 0001',
  },
  {
    name: 'Papelería y Libros La Ceiba (demo)',
    address: 'Calle de ejemplo 2, Col. Centro, Huauchinango, Puebla',
    opening_hours: 'L–S 9:00–19:00',
    phone: '776 000 0002',
  },
  {
    name: 'Librería del Mercado (demo)',
    address: 'Calle de ejemplo 3, Huauchinango, Puebla',
    opening_hours: 'L–D 8:00–15:00',
    phone: null,
  },
  {
    name: 'Biblio Café Necaxa (demo)',
    address: 'Calle de ejemplo 4, Huauchinango, Puebla',
    opening_hours: 'Ma–D 11:00–21:00',
    phone: '776 000 0004',
  },
];

// genre: slug de scripts/genres.js. price_cents: precio de referencia en céntimos.
export const DEMO_BOOKS = [
  ...CATALOG_BOOKS,
  {
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    genre: 'novela',
    isbn: '9780307474728',
    price_cents: 32900,
    publisher: 'Vintage Español',
    publication_year: 1967,
    description: 'La historia de la familia Buendía en el pueblo de Macondo.',
  },
  {
    title: 'Pedro Páramo',
    author: 'Juan Rulfo',
    genre: 'novela',
    isbn: '9788437604183',
    price_cents: 21900,
    publisher: 'Cátedra',
    publication_year: 1955,
  },
  {
    title: 'El llano en llamas',
    author: 'Juan Rulfo',
    genre: 'novela',
    isbn: '9788437605128',
    price_cents: 19900,
    publisher: 'Cátedra',
    publication_year: 1953,
  },
  {
    title: 'Como agua para chocolate',
    author: 'Laura Esquivel',
    genre: 'romantica',
    isbn: '9780385721233',
    price_cents: 27900,
    publisher: 'Anchor',
    publication_year: 1989,
  },
  {
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    genre: 'novela',
    isbn: '9786071653031',
    price_cents: 45900,
    publisher: 'Fondo de Cultura Económica',
    publication_year: 1605,
  },
  {
    title: 'El principito',
    author: 'Antoine de Saint-Exupéry',
    genre: 'infantil',
    isbn: '9788498381498',
    price_cents: 18900,
    publisher: 'Salamandra',
    publication_year: 1943,
  },
  {
    title: 'Ficciones',
    author: 'Jorge Luis Borges',
    genre: 'fantasia',
    isbn: '9788499089508',
    price_cents: 24900,
    publisher: 'Debolsillo',
    publication_year: 1944,
  },
  {
    title: 'Rayuela',
    author: 'Julio Cortázar',
    genre: 'novela',
    isbn: '9788437604572',
    price_cents: 29900,
    publisher: 'Cátedra',
    publication_year: 1963,
  },
  {
    title: 'El laberinto de la soledad',
    author: 'Octavio Paz',
    genre: 'ensayo',
    isbn: '9789681659707',
    price_cents: 22900,
    publisher: 'Fondo de Cultura Económica',
    publication_year: 1950,
  },
  {
    title: 'La sombra del viento',
    author: 'Carlos Ruiz Zafón',
    genre: 'misterio-y-suspense',
    isbn: '9788408163435',
    price_cents: 34900,
    publisher: 'Planeta',
    publication_year: 2001,
  },
  {
    title: 'La casa de los espíritus',
    author: 'Isabel Allende',
    genre: 'novela',
    isbn: '9788466360081',
    price_cents: 31900,
    publisher: 'Debolsillo',
    publication_year: 1982,
  },
  // Sin puntos de venta: sirve para probar el aviso de "no disponible".
  {
    title: 'Los de abajo',
    author: 'Mariano Azuela',
    genre: 'novela-historica',
    isbn: '9786073121040',
    price_cents: 15900,
    publisher: 'Penguin Books',
    publication_year: 1915,
  },
];

// [índice de tienda, ISBN, stock, precio propio en céntimos o null].
export const DEMO_STORE_BOOKS = [
  ...CATALOG_STORE_BOOKS,
  [0, '9780307474728', 5, 29900],
  [1, '9780307474728', 2, null],
  [2, '9780307474728', 0, null], // agotado
  [0, '9788437604183', 4, null],
  [3, '9788437604183', 1, 20900],
  [0, '9788437605128', 3, null],
  [1, '9780385721233', 6, null],
  [3, '9780385721233', 2, 25900],
  [0, '9786071653031', 1, null],
  [1, '9788498381498', 10, 16900],
  [2, '9788498381498', 4, null],
  [3, '9788499089508', 2, null],
  [0, '9788437604572', 2, null],
  [2, '9789681659707', 3, null],
  [3, '9788408163435', 5, null],
  [1, '9788466360081', 3, 29900],
];
