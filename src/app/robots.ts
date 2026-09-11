import type { MetadataRoute } from "next";

const SITE_URL = "https://fitretro.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing behind these routes is meant to be indexed — all require a session, and /ops
      // additionally 404s for anyone who isn't the owner.
      disallow: ["/today", "/settings", "/pantry", "/meal-prep", "/wake-up", "/ops", "/calendar"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
