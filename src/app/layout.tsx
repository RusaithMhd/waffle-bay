import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { GlobalClickSound } from "@/components/GlobalClickSound";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Waffle Bay POS",
  description: "Enterprise POS and Management System",
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body className={inter.className}>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff' } }} />
        <ServiceWorkerRegister />
        <GlobalClickSound />
        {children}
      </body>
    </html>
  );
}
