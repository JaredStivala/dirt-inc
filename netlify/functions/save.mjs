import { getStore } from "@netlify/blobs";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: HEADERS });
  const code = (new URL(req.url).searchParams.get("code") || "")
    .replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);
  if (code.length < 6) {
    return new Response(JSON.stringify({ error: "bad code" }), { status: 400, headers: HEADERS });
  }
  const store = getStore({ name: "saves", consistency: "strong" });

  if (req.method === "POST") {
    const body = await req.text();
    if (!body || body.length > 200000) {
      return new Response(JSON.stringify({ error: "bad save" }), { status: 400, headers: HEADERS });
    }
    try { JSON.parse(body); } catch (e) {
      return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: HEADERS });
    }
    await store.set(code, body);
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS });
  }

  const data = await store.get(code);
  return new Response(data || "null", { headers: HEADERS });
};

export const config = { path: "/api/save" };
