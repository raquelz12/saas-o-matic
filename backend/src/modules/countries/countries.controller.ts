import type { RequestHandler } from 'express';
import type { CountriesService } from './countries.service.ts';

export interface CountriesController {
  /** `GET /countries` → 200 `{ items }`, sin paginación (spec 5.7). */
  list: RequestHandler;
}

export function createCountriesController(service: CountriesService): CountriesController {
  return {
    list: (_req, res) => {
      res.status(200).json({ items: service.listCountries() });
    },
  };
}
