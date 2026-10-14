const isManagedBuild = Boolean(process.env.CI || process.env.VERCEL_ENV);

if (!isManagedBuild) {
  console.log("Environment check skipped for local visual/demo mode.");
  process.exit(0);
}

// Security: Auth bypass flags must never be exposed to the client
if (process.env.NEXT_PUBLIC_DISABLE_AUTH) {
  console.error(
    "Security violation: NEXT_PUBLIC_DISABLE_AUTH is present. Client-exposed auth bypasses are strictly forbidden."
  );
  process.exit(1);
}

// Security: Auth bypass flags must never be active in production
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production";

const forbiddenBypassVars = ["AUTH_BYPASS_ENABLED", "BYPASS_AUTH"];
if (isProduction) {
  const activeBypass = forbiddenBypassVars.filter(
    (name) => process.env[name] === "true" || process.env[name] === "1"
  );
  if (activeBypass.length > 0) {
    console.error(
      `Security violation: Auth bypass flags (${activeBypass.join(", ")}) must never be enabled in production.`
    );
    process.exit(1);
  }
}

const required = [
  "NEXT_PUBLIC_CONVEX_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_JWT_ISSUER_DOMAIN",
];

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Required deployment environment variables are present and security guards passed.");

