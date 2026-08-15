import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Civique - Civic Issue Reporting & Resolution Platform",
  description: "AI-Powered Civic Issue Reporting, Verification & Resolution Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased light`}>
      <body className="min-h-full flex flex-col bg-[#faf9f6] text-[#351008]">
        {children}
      </body>
    </html>
  );
}
