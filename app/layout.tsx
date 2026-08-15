import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NL2SQL — Ask your database in plain English",
  description: "Turn natural language questions into SQL, instantly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
