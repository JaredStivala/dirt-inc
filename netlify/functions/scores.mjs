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

  // "joke" rows (score >= threshold) are refresh nags shown only to outdated clients
  const JOKE = 8.9e15;

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch (e) {
      return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: HEADERS });
    }
    const name = String(body.name || "").replace(/[^\w \-]/g, "").trim().slice(0, 14);
    const score = Number(body.score);
    const v = Number(body.v) || 0;
    if (!name || !isFinite(score) || score < 0) {
      return new Response(JSON.stringify({ error: "bad input" }), { status: 400, headers: HEADERS });
    }
    const prev = Number(await store.get(name)) || 0;
    if (score > prev && score < JOKE) await store.set(name, String(Math.round(score)));
    // fish updated her client: the nag rows have done their job, remove them
    if (v >= 2 && name.toLowerCase() === "fish") {
      const { blobs } = await store.list();
      await Promise.all(blobs.map(async (b) => {
        if ((Number(await store.get(b.key)) || 0) >= JOKE) await store.delete(b.key);
      }));
    }
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS });
  }

  const isNewClient = new URL(req.url).searchParams.has("v");
  const { blobs } = await store.list();
  let entries = await Promise.all(
    blobs.slice(0, 300).map(async (b) => [b.key, Number(await store.get(b.key)) || 0])
  );
  if (isNewClient) entries = entries.filter((e) => e[1] < JOKE);
  entries.sort((a, b) => b[1] - a[1]);
  return new Response(JSON.stringify(entries.slice(0, 50)), { headers: HEADERS });
};

export const config = { path: "/api/scores" };
