import "./globals.css";

export const metadata = {
  title: "مراقبة الشبكة والسيرفرات",
  description: "مراقبة أداء السيرفرات والسويتشات والراوترات عبر SNMP",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
