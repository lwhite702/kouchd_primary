export const dynamic = "force-static";

/**
 * Replay QA site-ownership token. Public on purpose: Replay QA fetches this URL to confirm
 * we control kouchd.com, like a search-console verification file. It grants no access and
 * is not a secret, so it lives in code rather than an environment variable.
 */
export const REPLAY_QA_SECURITY_NONCE =
  "loopqa-sec-9TrCmqrdLQkZh1UIU1Qew_Ql6bEQ36iILYviGiS25V0";

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
