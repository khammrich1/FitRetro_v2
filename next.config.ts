import type { NextConfig } from "next";
import { execSync } from "node:child_process";

/** Short commit SHA of the build, shown as a discreet version marker in the footer — lets you
 * visually confirm a deploy actually landed without needing a manual version bump. Falls back to
 * "dev" outside a git checkout (e.g. some sandboxed build environments). */
function getGitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_SHA: getGitSha(),
  },
  experimental: {
    serverActions: {
      // Default is 1MB; raised to fit meal photos (capped at 8MB in the action itself).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
