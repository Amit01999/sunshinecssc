import { Navigate, useNavigate } from "react-router-dom";
import { Users, Hash, Layers, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChildRecord {
  _id: string;
  firstName: string;
  lastName: string;
  studentCode?: string;
  rollNumber?: string;
  classId?: { name?: string };
  sectionId?: { name?: string };
}

export default function Children() {
  const { user, activeChildId, setActiveChildId } = useAuth();
  const navigate = useNavigate();

  // Parent-only page - students share this route tree but "Linked Children" has nothing
  // meaningful to show them (and the empty state's "link your child" copy would be confusing).
  if (user?.role !== "parent") return <Navigate to="/portal" replace />;

  const children = (user?.children ?? []) as unknown as ChildRecord[];

  return (
    <div>
      <PageHeader title="Linked Children" description="Every student verified as linked to your parent account." />

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No student is linked to your parent account yet"
          description="Please contact the school administrator to link your child."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {children.map((child) => {
            const isActive = activeChildId === child._id;
            return (
              <Card key={child._id} className={isActive ? "border-[hsl(208,89%,70%)]" : undefined}>
                <CardContent className="p-5 flex items-center gap-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback style={{ backgroundColor: "hsl(208,89%,40%)", color: "white" }}>
                      {`${child.firstName?.[0] ?? ""}${child.lastName?.[0] ?? ""}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">
                        {child.firstName} {child.lastName}
                      </p>
                      {isActive && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          Currently viewing
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-gray-500">
                      {child.studentCode && (
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" /> {child.studentCode}
                        </span>
                      )}
                      {child.classId?.name && (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {child.classId.name}
                          {child.sectionId?.name ? ` — ${child.sectionId.name}` : ""}
                        </span>
                      )}
                      {child.rollNumber && <span>Roll {child.rollNumber}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isActive ? "secondary" : "outline"}
                    onClick={() => {
                      setActiveChildId(child._id);
                      navigate("/portal");
                    }}
                  >
                    {isActive ? "View Dashboard" : "Switch"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
