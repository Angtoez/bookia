// Género de la lista predefinida (data-model § Genre). Solo lo escribe el seed (FR-016).
import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

const genreSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
    slug: {
      type: String,
      required: [true, 'El slug es obligatorio'],
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'El slug solo admite minúsculas, números y guiones'],
    },
  },
  {
    collection: 'genres',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: toJSONOptions(['created_at', 'updated_at']),
  },
);

genreSchema.index({ name: 1 }, { unique: true });
genreSchema.index({ slug: 1 }, { unique: true });

export const Genre = mongoose.model('Genre', genreSchema);
