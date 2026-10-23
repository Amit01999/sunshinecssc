import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

interface ChildRecord {
  _id: string;
  firstName: string;
  lastName: string;
  classId?: { name?: string };
  sectionId?: { name?: string };
}

export function ChildSwitcher() {
  const { user, activeChildId, setActiveChildId } = useAuth();
  const children = (user?.children ?? []) as unknown as ChildRecord[];

  if (children.length === 0) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No children are linked to your account yet. Please contact the school office to verify the relationship.
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
      <Users className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="text-sm text-gray-500 shrink-0">Viewing:</span>
      <Select value={activeChildId ?? children[0]._id} onValueChange={setActiveChildId}>
        <SelectTrigger className="w-full max-w-xs h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {children.map((child) => (
            <SelectItem key={child._id} value={child._id}>
              {child.firstName} {child.lastName}
              {child.classId?.name ? ` — ${child.classId.name}${child.sectionId?.name ? ` ${child.sectionId.name}` : ""}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
