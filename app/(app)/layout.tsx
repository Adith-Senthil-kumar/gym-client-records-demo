import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";

// Suspense: route hooks (usePathname) inside the shell suspend while
// Next.js prerenders the static shell of dynamic routes like /clients/[id].
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
