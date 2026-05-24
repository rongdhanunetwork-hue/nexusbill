import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NexusBill ISP | Billing Software",
  description: "Advanced ISP Billing and Management System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ backgroundColor: "#0f172a" }}>
      <body
        className={`${poppins.variable} font-sans bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 antialiased min-h-screen`}
        style={{ backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100vh" }}
      >
        {children}
      </body>
    </html>
  );
}
