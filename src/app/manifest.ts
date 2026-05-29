import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Infostream — National financial infrastructure",
    short_name: "Infostream",
    description:
      "Infostream builds and runs Montenegro's core public-finance systems — tax, treasury and central-bank settlement.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d111c",
    theme_color: "#0d111c",
    lang: "en",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
