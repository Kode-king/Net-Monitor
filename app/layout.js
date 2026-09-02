import "./globals.css";
import I18nProvider from "@/components/I18nProvider";

export const metadata = {
  title: "مراقبة الشبكة والسيرفرات · Network Monitoring",
  description: "مراقبة أداء السيرفرات والسويتشات والراوترات عبر SNMP",
};

// Apply the stored language before first paint to avoid an RTL/LTR flash.
const preScript = `try{var l=localStorage.getItem('nm_lang');if(l==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';}}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: preScript }} />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
