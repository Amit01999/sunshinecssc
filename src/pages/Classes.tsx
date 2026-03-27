import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const classes = [
  { label: 'Play Group', color: 'from-[#1976D2] to-[#42A5F5]' },
  { label: 'Nursery', color: 'from-[#F4511E] to-[#FF8A65]' },
  { label: 'Kindergarten', color: 'from-[#F9A825] to-[#FFD54F]' },
  { label: 'Class-1', color: 'from-[#558B2F] to-[#9CCC65]' },
  { label: 'Class-2', color: 'from-[#D84315] to-[#FF7043]' },
  { label: 'Class-3', color: 'from-[#004D40] to-[#26A69A]' },
  { label: 'Class-4', color: 'from-[#880E4F] to-[#E91E8C]' },
  { label: 'Class-5', color: 'from-[#00838F] to-[#4DD0E1]' },
  { label: 'Class-6', color: 'from-[#0D47A1] to-[#1976D2]' },
  { label: 'Class-7', color: 'from-[#E64A19] to-[#FF7043]' },
  { label: 'Class-8', color: 'from-[#E65100] to-[#FFA726]' },
  { label: 'Class-9', color: 'from-[#2E7D32] to-[#66BB6A]' },
  { label: 'Class-10', color: 'from-[#827717] to-[#D4E157]' },
  { label: 'Class-11', color: 'from-[#006064] to-[#00ACC1]' },
  { label: 'Class-12', color: 'from-[#AD1457] to-[#F06292]' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const Classes = () => (
  <>
    <Navbar />
    <main className="pt-[97px] min-h-screen bg-gray-50">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(208,89%,40%) 0%, hsl(208,89%,28%) 100%)' }}
      >
        <div className="absolute inset-0 opacity-10"
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
            Our Classes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-3 text-blue-100 text-base max-w-xl mx-auto"
          >
            From Play Group to Class-12 — nurturing every student at every stage.
          </motion.p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="max-w-6xl mx-auto px-6 py-14">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
        >
          {classes.map(cls => (
            <motion.div
              key={cls.label}
              variants={cardVariant}
              whileHover={{ y: -6, scale: 1.03 }}
              className={`bg-gradient-to-br ${cls.color} rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer`}
            >
              <div className="flex items-center justify-center px-4 py-10">
                <span className="text-white text-lg font-bold text-center leading-snug drop-shadow-sm">
                  {cls.label}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
    <Footer />
  </>
);

export default Classes;
