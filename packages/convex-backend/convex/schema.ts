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
    storageId: v.id("_storage"),
    prompt: v.string(),
    editType: v.optional(
      v.union(
        v.literal("original"),
        v.literal("center"),
        v.literal("make_old"),
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
  }).index("by_chain", ["chainId", "stepNumber"]),
});
