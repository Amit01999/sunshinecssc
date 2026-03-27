import { motion } from 'framer-motion';

interface Highlight {
  title: string;
  color: string;
  gradient: string;
}

const highlights: Highlight[] = [
  {
    title: 'From the beginning 100% pass on PECE, JSC and SSC',
    color: '#7B5EA7',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
  },
  {
    title: 'Own land (CDA and Board approved)',
    color: '#1e6fa8',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #1d6fa8 100%)',
  },
  {
    title: 'Board authorized science and computer lab',
    color: '#16a34a',
    gradient: 'linear-gradient(135deg, #4ade80 0%, #15803d 100%)',
  },
  {
    title: 'Indoor & Outdoor Games Setup',
    color: '#d97706',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  },
  {
    title: 'SMS service',
    color: '#0e7490',
    gradient: 'linear-gradient(135deg, #67e8f9 0%, #0e7490 100%)',
  },
  {
    title: '88Kv FG Wilson Generator as Power Backup',
    color: '#9333ea',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #9333ea 100%)',
  },
  {
    title: '300 Seat Auditorium',
    color: '#1d4ed8',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)',
  },
  {
    title: 'Fully Air-conditioned Classrooms',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
  },
];

const Highlights = () => (
  <section
    className="py-8 px-4 sm:px-6 lg:px-8"
    style={{
      backgroundImage:
        'url(http://sunshinecssc.com/wp-content/uploads/2019/01/shapes-bg-color.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  >
    {/* Cloud divider top */}
    {/* <div className="-mt-20 mb-8">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-[60px]" style={{ display: 'block' }}>
        <path d="M0,0 C240,80 480,20 720,60 C960,100 1200,40 1440,80 L1440,0 Z" fill="hsl(var(--primary))" />
      </svg>
    </div> */}

    <div className="container mx-auto">
      <h2 className="text-4xl font-bold text-center mb-12 font-display text-foreground">
        Highlights
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {highlights.map((h, i) => (
          <motion.div
            key={h.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-2xl p-6 text-center flex items-center justify-center min-h-[190px] transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] relative overflow-hidden cursor-default"
            style={{
              background: h.gradient,
              boxShadow: `0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.14)`,
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            {/* Top gloss shine */}
            <div
              className="absolute inset-x-0 top-0 h-[55%] pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.0) 100%)',
                borderRadius: '1rem 1rem 50% 50%',
              }}
            />
            {/* Bottom subtle glow */}
            <div
              className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
              style={{
                background: 'linear-gradient(0deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 100%)',
              }}
            />
            <h3 className="relative text-base font-bold leading-snug tracking-wide drop-shadow-sm" style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.30)' }}>
              {h.title}
            </h3>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Highlights;
