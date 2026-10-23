import { useMemo } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { api } from "@/lib/api";
import { portalBase } from "@/components/dashboard/portalBase";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentScope } from "../useStudentScope";
import { ExamResultRow, subjectDetailRows } from "../examResultGrouping";

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : undefined;
}

export default function ResultDetail() {
  const { examinationId } = useParams<{ examinationId: string }>();
  const location = useLocation();
  const base = portalBase(location.pathname);
  const { studentId, ready } = useStudentScope();

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["exam-result-detail", studentId, examinationId],
    enabled: ready && Boolean(examinationId),
    queryFn: async () => {
      const params: Record<string, string> = { examinationId: examinationId! };
      if (studentId) params.studentId = studentId;
      const res = await api.get<{ data: ExamResultRow[] }>("/examinations/results/all", { params });
      return res.data.data;
    },
  });

  const subjectRows = useMemo(() => subjectDetailRows(rows ?? []), [rows]);
  const exam = rows?.[0]?.examinationId;
  const student = rows?.[0]?.studentId;

  const totals = useMemo(() => {
    const totalObtained = subjectRows.reduce((sum, r) => sum + r.marksObtained, 0);
    const totalPossible = subjectRows.reduce((sum, r) => sum + (r.maxMarks ?? 0), 0);
    const allHaveMaxMarks = subjectRows.length > 0 && subjectRows.every((r) => typeof r.maxMarks === "number");
    const allHavePassStatus = subjectRows.length > 0 && subjectRows.every((r) => r.passed !== undefined);
    const passedCount = subjectRows.filter((r) => r.passed === true).length;
    return {
      totalObtained,
      totalPossible,
      percentage: allHaveMaxMarks && totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 1000) / 10 : null,
      passedCount,
      allHavePassStatus,
    };
  }, [subjectRows]);

  const publishedAt = (rows ?? []).reduce<string | undefined>(
    (latest, r) => (r.publishedAt && (!latest || r.publishedAt > latest) ? r.publishedAt : latest),
    undefined,
  );

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-gray-500 hover:text-gray-700">
      <Link to={`${base}/results`}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Results
      </Link>
    </Button>
  );

  if (!ready) return <EmptyState icon={GraduationCap} title="Select a child above to view results" />;

  return (
    <div>
      <div className="mb-4">{backLink}</div>

      {isError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load this result right now. Please try again later.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : !exam ? (
        !isError && (
          <EmptyState
            icon={GraduationCap}
            title="This result is not available"
            description="It may not be published yet, or it isn't one of this student's examinations."
          />
        )
      ) : (
        <>
          <PageHeader
            title={exam.name}
            description={[
              exam.examType ? exam.examType.charAt(0).toUpperCase() + exam.examType.slice(1) : null,
              exam.academicYearId?.name,
              exam.classId?.name,
              student ? `${student.firstName} ${student.lastName}${student.studentCode ? ` (${student.studentCode})` : ""}` : null,
            ]
              .filter(Boolean)
              .join(" • ")}
            actions={
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Published{publishedAt ? ` ${formatDate(publishedAt)}` : ""}
              </Badge>
            }
          />

          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Subject-wise Marks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Full Marks</TableHead>
                    <TableHead className="text-right">Obtained</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-gray-700">{r.subjectName}</TableCell>
                      <TableCell className="text-right text-gray-500">{r.maxMarks ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-gray-800">{r.marksObtained}</TableCell>
                      <TableCell>{r.grade ? <Badge variant="secondary">{r.grade}</Badge> : "—"}</TableCell>
                      <TableCell>
                        {r.passed === undefined ? (
                          "—"
                        ) : (
                          <Badge
                            variant="outline"
                            className={r.passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}
                          >
                            {r.passed ? "Pass" : "Below Pass Mark"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">{r.remarks ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-gray-800">{subjectRows.length}</p>
                <p className="text-xs text-gray-400">Subjects Published</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">
                  {totals.totalPossible > 0 ? `${totals.totalObtained}/${totals.totalPossible}` : totals.totalObtained}
                </p>
                <p className="text-xs text-gray-400">Total Marks</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">{totals.percentage !== null ? `${totals.percentage}%` : "—"}</p>
                <p className="text-xs text-gray-400">Overall Percentage</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">
                  {totals.allHavePassStatus ? `${totals.passedCount}/${subjectRows.length}` : "—"}
                </p>
                <p className="text-xs text-gray-400">Subjects Passed</p>
              </div>
            </CardContent>
            <CardContent className="px-4 pb-4 pt-0 border-t">
              <p className="text-xs text-gray-400 pt-3">
                These totals reflect only the subjects published so far for this examination. The school's system does not
                calculate an overall GPA or letter grade, so none is shown here — only the verified marks above.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
