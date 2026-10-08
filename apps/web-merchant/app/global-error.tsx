"use client";

/**
 * Last-resort boundary when the root layout itself fails. No providers, no
 * design system — plain markup with inline styles so it always renders.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F8FAFC" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <h1 style={{ fontSize: 20, color: "#0F172A" }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#64748B" }}>
              Dhruto could not load this page. Your data is safe — try again.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: 8,
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid #0F5132",
                background: "#0F5132",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
