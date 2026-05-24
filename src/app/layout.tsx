import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/layout/Sidebar"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "AI Growth Desk",
  description: "AI-powered marketing department dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-gray-50 font-sans antialiased">
        <Sidebar />
        <main className="ml-60 min-h-full">
          {children}
        </main>
      </body>
    </html>
  )
}
