import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add package",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
