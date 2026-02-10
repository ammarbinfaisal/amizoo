"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Calendar,
  FileText,
  GraduationCap,
  Award,
  Wifi,
  MessageSquareText,
  LayoutDashboard
} from "lucide-react";

const navItems = [
  { label: "Schedule", href: "/dashboard/schedule", icon: Calendar },
  { label: "Attendance", href: "/dashboard/attendance", icon: BarChart3 },
  { label: "Courses", href: "/dashboard/courses", icon: GraduationCap },
  { label: "Exams", href: "/dashboard/exams", icon: FileText },
  { label: "Results", href: "/dashboard/results", icon: Award },
  { label: "Wi-Fi", href: "/dashboard/wifi", icon: Wifi },
  { label: "Feedback", href: "/dashboard/feedback", icon: MessageSquareText },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:flex flex-col gap-2 w-64 shrink-0">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-4 w-4", isActive ? "animate-pulse" : "")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { Menu, X } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const activeItem = navItems.find(item => pathname.startsWith(item.href)) || navItems[0];

  return (
    <div className="lg:hidden fixed bottom-6 right-6 z-50">
      <Drawer>
        <DrawerTrigger asChild>
          <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 border-4 border-background animate-in fade-in zoom-in duration-300">
            <Menu className="h-6 w-6" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="text-left px-2">
            <DrawerTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                <div className="bg-primary text-primary-foreground p-1 rounded-md">
                    <GraduationCap className="h-5 w-5" />
                </div>
                Amizoo
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <DrawerClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all border-2",
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                        : "bg-muted/50 text-muted-foreground border-transparent active:scale-95"
                    )}
                  >
                    <item.icon className={cn("h-6 w-6", isActive ? "animate-pulse" : "")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">
                      {item.label}
                    </span>
                  </Link>
                </DrawerClose>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function TabNav() {
    const pathname = usePathname();
    
    return (
        <div className="hidden md:flex lg:hidden overflow-x-auto pb-2 scrollbar-hide gap-2">
            {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest whitespace-nowrap transition-all border",
                            isActive 
                                ? "bg-primary text-primary-foreground border-primary" 
                                : "bg-muted text-muted-foreground border-transparent hover:border-border"
                        )}
                    >
                        <item.icon className="h-3 w-3" />
                        {item.label}
                    </Link>
                );
            })}
        </div>
    )
}
