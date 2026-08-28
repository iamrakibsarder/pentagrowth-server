import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { HttpError } from "./http.js";

let client;

export function getSupabase() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new HttpError(503, "Supabase is not configured correctly.");
  }

  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}

export const supabase = new Proxy(
  {},
  {
    get(_target, property) {
      return getSupabase()[property];
    },
  },
);
