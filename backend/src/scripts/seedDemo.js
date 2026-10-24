// Seed de demostración: libros, puntos de venta de Huauchinango y su inventario.
// Es idempotente: identifica libros por ISBN, tiendas por nombre y asociaciones por
// (tienda, libro), y solo inserta lo que falta; nunca sobrescribe datos editados. La única
// excepción es la sinopsis: si un libro existente no tiene, se le añade la de demostración.
import { ENV } from '../config/env.js';
import { connectDb, describeConnection, disconnectDb } from '../config/db.js';
import { Book, Genre, Store, StoreBook, syncAllIndexes } from '../models/index.js';
import { normalizeIsbn } from '../utils/isbn.js';
import { DEMO_BOOKS, DEMO_STORE_BOOKS, DEMO_STORES } from './demoData.js';
import { seedGenres } from './genres.js';

async function upsertStores() {
  const stores = [];
  let created = 0;
  for (const data of DEMO_STORES) {
    let store = await Store.findOne({ name: data.name });
    if (!store) {
      store = await Store.create(data);
      created += 1;
    }
    stores.push(store);
  }
  return { stores, created };
}

async function upsertBooks() {
  const genres = new Map((await Genre.find().lean()).map((g) => [g.slug, g._id]));
  const booksByIsbn = new Map();
  let created = 0;
  let described = 0;
  for (const { genre, ...data } of DEMO_BOOKS) {
    const genreId = genres.get(genre);
    if (!genreId) throw new Error(`El género "${genre}" no existe`);
    const isbn = normalizeIsbn(data.isbn);
    let book = await Book.findOne({ isbn });
    if (!book) {
      // create() pasa por las validaciones y calcula los campos de búsqueda.
      book = await Book.create({ ...data, genre_id: genreId });
      created += 1;
    } else if (!book.description && data.description) {
      // Rellenar una sinopsis vacía no pisa nada editado: solo completa el libro.
      book.description = data.description;
      await book.save();
      described += 1;
    }
    booksByIsbn.set(isbn, book);
  }
  return { booksByIsbn, created, described };
}

async function upsertStoreBooks(stores, booksByIsbn) {
  let created = 0;
  for (const [storeIndex, isbn, stock, storePrice] of DEMO_STORE_BOOKS) {
    const result = await StoreBook.updateOne(
      { store_id: stores[storeIndex]._id, book_id: booksByIsbn.get(isbn)._id },
      { $setOnInsert: { stock, store_price_cents: storePrice, reserved_count: 0 } },
      { upsert: true, runValidators: true },
    );
    created += result.upsertedCount;
  }
  return created;
}

async function main() {
  if (ENV.NODE_ENV === 'production') {
    throw new Error('seed:demo no se ejecuta con NODE_ENV=production');
  }
  await connectDb();
  console.info(`Conectado a ${describeConnection()}`);
  await syncAllIndexes();
  await seedGenres();
  const { stores, created: storesCreated } = await upsertStores();
  const { booksByIsbn, created: booksCreated, described } = await upsertBooks();
  const storeBooksCreated = await upsertStoreBooks(stores, booksByIsbn);
  console.info(
    `Demo: ${storesCreated} tiendas, ${booksCreated} libros y ` +
      `${storeBooksCreated} asociaciones nuevas; ${described} sinopsis añadidas a libros ` +
      'que no tenían (lo demás no se ha modificado).',
  );
}

main()
  .catch((err) => {
    console.error(`Error en seed:demo: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
