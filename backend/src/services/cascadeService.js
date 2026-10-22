// Bajas en cascada de libros y tiendas, auditadas en la misma transacción (research R10).
// Las reservas activas se cancelan antes de borrar los StoreBook, para liberar sus contadores.
import { Book } from '../models/Book.js';
import { Store } from '../models/Store.js';
import { StoreBook } from '../models/StoreBook.js';
import { notFound } from '../utils/httpError.js';
import { record } from './auditService.js';
import { cancelActiveFor } from './reservationTransitions.js';

async function deleteStoreBooks(filter, actorId, labelOf, session) {
  const storeBooks = await StoreBook.find(filter).session(session);
  for (const sb of storeBooks) {
    await record(
      {
        userId: actorId,
        action: 'delete',
        entityType: 'store_book',
        entityId: sb._id,
        entityLabel: labelOf(sb),
        before: sb,
      },
      session,
    );
  }
  await StoreBook.deleteMany(filter).session(session);
  return storeBooks.length;
}

/** Borra un libro y sus asociaciones con tiendas (FR-017). */
export async function deleteBookCascade(bookId, actorId, session) {
  const book = await Book.findById(bookId).session(session);
  if (!book) throw notFound('Libro no encontrado');
  await cancelActiveFor({ book_id: book._id }, 'book_deleted', actorId, session);
  // Punto de extensión (US6): borrar los favoritos del libro.
  await deleteStoreBooks({ book_id: book._id }, actorId, () => book.title, session);
  await Book.deleteOne({ _id: book._id }).session(session);
  await record(
    {
      userId: actorId,
      action: 'delete',
      entityType: 'book',
      entityId: book._id,
      entityLabel: book.title,
      before: book,
    },
    session,
  );
}

/** Borra una tienda y sus asociaciones, sin borrar los libros (FR-021). */
export async function deleteStoreCascade(storeId, actorId, session) {
  const store = await Store.findById(storeId).session(session);
  if (!store) throw notFound('Establecimiento no encontrado');
  await cancelActiveFor({ store_id: store._id }, 'store_deleted', actorId, session);
  await deleteStoreBooks({ store_id: store._id }, actorId, () => store.name, session);
  await Store.deleteOne({ _id: store._id }).session(session);
  await record(
    {
      userId: actorId,
      action: 'delete',
      entityType: 'store',
      entityId: store._id,
      entityLabel: store.name,
      before: store,
    },
    session,
  );
}
