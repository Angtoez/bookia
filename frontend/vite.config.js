// Vite: React, Tailwind, proxy de /api hacia el backend y configuración de Vitest.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // La SPA y la API comparten origen en desarrollo, así la cookie sameSite=strict viaja.
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: 'tests/setup.js',
    coverage: {
      include: ['src/hooks/**', 'src/services/**', 'src/utils/**'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
