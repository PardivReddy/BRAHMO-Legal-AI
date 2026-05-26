import { getAIStatus, getActiveProviderMetrics } from '@/lib/ai/orchestration/orchestrator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const startTime = Date.now();

  try {
    const [baseStatus, metrics] = await Promise.all([
      getAIStatus(),
      getActiveProviderMetrics(),
    ]);

    const response = {
      ...baseStatus,
      metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    return Response.json(response, {
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}