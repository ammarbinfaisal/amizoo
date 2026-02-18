"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, BarChart, Info, ExternalLink, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const GRAFANA_DASHBOARD_URL =
  "https://grafana.ami.zoo.fullstacktics.com/d/amizone-overview/amizone-overview?orgId=1";

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Fallback for older browsers / non-secure contexts.
    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.left = "-10000px";
      el.style.top = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function AboutPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black uppercase tracking-tighter">About Amizoo</h1>
        <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">
          The story behind the project
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 shadow-xl shadow-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-tight font-black">
              <Info className="h-5 w-5 text-primary" />
              Project Mission
            </CardTitle>
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest">
              Why we built this
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Amizoo was created to provide students with a modern, fast, and reliable way to access their academic information. 
              Tired of slow loading times and outdated interfaces, we built this platform focusing on user experience, performance, and accessibility.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-xl shadow-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-tight font-black">
              <BarChart className="h-5 w-5 text-primary" />
              System Status
            </CardTitle>
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest">
              Real-time monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              We maintain a public Grafana dashboard to track the health and performance of the backend services that power Amizoo.
            </p>
            <div className="pt-2">
              <Button asChild variant="outline" className="w-full border-2 font-bold uppercase text-[10px] tracking-widest gap-2">
                <Link href={GRAFANA_DASHBOARD_URL} target="_blank">
                  View Grafana Dashboard <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                  <span>Username:</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard("public");
                      toast[ok ? "success" : "error"](ok ? "Username copied" : "Failed to copy username");
                    }}
                    className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 font-mono text-[11px] normal-case text-foreground hover:bg-muted/70"
                    title="Click to copy"
                  >
                    public <Copy className="h-3 w-3 opacity-70" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                  <span>Password:</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard("public");
                      toast[ok ? "success" : "error"](ok ? "Password copied" : "Failed to copy password");
                    }}
                    className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 font-mono text-[11px] normal-case text-foreground hover:bg-muted/70"
                    title="Click to copy"
                  >
                    public <Copy className="h-3 w-3 opacity-70" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Open Source</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Github className="h-5 w-5" />
                Frontend
              </CardTitle>
              <CardDescription className="uppercase text-[10px] font-bold tracking-widest">
                Next.js & TypeScript
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The modern web interface built with Next.js 15+, Tailwind CSS, and Shadcn UI.
              </p>
              <Button asChild variant="secondary" className="w-full font-bold uppercase text-[10px] tracking-widest gap-2">
                <Link href="https://github.com/ammarbinfaisal/amizoo" target="_blank">
                  View Source Code <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Github className="h-5 w-5" />
                Backend (Go-Amizone)
              </CardTitle>
              <CardDescription className="uppercase text-[10px] font-bold tracking-widest">
                Go & gRPC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The high-performance backend API written in Go, providing a clean interface to Amizone data.
              </p>
              <Button asChild variant="secondary" className="w-full font-bold uppercase text-[10px] tracking-widest gap-2">
                <Link href="https://github.com/ammarbinfaisal/go-amizone" target="_blank">
                  View Source Code <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
