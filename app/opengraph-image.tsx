import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Amizoo - Amizone, but better";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F7F7F2",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "#DEB887",
            opacity: 0.1,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "#171717",
            opacity: 0.05,
          }}
        />

        {/* Main Content Container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#171717",
            padding: "60px 80px",
            borderRadius: "40px",
            boxShadow: "0 30px 60px -12px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                background: "#DEB887",
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: "40px" }}>🎓</div>
            </div>
            <span
              style={{
                fontSize: "120px",
                fontWeight: 900,
                color: "#F7F7F2",
                textTransform: "uppercase",
                letterSpacing: "-0.06em",
              }}
            >
              Amizoo
            </span>
          </div>
          
          <div
            style={{
              fontSize: "42px",
              fontWeight: 700,
              color: "#DEB887",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginTop: "10px",
            }}
          >
            Amizone, but better.
          </div>
        </div>

        {/* Features list */}
        <div
          style={{
            marginTop: "60px",
            display: "flex",
            gap: "40px",
            fontSize: "24px",
            fontWeight: 800,
            color: "#171717",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            opacity: 0.6,
          }}
        >
          <span>Attendance</span>
          <span style={{ color: "#DEB887" }}>•</span>
          <span>Schedule</span>
          <span style={{ color: "#DEB887" }}>•</span>
          <span>Courses</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}