import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Client-side Supabase client
export const createClient = () => {
  return createClientComponentClient();
};

// Export a default instance for convenience
export const supabase = createClientComponentClient();
