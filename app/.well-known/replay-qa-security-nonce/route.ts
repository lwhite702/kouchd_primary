export const dynamic = "force-static";

export const REPLAY_QA_SECURITY_NONCE =
  "loopqa-sec-3bAFRdzS2bM3tBVyOSeOy8MvDU8J2Z1BExfQyMLmljc";

export function GET() {
  return new Response(REPLAY_QA_SECURITY_NONCE, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
