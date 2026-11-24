import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output:
    process.env.NEXT_BUILD_STANDALONE === "true" ? "standalone" : undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack(config) {
    for (const rule of config.module?.rules ?? []) {
      if (rule && typeof rule === "object" && Array.isArray(rule.oneOf)) {
        for (const oneOfRule of rule.oneOf) {
          if (
            oneOfRule &&
            typeof oneOfRule === "object" &&
            oneOfRule[Symbol.for("__next_css_remove")] === true &&
            Array.isArray(oneOfRule.use) &&
            oneOfRule.use.some(
              (u: unknown) =>
                typeof u === "object" &&
                u !== null &&
                "loader" in u &&
                typeof (u as { loader?: unknown }).loader === "string" &&
                (u as { loader: string }).loader.includes("css-loader"),
            )
          ) {
            oneOfRule.use.push("@tailwindcss/turbopack");
          }
        }
      }
    }
    return config;
  },
};

export default nextConfig;
