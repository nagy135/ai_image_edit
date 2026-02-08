import { AuthConfig } from "convex/server";

const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (domain) {
  console.log("[Auth Config] Using Clerk domain:", domain);
} else {
  console.error(
    "[Auth Config] Missing CLERK_JWT_ISSUER_DOMAIN environment variable. " +
    "Set it in your .env.local file with your Clerk Frontend API URL."
  );
}

export default {
  providers: [
    {
      domain: domain || "https://placeholder.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
