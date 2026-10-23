// Catálogo ampliado de demostración: cinco libros por género (cuatro en cocina), repartidos entre
// las tiendas demo. Los ISBN son de ediciones reales en español, comprobados en Open Library, y la
// editorial es la de esa edición. El año es el de la obra original.

// slug del género → [título, autor, editorial, año, precio en pesos, ISBN].
const CATALOG = {
  novela: [
    ['Aura', 'Carlos Fuentes', 'Era', 1962, 199, '9786074450699'],
    ['El túnel', 'Ernesto Sabato', 'Seix Barral', 1948, 219, '9789686005240'],
    ['La ciudad y los perros', 'Mario Vargas Llosa', 'Alfaguara', 1963, 329, '9789707702110'],
    [
      'Crónica de una muerte anunciada',
      'Gabriel García Márquez',
      'Debolsillo',
      1981,
      249,
      '9789588886176',
    ],
    ['La tregua', 'Mario Benedetti', 'Punto de Lectura', 1960, 229, '9789707311169'],
  ],
  'ciencia-ficcion': [
    ['Fahrenheit 451', 'Ray Bradbury', 'Debolsillo', 1953, 259, '9789700517551'],
    ['Un mundo feliz', 'Aldous Huxley', 'Debolsillo', 1932, 269, '9789871138517'],
    ['Dune', 'Frank Herbert', 'Debolsillo', 1965, 449, '9789877254112'],
    ['Fundación', 'Isaac Asimov', 'Debolsillo', 1951, 319, '9789875661127'],
    ['Crónicas marcianas', 'Ray Bradbury', 'Minotauro', 1950, 289, '9788445008256'],
  ],
  fantasia: [
    ['El hobbit', 'J. R. R. Tolkien', 'Timun Mas', 1937, 349, '9788445001257'],
    ['El nombre del viento', 'Patrick Rothfuss', 'Plaza & Janés', 2007, 499, '9788401022524'],
    ['Juego de tronos', 'George R. R. Martin', 'Plaza & Janés', 1996, 459, '9786073113113'],
    ['La historia interminable', 'Michael Ende', 'Alfaguara', 1979, 379, '9788420464398'],
    ['Un mago de Terramar', 'Ursula K. Le Guin', 'Minotauro', 1968, 299, '9786073908467'],
  ],
  'misterio-y-suspense': [
    ['Diez negritos', 'Agatha Christie', 'Planeta DeAgostini', 1939, 249, '9789504916093'],
    ['El nombre de la rosa', 'Umberto Eco', 'Debolsillo', 1980, 399, '9788497592581'],
    [
      'Los hombres que no amaban a las mujeres',
      'Stieg Larsson',
      'Destino',
      2005,
      429,
      '9788423343218',
    ],
    ['El sabueso de los Baskerville', 'Arthur Conan Doyle', 'Alianza', 1902, 199, '9788420665689'],
    ['La chica del tren', 'Paula Hawkins', 'Planeta', 2015, 349, '9788408141471'],
  ],
  romantica: [
    ['Orgullo y prejuicio', 'Jane Austen', 'Albor Libros', 1813, 229, '9788415083696'],
    ['Jane Eyre', 'Charlotte Brontë', 'Cátedra', 1847, 289, '9788437614496'],
    ['Cumbres borrascosas', 'Emily Brontë', '', 1847, 249, '9788440210678'],
    ['Bajo la misma estrella', 'John Green', 'Nube de Tinta', 2012, 299, '9788415594017'],
    ['Persuasión', 'Jane Austen', 'Creative Media Partners', 1817, 239, '9781016890687'],
  ],
  'novela-historica': [
    ['Los pilares de la Tierra', 'Ken Follett', 'Debolsillo', 1989, 499, '9788497592901'],
    ['Memorias de Adriano', 'Marguerite Yourcenar', 'Edhasa', 1951, 329, '9788435034647'],
    ['Yo, Claudio', 'Robert Graves', 'Alianza', 1934, 359, '9788420650470'],
    ['La catedral del mar', 'Ildefonso Falcones', 'Grijalbo', 2006, 429, '9789707802797'],
    ['Noticias del Imperio', 'Fernando del Paso', 'Diana', 1987, 449, '9789681318116'],
  ],
  poesia: [
    [
      'Veinte poemas de amor y una canción desesperada',
      'Pablo Neruda',
      'Seix Barral',
      1924,
      199,
      '9789507313578',
    ],
    ['Piedra de sol', 'Octavio Paz', 'Mondadori', 1957, 159, '9788439702146'],
    ['Poeta en Nueva York', 'Federico García Lorca', 'Cátedra', 1940, 219, '9788437607252'],
    ['Campos de Castilla', 'Antonio Machado', 'Cátedra', 1912, 189, '9788437600161'],
    ['Trilce', 'César Vallejo', 'Cátedra', 1922, 219, '9788437609102'],
  ],
  teatro: [
    ['La casa de Bernarda Alba', 'Federico García Lorca', 'Cátedra', 1945, 169, '9788437600680'],
    ['La vida es sueño', 'Pedro Calderón de la Barca', 'Cátedra', 1635, 179, '9788437600925'],
    ['Hamlet', 'William Shakespeare', 'Austral', 1603, 189, '9788467055221'],
    ['Casa de muñecas', 'Henrik Ibsen', 'Edimat', 1879, 199, '9788497647045'],
    ['Esperando a Godot', 'Samuel Beckett', 'Tusquets', 1952, 229, '9789509779792'],
  ],
  ensayo: [
    ['La raza cósmica', 'José Vasconcelos', 'Porrúa', 1925, 189, '9789700730271'],
    [
      'Las venas abiertas de América Latina',
      'Eduardo Galeano',
      'Siglo XXI',
      1971,
      329,
      '9789682325571',
    ],
    ['Una habitación propia', 'Virginia Woolf', 'Seix Barral', 1929, 219, '9788432222825'],
    ['El segundo sexo', 'Simone de Beauvoir', 'Cátedra', 1949, 499, '9788437622330'],
    [
      'La civilización del espectáculo',
      'Mario Vargas Llosa',
      'Alfaguara',
      2012,
      299,
      '9788420411484',
    ],
  ],
  'biografia-y-memorias': [
    ['El diario de Ana Frank', 'Ana Frank', 'Ediciones Leyenda', 1947, 229, '9789685146074'],
    ['Vivir para contarla', 'Gabriel García Márquez', 'Debolsillo', 2002, 349, '9789875660298'],
    ['Steve Jobs', 'Walter Isaacson', 'Debate', 2011, 499, '9788499921181'],
    ['Yo soy Malala', 'Malala Yousafzai', 'Alianza', 2013, 299, '9786074386783'],
    [
      'Largo camino hacia la libertad',
      'Nelson Mandela',
      'Punto de Lectura',
      1994,
      449,
      '9788466328319',
    ],
  ],
  infantil: [
    ['Pinocho', 'Carlo Collodi', 'Océano', 1883, 199, '9788449427329'],
    ['Matilda', 'Roald Dahl', 'Alfaguara', 1988, 229, '9786073136594'],
    ['Charlie y la fábrica de chocolate', 'Roald Dahl', 'Alfaguara', 1964, 229, '9781598200034'],
    ['Donde viven los monstruos', 'Maurice Sendak', 'Kalandraka', 1963, 279, '9788484648581'],
    ['Alicia en el país de las maravillas', 'Lewis Carroll', 'Edimat', 1865, 199, '9788484034094'],
  ],
  juvenil: [
    ['Los juegos del hambre', 'Suzanne Collins', 'Molino', 2008, 329, '9789876091657'],
    [
      'Percy Jackson y el ladrón del rayo',
      'Rick Riordan',
      'Salamandra',
      2005,
      299,
      '9788419275738',
    ],
    [
      'El curioso incidente del perro a medianoche',
      'Mark Haddon',
      'Salamandra',
      2003,
      269,
      '9788478889105',
    ],
    ['Momo', 'Michael Ende', 'Alfaguara', 1973, 279, '9789681902551'],
    ['Wonder', 'R. J. Palacio', 'Nube de Tinta', 2012, 289, '9788415594024'],
  ],
  'comic-y-novela-grafica': [
    ['Maus', 'Art Spiegelman', 'Reservoir Books', 1991, 499, '9788439720713'],
    ['Persépolis', 'Marjane Satrapi', 'Reservoir Books', 2000, 449, '9788417910143'],
    ['Watchmen', 'Alan Moore', 'ECC Ediciones', 1987, 699, '9788416998722'],
    ['Mafalda: todas las tiras', 'Quino', 'Lumen', 1993, 799, '9788426418760'],
    ['V de Vendetta', 'Alan Moore', 'ECC Ediciones', 1989, 549, '9788418326943'],
  ],
  autoayuda: [
    ['Hábitos atómicos', 'James Clear', 'Diana', 2018, 349, '9788411192477'],
    [
      'Los 7 hábitos de la gente altamente efectiva',
      'Stephen R. Covey',
      'Paidós',
      1989,
      379,
      '9789501251111',
    ],
    ['El poder del ahora', 'Eckhart Tolle', 'Random House Mondadori', 1997, 299, '9789588618791'],
    ['Los cuatro acuerdos', 'Miguel Ruiz', 'Urano', 1997, 229, '9788479532536'],
    ['El hombre en busca de sentido', 'Viktor Frankl', 'Herder', 1946, 249, '9788425423314'],
  ],
  'ciencia-y-divulgacion': [
    ['Cosmos', 'Carl Sagan', 'Planeta', 1980, 399, '9788408053040'],
    ['Breve historia del tiempo', 'Stephen Hawking', 'Crítica', 1988, 329, '9786079377373'],
    ['El gen egoísta', 'Richard Dawkins', 'Salvat', 1976, 379, '9788434558472'],
    ['El origen de las especies', 'Charles Darwin', 'Errepar', 1859, 299, '9789507396724'],
    ['Sapiens. De animales a dioses', 'Yuval Noah Harari', 'Debate', 2011, 449, '9788499926223'],
  ],
  historia: [
    [
      'México bárbaro',
      'John Kenneth Turner',
      'Editores Mexicanos Unidos',
      1909,
      249,
      '9789681520779',
    ],
    [
      'Historia verdadera de la conquista de la Nueva España',
      'Bernal Díaz del Castillo',
      'Porrúa',
      1632,
      349,
      '9789700718002',
    ],
    ['Armas, gérmenes y acero', 'Jared Diamond', 'Debolsillo', 1997, 429, '9786073139250'],
    ['La Segunda Guerra Mundial', 'Antony Beevor', 'Pasado & Presente', 2012, 599, '9788493986339'],
    [
      'Historia mínima de México',
      'Daniel Cosío Villegas',
      'El Colegio de México',
      1973,
      249,
      '9789681200442',
    ],
  ],
  filosofia: [
    ['El mundo de Sofía', 'Jostein Gaarder', 'Siruela', 1991, 389, '9788478448159'],
    ['Así habló Zaratustra', 'Friedrich Nietzsche', 'Alianza', 1883, 299, '9789504000495'],
    ['Meditaciones', 'Marco Aurelio', 'Austral', 180, 229, '9788408262459'],
    ['El mito de Sísifo', 'Albert Camus', 'Alianza', 1942, 219, '9788420609270'],
    ['Discurso del método', 'René Descartes', 'Andrómeda', 1637, 189, '9789507221101'],
  ],
  arte: [
    ['La historia del arte', 'E. H. Gombrich', 'Phaidon', 1950, 899, '9780714873008'],
    ['Modos de ver', 'John Berger', 'Gustavo Gili', 1972, 299, '9788425218071'],
    [
      'El diario de Frida Kahlo',
      'Frida Kahlo',
      'La Vaca Independiente',
      1995,
      699,
      '9789687559100',
    ],
    ['Cartas a Theo', 'Vincent van Gogh', 'Altamira', 1914, 349, '9789879423226'],
    ['De lo espiritual en el arte', 'Vasili Kandinsky', 'Paidós', 1911, 259, '9789501251241'],
  ],
  cocina: [
    ['La cocina mexicana', 'Diana Kennedy', 'Diana', 1972, 549, '9786070702181'],
    ['Larousse de la cocina mexicana', 'Alicia Gironella', 'Larousse', 2004, 499, '9789702216858'],
    ['Sal, grasa, ácido, calor', 'Samin Nosrat', 'NeoPerson', 2017, 599, '9788415887270'],
    ['1080 recetas de cocina', 'Simone Ortega', 'Alianza', 1972, 549, '9788420691022'],
  ],
  viajes: [
    ['En el camino', 'Jack Kerouac', 'Anagrama', 1957, 299, '9788433959485'],
    ['Viajes con Charley', 'John Steinbeck', 'Nórdica', 1962, 319, '9788417281601'],
    ['Diarios de motocicleta', 'Ernesto Guevara', 'Ocean Press', 1993, 249, '9781920888114'],
    ['Hacia rutas salvajes', 'Jon Krakauer', 'Ediciones B', 1996, 299, '9788413141220'],
    ['La vuelta al mundo en ochenta días', 'Julio Verne', 'Porrúa', 1872, 199, '9789700701677'],
  ],
};

export const CATALOG_BOOKS = Object.entries(CATALOG)
  .flatMap(([genre, rows]) => rows.map((row) => [genre, ...row]))
  .map(([genre, title, author, publisher, year, pesos, isbn]) => ({
    title,
    author,
    genre,
    isbn,
    price_cents: pesos * 100,
    publisher,
    // El modelo no admite años anteriores a 1450: las obras de la Antigüedad van sin año.
    publication_year: year >= 1450 ? year : null,
  }));

// Cada libro va a dos de las cuatro tiendas (la segunda, a 1–3 posiciones de la primera).
// Uno de cada siete queda agotado en la segunda y uno de cada cinco tiene precio propio.
export const CATALOG_STORE_BOOKS = CATALOG_BOOKS.flatMap((book, index) => {
  const first = index % 4;
  const second = (first + 1 + (index % 3)) % 4;
  const storePrice = index % 5 === 0 ? book.price_cents - 2000 : null;
  return [
    [first, book.isbn, 1 + (index % 6), storePrice],
    [second, book.isbn, index % 7 === 0 ? 0 : 2 + (index % 4), null],
  ];
});
