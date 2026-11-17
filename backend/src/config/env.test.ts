import { describe, expect, it } from 'vitest';
import { loadConfig } from './env.ts';

describe('loadConfig', () => {
  it('sin variables usa los valores por defecto', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      host: '127.0.0.1',
      dbPath: './data/saas-o-matic.db',
      corsOrigin: 'http://localhost:5173',
    });
  });

  it('las variables definidas sustituyen a los valores por defecto', () => {
    const config = loadConfig({
      PORT: '4000',
      HOST: '0.0.0.0',
      DB_PATH: '/tmp/test.db',
      CORS_ORIGIN: 'https://app.example.com',
    });
    expect(config).toEqual({
      port: 4000,
      host: '0.0.0.0',
      dbPath: '/tmp/test.db',
      corsOrigin: 'https://app.example.com',
    });
  });

  it('ignora las variables que no son de la aplicación', () => {
    expect(loadConfig({ PATH: '/usr/bin' }).port).toBe(3000);
  });

  it.each(['abc', '3000.5', '-1', '', ' 3000'])(
    'PORT = %j lanza un error que nombra PORT',
    (port) => {
      expect(() => loadConfig({ PORT: port })).toThrow(/PORT/);
    },
  );

  it.each(['0', '65536'])('PORT = %s, fuera de 1–65535, lanza un error que nombra PORT', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(/PORT/);
  });

  it.each(['localhost:5173', 'no es una url', 'ftp://example.com'])(
    'CORS_ORIGIN = %j lanza un error que nombra CORS_ORIGIN',
    (origin) => {
      expect(() => loadConfig({ CORS_ORIGIN: origin })).toThrow(/CORS_ORIGIN/);
    },
  );

  it('HOST o DB_PATH vacíos lanzan un error que nombra la variable', () => {
    expect(() => loadConfig({ HOST: '' })).toThrow(/HOST/);
    expect(() => loadConfig({ DB_PATH: '' })).toThrow(/DB_PATH/);
  });

  it('nombra todas las variables no válidas en un solo error', () => {
    expect(() => loadConfig({ PORT: 'abc', CORS_ORIGIN: 'x' })).toThrow(/PORT.*CORS_ORIGIN/);
  });
});
