import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DbHandle = NodePgDatabase<typeof schema>;

const globalForPool = globalThis as unknown as {
  __fuelPgPool?: Pool;
  __fuelDbPromise?: Promise<DbHandle>;
};

async function resolveConnectionString(): Promise<string> {
  // Prefer Lambda Secrets Manager + RDS Proxy whenever both are present.
  // Next/OpenNext can inline `DATABASE_URL` from a developer `.env` into the
  // server bundle at build time; if we check DATABASE_URL first, prod Lambdas
  // keep hitting localhost:5433 even when Lambda env has no DATABASE_URL.
  const secretArn = process.env.DB_SECRET_ARN;
  const proxy = process.env.DB_PROXY_ENDPOINT;
  if (secretArn && proxy) {
    const { SecretsManagerClient, GetSecretValueCommand } =
      await import("@aws-sdk/client-secrets-manager");
    const sm = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const res = await sm.send(
      new GetSecretValueCommand({ SecretId: secretArn }),
    );
    if (!res.SecretString) throw new Error("DB secret has no SecretString");
    const s = JSON.parse(res.SecretString) as {
      username: string;
      password: string;
      dbname?: string;
    };
    const dbname = s.dbname ?? "fuel";
    return `postgres://${encodeURIComponent(s.username)}:${encodeURIComponent(s.password)}@${proxy}:5432/${dbname}?sslmode=require`;
  }

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  throw new Error(
    "Set DATABASE_URL locally, or DB_SECRET_ARN + DB_PROXY_ENDPOINT in Lambda",
  );
}

async function ensurePool(): Promise<Pool> {
  if (globalForPool.__fuelPgPool) return globalForPool.__fuelPgPool;
  const connectionString = await resolveConnectionString();
  const ssl = connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false;
  const pool = new Pool({ connectionString, ssl });
  globalForPool.__fuelPgPool = pool;
  return pool;
}

export async function getPool(): Promise<Pool> {
  return ensurePool();
}

export async function getDb(): Promise<DbHandle> {
  const pool = await ensurePool();
  return drizzle(pool, { schema });
}

export { schema };
