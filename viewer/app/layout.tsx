import './globals.css';

export const metadata = { title: 'LLM Wiki', description: 'Personal knowledge graph' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
