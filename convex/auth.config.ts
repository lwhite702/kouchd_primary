const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "https://clerk.kouchd.com",
      applicationID: "convex",
    },
    {
      domain: "https://magical-foxhound-7185.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
