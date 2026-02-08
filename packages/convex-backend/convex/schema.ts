import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  imageChains: defineTable({
    name: v.string(),
    originalStorageId: v.id("_storage"),
    createdAt: v.number(),
  }),
  
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
        v.literal("delete_background"),
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
