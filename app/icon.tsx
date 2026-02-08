import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // Image boundary
      <div
        style={{
          fontSize: 24,
          background: "#171717",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FAFAFA",
          borderRadius: "8px",
          fontWeight: 900,
        }}
      >
        A
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
