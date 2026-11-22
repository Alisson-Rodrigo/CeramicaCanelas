import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/ToastProvider";
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
      <body className="font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
