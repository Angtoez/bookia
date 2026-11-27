// Reserva de una unidad de un libro en un punto de venta (data-model § Reservation).
import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

export const RESERVATION_STATUSES = ['pending', 'ready', 'picked_up', 'cancelled', 'expired'];
export const ACTIVE_STATUSES = ['pending', 'ready'];
export const CANCEL_REASONS = [
  'user',
  'admin',
  'book_deleted',
  'store_deleted',
  'account_deactivated',
  'account_deleted',
];

const { ObjectId } = mongoose.Schema.Types;

const reservationSchema = new mongoose.Schema(
  {
    user_id: { type: ObjectId, ref: 'User', required: true },
    // Pueden apuntar a un libro o a una tienda ya borrados: por eso se copian sus datos.
    book_id: { type: ObjectId, ref: 'Book', required: true },
    store_id: { type: ObjectId, ref: 'Store', required: true },
    book_title: { type: String, required: true },
    store_name: { type: String, required: true },
    store_address: { type: String, required: true },
    // Precio efectivo al reservar; no cambia aunque cambie después el de la tienda.
    price_cents: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'El precio debe ser un número entero' },
    },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'pending' },
    // true si status ∈ {pending, ready}; cada transición lo mantiene sincronizado.
    is_active: { type: Boolean, default: true },
    expires_at: { type: Date, default: null },
    ready_at: { type: Date, default: null },
    closed_at: { type: Date, default: null },
    cancel_reason: { type: String, enum: [...CANCEL_REASONS, null], default: null },
  },
  {
    collection: 'reservations',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: toJSONOptions(),
  },
);

// Una sola reserva activa por usuario, libro y tienda (FR-022a).
reservationSchema.index(
  { user_id: 1, book_id: 1, store_id: 1 },
  { unique: true, partialFilterExpression: { is_active: true } },
);
reservationSchema.index({ user_id: 1, created_at: -1 });
reservationSchema.index({ status: 1, store_id: 1, created_at: -1 });
reservationSchema.index({ is_active: 1, expires_at: 1 });
reservationSchema.index({ book_id: 1, is_active: 1 });
reservationSchema.index({ store_id: 1, is_active: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);
