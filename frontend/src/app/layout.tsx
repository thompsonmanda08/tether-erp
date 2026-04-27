import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Tether-ERP - Enterprise Procurement Management System",
    template: "%s | Tether-ERP",
  },
  description:
    "Transform your procurement operations with Tether-ERP. Streamline purchase orders, automate workflows, manage vendors, and optimize inventory. Trusted by leading organizations worldwide.",
  keywords: [
    "ERP system",
    "procurement software",
    "purchase order management",
    "vendor management",
    "inventory control",
    "procurement automation",
    "enterprise resource planning",
    "supply chain management",
    "procurement platform",
    "business operations",
    "workflow automation",
    "requisition management",
    "spend analysis",
    "procurement analytics",
    "enterprise procurement",
  ],
  authors: [{ name: "Tether-ERP Team" }],
  creator: "Tether-ERP",
  publisher: "Tether-ERP",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://tether-erp.com",
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Tether-ERP - Enterprise Procurement Management System",
    description:
      "Transform your procurement operations with Tether-ERP. Streamline purchase orders, automate workflows, manage vendors, and optimize inventory.",
    siteName: "Tether-ERP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tether-ERP - Enterprise Procurement Management System",
    description:
      "Transform your procurement operations with Tether-ERP. Streamline purchase orders, automate workflows, manage vendors, and optimize inventory.",
    creator: "@tethererp",
    site: "@tethererp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Tether-ERP" />
        <meta name="application-name" content="Tether-ERP" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0c54e7" />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />

        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />

        {/* Font Awesome with optimized loading */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />

        {/* Structured Data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Tether-ERP",
              url: process.env.NEXT_PUBLIC_APP_URL || "https://tether-erp.com",
              logo: `${process.env.NEXT_PUBLIC_APP_URL || "https://tether-erp.com"}/icon?<generated>`,
              description:
                "Enterprise Resource Planning system for procurement management, workflow automation, and supply chain optimization",
              foundingDate: "2026",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "support@tether-erp.com",
              },
              sameAs: [
                "https://twitter.com/tethererp",
                "https://linkedin.com/company/tether-erp",
              ],
            }),
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
