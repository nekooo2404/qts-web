import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

const DIRECTION_CONTRACT = `<!--
THESIS: A document-control workbench replaces the generic metric-card dashboard.
OWN-WORLD: QTS navy navigation, cool paper fields, blue review marks, and warm exception tags.
STORY: Staff enter their role workspace, process operational records, and leave with a clear document or state change.
FIRST VIEWPORT: Persistent rail, compact command header, and one task-focused workbench with the primary action at upper right.
FORM: Assigned grounded direction 7, seed cc032137, translated as Document Control Desk.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export const metadata: Metadata = {
  title: {
    default: "QTS Internal Portal",
    template: "%s | QTS Portal",
  },
  description: "Hệ thống quản trị nội bộ của QTS.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-theme="qts">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <template
          data-impeccable-contract="cc032137"
          dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }}
        />
        {children}
      </body>
    </html>
  );
}
