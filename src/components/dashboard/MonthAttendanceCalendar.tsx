import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { AttendanceStatus, ATTENDANCE_STATUS_STYLES } from "./AttendanceStatusBadge";

/** Aggregated counts for one calendar day — for a student there is at most one record per day
 *  (present/absent/late/excused each 0 or 1); for a teacher's class view these are totals across
 *  the whole roster for that day. */
export interface DayAttendance {
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dominantStatus(day: DayAttendance): AttendanceStatus | null {
  if (day.absent > 0) return "absent";
  if (day.late > 0) return "late";
  if (day.present > 0) return "present";
  if (day.excused > 0) return "excused";
  return null;
}

export function MonthAttendanceCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  statusByDate,
  minDate,
  maxDate,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected?: Date;
  onSelect: (d: Date) => void;
  statusByDate: Map<string, DayAttendance>;
  minDate?: Date;
  maxDate?: Date;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <DayPicker
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onDayClick={(d) => onSelect(d)}
      disabled={{ after: today, ...(minDate ? { before: minDate } : {}), ...(maxDate && maxDate < today ? { after: maxDate } : {}) }}
      showOutsideDays
      className="p-3"
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold text-gray-800",
        nav: "space-x-1 flex items-center",
        nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-gray-400 rounded-md w-9 font-normal text-[11px]",
        row: "flex w-full mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal rounded-md aria-selected:opacity-100"),
        day_today: "border border-[hsl(208,89%,40%)] text-[hsl(208,89%,40%)] font-semibold",
        day_selected: "bg-[hsl(208,89%,40%)] text-white hover:bg-[hsl(208,89%,40%)] hover:text-white focus:bg-[hsl(208,89%,40%)]",
        day_outside: "text-gray-300",
        day_disabled: "text-gray-300 opacity-60",
        day_hidden: "invisible",
      }}
      modifiers={{
        weekend: { dayOfWeek: [5, 6] }, // Friday & Saturday — the school week here runs Sun–Thu
      }}
      modifiersClassNames={{
        weekend: "bg-gray-50",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: ({ date }) => {
          const day = statusByDate.get(dayKey(date));
          const status = day ? dominantStatus(day) : null;
          return (
            <div className="relative flex flex-col items-center justify-center">
              <span>{date.getDate()}</span>
              {status && (
                <span className={cn("absolute -bottom-0.5 w-1 h-1 rounded-full", ATTENDANCE_STATUS_STYLES[status].dot)} />
              )}
            </div>
          );
        },
      }}
    />
  );
}

export function AttendanceCalendarLegend() {
  const entries = Object.entries(ATTENDANCE_STATUS_STYLES) as [AttendanceStatus, (typeof ATTENDANCE_STATUS_STYLES)[AttendanceStatus]][];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 px-3">
      {entries.map(([status, style]) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
          {style.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm bg-gray-100 border border-gray-200" />
        Weekend
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm border border-[hsl(208,89%,40%)]" />
        Today
      </span>
    </div>
  );
}
