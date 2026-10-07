import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Match Display",
};

export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
