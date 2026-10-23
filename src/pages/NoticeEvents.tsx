import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Bell, Pin, MapPin, CalendarDays } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';

interface PublicNotice {
  _id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

interface PublicEvent {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  image?: { url: string };
}

const NoticeEvents = () => {
  const { data: notices, isLoading: loadingNotices } = useQuery({
    queryKey: ['public-notices'],
    queryFn: async () => (await api.get('/notices/public')).data.data as PublicNotice[],
    retry: 1,
  });
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['public-events'],
    queryFn: async () => (await api.get('/events/public')).data.data as PublicEvent[],
    retry: 1,
  });

  const isLoading = loadingNotices || loadingEvents;
  const hasContent = Boolean(notices?.length || events?.length);

  return (
    <>
      <Navbar />
      <main className="pt-[97px] min-h-screen bg-gray-50 flex flex-col">
        {/* Hero banner */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(208,89%,40%) 0%, hsl(208,89%,28%) 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-6 py-14 text-center">
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-blue-200 text-sm font-medium tracking-widest uppercase mb-2"
            >
              Stay Updated
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Notice and Events
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-3 text-blue-100 text-base max-w-xl mx-auto"
            >
              Important announcements, upcoming events, and school notices — all in one place.
            </motion.p>
          </div>
        </div>

        {!isLoading && hasContent ? (
          <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-14 grid lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <Bell className="w-5 h-5" style={{ color: 'hsl(208,89%,40%)' }} /> Notices
              </h2>
              {notices?.length ? (
                <div className="space-y-4">
                  {notices.map((n) => (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white rounded-xl shadow-sm p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-800">{n.title}</h3>
                        {n.isPinned && <Pin className="w-4 h-4 text-amber-500 shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-3">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No notices right now.</p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" style={{ color: 'hsl(208,89%,40%)' }} /> Upcoming Events
              </h2>
              {events?.length ? (
                <div className="space-y-4">
                  {events.map((e) => (
                    <motion.div
                      key={e._id}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white rounded-xl shadow-sm overflow-hidden"
                    >
                      {e.image?.url && <img src={e.image.url} alt={e.title} className="w-full h-36 object-cover" />}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-800">{e.title}</h3>
                          <span className="text-xs text-gray-400 shrink-0">{new Date(e.startDate).toLocaleDateString()}</span>
                        </div>
                        {e.description && <p className="text-sm text-gray-500 mt-2">{e.description}</p>}
                        {e.location && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {e.location}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No upcoming events right now.</p>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center max-w-md"
            >
              {/* Icon */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                style={{ background: 'linear-gradient(135deg, hsl(208,89%,40%), hsl(208,89%,55%))' }}
              >
                <Bell className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-3">No Notices Yet</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                There are currently no notices or upcoming events to display. Please check back soon — new announcements
                will appear here as they are published by the school administration.
              </p>

              {/* Decorative divider */}
              <div className="flex items-center gap-3 justify-center">
                <span className="w-10 h-[2px] rounded-full" style={{ backgroundColor: 'hsl(208,89%,40%)' }} />
                <span className="text-xs text-gray-400 tracking-widest uppercase">Coming Soon</span>
                <span className="w-10 h-[2px] rounded-full" style={{ backgroundColor: 'hsl(208,89%,40%)' }} />
              </div>
            </motion.div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default NoticeEvents;
