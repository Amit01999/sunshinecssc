import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export const ATTENDANCE_STATUS_STYLES: Record<AttendanceStatus, { label: string; badge: string; dot: string }> = {
  present: { label: "Present", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  absent: { label: "Absent", badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  late: { label: "Late", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  excused: { label: "Excused", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
};

export function AttendanceStatusBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  const style = ATTENDANCE_STATUS_STYLES[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", style.badge, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      {style.label}
    </Badge>
  );
}

export function AttendanceStatusDot({ status, className }: { status: AttendanceStatus; className?: string }) {
  return <span className={cn("w-1.5 h-1.5 rounded-full", ATTENDANCE_STATUS_STYLES[status].dot, className)} />;
}
