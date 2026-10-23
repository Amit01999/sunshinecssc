import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeachingAssignment } from "./useTeachingAssignments";

export function AssignmentPicker({
  assignments,
  value,
  onChange,
}: {
  assignments: TeachingAssignment[];
  value: string | undefined;
  onChange: (assignmentId: string) => void;
}) {
  if (assignments.length === 0) {
    return <p className="text-sm text-gray-400">You have no teaching assignments yet. Contact the school administrator.</p>;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full max-w-sm">
        <SelectValue placeholder="Select a class, section & subject" />
      </SelectTrigger>
      <SelectContent>
        {assignments.map((a) => (
          <SelectItem key={a._id} value={a._id}>
            {a.classId?.name} {a.sectionId?.name} — {a.subjectId?.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
