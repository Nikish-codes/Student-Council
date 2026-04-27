/* eslint-disable @typescript-eslint/no-require-imports */
import type { Metadata } from "next";
import config from "@payload-config";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import "@payloadcms/next/css";
import "../../admin/admin.css";
import type { ServerFunctionClient } from "payload";
import React from "react";
import { importMap } from "./admin/importMap";

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
  >
    {children}
  </RootLayout>
);

export default Layout;

export const metadata: Metadata = {
  title: "Woxsen Council CMS",
};
