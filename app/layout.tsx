import type { Metadata } from "next";
import { Providers } from "@/shared/ui/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeCare Portal — Admin & Organization",
  description:
    "Nền tảng quản trị hệ thống và vận hành đối tác dịch vụ gia đình HomeCare",
  icons: {
    icon: "/homecare_logo.png",
    shortcut: "/homecare_logo.png",
    apple: "/homecare_logo.png",
  },
};

const THEME_INIT_SCRIPT = `(function(){try{var k='hc_theme';var m=localStorage.getItem(k);var d=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
