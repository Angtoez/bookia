// Usuario con cuenta (data-model § User).
import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

export const USER_ROLES = ['user', 'admin'];
export const USER_STATUSES = ['active', 'disabled'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: 1,
      maxlength: [100, 'El nombre admite como máximo 100 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'El correo no es válido'],
    },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'user' },
    status: { type: String, enum: USER_STATUSES, default: 'active' },
    failed_login_count: { type: Number, default: 0, min: 0 },
    locked_until: { type: Date, default: null },
    active_reservations: { type: Number, default: 0, min: 0 },
    // Sube con cada cambio de contraseña; el JWT la lleva como `ver` (feature 002, research R2).
    session_version: { type: Number, default: 0, min: 0 },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: toJSONOptions([
      'password_hash',
      'failed_login_count',
      'locked_until',
      'session_version',
    ]),
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });

export const User = mongoose.model('User', userSchema);
