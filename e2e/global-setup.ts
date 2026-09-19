const BACKEND_URL = process.env.E2E_BACKEND ?? 'http://localhost:8050';

export default async function globalSetup(): Promise<void> {
  console.log('Checking backend readiness...');
  try {
    const res = await fetch(`${BACKEND_URL}/actuator/health`, {
      signal: AbortSignal.timeout(90_000),
    });
    console.log(`Backend ready (${res.status})`);
  } catch {
    console.warn('Backend warmup failed — first test may be slow');
  }
}
