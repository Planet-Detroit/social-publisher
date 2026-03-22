import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ToolNav from "@/components/ToolNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social Publisher — Planet Detroit",
  description: "Generate and publish social media posts for Planet Detroit articles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <ToolNav />
        {children}
      </body>
    </html>
  );
}
