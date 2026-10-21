// Disponibilidad de un libro en un punto de venta (data-model § StoreBook).
// Es la relación N:M entre books y stores, con stock y precio propio de la tienda.
import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

const integer = (message) => ({ validator: (v) => v == null || Number.isInteger(v), message });

const storeBookSchema = new mongoose.Schema(
  {
    store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    book_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    stock: {
      type: Number,
      required: [true, 'El stock es obligatorio'],
      min: [0, 'El stock no puede ser negativo'],
      validate: integer('El stock debe ser un número entero'),
    },
    store_price_cents: {
      type: Number,
      default: null,
      min: [0, 'El precio no puede ser negativo'],
      validate: integer('El precio debe ser un número entero de céntimos'),
    },
    // Solo lo modifican las operaciones de reserva (feature 001, historia 5).
    reserved_count: { type: Number, default: 0, min: 0 },
  },
  {
    collection: 'store_books',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: toJSONOptions(),
  },
);

// Invariante 0 ≤ reserved_count ≤ stock (FR-020a).
storeBookSchema.pre('validate', function checkReserved() {
  if (this.reserved_count > this.stock) {
    this.invalidate('stock', `Hay ${this.reserved_count} unidades reservadas`);
  }
});

storeBookSchema.index({ store_id: 1, book_id: 1 }, { unique: true });
storeBookSchema.index({ book_id: 1 });

/** Unidades disponibles: stock menos reservas activas. */
export const availableOf = (sb) => Math.max(0, sb.stock - (sb.reserved_count ?? 0));

/** Precio en la tienda: el propio o, si no tiene, el de referencia del libro (FR-020). */
export const effectivePriceOf = (sb, book) => sb.store_price_cents ?? book.price_cents;

export const StoreBook = mongoose.model('StoreBook', storeBookSchema);
