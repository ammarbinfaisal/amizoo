import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amizoo",
    short_name: "Amizoo",
    description: "A modern, faster, and more beautiful way to access your Amizone dashboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Attendance",
        url: "/dashboard/attendance",
        icons: [{ src: "/icon", sizes: "512x512" }],
      },
      {
        name: "Schedule",
        url: "/dashboard/schedule",
        icons: [{ src: "/icon", sizes: "512x512" }],
      },
    ],
  };
}
