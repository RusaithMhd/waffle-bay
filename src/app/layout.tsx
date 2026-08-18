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

import { GlobalOrderReadyListener } from "@/components/GlobalOrderReadyListener";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body className={inter.className}>
        <Toaster 
          position="top-right" 
          toastOptions={{ 
            duration: 4000, 
            style: { 
              background: '#fff', 
              color: '#333', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              borderRadius: '16px',
              padding: '16px 24px',
              fontWeight: 600,
              fontSize: '15px'
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }} 
        />
        <ServiceWorkerRegister />
        <GlobalClickSound />
        <GlobalOrderReadyListener />
        {children}
      </body>
    </html>
  );
}
