// Punto de venta o establecimiento (data-model § Store).
import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

export const PHONE_PATTERN = /^[0-9 +\-()]{1,30}$/;

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [150, 'El nombre admite como máximo 150 caracteres'],
    },
    address: {
      type: String,
      required: [true, 'La dirección es obligatoria'],
      trim: true,
      maxlength: [300, 'La dirección admite como máximo 300 caracteres'],
    },
    opening_hours: {
      type: String,
      required: [true, 'El horario es obligatorio'],
      trim: true,
      maxlength: [300, 'El horario admite como máximo 300 caracteres'],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: (v) => v == null || v === '' || PHONE_PATTERN.test(v),
        message: 'El teléfono solo admite dígitos, espacios, +, - y ()',
      },
    },
  },
  {
    collection: 'stores',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: toJSONOptions(['created_at', 'updated_at']),
  },
);

storeSchema.index({ name: 1 });

export const Store = mongoose.model('Store', storeSchema);
