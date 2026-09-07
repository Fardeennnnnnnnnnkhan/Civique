import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const manrope = Manrope({
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Civique - Civic Issue Reporting & Resolution Platform",
  description: "AI-Powered Civic Issue Reporting, Verification & Resolution Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased light`}>
      <body className="min-h-full flex flex-col bg-[#faf9f6] text-[#351008]">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#351008',
              color: '#F7F4EE',
              fontFamily: 'var(--font-manrope), sans-serif',
              fontSize: '13px',
              borderRadius: '12px',
              border: '1px solid #E9E1D8',
            },
            success: { iconTheme: { primary: '#12B76A', secondary: '#F7F4EE' } },
            error: { iconTheme: { primary: '#F04438', secondary: '#F7F4EE' } },
          }}
        />
      </body>
    </html>
  );
}
