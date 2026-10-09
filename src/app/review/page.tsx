"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReviewIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/review/hsk4-h41111");
  }, [router]);
  return null;
}
