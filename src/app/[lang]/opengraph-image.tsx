import { ImageResponse } from "next/og";
import { getDictionary, hasLocale } from "@/lib/dictionaries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Infostream · Software built to last";

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(hasLocale(lang) ? lang : "eng");
  const tagline = dict.meta.ogTagline;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0d111c",
          backgroundImage:
            "radial-gradient(ellipse 90% 80% at 80% 10%, rgba(72,184,177,0.16), transparent 60%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Lockup row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            {[34, 54, 78, 64, 44].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 9,
                  height: h,
                  borderRadius: 2,
                  display: "flex",
                  background: "#48b8b1",
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "#d63b3b",
              display: "flex",
              lineHeight: 1,
            }}
          >
            infostream
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 900,
              display: "flex",
            }}
          >
            {tagline}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.55)",
              fontFamily: "monospace",
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 9,
                display: "flex",
                background: "#7ce38b",
              }}
            />
            ISO 27001 · 20+ years · Podgorica, Montenegro
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
