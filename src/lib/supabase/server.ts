import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Server Component / Server Action / Route Handler client. Runs with the
// anon key + the caller's session cookie, so every query is still subject to
// RLS as that user — this is NOT a privilege-escalation helper.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render (no response to attach
            // cookies to). Safe to ignore: the proxy refreshes the session
            // on every request, so it stays in sync.
          }
        },
      },
    }
  );
}
