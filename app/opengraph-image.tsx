import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Amizoo - Amizone, but better";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      // Image boundary
      <div
        style={{
          background: "#FAFAFA",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#171717",
            padding: "20px 40px",
            borderRadius: "12px",
            marginBottom: "24px",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          }}
        >
          <span
            style={{
              fontSize: "84px",
              fontWeight: 900,
              color: "#FAFAFA",
              textTransform: "uppercase",
              letterSpacing: "-0.05em",
            }}
          >
            Amizoo
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "#171717",
            opacity: 0.8,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Amizone, but better.
        </div>

        {/* Footer info */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            fontSize: "20px",
            fontWeight: 800,
            color: "#DEB887",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
          }}
        >
          Track Attendance • View Schedule • Fast & Modern
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
