import { REPLAY_QA_SECURITY_NONCE } from "@/lib/replay-qa-nonce";

export const dynamic = "force-static";

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
