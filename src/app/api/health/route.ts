import { getMissingRequiredEnv } from '@/lib/env';
import { getAIStatus, getActiveProviderMetrics } from '@/lib/ai/orchestration/orchestrator';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TIMEOUTS = {
  global: 0,
  provider: 0,
  retryBuffer: 0,
};

interface HealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  systems: {
    database: {
      connected: boolean;
      tables: string[];
    };
    aiOrchestration: ReturnType<typeof getAIStatus>;
    missingEnvVars: ReturnType<typeof getMissingRequiredEnv>;
  };
  timeouts: {
    total: number;
    byProvider: Record<string, number>;
    config: {
      global: number;
      provider: number;
      retryBuffer: number;
    };
  };
}

export async function GET(): Promise<Response> {
  const startTime = Date.now();
  
  try {
    const [dbStatus, aiStatus, missingEnv] = await Promise.all([
      checkDatabaseStatus(),
      getAIStatus(),
      getMissingRequiredEnv(),
    ]);
    const metrics = getActiveProviderMetrics();

    const response: HealthResponse = {
      status: missingEnv.length > 0 ? 'unhealthy' : 
             aiStatus.availableProviders.length < aiStatus.configuredProviders.length ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      systems: {
        database: dbStatus,
        aiOrchestration: aiStatus,
        missingEnvVars: missingEnv,
      },
      timeouts: {
        total: Object.values(metrics).reduce((sum, m) => sum + (m.timeouts?.total || 0), 0),
        byProvider: Object.fromEntries(
          Object.entries(metrics)
            .filter(([, m]) => m.timeouts?.perProvider)
            .map(([name, m]) => [name, (m.timeouts?.total ?? 0)])
        ) as Record<string, number>,
        config: DEFAULT_TIMEOUTS
      }
    };

    return Response.json(response, {
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch {
    return Response.json({
      status: 'unhealthy',
      error: 'Health check failed',
      details: 'Unknown error',
    }, { status: 500 });
  }
}

async function checkDatabaseStatus() {
  try {
    const { data: tables } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    return {
      connected: true,
      tables: tables?.map(t => t.tablename) ?? [],
    };
  } catch {
    return {
      connected: false,
      tables: [],
    };
  }
}
