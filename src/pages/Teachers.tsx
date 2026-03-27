import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PRIMARY = 'hsl(208,89%,40%)';

const teachers = [
  {
    name: 'Name Goes Here',
    position: 'English Department',
    initials: 'NG',
    color: '#1976D2',
  },
  {
    name: 'Name Goes Here',
    position: 'Mathematics Department',
    initials: 'NG',
    color: '#F4511E',
  },
  {
    name: 'Name Goes Here',
    position: 'Physics Department',
    initials: 'NG',
    color: '#F9A825',
  },
  {
    name: 'Name Goes Here',
    position: 'Chemistry Department',
    initials: 'NG',
    color: '#558B2F',
  },
  {
    name: 'Name Goes Here',
    position: 'Bangla Department',
    initials: 'NG',
    color: '#D84315',
  },
  {
    name: 'Name Goes Here',
    position: 'Computer Science',
    initials: 'NG',
    color: '#004D40',
  },
  {
    name: 'Name Goes Here',
    position: 'Accounting Department',
    initials: 'NG',
    color: '#880E4F',
  },
  {
    name: 'Name Goes Here',
    position: 'General Education',
    initials: 'NG',
    color: '#0D47A1',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const Teachers = () => (
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
                  {teacher.initials}
                </div>
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
                <p className="text-gray-500 text-xs leading-relaxed">
                  Your content goes here. Edit or remove this text inline or in
                  the module Content settings. You can also style every aspect
                  of this content in the module{' '}
                  <span style={{ color: PRIMARY }}>Design settings</span> and
                  even apply custom CSS to this text in the module{' '}
                  <span style={{ color: PRIMARY }}>Advanced settings.</span>
                </p>

                {/* View profile button */}
                {/* <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-4 w-full py-2 rounded-lg text-xs font-semibold text-white transition-colors duration-200"
                  style={{ backgroundColor: teacher.color }}
                >
                  View Profile
                </motion.button> */}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
    <Footer />
  </>
);

export default Teachers;
