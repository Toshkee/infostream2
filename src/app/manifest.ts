import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Infostream — National financial infrastructure",
    short_name: "Infostream",
    description:
      "Infostream builds and runs the systems behind Montenegro's public finance — tax, treasury, business and pension registers.",
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
