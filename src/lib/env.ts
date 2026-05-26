export interface EnvCheck {
  name: string;
  configured: boolean;
  required: boolean;
  fallback?: string;
}

export function getServerEnvChecks(): EnvCheck[] {
  return [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      required: true,
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      required: true,
    },
    {
      name: 'GEMINI_API_KEY',
      configured: Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      required: true,
      fallback: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'GOOGLE_GENERATIVE_AI_API_KEY' : undefined,
    },
    {
      name: 'INDIAN_KANOON_API_KEY',
      configured: Boolean(process.env.INDIAN_KANOON_API_KEY),
      required: false,
      fallback: 'HTML scrape (Level 3) does not require API key',
    },
  ];
}

export function getMissingRequiredEnv(): EnvCheck[] {
  return getServerEnvChecks().filter((item) => item.required && !item.configured);
}
