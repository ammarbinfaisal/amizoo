import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amizoo",
    short_name: "Amizoo",
    description: "A modern, faster, and more beautiful way to access your Amizone dashboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#171717",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}
