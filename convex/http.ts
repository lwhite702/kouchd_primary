import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  normalizeRevenueCatEvent,
  parseRevenueCatProductIdAllowlist,
} from "../lib/domain/revenuecatWebhook";

const MAX_WEBHOOK_BYTES = 64 * 1024;

type BoundedBody = { ok: true; text: string } | { ok: false; status: 400 | 413 };

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function constantTimeEquals(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let i = 0; i < leftBytes.length; i += 1) difference |= leftBytes[i] ^ rightBytes[i];
  return difference === 0;
}

async function readBoundedBody(request: Request): Promise<BoundedBody> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) return { ok: false, status: 400 };
    if (Number(declaredLength) > MAX_WEBHOOK_BYTES) return { ok: false, status: 413 };
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400 };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_WEBHOOK_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(body) };
  } catch {
    return { ok: false, status: 400 };
  }
}

const http = httpRouter();

http.route({
  path: "/revenuecat/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedAuthorization = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
    const expectedAppId = process.env.REVENUECAT_APP_ID;
    if (!expectedAuthorization || !expectedAppId) {
      return jsonResponse(503, { error: "webhook_not_configured" });
    }

    const authorization = request.headers.get("authorization");
    if (!authorization || !constantTimeEquals(authorization, expectedAuthorization)) {
      return jsonResponse(401, { error: "unauthorized" });
    }

    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") return jsonResponse(415, { error: "unsupported_media_type" });

    const body = await readBoundedBody(request);
    if (!body.ok) return jsonResponse(body.status, { error: body.status === 413 ? "payload_too_large" : "invalid_payload" });

    let payload: unknown;
    try {
      payload = JSON.parse(body.text);
    } catch {
      return jsonResponse(400, { error: "invalid_payload" });
    }

    const parsed = normalizeRevenueCatEvent(
      payload,
      expectedAppId,
      parseRevenueCatProductIdAllowlist(process.env.REVENUECAT_FOUNDING_HOST_PRODUCT_IDS),
    );
    if (parsed.kind === "invalid") return jsonResponse(400, { error: "invalid_payload" });
    if (parsed.kind === "wrong_app") return jsonResponse(400, { error: "unexpected_app" });
    if (parsed.kind === "ignored") return jsonResponse(200, { received: true, ignored: true });

    const result = await ctx.runMutation(internal.subscriptions.ingestRevenueCatEvent, parsed.event);
    return jsonResponse(200, { received: true, result });
  }),
});

export default http;
