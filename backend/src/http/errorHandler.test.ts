import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../shared/errors.ts';
import type { Logger } from '../shared/logger.ts';
import { createErrorHandler } from './errorHandler.ts';

/** App mínima con una ruta que lanza `thrown` y el errorHandler detrás. */
function appThatThrows(thrown: unknown) {
  const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const app = express();
  app.get('/boom', () => {
    throw thrown;
  });
  app.use(createErrorHandler(logger));
  return { app, logger };
}

describe('errorHandler', () => {
  it('un Error desconocido → 500 INTERNAL_ERROR con mensaje genérico y sin traza', async () => {
    const error = new Error('secret: SQLITE_CONSTRAINT at repository.ts:42');
    const { app } = appThatThrows(error);
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: [] },
    });
    expect(res.text).not.toContain('secret');
    expect(res.text).not.toContain('repository.ts');
  });

  it('la traza del error desconocido va solo al logger', async () => {
    const error = new Error('boom');
    const { app, logger } = appThatThrows(error);
    await request(app).get('/boom');
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), error);
  });

  it('un valor lanzado que no es Error también da 500 INTERNAL_ERROR', async () => {
    const { app } = appThatThrows('not an error');
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('un AppError se serializa con su status, code, message y details', async () => {
    const details = [{ field: 'users', issue: 'OUT_OF_RANGE' }];
    const { app, logger } = appThatThrows(
      new AppError(422, 'VALIDATION_ERROR', 'Request validation failed', details),
    );
    const res = await request(app).get('/boom');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });
});
