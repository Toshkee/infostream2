import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Infostream · Software built to last",
    short_name: "Infostream",
    description:
      "Montenegrin software firm building systems that last: the country's tax, treasury, business and pension registers.",
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
