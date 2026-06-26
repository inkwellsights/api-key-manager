function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const env = {
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_SECRET_KEY: required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  SUPABASE_PUBLISHABLE_KEY: required("SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY),
  API_KEY_ENC_SECRET: required("API_KEY_ENC_SECRET", process.env.API_KEY_ENC_SECRET),
};
