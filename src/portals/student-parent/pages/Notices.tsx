import { useQuery } from "@tanstack/react-query";
import { Bell, Pin, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStudentScope } from "../useStudentScope";

interface Notice {
  _id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

interface SchoolEvent {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
}

export default function Notices() {
  const { isParent } = useStudentScope();

  const { data: notices, isLoading: loadingNotices } = useQuery({
    queryKey: ["my-notices"],
    queryFn: async () => (await api.get<{ data: Notice[] }>("/notices/mine")).data.data,
  });
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["my-events"],
    queryFn: async () => (await api.get<{ data: SchoolEvent[] }>("/events/mine")).data.data,
  });

  return (
    <div>
      <PageHeader
        title={isParent ? "School Notices and Updates" : "Notices & Events"}
        description={
          isParent
            ? "School-wide announcements and upcoming events, plus anything specific to your linked children's classes."
            : "Announcements and upcoming events relevant to you."
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Notices</h3>
          {loadingNotices ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : notices && notices.length > 0 ? (
            <div className="space-y-3">
              {notices.map((n) => (
                <Card key={n._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-gray-800">{n.title}</p>
                      {n.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-3">{n.body}</p>
                    <p className="text-[11px] text-gray-400 mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Bell} title="No notices right now" />
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Upcoming Events</h3>
          {loadingEvents ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : events && events.length > 0 ? (
            <div className="space-y-3">
              {events.map((e) => (
                <Card key={e._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-gray-800">{e.title}</p>
                      <Badge variant="outline">{new Date(e.startDate).toLocaleDateString()}</Badge>
                    </div>
                    {e.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{e.description}</p>}
                    {e.location && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {e.location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Bell} title="No upcoming events" />
          )}
        </div>
      </div>
    </div>
  );
}
