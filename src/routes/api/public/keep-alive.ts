import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/keep-alive")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
          return Response.json(
            { ok: false, error: "Unauthorized" },
            { status: 401, headers: { "Cache-Control": "no-store" } },
          );
        }

        if (!supabaseUrl || !serviceRoleKey) {
          return Response.json(
            { ok: false, error: "Backend configuration is missing" },
            { status: 500, headers: { "Cache-Control": "no-store" } },
          );
        }

        const client = createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        try {
          const { error } = await client
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .limit(1);

          if (error) throw error;

          return Response.json(
            { ok: true, checkedAt: new Date().toISOString() },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch {
          return Response.json(
            { ok: false, error: "Backend did not respond" },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
