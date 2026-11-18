import type { Plan } from '../../api/types.ts';

// Planes del formulario de alta (RF-37): son un enum del frontend, no vienen de la API.
export const PLANS: readonly Plan[] = ['STARTER', 'BUSINESS', 'ENTERPRISE'];

export const PLAN_LABELS: Record<Plan, string> = {
  STARTER: 'Starter',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
};
