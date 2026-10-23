import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Search } from "lucide-react";
import { api } from "@/lib/api";
import { portalBase } from "@/components/dashboard/portalBase";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentScope } from "../useStudentScope";
import { ExamResultRow, groupResultsByExamination } from "../examResultGrouping";

const ALL = "all";

export default function Results() {
  const { studentId, ready, isParent } = useStudentScope();
  const location = useLocation();
  const base = portalBase(location.pathname);

  const [yearFilter, setYearFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [search, setSearch] = useState("");

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["exam-results", studentId],
    enabled: ready,
    queryFn: async () => {
      const params = studentId ? { studentId } : {};
      const res = await api.get<{ data: ExamResultRow[] }>("/examinations/results/all", { params });
      return res.data.data;
    },
  });

  const groups = useMemo(() => groupResultsByExamination(rows ?? []), [rows]);

  const years = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) if (g.academicYearId) map.set(g.academicYearId, g.academicYearName ?? "Unnamed year");
    return [...map.entries()];
  }, [groups]);

  const types = useMemo(() => [...new Set(groups.map((g) => g.examType))], [groups]);

  const filtered = groups
    .filter((g) => yearFilter === ALL || g.academicYearId === yearFilter)
    .filter((g) => typeFilter === ALL || g.examType === typeFilter)
    .filter((g) => !search.trim() || g.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  if (!ready) return <EmptyState icon={GraduationCap} title="Select a child above to view results" />;

  return (
    <div>
      <PageHeader
        title={isParent ? "Your Child's Examination Results" : "Examination Results"}
        description={
          isParent
            ? "Your child's complete result for each published examination, in one place."
            : "Your complete result for each published examination, in one place."
        }
      />

      {isError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {isParent
            ? "Could not load your child's examination results right now. Please try again later."
            : "Could not load your examination results right now. Please try again later."}
        </div>
      )}

      {!isLoading && groups.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[170px]">
              <Label className="text-xs text-gray-500 mb-1 block">Academic Year</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All years</SelectItem>
                  {years.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {types.length > 1 && (
              <div className="min-w-[170px]">
                <Label className="text-xs text-gray-500 mb-1 block">Examination Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All types</SelectItem>
                    {types.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-gray-500 mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Examination name…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((g) => (
            <Card key={g.examinationId}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{g.name}</p>
                    <p className="text-xs text-gray-500 capitalize truncate">
                      {g.examType}
                      {g.academicYearName ? ` • ${g.academicYearName}` : ""}
                      {g.className ? ` • ${g.className}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0">
                    Published
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-800">{g.subjectCount}</p>
                    <p className="text-[11px] text-gray-400">Subjects</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">
                      {g.totalPossible > 0 ? `${g.totalObtained}/${g.totalPossible}` : g.totalObtained}
                    </p>
                    <p className="text-[11px] text-gray-400">Marks</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{g.percentage !== null ? `${g.percentage}%` : "—"}</p>
                    <p className="text-[11px] text-gray-400">Overall</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-[11px] text-gray-400">
                    {g.publishedAt
                      ? `Published ${new Date(g.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                      : ""}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`${base}/results/${g.examinationId}`}>View Full Result</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length > 0 ? (
        <EmptyState icon={GraduationCap} title="No examinations match these filters" />
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No published examination results yet"
          description={
            isParent
              ? "Your child's results will appear here after the school publishes them."
              : "Your results will appear here after your school publishes them."
          }
        />
      )}
    </div>
  );
}
