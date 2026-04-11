import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import CartPortal from "@/components/CartPortal";
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
          colorBackground: "#0d1520",
          colorInputBackground: "#111a2e",
          colorInputText: "#e0e6ed",
          colorTextOnPrimaryBackground: "#0a0f1a",
          colorText: "#e0e6ed",
          colorTextSecondary: "#90a4ae",
          borderRadius: "0.5rem",
        },
        elements: {
          // Cards + forms (sign-in, sign-up, manage account)
          card: { backgroundColor: "#0d1520", border: "1px solid #1e2a3a", boxShadow: "none" },
          formFieldInput: { backgroundColor: "#111a2e", borderColor: "#2a3a4a", color: "#e0e6ed" },
          formFieldLabel: { color: "#90a4ae" },
          formButtonPrimary: { backgroundColor: "#4fc3f7", color: "#0a0f1a", fontWeight: "600" },
          footerActionLink: { color: "#4fc3f7" },
          headerTitle: { color: "#e0e6ed" },
          headerSubtitle: { color: "#90a4ae" },
          socialButtonsBlockButton: { backgroundColor: "#111a2e", border: "1px solid #1e2a3a", color: "#e0e6ed" },
          dividerLine: { backgroundColor: "#1e2a3a" },
          dividerText: { color: "#546e7a" },
          identityPreviewText: { color: "#e0e6ed" },
          identityPreviewEditButton: { color: "#4fc3f7" },
          // UserButton dropdown popover
          userButtonPopoverCard: { backgroundColor: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" },
          userButtonPopoverActionButton: { color: "#e0e6ed" },
          userButtonPopoverActionButtonText: { color: "#e0e6ed" },
          userButtonPopoverActionButtonIcon: { color: "#90a4ae" },
          userButtonPopoverFooter: { display: "none" },
          // Generic menu (used in UserButton popover)
          menuList: { backgroundColor: "#0d1520", border: "1px solid rgba(255,255,255,0.1)" },
          menuItem: { color: "#e0e6ed" },
          menuButton: { color: "#e0e6ed" },
        },
      }}
    >
      <html
        lang="en"
        className={`${plexMono.variable} ${jakarta.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-bg-primary text-text-primary font-sans">
          {children}
          <CartPortal />
        </body>
      </html>
    </ClerkProvider>
  );
}
