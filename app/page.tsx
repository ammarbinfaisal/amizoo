"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("amizone_user");
    const pass = localStorage.getItem("amizone_pass");
    
    if (user && pass) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 bg-primary/20 rounded-full" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">Loading Amizoo...</p>
      </div>
    </div>
  );
}