import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, User as UserIcon, Check, X } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface ApplicantRef {
  _id: string;
  email: string;
  role: string;
}

interface LeaveApplicationItem {
  _id: string;
  applicantId?: ApplicantRef;
  applicantRole: "student" | "teacher" | "staff";
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  staff: "Staff",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function LeaveCard({
  app,
  onReview,
  isReviewing,
}: {
  app: LeaveApplicationItem;
  onReview: (id: string, status: "approved" | "rejected", reviewNote: string, clear: () => void) => void;
  isReviewing: boolean;
}) {
  const [note, setNote] = useState("");
  const applicantLabel = app.applicantId
    ? `${ROLE_LABELS[app.applicantRole] ?? app.applicantRole} · ${app.applicantId.email}`
    : "Unknown applicant";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-800">
              {formatDate(app.fromDate)} – {formatDate(app.toDate)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <UserIcon className="w-3 h-3 shrink-0" /> {applicantLabel}
            </p>
          </div>
          <Badge variant="outline" className={`text-[10px] capitalize shrink-0 ${STATUS_STYLES[app.status] ?? ""}`}>
            {app.status}
          </Badge>
        </div>

        <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{app.reason}</p>
        <p className="text-[11px] text-gray-300 mt-1">Submitted {new Date(app.createdAt).toLocaleString()}</p>

        {app.status !== "pending" && app.reviewNote && (
          <div className="mt-2 pl-3 border-l-2 border-gray-100">
            <p className="text-sm text-gray-700">{app.reviewNote}</p>
            <p className="text-[11px] text-gray-400">
              Reviewer's note{app.reviewedAt ? ` · ${new Date(app.reviewedAt).toLocaleString()}` : ""}
            </p>
          </div>
        )}

        {app.status === "pending" && (
          <div className="flex items-center gap-2 mt-3">
            <Input placeholder="Optional note…" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" onClick={() => onReview(app._id, "approved", note, () => setNote(""))} disabled={isReviewing}>
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReview(app._id, "rejected", note, () => setNote(""))} disabled={isReviewing}>
              <X className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeaveApplications() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: applications = [] } = useQuery<LeaveApplicationItem[]>({
    queryKey: ["admin-leave-applications"],
    queryFn: async () => (await api.get("/leave-applications")).data.data,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-leave-applications"] });

  const review = useMutation({
    mutationFn: async ({ id, status, reviewNote }: { id: string; status: "approved" | "rejected"; reviewNote?: string }) =>
      api.post(`/leave-applications/${id}/review`, { status, reviewNote: reviewNote || undefined }),
    onSuccess: (_res, variables) => {
      toast({ title: variables.status === "approved" ? "Leave application approved" : "Leave application rejected" });
      refresh();
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const pending = applications.filter((a) => a.status === "pending");
  const approved = applications.filter((a) => a.status === "approved");
  const rejected = applications.filter((a) => a.status === "rejected");

  const renderList = (list: LeaveApplicationItem[], emptyTitle: string) =>
    list.length ? (
      <div className="space-y-3">
        {list.map((app) => (
          <LeaveCard
            key={app._id}
            app={app}
            onReview={(id, status, reviewNote, clear) => review.mutate({ id, status, reviewNote }, { onSuccess: clear })}
            isReviewing={review.isPending}
          />
        ))}
      </div>
    ) : (
      <EmptyState icon={ClipboardList} title={emptyTitle} />
    );

  return (
    <div>
      <PageHeader title="Leave Applications" description="Review and decide on leave requests from students, teachers, and staff." />

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">{renderList(pending, "No pending leave applications")}</TabsContent>
        <TabsContent value="approved">{renderList(approved, "No approved leave applications yet")}</TabsContent>
        <TabsContent value="rejected">{renderList(rejected, "No rejected leave applications")}</TabsContent>
      </Tabs>
    </div>
  );
}
