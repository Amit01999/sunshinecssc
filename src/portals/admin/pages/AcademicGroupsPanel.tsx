import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface SchoolClassOption {
  _id: string;
  name: string;
}

/** Manages academic streams (e.g. Science, Humanities, Business Studies) used to scope which
 *  classes a group-specific subject applies to — mainly relevant for higher-secondary levels. */
export function AcademicGroupsPanel({ classes }: { classes: SchoolClassOption[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: groups } = useQuery({
    queryKey: ["academic-groups"],
    queryFn: async () => (await api.get("/academic-groups")).data.data,
  });

  const [name, setName] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: async () => api.post("/academic-groups", { name, classIds }),
    onSuccess: () => {
      toast({ title: "Academic group created" });
      setName("");
      setClassIds([]);
      qc.invalidateQueries({ queryKey: ["academic-groups"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const toggleClass = (id: string) => {
    setClassIds((ids) => (ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Academic Groups / Streams</CardTitle>
        <p className="text-xs text-gray-500">
          Optional — use this for streams like Science, Humanities, or Business Studies that apply to specific classes
          (e.g. Class XI–XII). Subjects can be tagged to a group so they only show up for classes in that group.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input placeholder="Group name (e.g. Science)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-wrap gap-3 px-1">
            {classes.map((c) => (
              <label key={c._id} className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={classIds.includes(c._id)} onCheckedChange={() => toggleClass(c._id)} />
                {c.name}
              </label>
            ))}
          </div>
          <Button size="sm" onClick={() => create.mutate()} disabled={!name || create.isPending}>
            Create Group
          </Button>
        </div>

        {groups?.length ? (
          <div className="divide-y border-t">
            {groups.map((g: any) => (
              <div key={g._id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{g.name}</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {g.classIds?.length ? (
                    g.classIds.map((c: any) => (
                      <Badge key={c._id} variant="outline">{c.name}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">No classes linked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Layers} title="No academic groups yet" />
        )}
      </CardContent>
    </Card>
  );
}
