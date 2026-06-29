export async function register() { if (process.env.NEXT_RUNTIME === 'nodejs') { const { startExpirationChecker } = await import('@/lib/sync'); startExpirationChecker(); } }
