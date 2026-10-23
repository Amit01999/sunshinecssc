import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link2, X } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const RELATIONSHIPS = ["father", "mother", "guardian"];

/** Links/unlinks parent accounts to one student, against the shared
 *  /admin/users/students/:id/parents endpoints (admins can manage any student; teachers are
 *  scoped server-side to students in a class/section they teach). `parentOptionsEndpoint` is
 *  the only thing that differs by caller - admin sees every parent account, a teacher gets a
 *  narrower, minimal-fields list. */
export function LinkParentDialog({
  studentProfileId,
  studentName,
  parentOptionsEndpoint,
}: {
  studentProfileId: string;
  studentName: string;
  parentOptionsEndpoint: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [parentUserId, setParentUserId] = useState<string>();
  const [relationship, setRelationship] = useState("guardian");
  const [isPrimary, setIsPrimary] = useState(false);
  // Toggling the parent Select's value between a defined id and undefined is a controlled ->
  // uncontrolled transition React doesn't reliably re-render for, so the picker could keep
  // showing the just-linked email after a successful link. Remounting it on reset sidesteps that.
  const [formResetKey, setFormResetKey] = useState(0);

  const { data: links, refetch: refetchLinks } = useQuery({
    queryKey: ["student-parent-links", studentProfileId],
    enabled: open,
    queryFn: async () => (await api.get(`/admin/users/students/${studentProfileId}/parents`)).data.data,
  });
  const { data: parentUsers } = useQuery({
    queryKey: ["parent-options-for-link", parentOptionsEndpoint],
    enabled: open,
    queryFn: async () => (await api.get(parentOptionsEndpoint)).data.data,
  });

  const resetForm = () => {
    setParentUserId(undefined);
    setRelationship("guardian");
    setIsPrimary(false);
    setFormResetKey((k) => k + 1);
  };

  const link = useMutation({
    mutationFn: async () => api.post(`/admin/users/students/${studentProfileId}/parents`, { parentUserId, relationship, isPrimary }),
    onSuccess: () => {
      toast({ title: "Parent linked" });
      resetForm();
      refetchLinks();
    },
    onError: (err) => toast({ title: "Failed to link parent", description: getErrorMessage(err), variant: "destructive" }),
  });

  const unlink = useMutation({
    mutationFn: async (parentProfileId: string) => api.delete(`/admin/users/students/${studentProfileId}/parents/${parentProfileId}`),
    onSuccess: () => {
      toast({ title: "Link removed" });
      resetForm();
      refetchLinks();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const linkedParentUserIds = new Set((links ?? []).map((l: any) => l.parentId?.userId?._id).filter(Boolean));
  const availableParents = (parentUsers ?? []).filter((p: any) => !linkedParentUserIds.has(p._id));

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : (setOpen(false), resetForm()))}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Link parent/guardian">
          <Link2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Parents/Guardians — {studentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {links?.length ? (
              links.map((l: any) => (
                <div key={l._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="text-sm">
                    <p className="text-gray-700">{l.parentId?.userId?.email ?? "Unknown parent"}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {l.relationship}
                      {l.isPrimary ? " · Primary" : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remove link"
                    onClick={() => unlink.mutate(l.parentId._id)}
                    disabled={unlink.isPending}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">No parent or guardian linked yet.</p>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <Label className="text-xs text-gray-500">Link a parent account</Label>
            <Select key={formResetKey} value={parentUserId} onValueChange={setParentUserId}>
              <SelectTrigger>
                <SelectValue placeholder={availableParents.length ? "Select a parent account" : "No parent accounts available to link"} />
              </SelectTrigger>
              <SelectContent>
                {availableParents.map((p: any) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(Boolean(v))} /> Primary guardian
            </label>
            <Button className="w-full" onClick={() => link.mutate()} disabled={!parentUserId || link.isPending}>
              Link Parent
            </Button>
            <p className="text-xs text-gray-400">
              No parent account yet for this family? Ask an administrator to create one first, with role "Parent".
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
