"use client";

// "/" sends you to the home screen of the current role.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { roleHome, useCurrentStaff } from "@/lib/select";
import { useHydrated } from "@/lib/store";

export default function RoleHomePage() {
  const hydrated = useHydrated();
  const staff = useCurrentStaff();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && staff) router.replace(roleHome(staff));
  }, [hydrated, staff, router]);

  return null;
}
