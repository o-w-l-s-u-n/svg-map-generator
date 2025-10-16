import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "Map Vector Forge Studio",
  description:
    "Select any OpenStreetMap viewport, fine-tune stroke weights, and export a precision SVG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className="antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
