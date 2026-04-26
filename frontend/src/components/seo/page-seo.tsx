"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface PageSEOProps {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
}

/**
 * Client-side SEO component for dynamic meta tag updates
 * Use this for client components that need to update SEO dynamically
 */
export function PageSEO({
  title,
  description,
  image,
  noindex = false,
}: PageSEOProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = `${title} | Tether-ERP`;
    }

    // Update meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", description);
    }

    // Update OG tags
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement("meta");
        ogTitle.setAttribute("property", "og:title");
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute("content", title);
    }

    if (description) {
      let ogDescription = document.querySelector(
        'meta[property="og:description"]',
      );
      if (!ogDescription) {
        ogDescription = document.createElement("meta");
        ogDescription.setAttribute("property", "og:description");
        document.head.appendChild(ogDescription);
      }
      ogDescription.setAttribute("content", description);
    }

    if (image) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement("meta");
        ogImage.setAttribute("property", "og:image");
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute("content", image);
    }

    // Update robots meta
    if (noindex) {
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.setAttribute("name", "robots");
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute("content", "noindex, nofollow");
    }

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tether-erp.com";
    canonical.setAttribute("href", `${baseUrl}${pathname}`);
  }, [title, description, image, noindex, pathname]);

  return null;
}
