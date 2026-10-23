import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SiteSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await api.get("/site-settings")).data.data,
  });

  const [form, setForm] = useState({
    schoolName: "",
    address: "",
    officeHours: "",
    footerText: "",
    phones: "",
    emails: "",
    facebook: "",
    instagram: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      schoolName: data.schoolName ?? "",
      address: data.address ?? "",
      officeHours: data.officeHours ?? "",
      footerText: data.footerText ?? "",
      phones: (data.phones ?? []).join(", "),
      emails: (data.emails ?? []).join(", "),
      facebook: data.socialLinks?.facebook ?? "",
      instagram: data.socialLinks?.instagram ?? "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () =>
      api.patch("/site-settings", {
        schoolName: form.schoolName,
        address: form.address,
        officeHours: form.officeHours,
        footerText: form.footerText,
        phones: form.phones.split(",").map((s) => s.trim()).filter(Boolean),
        emails: form.emails.split(",").map((s) => s.trim()).filter(Boolean),
        socialLinks: { facebook: form.facebook, instagram: form.instagram },
      }),
    onSuccess: () => {
      toast({ title: "Settings saved" });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const uploadImage = useMutation({
    mutationFn: async ({ file, target }: { file: File; target: "logo" | "favicon" }) => {
      const form_ = new FormData();
      form_.append("image", file);
      await api.post(`/site-settings/images/${target}`, form_);
    },
    onSuccess: () => {
      toast({ title: "Image updated" });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (err) => toast({ title: "Upload failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <div>
      <PageHeader title="Site Settings" description="Contact information, footer, social links and branding used across the public site." />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>School Name</Label><Input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} /></div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Office Hours</Label><Input value={form.officeHours} onChange={(e) => setForm({ ...form, officeHours: e.target.value })} /></div>
            <div><Label>Footer Text</Label><Textarea value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact & Social</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Phone numbers (comma separated)</Label><Input value={form.phones} onChange={(e) => setForm({ ...form, phones: e.target.value })} /></div>
            <div><Label>Emails (comma separated)</Label><Input value={form.emails} onChange={(e) => setForm({ ...form, emails: e.target.value })} /></div>
            <div><Label>Facebook URL</Label><Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} /></div>
            <div><Label>Instagram URL</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Logo</Label>
              {data?.logoUrl && <img src={data.logoUrl} alt="logo" className="h-10 my-2" />}
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage.mutate({ file: e.target.files[0], target: "logo" })} className="text-sm block" />
            </div>
            <div>
              <Label className="text-xs">Favicon</Label>
              {data?.faviconUrl && <img src={data.faviconUrl} alt="favicon" className="h-8 my-2" />}
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage.mutate({ file: e.target.files[0], target: "favicon" })} className="text-sm block" />
            </div>
          </CardContent>
        </Card>

        <Card className="flex items-end">
          <CardContent className="w-full">
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
              <Settings className="w-4 h-4 mr-2" /> Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
