import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';

const PRIMARY = 'hsl(208,89%,40%)';
const COLORS = ['#1976D2', '#F4511E', '#F9A825', '#558B2F', '#D84315', '#004D40', '#880E4F', '#0D47A1'];

interface DisplayTeacher {
  name: string;
  position: string;
  color: string;
  photo?: string;
  bio?: string;
}

const fallbackTeachers: DisplayTeacher[] = [
  { name: 'Name Goes Here', position: 'English Department', color: COLORS[0] },
  { name: 'Name Goes Here', position: 'Mathematics Department', color: COLORS[1] },
  { name: 'Name Goes Here', position: 'Physics Department', color: COLORS[2] },
  { name: 'Name Goes Here', position: 'Chemistry Department', color: COLORS[3] },
  { name: 'Name Goes Here', position: 'Bangla Department', color: COLORS[4] },
  { name: 'Name Goes Here', position: 'Computer Science', color: COLORS[5] },
  { name: 'Name Goes Here', position: 'Accounting Department', color: COLORS[6] },
  { name: 'Name Goes Here', position: 'General Education', color: COLORS[7] },
];

interface ApiTeacher {
  _id: string;
  firstName: string;
  lastName: string;
  designation?: string;
  bio?: string;
  photo?: { url: string };
  departmentId?: { name: string };
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const Teachers = () => {
  const { data } = useQuery({
    queryKey: ['public-teachers'],
    queryFn: async () => (await api.get('/teachers/public')).data.data as ApiTeacher[],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const teachers = useMemo<DisplayTeacher[]>(() => {
    if (data?.length) {
      return data.map((t, i) => ({
        name: `${t.firstName} ${t.lastName}`,
        position: t.departmentId?.name ?? t.designation ?? 'Faculty',
        color: COLORS[i % COLORS.length],
        photo: t.photo?.url,
        bio: t.bio,
      }));
    }
    return fallbackTeachers;
  }, [data]);

  return (
    <>
      <Navbar />
      <main className="pt-[97px] min-h-screen bg-gray-50">
        {/* Hero banner */}
        <div
          className="relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, hsl(208,89%,40%) 0%, hsl(208,89%,28%) 100%)',
          }}
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
              Academics
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Our Teachers
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-3 text-blue-100 text-base max-w-xl mx-auto"
            >
              Dedicated educators committed to shaping the leaders of tomorrow.
            </motion.p>
          </div>
        </div>

        {/* Teacher cards grid */}
        <div className="max-w-6xl mx-auto px-6 py-14">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {teachers.map((teacher, i) => (
              <motion.div
                key={i}
                variants={cardVariant}
                whileHover={{ y: -6 }}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                {/* Avatar area */}
                <div className="relative h-52 bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                  {/* Decorative top bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: teacher.color }}
                  />
                  {teacher.photo ? (
                    <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      {/* Silhouette SVG */}
                      <svg
                        viewBox="0 0 200 200"
                        className="w-36 h-36 opacity-30"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="100" cy="72" r="42" fill="#9CA3AF" />
                        <ellipse cx="100" cy="175" rx="70" ry="48" fill="#9CA3AF" />
                      </svg>
                      {/* Initials badge */}
                      <div
                        className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                        style={{ backgroundColor: teacher.color }}
                      >
                        {teacher.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    </>
                  )}
                </div>

                {/* Info area */}
                <div className="p-5">
                  <h3 className="text-gray-800 font-semibold text-base leading-snug group-hover:text-[hsl(208,89%,40%)] transition-colors duration-200">
                    {teacher.name}
                  </h3>
                  <p
                    className="text-xs font-semibold mt-1 mb-3 tracking-wide uppercase"
                    style={{ color: teacher.color }}
                  >
                    {teacher.position}
                  </p>
                  {teacher.bio ? (
                    <p className="text-gray-500 text-xs leading-relaxed">{teacher.bio}</p>
                  ) : !data?.length ? (
                    <p className="text-gray-500 text-xs leading-relaxed">
                      Your content goes here. Edit or remove this text inline or in
                      the module Content settings. You can also style every aspect
                      of this content in the module{' '}
                      <span style={{ color: PRIMARY }}>Design settings</span> and
                      even apply custom CSS to this text in the module{' '}
                      <span style={{ color: PRIMARY }}>Advanced settings.</span>
                    </p>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Teachers;
