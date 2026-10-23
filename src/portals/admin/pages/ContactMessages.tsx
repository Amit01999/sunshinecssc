import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ContactMessages() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: async () => (await api.get("/contact-messages")).data.data,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.post(`/contact-messages/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact-messages"] }),
  });

  return (
    <div>
      <PageHeader title="Contact Messages" description="Submissions from the public Contact Us page." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Loading…</p>
          ) : data?.length ? (
            <div className="divide-y">
              {data.map((m: any) => (
                <div key={m._id} className="p-4 flex items-start justify-between gap-4" onClick={() => !m.isRead && markRead.mutate(m._id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-800">{m.name}</p>
                      {!m.isRead && <Badge className="text-[10px]">New</Badge>}
                    </div>
                    <p className="text-xs text-gray-400">{m.email}</p>
                    <p className="text-sm text-gray-600 mt-2">{m.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Mail} title="No contact messages yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
