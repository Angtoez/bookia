// Paginación común de los listados: {items, page, limit, total, total_pages}.
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

export function parsePagination({ page, limit } = {}) {
  const p = Number.isInteger(page) && page >= 1 ? page : 1;
  const l = Number.isInteger(limit) && limit >= 1 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;
  return { page: p, limit: l, skip: (p - 1) * l };
}

export function buildPage(items, total, page, limit) {
  return { items, page, limit, total, total_pages: Math.ceil(total / limit) };
}

/**
 * Ejecuta una consulta paginada sobre un modelo de Mongoose.
 * @param {import('mongoose').Model} model
 * @param {object} filter filtro ya validado.
 * @param {{sort?: object, populate?: any, page?: number, limit?: number}} options
 */
export async function paginate(model, filter, { sort, populate, ...rest } = {}) {
  const { page, limit, skip } = parsePagination(rest);
  let query = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (populate) query = query.populate(populate);
  const [items, total] = await Promise.all([query, model.countDocuments(filter)]);
  return buildPage(items, total, page, limit);
}
