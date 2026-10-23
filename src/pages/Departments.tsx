import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';

interface DisplayDepartment {
  label: string;
  icon: string;
  color: string;
  desc: string;
  image?: string;
}

const fallbackDepartments: DisplayDepartment[] = [
  { label: 'Bangla', icon: 'অ', color: 'from-[#1976D2] to-[#42A5F5]', desc: 'Language & Literature' },
  { label: 'English', icon: 'A', color: 'from-[#F4511E] to-[#FF8A65]', desc: 'Language & Communication' },
  { label: 'Physics', icon: '⚛', color: 'from-[#F9A825] to-[#FFD54F]', desc: 'Science & Mechanics' },
  { label: 'Chemistry', icon: '⚗', color: 'from-[#558B2F] to-[#9CCC65]', desc: 'Molecular Science' },
  { label: 'Mathematics', icon: '∑', color: 'from-[#D84315] to-[#FF7043]', desc: 'Numbers & Logic' },
  { label: 'Computer Science', icon: '💻', color: 'from-[#004D40] to-[#26A69A]', desc: 'Technology & Programming' },
  { label: 'Accounting', icon: '₿', color: 'from-[#880E4F] to-[#E91E8C]', desc: 'Finance & Commerce' },
];

const GRADIENTS = [
  'from-[#1976D2] to-[#42A5F5]',
  'from-[#F4511E] to-[#FF8A65]',
  'from-[#F9A825] to-[#FFD54F]',
  'from-[#558B2F] to-[#9CCC65]',
  'from-[#D84315] to-[#FF7043]',
  'from-[#004D40] to-[#26A69A]',
  'from-[#880E4F] to-[#E91E8C]',
];

interface ApiDepartment {
  _id: string;
  name: string;
  description?: string;
  image?: { url: string };
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const Departments = () => {
  const { data } = useQuery({
    queryKey: ['public-departments'],
    queryFn: async () => (await api.get('/departments/public')).data.data as ApiDepartment[],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const departments = useMemo<DisplayDepartment[]>(() => {
    if (data?.length) {
      return data.map((d, i) => ({
        label: d.name,
        icon: d.name[0]?.toUpperCase() ?? '•',
        color: GRADIENTS[i % GRADIENTS.length],
        desc: d.description ?? '',
        image: d.image?.url,
      }));
    }
    return fallbackDepartments;
  }, [data]);

  return (
    <>
      <Navbar />
      <main className="pt-[97px] min-h-screen bg-gray-50">
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
              Academics
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Departments
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-3 text-blue-100 text-base max-w-xl mx-auto"
            >
              Specialized academic departments delivering excellence across every discipline.
            </motion.p>
          </div>
        </div>

        {/* Cards grid */}
        <div className="max-w-6xl mx-auto px-6 py-14">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {departments.map(dept => (
              <motion.div
                key={dept.label}
                variants={cardVariant}
                whileHover={{ y: -8, scale: 1.03 }}
                className={`bg-gradient-to-br ${dept.color} rounded-2xl shadow-md hover:shadow-2xl transition-shadow duration-300 cursor-pointer group overflow-hidden`}
              >
                {dept.image ? (
                  <div className="h-28 w-full overflow-hidden">
                    <img src={dept.image} alt={dept.label} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : null}
                <div className="flex flex-col items-center justify-center px-6 py-10 gap-3">
                  <span className="text-4xl opacity-80 group-hover:scale-110 transition-transform duration-300">
                    {dept.icon}
                  </span>
                  <span className="text-white text-xl font-bold text-center leading-snug drop-shadow-sm">
                    {dept.label}
                  </span>
                  {dept.desc && (
                    <span className="text-white/70 text-xs font-medium text-center tracking-wide">
                      {dept.desc}
                    </span>
                  )}
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

export default Departments;
