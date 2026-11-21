import * as BunnySDK from "npm:@bunny.net/edgescript-sdk@0.12.1";
import process from "node:process";

/**
 * Proxy in front of the last.fm API, deployed as a Bunny standalone edge script on api.lastfmstats.com.
 * It keeps the API key server side (the LASTFM_KEY secret on the script) and only forwards the calls
 * the apps actually make. Requests keep the shape of the last.fm API: GET /2.0/?method=...&user=...
 */

const UPSTREAM = "https://ws.audioscrobbler.com/2.0/";

const ALLOWED_ORIGINS = new Set([
  "https://lastfmstats.com",
  "https://www.lastfmstats.com",
  "https://spotifystats.app",
  "https://www.spotifystats.app",
  "http://localhost:4200",
  "http://localhost:4201",
]);

/** Allowed methods (lowercase) with the parameters that are forwarded for each of them. */
const METHODS: Record<string, string[]> = {
  "user.getrecenttracks": ["user", "from", "to", "limit", "page"],
  "user.getinfo": ["user"],
  "artist.getinfo": ["artist", "autocorrect"],
};

const MAX_PAGE_SIZE = 1000;

function respond(status: number, body: BodyInit | null, origin: string | null, contentType = "application/json"): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  if (body !== null) {
    headers.set("Content-Type", contentType);
  }
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return new Response(body, {status, headers});
}

function error(status: number, message: string, origin: string | null): Response {
  return respond(status, JSON.stringify({message}), origin);
}

BunnySDK.net.http.serve(async (request: Request): Promise<Response> => {
  const requestOrigin = request.headers.get("Origin");
  const origin = requestOrigin && ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : null;
  if (!origin) {
    return error(403, "Origin not allowed", null);
  }

  if (request.method === "OPTIONS") {
    const preflight = respond(204, null, origin);
    preflight.headers.set("Access-Control-Allow-Methods", "GET");
    preflight.headers.set("Access-Control-Max-Age", "86400");
    return preflight;
  }
  if (request.method !== "GET") {
    return error(405, "Method not allowed", origin);
  }

  const url = new URL(request.url);
  if (url.pathname !== "/2.0/" && url.pathname !== "/2.0") {
    return error(404, "Not found", origin);
  }

  const method = url.searchParams.get("method") ?? "";
  const allowedParams = METHODS[method.toLowerCase()];
  if (!allowedParams) {
    return error(400, "Unsupported method", origin);
  }

  const limit = url.searchParams.get("limit");
  if (limit !== null && !(Number(limit) >= 1 && Number(limit) <= MAX_PAGE_SIZE)) {
    return error(400, "Invalid limit", origin);
  }

  const key = process.env.LASTFM_KEY;
  if (!key) {
    return error(500, "Proxy is not configured", origin);
  }

  const upstream = new URL(UPSTREAM);
  upstream.searchParams.set("method", method);
  for (const name of allowedParams) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      upstream.searchParams.set(name, value);
    }
  }
  upstream.searchParams.set("api_key", key);
  upstream.searchParams.set("format", "json");

  try {
    // Status and body are passed through untouched: the apps rely on last.fm's own error responses.
    const response = await fetch(upstream, {headers: {"Accept": "application/json"}});
    return respond(response.status, response.body, origin, response.headers.get("Content-Type") ?? "application/json");
  } catch {
    return error(502, "Could not reach last.fm", origin);
  }
});
