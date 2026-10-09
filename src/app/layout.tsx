import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eloise's HSK APP | HSK 4급 & 5급 공식 실전 모의고사",
  description: "Eloise를 위한 맞춤형 HSK 4급 및 5급 기출 모의고사, 공식 원본 듣기 오디오 스트리밍, 한국어 심층 해설 및 오답노트 시스템",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
