import type { RequestHandler } from 'express';
import { UnsupportedMediaTypeError } from '../shared/errors.ts';

const JSON_MEDIA_TYPE = 'application/json';
const UTF8 = 'utf-8';

/**
 * Acepta `application/json` sin distinguir mayúsculas, sin parámetros o con
 * `charset=utf-8` (spec 5.1). No usa `req.is()`, que devuelve `null` cuando no
 * hay body y confundiría un body vacío (400) con un tipo no aceptado (415).
 */
export function isJsonContentType(header: string | undefined): boolean {
  if (header === undefined) return false;
  const [mediaType = '', ...params] = header.split(';').map((part) => part.trim().toLowerCase());
  if (mediaType !== JSON_MEDIA_TYPE) return false;
  return params.every((param) => {
    if (param === '') return true;
    const [name, value = ''] = param.split('=').map((part) => part.trim());
    return name === 'charset' && value.replace(/^"(.*)"$/, '$1') === UTF8;
  });
}

/**
 * Exige `Content-Type: application/json` antes de parsear el body: cualquier otro
 * tipo, o la falta de cabecera, responde 415 antes que el 400 o el 413 (spec 3.1, paso 1).
 */
export const requireJson: RequestHandler = (req, _res, next) => {
  if (isJsonContentType(req.headers['content-type'])) {
    next();
    return;
  }
  next(new UnsupportedMediaTypeError());
};
