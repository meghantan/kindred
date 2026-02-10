import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthContextProvider } from '@/context/AuthContext'; 
import { AuthGate } from '@/app/components/AuthGate'; 
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kindred",
  description: "Your Family Operating System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthContextProvider>
          <AuthGate>
            {children}
          </AuthGate>
        </AuthContextProvider>
      </body>
    </html>
  );
}