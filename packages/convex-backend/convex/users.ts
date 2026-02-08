import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertCurrentUser = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For self-hosted Convex, we accept clerkUserId from the client
    // In production with Convex Cloud, this would validate ctx.auth.getUserIdentity()
    if (!args.clerkUserId) {
      throw new Error("Clerk user ID required");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        email: args.email ?? existing.email,
        imageUrl: args.imageUrl ?? existing.imageUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      tokenIdentifier: args.clerkUserId, // For compatibility
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      credits: 10,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getCurrentUser = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.clerkUserId) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();
  },
});

export const decrementCredits = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.credits <= 0) {
      throw new Error("Insufficient credits for this operation");
    }

    await ctx.db.patch(user._id, {
      credits: user.credits - 1,
    });

    return user.credits - 1;
  },
});
