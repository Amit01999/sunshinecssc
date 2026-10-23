import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Camera, ShieldAlert } from "lucide-react";
import { api, getErrorMessage, setAccessToken } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { portalBase } from "@/components/dashboard/portalBase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "security" ? "security" : "contact";
  const forced = searchParams.get("forced") === "1";
  const profile = user?.profile as Record<string, any> | null;

  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const saveContact = useMutation({
    mutationFn: async () => api.patch("/profile/me", { phone }),
    onSuccess: async () => {
      toast({ title: "Contact info updated" });
      await refresh();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("image", file);
      await api.post("/profile/me/photo", form);
    },
    onSuccess: async () => {
      toast({ title: "Photo updated" });
      await refresh();
    },
    onError: (err) => toast({ title: "Upload failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const changePassword = useMutation({
    mutationFn: async () => (await api.post("/auth/change-password", { currentPassword, newPassword })).data.data,
    onSuccess: async (data) => {
      setAccessToken(data.accessToken);
      await refresh();
      toast({ title: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
      if (forced) navigate(`${portalBase(location.pathname)}/profile`, { replace: true });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  if (!user) return null;

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your administrator account details and password." />

      <Card className="mb-6">
        <CardContent className="p-6 flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.photo?.url} />
              <AvatarFallback className="text-lg" style={{ backgroundColor: "hsl(208,89%,40%)", color: "white" }}>
                {(profile?.firstName?.[0] ?? user.email[0]).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow border flex items-center justify-center cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-gray-500" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto.mutate(e.target.files[0])} />
            </label>
          </div>
          <div>
            <p className="font-semibold text-gray-800">{profile?.firstName} {profile?.lastName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <Badge variant="secondary" className="mt-1 capitalize">{user.role.replace("_", " ")}</Badge>
          </div>
        </CardContent>
      </Card>

      {forced && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="w-4 h-4 shrink-0" /> For security, please set a new password before continuing.
        </div>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          <Card>
            <CardContent className="p-6 space-y-4 max-w-md">
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button onClick={() => saveContact.mutate()} disabled={saveContact.isPending}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardContent className="p-6 space-y-4 max-w-md">
              <div>
                <Label>Current Password</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div>
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending}>
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
