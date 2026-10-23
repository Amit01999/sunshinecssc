import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const AUDIENCES = ["all", "students", "parents", "teachers", "staff"];

function NoticesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [isPinned, setIsPinned] = useState(false);

  const { data: notices } = useQuery({
    queryKey: ["admin-notices"],
    queryFn: async () => (await api.get("/notices/admin")).data.data,
  });

  const create = useMutation({
    mutationFn: async () => api.post("/notices", { title, body, audience, isPinned, status: "published" }),
    onSuccess: () => {
      toast({ title: "Notice published" });
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["admin-notices"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/notices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notices"] }),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">New Notice</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPinned} onCheckedChange={(v) => setIsPinned(Boolean(v))} /> Pin to top
          </label>
          <Button className="w-full" onClick={() => create.mutate()} disabled={!title || !body}>Publish</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {notices?.length ? (
            <div className="divide-y">
              {notices.map((n: any) => (
                <div key={n._id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge variant="outline" className="capitalize text-[10px] mt-1">{n.audience}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(n._id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Bell} title="No notices yet" />}
        </CardContent>
      </Card>
    </div>
  );
}

function EventsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");

  const { data: events } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => (await api.get("/events/admin")).data.data,
  });

  const create = useMutation({
    mutationFn: async () => api.post("/events", { title, description, location, startDate, status: "published" }),
    onSuccess: () => {
      toast({ title: "Event published" });
      setTitle("");
      setDescription("");
      setLocation("");
      setStartDate("");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events"] }),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">New Event</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Button className="w-full" onClick={() => create.mutate()} disabled={!title || !startDate}>Publish</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {events?.length ? (
            <div className="divide-y">
              {events.map((e: any) => (
                <div key={e._id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-gray-400">{new Date(e.startDate).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(e._id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Bell} title="No events yet" />}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NoticesEvents() {
  return (
    <div>
      <PageHeader title="Notices & Events" description="Publish announcements and events to the public site and dashboards." />
      <Tabs defaultValue="notices">
        <TabsList className="mb-4">
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>
        <TabsContent value="notices"><NoticesTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
