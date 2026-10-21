// Configuración pública y lista de géneros.
import { ENV } from '../config/env.js';
import { Genre } from '../models/Genre.js';
import { toGenre } from '../utils/presenters.js';

export function getConfig(_req, res) {
  res.json({
    currency: ENV.CURRENCY,
    max_active_reservations: ENV.MAX_ACTIVE_RESERVATIONS,
    pending_ttl_days: ENV.PENDING_TTL_DAYS,
    pickup_ttl_days: ENV.PICKUP_TTL_DAYS,
  });
}

export async function listGenres(_req, res) {
  const genres = await Genre.find().sort({ name: 1 }).lean();
  res.json(genres.map(toGenre));
}
