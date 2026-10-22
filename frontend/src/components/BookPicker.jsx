// Buscador de libros por título o autor para elegir uno (inventario de una tienda, US3).
import { useCallback, useEffect, useId, useState } from 'react';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { listBooks } from '../services/booksService.js';
import { SEARCH_DEBOUNCE_MS } from './SearchBar.jsx';

const RESULTS_LIMIT = 8;

/**
 * @param {{onSelect: (book: object) => void, excludedIds?: Set<string>}} props
 *   excludedIds: libros que ya están en el inventario visible; se muestran desactivados.
 */
export function BookPicker({ onSelect, excludedIds = new Set() }) {
  const id = useId();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setTerm(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const fetcher = useCallback(
    () => (term ? listBooks({ q: term, limit: RESULTS_LIMIT }) : Promise.resolve(null)),
    [term],
  );
  const { data, error, loading } = useApiQuery(fetcher);
  const results = term ? (data?.items ?? []) : [];

  let status = '';
  if (term && loading) status = 'Buscando…';
  else if (term && !error) {
    status = results.length === 0 ? 'No hay libros que coincidan' : `${results.length} resultados`;
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        Buscar libro por título o autor
      </label>
      <input
        id={id}
        type="search"
        value={text}
        maxLength={100}
        onChange={(event) => setText(event.target.value)}
        className="block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
      />
      <p aria-live="polite" className="text-xs text-stone-600">
        {error ? error.message : status}
      </p>
      {results.length > 0 && (
        <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 bg-white">
          {results.map((book) => {
            const excluded = excludedIds.has(book.id);
            return (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={() => onSelect(book)}
                  disabled={excluded}
                  className="flex w-full flex-wrap items-baseline justify-between gap-x-3 px-3 py-2 text-left text-sm hover:bg-teal-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium text-stone-900">{book.title}</span>
                    <span className="text-stone-600"> · {book.author}</span>
                  </span>
                  <span className="font-mono text-xs text-stone-500">
                    {excluded ? 'Ya está en el inventario' : book.isbn}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
