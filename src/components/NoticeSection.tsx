import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { api } from "@/lib/api";

const fallbackNotices = [
  {
    title: "35th Anniversary Celebrations",
    text: "Day long celebrations on the occasion of the 35th Anniversary of Sunshine Education will be held on 14th January. Location: Hall 24 Convention Center.",
    date: "Jan 11, 2020",
    isEvent: false,
  },
  {
    title: "Sunshine Open Day",
    text: "Sunshine Open Day for Academic Session 2019-20 will be held on 7th July. Time: 09.30 am - 3.00 pm.",
    date: "Jul 2, 2019",
    isEvent: false,
  },
];

interface PublicNotice {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface PublicEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
}

const NoticeSection = () => {
  const { data: notices } = useQuery({
    queryKey: ["public-notices-preview"],
    queryFn: async () => (await api.get("/notices/public")).data.data as PublicNotice[],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const { data: events } = useQuery({
    queryKey: ["public-events-preview"],
    queryFn: async () => (await api.get("/events/public")).data.data as PublicEvent[],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const combined = [
    ...(notices ?? []).map((n) => ({ title: n.title, text: n.body, sortDate: n.createdAt, isEvent: false })),
    ...(events ?? []).map((e) => ({ title: e.title, text: e.description ?? "", sortDate: e.startDate, isEvent: true })),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  const items = combined.length
    ? combined.slice(0, 3).map((item) => ({
        title: item.title,
        text: item.text,
        date: new Date(item.sortDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        isEvent: item.isEvent,
      }))
    : fallbackNotices;

  return (
    <section id="notice" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center mb-10 font-display text-foreground">
          <strong>Notice and Events</strong>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {items.map((n, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-card shadow-md p-6"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-xl font-bold font-display text-primary">
                  <Link to="/notice-and-events" className="hover:underline">{n.title}</Link>
                </h3>
                {n.isEvent && <CalendarDays className="w-4 h-4 text-primary shrink-0" />}
              </div>
              <span className="text-sm text-muted-foreground">{n.date}</span>
              <p className="text-muted-foreground leading-relaxed mt-3 line-clamp-3">{n.text}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            to="/notice-and-events"
            className="inline-flex items-center gap-2 px-9 py-3 rounded-full text-white font-semibold text-base tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            style={{ background: "linear-gradient(105deg, hsl(208,89%,40%), hsl(208,89%,28%))" }}
          >
            View All Notices
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NoticeSection;
