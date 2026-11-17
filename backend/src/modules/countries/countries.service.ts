import type { Country, TaxRatesRepository } from './countries.repository.ts';

export interface CountriesService {
  /** Catálogo de países soportados, ordenado por `code` (RF-17). */
  listCountries(): Country[];
}

export function createCountriesService(taxRatesRepo: TaxRatesRepository): CountriesService {
  return {
    listCountries: () => taxRatesRepo.listCountries(),
  };
}
