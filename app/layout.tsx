import './globals.css';

export const metadata = {
  title: 'Cantina Escolar Pro | Gestão da cantina',
  description: 'Gestão simples e segura da cantina escolar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full text-slate-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
