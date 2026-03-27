import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Import all local gallery images via Vite glob
const imageModules = import.meta.glob('../assets/images/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const EXCLUDE = ['hero1.png', 'hero2.png', 'hero3.png', 'logo.png', 'unnamed.webp', 'clude.png'];

const allImages: string[] = Object.entries(imageModules)
  .filter(([path]) => !EXCLUDE.some(ex => path.endsWith(ex)))
  .map(([, url]) => url);

// Also include the original WordPress gallery images as a fallback pool
const wpImages = [
  'https://sunshinecssc.com/wp-content/uploads/2019/02/20160412_104837-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/IMG201708241148291-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/IMG20170802105137-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/IMG_20160110_102504-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/20170221_095121-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/DSC_0093-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/20170803_091404-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/20170828_1101261-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/20170828_1100501-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/20170823_112218-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/20170815_095901-400x284.jpg',
  'https://sunshinecssc.com/wp-content/uploads/2019/02/20170817_103108-400x284.jpg',
];

const images = allImages.length > 0 ? allImages : wpImages;

const TABS = ['All', 'Events', 'Campus', 'Activities'];

const GalleryPage = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Simple partition: just show all images for every tab (real data doesn't have categories)
  const displayed = images;

  const openLightbox = (i: number) => setLightbox(i);
  const closeLightbox = () => setLightbox(null);

  const prev = useCallback(() => {
    setLightbox(i => (i === null ? null : (i - 1 + displayed.length) % displayed.length));
  }, [displayed.length]);

  const next = useCallback(() => {
    setLightbox(i => (i === null ? null : (i + 1) % displayed.length));
  }, [displayed.length]);

  return (
    <>
      <Navbar />
      <main className="pt-[97px] min-h-screen bg-gray-50">
        {/* Hero */}
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
              className="text-blue-200 text-sm font-medium tracking-widest uppercase mb-2"
            >
              Our Moments
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Photo Gallery
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 text-blue-100 text-base max-w-xl mx-auto"
            >
              Glimpses of life, learning, and laughter at Chittagong Sunshine School &amp; College.
            </motion.p>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 pt-10">
          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab
                    ? 'text-white shadow-md'
                    : 'text-gray-500 bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
                style={activeTab === tab ? { backgroundColor: 'hsl(208,89%,40%)' } : {}}
              >
                {tab}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400 font-medium">{displayed.length} photos</span>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            {displayed.map((src, i) => (
              <motion.div
                key={src}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.5) }}
                onClick={() => openLightbox(i)}
                className="relative overflow-hidden rounded-xl cursor-pointer group bg-gray-200 aspect-[4/3]"
              >
                <img
                  src={src}
                  alt={`Gallery photo ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {lightbox + 1} / {displayed.length}
            </span>

            {/* Prev */}
            <button
              onClick={e => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Image */}
            <motion.img
              key={lightbox}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              src={displayed[lightbox]}
              alt=""
              onClick={e => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            />

            {/* Next */}
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
};

export default GalleryPage;
