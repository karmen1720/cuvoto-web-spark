import webpush from "npm:web-push@3.6.7";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

webpush.setVapidDetails(
  "mailto:support@cuvoto.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

export async function pushToUser(db: SupabaseClient, userId: string, title: string, body: string, tag: string) {
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  const payload = JSON.stringify({ title, body, tag, url: "/dashboard" });
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("push failed", code, (e as Error).message);
    }
  }));
}

export type Zone = "low" | "normal" | "high" | "full";
export const zoneOf = (l: number): Zone => (l >= 100 ? "full" : l >= 80 ? "high" : l <= 20 ? "low" : "normal");
