"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  plan: "FREE" | "PRO" | "BUSINESS";
  role: "USER" | "ADMIN";
  creditsRemaining: number;
  analyses: number;
  createdAt: string;
}

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    if (res.ok) {
      toast.success("Updated");
      router.refresh();
    } else toast.error(((await res.json()) as { error?: string }).error ?? "Failed");
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Credits</TableHead>
          <TableHead className="text-right">Reports</TableHead>
          <TableHead className="text-right">Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <div className="font-medium">{u.email}</div>
              {u.name && <div className="text-xs text-muted-foreground">{u.name}</div>}
            </TableCell>
            <TableCell>
              <Select value={u.plan} onValueChange={(v) => void patch(u.id, { plan: v })}>
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Select value={u.role} onValueChange={(v) => void patch(u.id, { role: v })}>
                <SelectTrigger size="sm" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => void patch(u.id, { creditsDelta: -10 })} aria-label="Remove 10 credits">
                  −10
                </Button>
                <span className="num w-10 text-center">{u.creditsRemaining}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => void patch(u.id, { creditsDelta: 10 })} aria-label="Add 10 credits">
                  +10
                </Button>
              </div>
            </TableCell>
            <TableCell className="num text-right">{u.analyses}</TableCell>
            <TableCell className="text-right text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
