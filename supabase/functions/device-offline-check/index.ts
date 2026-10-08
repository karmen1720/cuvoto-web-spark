import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { pushToUser } from "../_shared/push.ts";

const OFFLINE_AFTER_MIN = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cutoff = new Date(Date.now() - OFFLINE_AFTER_MIN * 60_000).toISOString();

  const { data: stale, error } = await db.from("devices")
    .update({ is_online: false })
    .eq("is_online", true).lt("last_seen_at", cutoff)
    .select("id, user_id, device_name");
  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  await Promise.all((stale ?? []).map((d) =>
    pushToUser(db, d.user_id, `${d.device_name} went offline`, `No data for over ${OFFLINE_AFTER_MIN} minutes. Check power or Wi-Fi.`, `online-${d.id}`)
  ));
  return new Response(JSON.stringify({ offline: stale?.length ?? 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
