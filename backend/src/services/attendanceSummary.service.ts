import { Types } from "mongoose";
import { Attendance, AttendanceStatus } from "../models/Attendance.model";

export interface AttendanceSummaryResult {
  total: number;
  counts: Record<AttendanceStatus, number>;
  percentage: number;
  academicYearId?: string;
}

/** Single source of truth for "present + late / total" attendance percentage, shared by the
 *  student dashboard, the attendance detail page, and the parent dashboard - previously each
 *  computed this independently with duplicated (if equivalent) logic. */
export async function computeAttendanceSummary(
  studentId: Types.ObjectId | string,
  options: { academicYearId?: Types.ObjectId | string; from?: Date; to?: Date } = {},
): Promise<AttendanceSummaryResult> {
  const filter: Record<string, unknown> = { studentId };
  if (options.academicYearId) filter.academicYearId = options.academicYearId;
  if (options.from || options.to) {
    const dateFilter: Record<string, Date> = {};
    if (options.from) dateFilter.$gte = options.from;
    if (options.to) dateFilter.$lte = options.to;
    filter.date = dateFilter;
  }

  const records = await Attendance.find(filter).select("status").lean();
  const total = records.length;
  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of records) counts[r.status]++;
  const percentage = total > 0 ? Math.round(((counts.present + counts.late) / total) * 1000) / 10 : 0;

  return {
    total,
    counts,
    percentage,
    academicYearId: options.academicYearId ? String(options.academicYearId) : undefined,
  };
}
