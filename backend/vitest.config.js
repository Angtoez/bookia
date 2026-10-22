import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 180000,
    // Cada archivo arranca su propio replica set en memoria; en serie es más estable.
    fileParallelism: false,
    // Valores de prueba: nunca se usa la base de datos real de backend/.env.
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/bookia-test-placeholder',
      JWT_SECRET: 'jwt-secret-solo-para-pruebas-0123456789abcdef',
      BCRYPT_ROUNDS: '10',
      CURRENCY: 'MXN',
      CORS_ORIGIN: '',
    },
    coverage: {
      provider: 'v8',
      include: ['src/{controllers,services,middlewares,utils,jobs}/**'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
