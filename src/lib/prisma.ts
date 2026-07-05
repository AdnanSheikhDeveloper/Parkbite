import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we are running the seed script or a migration command
const isSeedingOrCli = 
  process.env.npm_lifecycle_event === 'seed' || 
  process.argv.some(arg => arg.includes('seed') || arg.includes('prisma'));

// Prioritize DATABASE_URL (pooled connection) for live application runtime to prevent connection exhaustion.
// Prioritize DIRECT_URL (direct connection) for seeding to prevent transaction pooler ECONNRESET limits.
const connectionString = isSeedingOrCli
  ? (process.env.DIRECT_URL || process.env.DATABASE_URL)
  : (process.env.DATABASE_URL || process.env.DIRECT_URL);

if (!connectionString) {
  console.warn('DATABASE_URL or DIRECT_URL environment variable is missing.');
}

const pool = new Pool({ 
  connectionString,
  max: isSeedingOrCli ? 2 : 10, // Keep connection count low for serverless functions, and extra low for CLI script
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
