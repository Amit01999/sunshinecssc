import { motion } from 'framer-motion';
import { Newspaper } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const NewsMedia = () => (
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
            Media Coverage
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white"
          >
            News and Media
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-3 text-blue-100 text-base max-w-xl mx-auto"
          >
            Latest news, press coverage, and media highlights from Chittagong Sunshine School &amp; College.
          </motion.p>
        </div>
      </div>

      {/* Empty state */}
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
            <Newspaper className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-3">Nothing Published Yet</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            News articles and media features will be shared here once available. Stay tuned for updates on school
            achievements, events, and coverage from Chittagong Sunshine School &amp; College.
          </p>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 justify-center">
            <span className="w-10 h-[2px] rounded-full" style={{ backgroundColor: 'hsl(208,89%,40%)' }} />
            <span className="text-xs text-gray-400 tracking-widest uppercase">Coming Soon</span>
            <span className="w-10 h-[2px] rounded-full" style={{ backgroundColor: 'hsl(208,89%,40%)' }} />
          </div>
        </motion.div>
      </div>
    </main>
    <Footer />
  </>
);

export default NewsMedia;
