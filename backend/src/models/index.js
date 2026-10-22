// Registro de todos los modelos, para sincronizar índices desde el seed y las pruebas.
import { AuditLog } from './AuditLog.js';
import { Book } from './Book.js';
import { Genre } from './Genre.js';
import { Reservation } from './Reservation.js';
import { Store } from './Store.js';
import { StoreBook } from './StoreBook.js';
import { User } from './User.js';

export const ALL_MODELS = [User, Genre, Book, Store, StoreBook, Reservation, AuditLog];

/** Crea las colecciones y los índices declarados en los esquemas (principio IV). */
export async function syncAllIndexes() {
  for (const model of ALL_MODELS) {
    await model.createCollection();
    await model.syncIndexes();
  }
}

export { AuditLog, Book, Genre, Reservation, Store, StoreBook, User };
