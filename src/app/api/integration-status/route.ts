import { getServerEnvChecks } from '@/lib/env';
import { getGeminiStatus } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const TABLES = ['legal_templates', 'knowledge_nodes', 'section_mappings', 'matters'] as const;

interface TableStatus {
  table: (typeof TABLES)[number];
  ok: boolean;
  count: number | null;
  error?: string;
}

export async function GET(): Promise<Response> {
  const env = getServerEnvChecks();
  const tables = await Promise.all(TABLES.map(checkTable));

  return Response.json({
    env,
    gemini: getGeminiStatus(),
    supabase: {
      configured: env
        .filter((item) => item.name.startsWith('NEXT_PUBLIC_SUPABASE'))
        .every((item) => item.configured),
      tables,
    },
  });
}

async function checkTable(table: (typeof TABLES)[number]): Promise<TableStatus> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true });

    if (error) {
      return { table, ok: false, count: null, error: error.message };
    }

    return { table, ok: true, count: count ?? 0 };
  } catch (error: unknown) {
    return {
      table,
      ok: false,
      count: null,
      error: error instanceof Error ? error.message : 'Unable to check table.',
    };
  }
}
