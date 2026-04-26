import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tether-ERP - Business Operations Platform",
    short_name: "Tether-ERP",
    description:
      "Streamline your business operations with Tether-ERP - the all-in-one platform for procurement, workflow automation, and team collaboration.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0c54e7",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "finance"],
    screenshots: [
      {
        src: "/images/screenshots/dashboard.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/images/screenshots/mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
  };
}
