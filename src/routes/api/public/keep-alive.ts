import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/keep-alive")({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !publishableKey) {
          return Response.json(
            { ok: false, error: "Backend configuration is missing" },
            { status: 500 },
          );
        }

        const client = createClient<Database>(supabaseUrl, publishableKey, {
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        try {
          await client
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .limit(1);

          return Response.json({ ok: true, checkedAt: new Date().toISOString() });
        } catch {
          return Response.json(
            { ok: false, error: "Backend did not respond" },
            { status: 503 },
          );
        }
      },
    },
  },
});