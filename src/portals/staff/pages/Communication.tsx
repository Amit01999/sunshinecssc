import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, MessageSquare, User as UserIcon } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface UserRef {
  _id: string;
  email: string;
  role: string;
}

interface StudentRef {
  _id: string;
  firstName: string;
  lastName: string;
  studentCode: string;
}

interface InquiryResponse {
  byUserId?: UserRef;
  message: string;
  at: string;
}

interface InquiryItem {
  _id: string;
  fromUserId?: UserRef;
  toUserId?: UserRef;
  studentId?: StudentRef;
  subject: string;
  message: string;
  responses: InquiryResponse[];
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  parent: "Parent",
  teacher: "Teacher",
  staff: "Staff",
  admin: "Admin",
  academic_admin: "Admin",
  super_admin: "Admin",
};

function InquiryCard({
  inq,
  myUserId,
  onRespond,
  onClose,
  isResponding,
  isClosing,
}: {
  inq: InquiryItem;
  myUserId?: string;
  onRespond: (id: string, message: string, clear: () => void) => void;
  onClose: (id: string) => void;
  isResponding: boolean;
  isClosing: boolean;
}) {
  const [draft, setDraft] = useState("");
  const unclaimed = !inq.toUserId && inq.status === "open";
  const senderLabel = inq.fromUserId
    ? `${ROLE_LABELS[inq.fromUserId.role] ?? inq.fromUserId.role} · ${inq.fromUserId.email}`
    : "Unknown sender";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-800">{inq.subject}</p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap">
              <UserIcon className="w-3 h-3 shrink-0" />
              {senderLabel}
              {inq.studentId && (
                <span className="text-gray-400"> · Re: {inq.studentId.firstName} {inq.studentId.lastName}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {unclaimed && (
              <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Unclaimed</Badge>
            )}
            <Badge variant={inq.status === "closed" ? "secondary" : "outline"} className="text-[10px] capitalize">
              {inq.status}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{inq.message}</p>
        <p className="text-[11px] text-gray-300 mt-1">{new Date(inq.createdAt).toLocaleString()}</p>

        {inq.responses.length > 0 && (
          <div className="mt-3 space-y-2">
            {inq.responses.map((r, i) => (
              <div key={i} className="pl-3 border-l-2 border-gray-100">
                <p className="text-sm text-gray-700">{r.message}</p>
                <p className="text-[11px] text-gray-400">
                  {r.byUserId ? (r.byUserId._id === myUserId ? "You" : r.byUserId.email) : "Staff"} · {new Date(r.at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {inq.status === "open" && (
          <div className="flex items-center gap-2 mt-3">
            <Input placeholder="Write a response…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button
              size="sm"
              onClick={() => onRespond(inq._id, draft, () => setDraft(""))}
              disabled={!draft || isResponding}
            >
              {unclaimed ? "Claim & Respond" : "Send"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onClose(inq._id)} disabled={isClosing}>
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Communication() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: inquiries = [] } = useQuery<InquiryItem[]>({
    queryKey: ["my-inquiries"],
    queryFn: async () => (await api.get("/inquiries/mine")).data.data,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["my-inquiries"] });

  const respond = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => api.post(`/inquiries/${id}/respond`, { message }),
    onSuccess: () => {
      toast({ title: "Response sent" });
      refresh();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const close = useMutation({
    mutationFn: async (id: string) => api.post(`/inquiries/${id}/close`),
    onSuccess: () => {
      toast({ title: "Conversation closed" });
      refresh();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const myUserId = user?.id;
  const unclaimed = inquiries.filter((i) => !i.toUserId && i.status === "open");
  const mine = inquiries.filter((i) => i.status === "open" && (i.toUserId?._id === myUserId || i.fromUserId?._id === myUserId));
  const closed = inquiries.filter((i) => i.status === "closed");

  const renderList = (list: InquiryItem[], emptyTitle: string) =>
    list.length ? (
      <div className="space-y-3">
        {list.map((inq) => (
          <InquiryCard
            key={inq._id}
            inq={inq}
            myUserId={myUserId}
            onRespond={(id, message, clear) => respond.mutate({ id, message }, { onSuccess: clear })}
            onClose={(id) => close.mutate(id)}
            isResponding={respond.isPending}
            isClosing={close.isPending}
          />
        ))}
      </div>
    ) : (
      <EmptyState icon={MessageSquare} title={emptyTitle} />
    );

  return (
    <div>
      <PageHeader
        title="Communication"
        description="Inquiries from students and parents — a shared queue any staff member can pick up."
      />

      <Tabs defaultValue="unclaimed">
        <TabsList className="mb-4">
          <TabsTrigger value="unclaimed" className="gap-1.5">
            <Inbox className="w-3.5 h-3.5" /> Unclaimed ({unclaimed.length})
          </TabsTrigger>
          <TabsTrigger value="mine">My Conversations ({mine.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="unclaimed">
          {renderList(unclaimed, "Nothing waiting for a response right now")}
        </TabsContent>
        <TabsContent value="mine">
          {renderList(mine, "No active conversations assigned to you")}
        </TabsContent>
        <TabsContent value="closed">
          {renderList(closed, "No closed conversations yet")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
