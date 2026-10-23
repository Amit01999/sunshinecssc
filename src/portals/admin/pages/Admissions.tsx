import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Landmark, Search, UserCheck } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const ALL = "__all__";
type AdmissionStatus = "pending" | "under_review" | "info_requested" | "approved" | "rejected";

const STATUS_STYLES: Record<AdmissionStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-50 text-gray-700 border-gray-200" },
  under_review: { label: "Under Review", className: "bg-blue-50 text-blue-700 border-blue-200" },
  info_requested: { label: "Info Requested", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
};

function StatusBadge({ status }: { status: AdmissionStatus }) {
  const s = STATUS_STYLES[status];
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

interface Application {
  _id: string;
  applicantName: string;
  dateOfBirth: string;
  gender?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  appliedClassId?: { _id: string; name: string };
  documents: { url: string; filename: string }[];
  status: AdmissionStatus;
  reviewNote?: string;
  reviewedAt?: string;
  createdStudentUserId?: string;
  createdAt: string;
}

/* ---------------------------------------------------------------------- */
/* Detail / review dialog                                                 */
/* ---------------------------------------------------------------------- */

function ApplicationDialog({
  open,
  onOpenChange,
  application,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  application: Application | null;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data.data, enabled: open });
  const { data: years } = useQuery({ queryKey: ["years"], queryFn: async () => (await api.get("/academic-years")).data.data, enabled: open });

  const [reviewNote, setReviewNote] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [email, setEmail] = useState("");
  const [academicYearId, setAcademicYearId] = useState<string>();
  const [classId, setClassId] = useState<string>();
  const [sectionId, setSectionId] = useState<string>();
  const [rollNumber, setRollNumber] = useState("");
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  const { data: sections } = useQuery({
    queryKey: ["sections-for-admission", classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/sections`)).data.data,
  });

  useEffect(() => {
    if (open && application) {
      setReviewNote("");
      setEnrolling(false);
      setEmail("");
      setClassId(application.appliedClassId?._id);
      setSectionId(undefined);
      setRollNumber("");
    }
  }, [open, application]);

  useEffect(() => {
    if (open && years?.length && !academicYearId) {
      setAcademicYearId(years.find((y: any) => y.isActive)?._id ?? years[0]._id);
    }
  }, [open, years, academicYearId]);

  const review = useMutation({
    mutationFn: async (body: { status: AdmissionStatus; reviewNote?: string; email?: string; classId?: string; sectionId?: string; rollNumber?: string; academicYearId?: string }) =>
      api.post(`/admissions/${application!._id}/review`, body),
    onSuccess: (_res, variables) => {
      const messages: Record<string, string> = {
        under_review: "Application marked as under review",
        info_requested: "Marked — more information requested",
        approved: "Application approved — student account created",
        rejected: "Application rejected",
      };
      toast({ title: messages[variables.status] ?? "Updated" });
      onOpenChange(false);
      onDone();
    },
    onError: (err) => toast({ title: "Could not update application", description: getErrorMessage(err), variant: "destructive" }),
  });

  if (!application) return null;
  const isFinal = application.status === "approved" || application.status === "rejected";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {application.applicantName}
              <StatusBadge status={application.status} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Date of Birth</p><p className="text-gray-700">{new Date(application.dateOfBirth).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-gray-400">Gender</p><p className="text-gray-700 capitalize">{application.gender ?? "—"}</p></div>
              <div><p className="text-xs text-gray-400">Applied For</p><p className="text-gray-700">{application.appliedClassId?.name ?? "—"}</p></div>
              <div><p className="text-xs text-gray-400">Submitted</p><p className="text-gray-700">{new Date(application.createdAt).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-gray-400">Guardian</p><p className="text-gray-700">{application.guardianName}</p></div>
              <div><p className="text-xs text-gray-400">Guardian Phone</p><p className="text-gray-700">{application.guardianPhone}</p></div>
              {application.guardianEmail && (
                <div className="col-span-2"><p className="text-xs text-gray-400">Guardian Email</p><p className="text-gray-700">{application.guardianEmail}</p></div>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">Documents</p>
              {application.documents?.length ? (
                <div className="space-y-1">
                  {application.documents.map((d, i) => (
                    <a key={i} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-[hsl(208,89%,40%)] hover:underline">
                      <FileText className="w-3.5 h-3.5" /> {d.filename}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No documents uploaded.</p>
              )}
            </div>

            {application.reviewNote && (
              <div className="bg-gray-50 border rounded-md p-3">
                <p className="text-xs text-gray-400 mb-1">Last review note</p>
                <p className="text-sm text-gray-700">{application.reviewNote}</p>
              </div>
            )}

            {isFinal ? (
              <p className="text-xs text-gray-400">
                This application was finalized on {application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString() : "—"}.
                {application.status === "approved" && application.createdStudentUserId ? " A student account was created." : ""}
              </p>
            ) : enrolling ? (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-gray-700">Create Student Account</p>
                <div>
                  <Label htmlFor="adm-email">Student email (for login)</Label>
                  <Input id="adm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Academic Year</Label>
                  <Select value={academicYearId} onValueChange={setAcademicYearId}>
                    <SelectTrigger><SelectValue placeholder="Academic year" /></SelectTrigger>
                    <SelectContent>
                      {(years ?? []).map((y: any) => <SelectItem key={y._id} value={y._id}>{y.name}{y.isActive ? " (active)" : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Class</Label>
                    <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(undefined); }}>
                      <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                      <SelectContent>{(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                      <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                      <SelectContent>{(sections ?? []).map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="adm-roll">Roll Number</Label>
                  <Input id="adm-roll" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEnrolling(false)}>Back</Button>
                  <Button
                    className="flex-1"
                    disabled={!email || !classId || !sectionId || !rollNumber || !academicYearId || review.isPending}
                    onClick={() => review.mutate({ status: "approved", email, classId, sectionId, rollNumber, academicYearId, reviewNote: reviewNote || undefined })}
                  >
                    {review.isPending ? "Creating…" : "Confirm & Create Account"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label htmlFor="adm-note">Review note (optional)</Label>
                  <Textarea id="adm-note" placeholder="Visible to other admins — e.g. what's missing, or why this decision was made." value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {application.status === "pending" && (
                    <Button variant="outline" size="sm" onClick={() => review.mutate({ status: "under_review", reviewNote: reviewNote || undefined })} disabled={review.isPending}>
                      Mark Under Review
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => review.mutate({ status: "info_requested", reviewNote: reviewNote || undefined })} disabled={review.isPending}>
                    Request More Info
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setRejectConfirmOpen(true)} disabled={review.isPending}>
                    Reject
                  </Button>
                  <Button size="sm" className="ml-auto" onClick={() => setEnrolling(true)}>
                    <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Approve & Enroll
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {application.applicantName}'s application?</AlertDialogTitle>
            <AlertDialogDescription>
              This finalizes the application — it cannot be changed afterward. {reviewNote ? "" : "Consider adding a review note above first so the reason is on record."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRejectConfirmOpen(false);
                review.mutate({ status: "rejected", reviewNote: reviewNote || undefined });
              }}
            >
              Reject Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Main page                                                               */
/* ---------------------------------------------------------------------- */

function useStatusCount(status?: AdmissionStatus) {
  return useQuery({
    queryKey: ["admissions-count", status ?? "all"],
    queryFn: async () => (await api.get("/admissions", { params: { status, limit: 1 } })).data.meta.total as number,
  });
}

export default function Admissions() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>();
  const [classFilter, setClassFilter] = useState<string>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data.data });

  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ["admissions", statusFilter],
    queryFn: async () => (await api.get("/admissions", { params: { status: statusFilter, limit: 100 } })).data.data,
  });

  const totalCount = useStatusCount();
  const pendingCount = useStatusCount("pending" as AdmissionStatus);
  const underReviewCount = useStatusCount("under_review" as AdmissionStatus);
  const infoRequestedCount = useStatusCount("info_requested" as AdmissionStatus);
  const approvedCount = useStatusCount("approved" as AdmissionStatus);
  const needsAttention = (pendingCount.data ?? 0) + (underReviewCount.data ?? 0) + (infoRequestedCount.data ?? 0);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admissions"] });
    qc.invalidateQueries({ queryKey: ["admissions-count"] });
  };

  const filtered = (applications ?? []).filter((a) => {
    if (classFilter && a.appliedClassId?._id !== classFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.applicantName.toLowerCase().includes(q) && !a.guardianName.toLowerCase().includes(q) && !a.guardianPhone.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader title="Admissions" description="Review applications and enroll approved students." />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Applications" value={totalCount.data ?? "—"} icon={Landmark} />
        <StatCard label="Needs Attention" value={needsAttention} icon={Landmark} hint={`${pendingCount.data ?? 0} new`} />
        <StatCard label="Approved" value={approvedCount.data ?? "—"} icon={UserCheck} />
        <StatCard label="Info Requested" value={infoRequestedCount.data ?? "—"} icon={FileText} />
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <Label className="text-xs text-gray-500">Status</Label>
            <Select value={statusFilter ?? ALL} onValueChange={(v) => setStatusFilter(v === ALL ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {Object.entries(STATUS_STYLES).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-gray-500">Applied Class</Label>
            <Select value={classFilter ?? ALL} onValueChange={(v) => setClassFilter(v === ALL ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {(classes ?? []).map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Label className="text-xs text-gray-500">Search</Label>
            <Search className="absolute left-2.5 top-[34px] w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8" placeholder="Applicant or guardian name, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Applied For</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a._id} className="cursor-pointer" onClick={() => setSelected(a)}>
                    <TableCell className="font-medium text-gray-800">{a.applicantName}</TableCell>
                    <TableCell className="text-gray-600">{a.appliedClassId?.name ?? "—"}</TableCell>
                    <TableCell className="text-gray-500">{a.guardianName} · {a.guardianPhone}</TableCell>
                    <TableCell className="text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(a); }}>
                        {["approved", "rejected"].includes(a.status) ? "View" : "Review"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Landmark}
              title={applications?.length ? "No applications match these filters" : "No admission applications yet"}
              description={applications?.length ? "Try clearing a filter above." : "Applications submitted through the admissions form will appear here."}
            />
          )}
        </CardContent>
      </Card>

      <ApplicationDialog
        open={Boolean(selected)}
        onOpenChange={(v) => !v && setSelected(null)}
        application={selected}
        onDone={refreshAll}
      />
    </div>
  );
}
