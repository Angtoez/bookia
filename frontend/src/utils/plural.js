// "1 establecimiento", "3 establecimientos": elige la forma según la cantidad.
export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
