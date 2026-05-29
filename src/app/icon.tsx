import { ImageResponse } from "next/og";

// Brand mark: the five-bar "signal" lockup on the inset-dark background.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 2,
          padding: 6,
          background: "#0d111c",
        }}
      >
        {[11, 17, 24, 20, 14].map((h, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 1,
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
