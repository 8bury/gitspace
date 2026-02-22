import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitSpace — Your GitHub as a Solar System",
  description: "Explore your GitHub profile as an interactive 3D solar system.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
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
