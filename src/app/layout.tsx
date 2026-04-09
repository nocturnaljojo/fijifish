import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FijiFish — Catch to Customer",
  description:
    "Real-time seafood ordering from Fijian fishing villages to buyers in Australia.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#4fc3f7",
          colorBackground: "#0a0f1a",
        },
      }}
    >
      <html
        lang="en"
        className={`${plexMono.variable} ${jakarta.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-bg-primary text-text-primary font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
