import { z } from 'zod';

/** Configuración del backend leída del entorno (RNF-02, RNF-03, spec 4.7 y 5.1). */
export interface Config {
  port: number;
  host: string;
  dbPath: string;
  corsOrigin: string;
}

const envSchema = z.object({
  PORT: z
    .string()
    .regex(/^[0-9]+$/, 'must be an integer')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .default(3000),
  HOST: z.string().min(1).default('127.0.0.1'),
  DB_PATH: z.string().min(1).default('./data/saas-o-matic.db'),
  CORS_ORIGIN: z.url({ protocol: /^https?$/ }).default('http://localhost:5173'),
});

/**
 * Valida el entorno y aplica los valores por defecto.
 * Lanza un `Error` que nombra cada variable no válida.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables: ${problems.join('; ')}`);
  }
  const { PORT, HOST, DB_PATH, CORS_ORIGIN } = result.data;
  return { port: PORT, host: HOST, dbPath: DB_PATH, corsOrigin: CORS_ORIGIN };
}
