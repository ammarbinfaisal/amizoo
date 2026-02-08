import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://amizoo.vercel.app"),
  title: {
    default: "Amizoo - Amizone, but better",
    template: "%s | Amizoo",
  },
  description: "A modern, faster, and more beautiful way to access your Amizone dashboard. Track attendance, view schedules, and manage your academic life with ease.",
  keywords: ["Amizone", "Amity University", "Attendance Tracker", "Student Dashboard", "Academic Management"],
  authors: [{ name: "Amizoo Team" }],
  creator: "Amizoo",
  publisher: "Amizoo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://amizoo.vercel.app",
    siteName: "Amizoo",
    title: "Amizoo - Amizone, but better",
    description: "A modern, faster, and more beautiful way to access your Amizone dashboard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Amizoo - Amizone, but better",
    description: "A modern, faster, and more beautiful way to access your Amizone dashboard.",
    creator: "@amizoo",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Amizoo",
    "operatingSystem": "Web",
    "applicationCategory": "EducationalApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "description": "A modern, faster, and more beautiful way to access your Amizone dashboard.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "ratingCount": "1",
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
