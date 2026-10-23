/** Shapes the flat rows returned by GET /examinations/results/all (one row per published
 *  subject result) into one summary per examination, so the results pages never duplicate
 *  this matching/aggregation logic. Only ever includes subjects that are actually published -
 *  it never pads totals with configured-but-unpublished subjects. */

export interface ExamSubjectConfig {
  subjectId: { _id: string; name: string; code?: string } | string;
  maxMarks: number;
  passMarks: number;
  examDate?: string;
}

export interface ExamResultRow {
  _id: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
  publishedAt?: string;
  studentId?: { _id: string; firstName: string; lastName: string; studentCode?: string };
  subjectId: { _id: string; name: string; code?: string };
  examinationId: {
    _id: string;
    name: string;
    examType: string;
    classId?: { _id: string; name: string };
    academicYearId?: { _id: string; name: string };
    subjects?: ExamSubjectConfig[];
  };
}

export interface ExamGroupSummary {
  examinationId: string;
  name: string;
  examType: string;
  className?: string;
  academicYearId?: string;
  academicYearName?: string;
  publishedAt?: string;
  subjectCount: number;
  totalObtained: number;
  totalPossible: number;
  percentage: number | null;
}

function subjectConfigFor(row: ExamResultRow): ExamSubjectConfig | undefined {
  return (row.examinationId?.subjects ?? []).find((s) => {
    const sid = typeof s.subjectId === "string" ? s.subjectId : s.subjectId?._id;
    return sid === row.subjectId?._id;
  });
}

export function groupResultsByExamination(rows: ExamResultRow[]): ExamGroupSummary[] {
  const groups = new Map<string, ExamGroupSummary & { seenSubjectIds: Set<string> }>();

  for (const row of rows) {
    const exam = row.examinationId;
    if (!exam) continue;

    let group = groups.get(exam._id);
    if (!group) {
      group = {
        examinationId: exam._id,
        name: exam.name,
        examType: exam.examType,
        className: exam.classId?.name,
        academicYearId: exam.academicYearId?._id,
        academicYearName: exam.academicYearId?.name,
        publishedAt: undefined,
        subjectCount: 0,
        totalObtained: 0,
        totalPossible: 0,
        percentage: null,
        seenSubjectIds: new Set(),
      };
      groups.set(exam._id, group);
    }

    // A subject can only have one result per examination per student (enforced by a unique
    // index), but guard against duplicate rows anyway rather than double-counting totals.
    if (group.seenSubjectIds.has(row.subjectId._id)) continue;
    group.seenSubjectIds.add(row.subjectId._id);

    group.subjectCount += 1;
    group.totalObtained += row.marksObtained;
    const maxMarks = subjectConfigFor(row)?.maxMarks;
    if (typeof maxMarks === "number") group.totalPossible += maxMarks;
    if (row.publishedAt && (!group.publishedAt || row.publishedAt > group.publishedAt)) group.publishedAt = row.publishedAt;
  }

  return [...groups.values()].map(({ seenSubjectIds, ...summary }) => {
    void seenSubjectIds;
    return {
      ...summary,
      percentage: summary.totalPossible > 0 ? Math.round((summary.totalObtained / summary.totalPossible) * 1000) / 10 : null,
    };
  });
}

export function subjectDetailRows(rows: ExamResultRow[]) {
  return rows
    .map((row) => {
      const config = subjectConfigFor(row);
      const passed = typeof config?.passMarks === "number" ? row.marksObtained >= config.passMarks : undefined;
      return {
        id: row._id,
        subjectName: row.subjectId?.name ?? "Unknown subject",
        marksObtained: row.marksObtained,
        maxMarks: config?.maxMarks,
        passed,
        grade: row.grade,
        remarks: row.remarks,
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}
