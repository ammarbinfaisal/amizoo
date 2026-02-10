"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { useState } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Trash2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function WifiTab() {
  const { wifiMac, loading, refresh } = useDashboard();
  const [address, setAddress] = useState("");
  const [overrideLimit, setOverrideLimit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAdd = async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    const cleaned = normalizeMacAddress(address);
    if (!cleaned) {
      toast.error("Enter a valid MAC address");
      return;
    }

    setActionLoading(true);
    try {
      await amizoneApi.registerWifiMac(credentials, cleaned, overrideLimit);
      toast.success("Wi-Fi MAC added");
      setAddress("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add MAC");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (addr: string) => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setActionLoading(true);
    try {
      await amizoneApi.deregisterWifiMac(credentials, addr);
      toast.success("Wi-Fi MAC removed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove MAC");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !wifiMac) {
      return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Wi‑Fi MAC Addresses</h2>
          <p className="text-sm text-muted-foreground">Manage your registered devices.</p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={loading || actionLoading}
          className="font-bold uppercase text-[10px] tracking-widest"
        >
          <RefreshCw className={loading ? "animate-spin mr-2" : "mr-2"} size={14} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-card border-border shadow-sm py-6">
          <CardHeader className="pb-2 p-4 sm:p-6">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Slots</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black tabular-nums">{wifiMac?.slots ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm py-6">
          <CardHeader className="pb-2 p-4 sm:p-6">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Free Slots</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black tabular-nums">{wifiMac?.freeSlots ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm py-6">
          <CardHeader className="pb-2 p-4 sm:p-6">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Registered</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black tabular-nums">{wifiMac?.addresses?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border shadow-sm py-6">
        <CardHeader className="pb-4 p-4 sm:p-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest">Add MAC</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3 p-4 sm:p-6 pt-0">
          <Input
            placeholder="AA:BB:CC:DD:EE:FF"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="font-mono"
          />
          <Button
            type="button"
            variant={overrideLimit ? "default" : "outline"}
            onClick={() => setOverrideLimit(!overrideLimit)}
            className="font-bold uppercase text-[10px] tracking-widest whitespace-nowrap"
          >
            {overrideLimit ? "Override: ON" : "Override Limit"}
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={actionLoading || !address}
            className="font-bold uppercase text-[10px] tracking-widest"
          >
            Add Device
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm overflow-hidden py-6">
        <CardHeader className="pb-0 p-4 sm:p-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest">Registered Devices</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="font-bold uppercase text-[10px] tracking-widest px-6">MAC Address</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest px-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wifiMac?.addresses?.length ? (
                wifiMac.addresses.map((addr) => (
                  <TableRow key={addr}>
                    <TableCell className="px-6 py-4 font-medium tabular-nums font-mono">{addr}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRemove(addr)}
                        disabled={actionLoading}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No MAC addresses found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeMacAddress(raw: string) {
  const cleaned = raw.trim().replace(/-/g, ":").toUpperCase();
  const ok = /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(cleaned);
  return ok ? cleaned : null;
}
