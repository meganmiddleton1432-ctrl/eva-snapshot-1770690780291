import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 60000,
  max: 10,
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected pool error:', err.message);
});

export const db = drizzle(pool, { schema });

let dbHealthy = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000;

export async function checkDbHealth(): Promise<boolean> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) return dbHealthy;
  lastHealthCheck = now;
  try {
    await pool.query('SELECT 1');
    if (!dbHealthy) console.log('[DB] Connection restored');
    dbHealthy = true;
  } catch {
    if (dbHealthy) console.log('[DB] Connection lost');
    dbHealthy = false;
  }
  return dbHealthy;
}

export function isDbHealthy(): boolean {
  return dbHealthy;
}

export async function queryWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (!dbHealthy) {
        dbHealthy = true;
        console.log('[DB] Connection restored via retry');
      }
      return result;
    } catch (e: any) {
      const isTransient = e.message?.includes('Connection terminated') ||
        e.message?.includes('connection timeout') ||
        e.message?.includes('Client has encountered a connection error') ||
        e.code === '57P01' || e.code === '08006' || e.code === '08003';
      
      if (isTransient && i < retries - 1) {
        console.log(`[DB] Transient error, retry ${i + 1}/${retries} in ${delayMs}ms: ${e.message?.slice(0, 60)}`);
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error('queryWithRetry exhausted all retries');
}

(async () => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Initial DB check timed out (5s)')), 5000)
    );
    await Promise.race([pool.query('SELECT 1'), timeoutPromise]);
    dbHealthy = true;
    console.log('[DB] Initial connection successful');
  } catch (e: any) {
    console.log(`[DB] Initial connection failed: ${e.message?.slice(0, 80)} — will retry in background`);
  }
})();

setInterval(async () => {
  if (!dbHealthy) {
    try {
      await pool.query('SELECT 1');
      dbHealthy = true;
      console.log('[DB] Health check: connection restored!');
    } catch {
      // still down
    }
  }
}, 60000);
