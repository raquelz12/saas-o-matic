import type { RequestHandler } from 'express';
import { getValidated } from '../../http/validate.ts';
import type { PageParams } from '../../shared/pagination.ts';
import type {
  Simulation,
  SimulationQuote,
  SimulationRequest,
  SimulationsService,
} from './simulations.service.ts';

export interface SimulationsController {
  /** `POST /simulations` → 201 con la `Simulation` creada, sin `Location` (spec 5.8). */
  create: RequestHandler;
  /** `GET /customers/:id/simulations` → 200 con el `Page<Simulation>` (spec 5.6). */
  history: RequestHandler;
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
    history: (_req, res) => {
      const { params, query } = getValidated<unknown, PageParams, { id: number }>(res);
      const page = service.history({ customerId: params.id, ...query });
      res.json({ ...page, items: page.items.map(toSimulation) });
    },
    preview: (_req, res) => {
      const { body } = getValidated<SimulationRequest>(res);
      res.json(toPreview(service.preview(body)));
    },
  };
}
