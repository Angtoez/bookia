// Da forma a las respuestas según contracts/rest-api.md (campos en snake_case).
import { availableOf, effectivePriceOf } from '../models/StoreBook.js';

export function toGenre(genre) {
  if (!genre?._id) return null;
  return { id: String(genre._id), name: genre.name, slug: genre.slug };
}

/** BookSummary: requiere genre_id poblado. */
export function toBookSummary(book) {
  return {
    id: String(book._id),
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    genre: toGenre(book.genre_id),
    price_cents: book.price_cents,
  };
}

/** StoreAvailability: requiere store_id poblado. */
export function toStoreAvailability(storeBook, book) {
  const store = storeBook.store_id;
  const available = availableOf(storeBook);
  return {
    store_id: String(store._id),
    name: store.name,
    address: store.address,
    opening_hours: store.opening_hours,
    phone: store.phone ?? null,
    price_cents: effectivePriceOf(storeBook, book),
    available,
    is_sold_out: available === 0,
  };
}

/** BookDetail = BookSummary + datos opcionales y tiendas. */
export function toBookDetail(book, storeBooks = []) {
  const stores = storeBooks
    .filter((sb) => sb.store_id?._id)
    .map((sb) => toStoreAvailability(sb, book))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return {
    ...toBookSummary(book),
    description: book.description ?? '',
    publisher: book.publisher ?? '',
    publication_year: book.publication_year ?? null,
    stores,
  };
}

export function toStore(store) {
  return {
    id: String(store._id),
    name: store.name,
    address: store.address,
    opening_hours: store.opening_hours,
    phone: store.phone ?? null,
  };
}

/** StoreBookItem: recibe la asociación y el libro (plano o documento). */
export function toStoreBookItem(storeBook, book) {
  return {
    book_id: String(book._id),
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    stock: storeBook.stock,
    reserved_count: storeBook.reserved_count ?? 0,
    available: availableOf(storeBook),
    store_price_cents: storeBook.store_price_cents ?? null,
    effective_price_cents: effectivePriceOf(storeBook, book),
  };
}

export function toUserMe(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

/** Usuario en la gestión de administración: nunca incluye la contraseña. */
/** Account (feature 002): los datos que la propia cuenta ve en Mi cuenta. */
export function toAccount(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };
}

export function toUserAdmin(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
  };
}

/**
 * AuditLogItem. `usersById` tiene los autores que existen: sin user_id la acción es del sistema;
 * con user_id pero sin autor, la cuenta se borró (`user_deleted`, feature 002).
 * @param {Map<string, {_id: any, name: string}>} usersById
 */
export function toAuditLog(log, usersById = new Map()) {
  const author = log.user_id ? usersById.get(String(log.user_id)) : null;
  return {
    id: String(log._id),
    user: author ? { id: String(author._id), name: author.name } : null,
    user_deleted: Boolean(log.user_id) && !author,
    action: log.action,
    entity_type: log.entity_type,
    entity_id: String(log.entity_id),
    entity_label: log.entity_label,
    before: log.before,
    after: log.after,
    created_at: log.created_at,
  };
}
