import { ImageResponse } from "next/og";

// Apple touch icon — same five-bar mark, scaled up with breathing room.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 11,
          padding: 44,
          background: "#0d111c",
        }}
      >
        {[60, 92, 130, 108, 76].map((h, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: h,
              borderRadius: 5,
              display: "flex",
              background: "#48b8b1",
            }}
          />
        ))}
      </div>
    ),
    { ...size }
  );
}
