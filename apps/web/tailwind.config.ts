import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--app-bg-0)",
        foreground: "var(--app-ink)",
        card: "var(--app-card)",
        "card-foreground": "var(--app-ink)",
        popover: "var(--app-popover)",
        "popover-foreground": "var(--app-ink)",
        primary: "var(--app-accent)",
        "primary-foreground": "var(--app-primary-foreground)",
        secondary: "var(--app-secondary)",
        "secondary-foreground": "var(--app-secondary-foreground)",
        muted: "var(--app-muted-bg)",
        "muted-foreground": "var(--app-muted)",
        accent: "var(--app-accent-2)",
        "accent-foreground": "var(--app-accent-foreground)",
        destructive: "var(--app-warn)",
        "destructive-foreground": "var(--app-destructive-foreground)",
        border: "var(--app-border)",
        input: "var(--app-border)",
        ring: "var(--app-accent)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;

export default config;
