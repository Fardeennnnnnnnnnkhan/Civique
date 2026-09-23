import type { Metadata } from "next";
import { Manrope, Orbitron } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Civique - Civic Issue Reporting, Verification & Resolution Platform",
  description: "AI-Powered Civic Issue Reporting, Verification & Resolution Platform for Municipalities",
  icons: {
    icon: "/civique.svg",
    shortcut: "/civique.svg",
    apple: "/civique.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${orbitron.variable} h-full antialiased light`}>
      <body className="min-h-full flex flex-col bg-white text-[#0f172a] font-sans selection:bg-[#143527] selection:text-white">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4500,
            className: 'civique-toast',
            style: {
              background: '#0f172a',
              color: '#ffffff',
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '13px',
              borderRadius: '16px',
              border: '1px solid #1e293b',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              maxWidth: 'min(360px, calc(100vw - 32px))',
              lineHeight: 1.35,
            },
            success: {
              iconTheme: { primary: '#143527', secondary: '#ffffff' },
              style: { border: '1px solid #143527', background: '#0e271c' },
            },
            error: {
              iconTheme: { primary: '#fb7185', secondary: '#ffffff' },
              style: { border: '1px solid #fb7185', background: '#35151b' },
            },
          }}
        />
      </body>
    </html>
  );
}
