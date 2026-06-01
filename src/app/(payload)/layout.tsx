/* eslint-disable @typescript-eslint/no-require-imports */
import type { Metadata } from "next";
import config from "@payload-config";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import "@payloadcms/next/css";
import "../../admin/admin.css";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import type { ServerFunctionClient } from "payload";
import React from "react";
import { importMap } from "./admin/importMap";

/**
 * Load the same fonts as the public site so the admin shell uses the
 * editorial Fraunces/Inter/JetBrains Mono trio. Passing `htmlProps` to
 * Payload's RootLayout puts our font CSS-variable classNames directly on
 * the <html> element it renders, so the variables cascade everywhere.
 */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

type Args = { children: React.ReactNode };

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) => (
  <RootLayout
    config={config}
    importMap={importMap}
    serverFunction={serverFunction}
    htmlProps={{
      className: `${sans.variable} ${display.variable} ${mono.variable} wc-admin-shell`,
    }}
  >
    {children}
  </RootLayout>
);

export default Layout;

export const metadata: Metadata = {
  title: "Woxsen Council CMS",
};
