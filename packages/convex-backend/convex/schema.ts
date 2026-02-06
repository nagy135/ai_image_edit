import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  imageChains: defineTable({
    name: v.string(),
    originalImagePath: v.string(),
    createdAt: v.number(),
  }),
  
  images: defineTable({
    chainId: v.id("imageChains"),
    imagePath: v.string(),
    prompt: v.string(),
    stepNumber: v.number(),
    createdAt: v.number(),
  }).index("by_chain", ["chainId", "stepNumber"]),
});
