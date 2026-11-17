import express, { type Request, type RequestHandler } from 'express';
import { MalformedJsonError } from '../shared/errors.ts';
import { requireJson } from './contentType.ts';

/** Peticiones cuyo body crudo trae al menos un byte. */
const withRawBody = new WeakSet<Request>();

/**
 * `express.json` con límite de 10 kB (413) y `strict: false`, para que `null`
 * o `42` lleguen al schema y den 422 `field: "body"` en vez de 400 (architecture §4).
 * `verify` solo se ejecuta cuando llegan bytes, y así marca qué peticiones traen body.
 */
const parseJson = express.json({
  limit: '10kb',
  strict: false,
  verify: (req, _res, buf) => {
    if (buf.length > 0) withRawBody.add(req as Request);
  },
});

/**
 * body-parser 2.x convierte un body vacío en `{}` sin error, y no parsea una
 * petición sin body. Las dos cosas se tratan como JSON vacío → 400 (spec 3.1, CA-84).
 */
const rejectEmptyBody: RequestHandler = (req, _res, next) => {
  next(withRawBody.has(req) ? undefined : new MalformedJsonError());
};

/** Parseo del body JSON con detección explícita del body vacío. */
export const jsonBody: RequestHandler[] = [parseJson, rejectEmptyBody];

/**
 * Recepción de un POST, en el orden del paso 1 de la spec 3.1: 415 → 413/400.
 * Se monta en cada ruta POST, no de forma global, para que un POST a una ruta
 * inexistente dé 404 y uno a una ruta solo GET dé 405.
 */
export const receiveJson: RequestHandler[] = [requireJson, ...jsonBody];
