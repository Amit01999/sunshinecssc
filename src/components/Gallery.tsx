import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ZoomIn } from 'lucide-react';
import { api } from '@/lib/api';
import claude from '@/assets/clude.png';

const imageModules = import.meta.glob('../assets/images/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const EXCLUDE = ['hero1.png', 'hero2.png', 'hero3.png', 'logo.png', 'unnamed.webp', 'clude.png'];

const fallbackImages: string[] = Object.entries(imageModules)
  .filter(([path]) => !EXCLUDE.some(ex => path.endsWith(ex)))
  .map(([, url]) => url)
  .slice(0, 8);

const Gallery = () => {
  const { data } = useQuery({
    queryKey: ['public-gallery-preview'],
    queryFn: async () => (await api.get('/gallery/images/public', { params: { featured: true } })).data.data as { url: string; altText?: string }[],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const previewImages = data?.length ? data.map((img) => img.url) : fallbackImages;

  return (
  <section id="gallery" className="pb-8 px-4 sm:px-6 lg:px-12">
    <div className="container mx-auto max-w-7xl">

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {previewImages.map((src, i) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            className="relative overflow-hidden rounded-2xl group cursor-pointer shadow-md aspect-[4/3]"
          >
            <img
              src={src}
              alt={`Gallery image ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              loading="lazy"
            />
            {/* Gradient + zoom icon on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3">
              <span className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ZoomIn className="w-4 h-4 text-white" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View More button */}
      <div className="text-center mt-10">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 px-9 py-3 rounded-full text-white font-semibold text-base tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          style={{
            background: 'linear-gradient(105deg, hsl(208,89%,40%), hsl(208,89%,28%))',
          }}
        >
          View Full Gallery
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>

    <div className="mt-12 -mx-4 sm:-mx-6 lg:-mx-12 overflow-hidden" style={{ lineHeight: 0 }}>
      <img
        src={claude}
        alt=""
        className="w-full block max-md:h-[140px] max-md:object-cover max-md:object-bottom md:h-auto"
        style={{ maxWidth: '100%' }}
      />
    </div>
  </section>
  );
};

export default Gallery;
