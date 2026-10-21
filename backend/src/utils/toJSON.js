// Opciones de serialización comunes: expone `id` y oculta `_id`, `__v` y los campos indicados.
export function toJSONOptions(hidden = []) {
  return {
    versionKey: false,
    transform(_doc, ret) {
      const { _id, ...rest } = ret;
      for (const field of hidden) delete rest[field];
      return { id: String(_id), ...rest };
    },
  };
}
