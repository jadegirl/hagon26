import type { Metadata } from "next";
import "./globals.css";
import KakaoScriptLoader from "@/components/KakaoScriptLoader";

export const metadata: Metadata = {
  title: "학온(HAGON) - 강사 계약서 마법사",
  description: "학원 강사 근로계약서를 쉽고 안전하게 작성하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
        <KakaoScriptLoader kakaoKey={kakaoKey} />
      </body>
    </html>
  );
}
