import { searchIndianKanoon } from '@/lib/indiankanoon';

export const runtime = 'nodejs';

const QUERY = 'anticipatory bail';

export async function GET(): Promise<Response> {
  try {
    const search = await searchIndianKanoon(QUERY);

    return Response.json({
      success: true,
      query: search.query,
      fromCache: search.fromCache,
      results: search.results,
    });
  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    return Response.json(
      {
        success: false,
        query: QUERY,
        error: isTimeout ? 'Indian Kanoon request timed out.' : 'Indian Kanoon request failed.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
