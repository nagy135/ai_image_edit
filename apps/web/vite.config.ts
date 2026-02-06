import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "image-upload-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === "/api/upload-image" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });
            req.on("end", () => {
              try {
                const data = JSON.parse(body);
                const { imageData, filename } = data;

                // imageData is expected to be a base64 data URL
                const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
                if (!base64Match) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: "Invalid image data" }));
                  return;
                }

                const base64Data = base64Match[1];
                const imageBuffer = Buffer.from(base64Data, "base64");

                // Generate unique filename if not provided
                const finalFilename = filename || `${randomUUID()}.png`;
                const imagesDir = path.join(process.cwd(), "public", "images");
                const filePath = path.join(imagesDir, finalFilename);

                // Ensure directory exists
                if (!fs.existsSync(imagesDir)) {
                  fs.mkdirSync(imagesDir, { recursive: true });
                }

                // Write file
                fs.writeFileSync(filePath, imageBuffer);

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ path: `/images/${finalFilename}` }));
              } catch (error) {
                console.error("Error uploading image:", error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Failed to upload image" }));
              }
            });
          } else {
            next();
          }
        });
      },
    },
  ],
});
