import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "Meu Plano — Encontre quem aceita o seu plano",
  description:
    "Encontre médicos, clínicas, labs e hospitais que realmente atendem o seu plano de saúde, sem precisar ligar.",
  applicationName: "Meu Plano",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Meu Plano",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AuthProvider>
          <ServiceWorkerRegister />
          <div className="mx-auto min-h-dvh max-w-lg pb-24 md:max-w-3xl lg:max-w-5xl">
            {children}
          </div>
          <InstallPrompt />
        </AuthProvider>
        {/* Fora do AuthProvider: Server Component com <a> nativos */}
        <BottomNav />
      </body>
    </html>
  );
}
