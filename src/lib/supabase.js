import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const supabase = createClient(
  env.supabaseUrl || "https://placeholder.supabase.co",
  env.supabaseServiceRoleKey || "placeholder-service-role-key",
  {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  },
);
