// Libro del catálogo (data-model § Book). Autor y editorial son texto (spec, Assumptions).
import mongoose from 'mongoose';
import { isValidIsbn, normalizeIsbn } from '../utils/isbn.js';
import { normalizeSearch } from '../utils/normalizeSearch.js';
import { toJSONOptions } from '../utils/toJSON.js';

const MIN_YEAR = 1450;

const integer = (message) => ({ validator: (v) => v == null || Number.isInteger(v), message });

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: [300, 'El título admite como máximo 300 caracteres'],
    },
    author: {
      type: String,
      required: [true, 'El autor es obligatorio'],
      trim: true,
      maxlength: [200, 'El autor admite como máximo 200 caracteres'],
    },
    genre_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Genre',
      required: [true, 'El género es obligatorio'],
    },
    isbn: {
      type: String,
      required: [true, 'El ISBN es obligatorio'],
      set: normalizeIsbn,
      validate: { validator: isValidIsbn, message: 'ISBN no válido' },
    },
    price_cents: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
      validate: integer('El precio debe ser un número entero de céntimos'),
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'La descripción admite como máximo 5000 caracteres'],
    },
    publisher: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'La editorial admite como máximo 200 caracteres'],
    },
    publication_year: {
      type: Number,
      default: null,
      min: [MIN_YEAR, `El año de publicación debe ser posterior a ${MIN_YEAR}`],
      validate: [
        integer('El año de publicación debe ser un número entero'),
        {
          validator: (v) => v == null || v <= new Date().getFullYear() + 1,
          message: 'El año de publicación no puede estar en el futuro',
        },
      ],
    },
    // Campos derivados para la búsqueda sin mayúsculas ni tildes (research R6).
    title_search: { type: String },
    author_search: { type: String },
  },
  {
    collection: 'books',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: toJSONOptions(['title_search', 'author_search']),
  },
);

bookSchema.pre('validate', function computeSearchFields() {
  this.title_search = normalizeSearch(this.title);
  this.author_search = normalizeSearch(this.author);
});

bookSchema.index({ isbn: 1 }, { unique: true });
bookSchema.index({ genre_id: 1, title_search: 1 });
bookSchema.index({ title_search: 1 });
bookSchema.index({ author_search: 1 });

export const Book = mongoose.model('Book', bookSchema);
