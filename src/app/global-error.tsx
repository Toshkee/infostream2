"use client";

// Last-resort boundary: catches errors in the root layout itself. It REPLACES
// the root layout, so it must render its own <html>/<body> and cannot rely on
// globals.css or fonts being loaded — all styling is inline.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 1.5rem",
          background: "#0d111c",
          color: "#fff",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#d63b3b",
          }}
        >
          error
        </div>
        <h1
          style={{
            marginTop: 20,
            fontSize: "clamp(1.8rem, 5vw, 3rem)",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            marginTop: 16,
            maxWidth: "28rem",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          A critical error interrupted the application.
          <br />
          <span style={{ color: "rgba(255,255,255,0.4)" }}>
            Kritična greška je prekinula aplikaciju.
          </span>
        </p>
        {error.digest && (
          <code
            style={{
              marginTop: 12,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {error.digest}
          </code>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 36,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            padding: "12px 20px",
            borderRadius: 9999,
            border: "none",
            cursor: "pointer",
            background: "#d63b3b",
            color: "#fff",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
