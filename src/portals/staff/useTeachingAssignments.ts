import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface TeachingAssignment {
  _id: string;
  academicYearId: string;
  classId: { _id: string; name: string };
  sectionId: { _id: string; name: string };
  subjectId: { _id: string; name: string };
}

interface RawTeachingAssignment {
  _id: string;
  academicYearId: string;
  classId: { _id: string; name: string } | null;
  sectionId: { _id: string; name: string } | null;
  subjectId: { _id: string; name: string } | null;
}

export function useTeachingAssignments() {
  return useQuery({
    queryKey: ["my-teaching-assignments"],
    queryFn: async () => {
      const raw = (await api.get<{ data: RawTeachingAssignment[] }>("/teaching-assignments/mine")).data.data;
      // A class/section/subject referenced here may have since been deleted elsewhere without
      // cleaning up this assignment — populate() then resolves it to null. Drop those rather than
      // let every page that consumes this hook crash trying to read .name off a missing class/subject.
      return raw.filter((a) => a.classId && a.sectionId && a.subjectId) as TeachingAssignment[];
    },
  });
}
