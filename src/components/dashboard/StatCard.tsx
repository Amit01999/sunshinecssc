import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PRIMARY = "hsl(208,89%,40%)";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "hsl(208,89%,95%)" }}
        >
          <Icon className="w-5 h-5" style={{ color: PRIMARY }} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
          <p className="text-xs text-gray-500 truncate">{label}</p>
          {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
