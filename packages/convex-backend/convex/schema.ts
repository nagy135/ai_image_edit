import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    credits: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_token", ["tokenIdentifier"]),

  imageChains: defineTable({
    userId: v.string(),
    name: v.string(),
    originalStorageId: v.id("_storage"),
    createdAt: v.number(),
  }).index("by_user_created", ["userId", "createdAt"]),
  
  images: defineTable({
    chainId: v.id("imageChains"),
    parentImageId: v.optional(v.id("images")),
    storageId: v.id("_storage"),
    prompt: v.string(),
    editType: v.optional(
      v.union(
        v.literal("original"),
        v.literal("align_left"),
        v.literal("align_right"),
        v.literal("center"),
        v.literal("make_old"),
        v.literal("make_young"),
        v.literal("delete_background"),
        v.literal("add_background"),
        v.literal("remove_object"),
        v.literal("make_square"),
        v.literal("make_circular"),
        v.literal("duplicate_object"),
        v.literal("manual"),
        v.literal("zoom"),
        v.literal("brightness"),
        v.literal("unknown"),
      ),
    ),
    stepNumber: v.number(),
    zoomPercent: v.number(),
    brightnessPercent: v.number(),
    createdAt: v.number(),
  })
    .index("by_chain", ["chainId", "stepNumber"])
    .index("by_chain_parent", ["chainId", "parentImageId"]),
});
