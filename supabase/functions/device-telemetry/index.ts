import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { pushToUser, zoneOf } from "../_shared/push.ts";

const num = z.coerce.number().finite().optional();
const Body = z.object({
  mac: z.string().trim().min(1).max(32),
  token: z.string().trim().min(8).max(128).optional(),
  water_level: num, level: num,
  floats: z.array(z.union([z.number(), z.boolean()])).max(5).optional(),
  float_mask: num,
  tds: num, salinity: num, temperature: num, temp: num,
  motor: z.union([z.string(), z.number(), z.boolean()]).optional(),
  motor_status: z.string().optional(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const p = parsed.data;
  const token = req.headers.get("x-device-token") ?? p.token;
  if (!token) return json({ error: "Missing device token" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: device } = await db.from("devices")
    .select("id, user_id, device_name, alert_zone, is_online, last_water_level")
    .eq("mac_id", p.mac.toUpperCase()).eq("ingest_token", token).maybeSingle();
  if (!device) return json({ error: "Unknown device or wrong token" }, 401);

  // Level: floats take priority (5 probes, bottom → top)
  let level = p.water_level ?? p.level;
  let floats: boolean[] | null = null;
  if (p.floats) floats = p.floats.map((v) => v === true || Number(v) === 1);
  else if (p.float_mask !== undefined) floats = Array.from({ length: 5 }, (_, i) => ((p.float_mask! >> i) & 1) === 1);
  if (floats) level = (floats.lastIndexOf(true) + 1) * 20;
  level = Math.min(100, Math.max(0, level ?? Number(device.last_water_level ?? 0)));

  const motorOn = p.motor === "on" || p.motor === 1 || p.motor === true || p.motor === "1" || p.motor_status === "on";
  const zone = zoneOf(level);
  const name = device.device_name;

  await db.from("devices").update({
    last_water_level: level,
    last_tds: p.tds ?? p.salinity ?? undefined,
    last_temperature: p.temperature ?? p.temp ?? undefined,
    last_motor_status: p.motor !== undefined || p.motor_status ? (motorOn ? "on" : "off") : undefined,
    last_seen_at: new Date().toISOString(),
    is_online: true,
    alert_zone: zone,
  }).eq("id", device.id);

  const alerts: Promise<void>[] = [];
  if (!device.is_online) alerts.push(pushToUser(db, device.user_id, `${name} is back online`, "Live data is flowing again", `online-${device.id}`));
  if (device.alert_zone && device.alert_zone !== zone) {
    const lvl = Math.round(level);
    if (zone === "low") alerts.push(pushToUser(db, device.user_id, `${name}: Low water`, `Level dropped to ${lvl}%`, `level-${device.id}`));
    else if (zone === "high" && device.alert_zone !== "full") alerts.push(pushToUser(db, device.user_id, `${name}: 80% reached`, `Tank is almost full (${lvl}%)`, `level-${device.id}`));
    else if (zone === "full") alerts.push(pushToUser(db, device.user_id, `${name}: Tank full`, "Level reached 100% — stop the motor", `level-${device.id}`));
  }
  await Promise.all(alerts);

  return json({ ok: true, level, zone });
});
