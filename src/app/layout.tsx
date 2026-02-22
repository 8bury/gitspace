import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitSpace — Your GitHub as a Solar System",
  description: "Explore your GitHub profile as an interactive 3D solar system.",
  icons: {
    icon: [{ url: "/favicon.svg?v=2", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg?v=2"],
    apple: [{ url: "/favicon.svg?v=2" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
