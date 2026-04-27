"use client";

interface StructuredDataProps {
  data: Record<string, any>;
}

export const StructuredData = ({ data }: StructuredDataProps) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
};

// Predefined structured data schemas
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Tether-ERP",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://tether-erp.com",
  logo: `${process.env.NEXT_PUBLIC_APP_URL || "https://tether-erp.com"}/images/logo/logo-full.svg`,
  description:
    "Enterprise procurement management system for workflow automation and team collaboration",
  foundingDate: "2023",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "support@tether-erp.com",
  },
  sameAs: [
    "https://twitter.com/tethererp",
    "https://linkedin.com/company/tether-erp",
  ],
};

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Tether-ERP",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser",
  description:
    "Enterprise procurement management system for workflow automation and team collaboration",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://tether-erp.com",
  screenshot: `${process.env.NEXT_PUBLIC_APP_URL || "https://tether-erp.com"}/images/dashboard-screenshot.png`,
  author: {
    "@type": "Organization",
    name: "Tether-ERP",
  },
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Tether-ERP?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tether-ERP is an enterprise procurement management system that streamlines procurement, automates approval workflows, and enhances team collaboration for organizations.",
      },
    },
    {
      "@type": "Question",
      name: "How does Tether-ERP improve business efficiency?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tether-ERP automates manual procurement processes, provides real-time workflow approvals, enables smart vendor management, and offers advanced analytics to boost operational efficiency.",
      },
    },
    {
      "@type": "Question",
      name: "What security measures does Tether-ERP implement?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tether-ERP implements enterprise-level security with encryption, role-based access control, and comprehensive audit trails to keep your sensitive data secure.",
      },
    },
  ],
};

export const breadcrumbSchema = (
  items: Array<{ name: string; url: string }>,
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});
