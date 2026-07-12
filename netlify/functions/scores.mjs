import { getStore } from "@netlify/blobs";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: HEADERS });
  const store = getStore({ name: "leaderboard", consistency: "strong" });

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch (e) {
      return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: HEADERS });
    }
    const name = String(body.name || "").replace(/[^\w \-]/g, "").trim().slice(0, 14);
    const score = Number(body.score);
    if (!name || !isFinite(score) || score < 0) {
      return new Response(JSON.stringify({ error: "bad input" }), { status: 400, headers: HEADERS });
    }
    const prev = Number(await store.get(name)) || 0;
    if (score > prev) await store.set(name, String(Math.round(score)));
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS });
  }

  const { blobs } = await store.list();
  const entries = await Promise.all(
    blobs.slice(0, 300).map(async (b) => [b.key, Number(await store.get(b.key)) || 0])
  );
  entries.sort((a, b) => b[1] - a[1]);
  return new Response(JSON.stringify(entries.slice(0, 50)), { headers: HEADERS });
};

export const config = { path: "/api/scores" };
