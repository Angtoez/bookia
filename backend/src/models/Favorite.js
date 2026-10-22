// Libro marcado como favorito por un usuario (data-model § Favorite).
import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

const { ObjectId } = mongoose.Schema.Types;

const favoriteSchema = new mongoose.Schema(
  {
    user_id: { type: ObjectId, ref: 'User', required: true },
    book_id: { type: ObjectId, ref: 'Book', required: true },
  },
  {
    collection: 'favorites',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: toJSONOptions(),
  },
);

// El índice único hace idempotente el PUT; el de book_id sirve a la cascada (FR-022i).
favoriteSchema.index({ user_id: 1, book_id: 1 }, { unique: true });
favoriteSchema.index({ book_id: 1 });

export const Favorite = mongoose.model('Favorite', favoriteSchema);
