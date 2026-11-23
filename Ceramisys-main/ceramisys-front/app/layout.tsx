import type { Metadata } from "next";
import Script from "next/script";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AssistantFloatingWidget } from "@/components/assistant/AssistantFloatingWidget";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ceramica Canelas", // Aproveitei para atualizar o título do seu App
  description: "Sistema de Gestão para Cerâmicas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* AQUI ESTÁ A CORREÇÃO:
       Adicionei 'suppressHydrationWarning' para evitar o erro 
       causado pelas extensões do navegador.
    */
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: "try { document.documentElement.dataset.theme = localStorage.getItem('ceramica-theme') === 'dark' ? 'dark' : 'light'; } catch (_) { document.documentElement.dataset.theme = 'light'; }" }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider><ToastProvider>{children}<AssistantFloatingWidget /></ToastProvider></ThemeProvider>
      </body>
    </html>
  );
}
