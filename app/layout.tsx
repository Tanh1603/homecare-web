import type { Metadata } from "next";
import { Providers } from "@/shared/ui/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeCare Portal — Admin & Organization",
  description:
    "Nền tảng quản trị hệ thống và vận hành đối tác dịch vụ gia đình HomeCare",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
