import type { RequestHandler } from 'express';
import { getValidated } from '../../http/validate.ts';
import type {
  SimulationQuote,
  SimulationRequest,
  SimulationsService,
} from './simulations.service.ts';

export interface SimulationsController {
  /** `POST /simulations/preview` → 200 con el `SimulationPreview` (spec 5.9). */
  preview: RequestHandler;
}

/** `SimulationPreview` de la spec 5.2: importes en céntimos de EUR (spec 5.1). */
function toPreview({ tiers, ...amounts }: SimulationQuote) {
  return { ...amounts, currency: 'EUR', tiers };
}

export function createSimulationsController(service: SimulationsService): SimulationsController {
  return {
    preview: (_req, res) => {
      const { body } = getValidated<SimulationRequest>(res);
      res.json(toPreview(service.preview(body)));
    },
  };
}
