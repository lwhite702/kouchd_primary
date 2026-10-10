const isManagedBuild = Boolean(process.env.CI || process.env.VERCEL_ENV);

if (!isManagedBuild) {
  console.log("Environment check skipped for local visual/demo mode.");
  process.exit(0);
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

console.log("Required deployment environment variables are present.");
