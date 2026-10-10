import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kouchd",
    short_name: "Kouchd",
    description: "Clear contributions, chores, and expectations for shared stays.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f0e8",
    theme_color: "#184f3a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
