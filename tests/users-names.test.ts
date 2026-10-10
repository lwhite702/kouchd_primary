import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { formatEmailAsName, resolveMemberName } from "../convex/lib/names";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

describe("Member name resolution unit tests", () => {
  it("formats email addresses into human-readable display names", () => {
    expect(formatEmailAsName("lee.white@gmail.com")).toBe("Lee White");
    expect(formatEmailAsName("sarah_connor@example.com")).toBe("Sarah Connor");
    expect(formatEmailAsName("taylor-swift@example.com")).toBe("Taylor Swift");
    expect(formatEmailAsName("alex@example.com")).toBe("Alex");
    expect(formatEmailAsName(undefined)).toBeUndefined();
  });

  it("prioritizes candidate names in the correct hierarchy", () => {
    // 1. Explicit name from client takes precedence
    expect(
      resolveMemberName({
        explicitName: "Explicit Name",
        identityName: "Identity Name",
        email: "test@example.com",
      })
    ).toBe("Explicit Name");

    // 2. Identity claim from token
    expect(
      resolveMemberName({
        identityName: "Token Identity Name",
        email: "test@example.com",
      })
    ).toBe("Token Identity Name");

    // 3. Combined given and family names
    expect(
      resolveMemberName({
        givenName: "Jane",
        familyName: "Doe",
        email: "jdoe@example.com",
      })
    ).toBe("Jane Doe");

    // 4. Nickname / preferred username
    expect(
      resolveMemberName({
        preferredUsername: "coolcat",
        email: "test@example.com",
      })
    ).toBe("coolcat");

    // 5. Existing name is preserved if incoming is "Kouchd member" or empty
    expect(
      resolveMemberName({
        explicitName: "",
        identityName: "Kouchd member",
        existingName: "Original Set Name",
        email: "test@example.com",
      })
    ).toBe("Original Set Name");

    // 6. Email fallback
    expect(
      resolveMemberName({
        explicitName: "",
        identityName: "",
        email: "marcus.aurelius@rome.org",
      })
    ).toBe("Marcus Aurelius");

    // 7. Role fallback
    expect(
      resolveMemberName({
        role: "host",
      })
    ).toBe("Host");
    expect(
      resolveMemberName({
        role: "guest",
      })
    ).toBe("Guest");
  });
});

describe("Convex user sync and member name persistence", () => {
  it("syncs the current Clerk profile name into the Convex member projection", async () => {
    const t = convexTest(schema, modules);
    const actor = t.withIdentity({ subject: "user-123" });
    await actor.mutation(api.users.syncCurrent, {
      clerkName: "Lee White",
      email: "lee@wrelik.com",
    });

    const v = await actor.query(api.users.viewer, {});
    expect(v?.name).toBe("Lee White");
    expect(v?.email).toBe("lee@wrelik.com");
  });

  it("derives friendly name from email when Clerk token omits name claim", async () => {
    const t = convexTest(schema, modules);
    const actor = t.withIdentity({ subject: "user-456", email: "jordan.belfort@example.com" });
    await actor.mutation(api.users.syncCurrent, {});

    const v = await actor.query(api.users.viewer, {});
    expect(v?.name).toBe("Jordan Belfort");
  });

  it("does not preserve a stale Convex-only name during a later sync", async () => {
    const t = convexTest(schema, modules);
    const actor = t.withIdentity({ subject: "user-789", email: "casey.guest@example.com" });
    await actor.mutation(api.users.syncCurrent, { clerkName: "Stale Convex Name" });

    await actor.mutation(api.users.syncCurrent, {});
    const v = await actor.query(api.users.viewer, {});
    expect(v?.name).toBe("Casey Guest");
  });

  it("keeps reminder preference updates separate from profile names", async () => {
    const t = convexTest(schema, modules);
    const actor = t.withIdentity({ subject: "user-update", name: "Clerk Profile Name" });
    await actor.mutation(api.users.syncCurrent, { clerkName: "Clerk Profile Name" });

    await actor.mutation(api.users.updatePreferences, {
      notifyEmail: true,
      notifySms: false,
    });
    const v = await actor.query(api.users.viewer, {});
    expect(v?.name).toBe("Clerk Profile Name");
  });

  it("returns human-readable names for stay members in getBundle", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "host-1", name: "Alice Host" });
    await host.mutation(api.users.syncCurrent, {});

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      paymentOptions: [],
      terms: {
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        cadence: "weekly",
        paymentDayOfWeek: 1,
        rateCents: 25_000,
        earlyDiscountEnabled: false,
        earlyDiscountPercentage: 0,
        earlyDiscountDays: 0,
        lateFeeEnabled: false,
        lateFeeCents: 0,
        graceDays: 0,
        houseNotes: "Welcome!",
      },
    });

    const guest = t.withIdentity({ subject: "guest-1", email: "bob.guest@example.com" });
    await guest.mutation(api.users.syncCurrent, {});
    // Invite and join
    const tokenHash = "a".repeat(64);
    await host.mutation(api.invites.create, {
      stayId,
      tokenHash,
      expiresAt: Date.now() + 86_400_000,
    });
    await guest.mutation(api.invites.accept, { tokenHash });

    const bundle = await host.query(api.stays.getBundle, { stayId });
    expect(bundle.members.length).toBe(2);
    const hostMember = bundle.members.find((m) => m.membership.role === "host");
    const guestMember = bundle.members.find((m) => m.membership.role === "guest");

    expect(hostMember?.person.name).toBe("Alice Host");
    expect(guestMember?.person.name).toBe("Bob Guest");
    expect(guestMember?.person.name).not.toBe("Kouchd member");
  });
});
