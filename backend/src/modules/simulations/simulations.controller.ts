import type { RequestHandler } from 'express';
import { getValidated } from '../../http/validate.ts';
import type {
  Simulation,
  SimulationQuote,
  SimulationRequest,
  SimulationsService,
} from './simulations.service.ts';

export interface SimulationsController {
  /** `POST /simulations` → 201 con la `Simulation` creada, sin `Location` (spec 5.8). */
  create: RequestHandler;
  /** `POST /simulations/preview` → 200 con el `SimulationPreview` (spec 5.9). */
  preview: RequestHandler;
}

/** `SimulationPreview` de la spec 5.2: importes en céntimos de EUR (spec 5.1). */
function toPreview({ tiers, ...amounts }: SimulationQuote) {
  return { ...amounts, currency: 'EUR', tiers };
}

/** `Simulation` de la spec 5.2, con los campos en el orden del contrato. */
function toSimulation({ createdAt, ...quote }: Simulation) {
  const { id, ...preview } = quote;
  return { id, ...toPreview(preview), createdAt };
}

export function createSimulationsController(service: SimulationsService): SimulationsController {
  return {
    create: (_req, res) => {
      const { body } = getValidated<SimulationRequest>(res);
      res.status(201).json(toSimulation(service.save(body)));
    },
    preview: (_req, res) => {
      const { body } = getValidated<SimulationRequest>(res);
      res.json(toPreview(service.preview(body)));
    },
  };
}
