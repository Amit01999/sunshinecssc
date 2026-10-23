import { useQuery } from "@tanstack/react-query";
import { ClipboardList, User as UserIcon } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ApplicantRef {
  _id: string;
  email: string;
  role: string;
}

interface LeaveApplicationItem {
  _id: string;
  applicantId?: ApplicantRef;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function LeaveCard({ app }: { app: LeaveApplicationItem }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-800">
              {formatDate(app.fromDate)} – {formatDate(app.toDate)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <UserIcon className="w-3 h-3 shrink-0" /> {app.applicantId?.email ?? "Unknown student"}
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
              School admin's note{app.reviewedAt ? ` · ${new Date(app.reviewedAt).toLocaleString()}` : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudentLeave() {
  const { data: applications = [] } = useQuery<LeaveApplicationItem[]>({
    queryKey: ["teacher-student-leave"],
    queryFn: async () => (await api.get("/leave-applications")).data.data,
  });

  const pending = applications.filter((a) => a.status === "pending");
  const decided = applications.filter((a) => a.status !== "pending");

  const renderList = (list: LeaveApplicationItem[], emptyTitle: string) =>
    list.length ? (
      <div className="space-y-3">
        {list.map((app) => <LeaveCard key={app._id} app={app} />)}
      </div>
    ) : (
      <EmptyState icon={ClipboardList} title={emptyTitle} />
    );

  return (
    <div>
      <PageHeader
        title="Student Leave Applications"
        description="Leave requests from students in your classes. The school office reviews and decides these — you're kept in the loop here."
      />

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="decided">Decided ({decided.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">{renderList(pending, "No pending leave applications from your students")}</TabsContent>
        <TabsContent value="decided">{renderList(decided, "No decided leave applications yet")}</TabsContent>
      </Tabs>
    </div>
  );
}
