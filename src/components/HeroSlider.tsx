import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import hero1 from '@/assets/images/hero1.png';
import hero2 from '@/assets/images/hero2.png';
import hero3 from '@/assets/images/hero3.png';

const slides = [
  {
    src: hero1,
    alt: 'Chittagong Sunshine School & College campus',
  },
  {
    src: hero2,
    alt: 'Students at Chittagong Sunshine School',
  },
  {
    src: hero3,
    alt: 'School event at Chittagong Sunshine School & College',
  },
];

const AUTOPLAY_DELAY = 5000;

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, AUTOPLAY_DELAY);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section
      id="home"
      className="relative w-full"
      style={{ marginTop: '100px' }}
    >
      {/* Slider viewport */}
      <div className="relative w-full h-[480px] md:h-[560px] lg:h-[500px] overflow-hidden">
        {/*
          All slides are always in the DOM, stacked via absolute positioning.
          Only opacity is animated — the active slide fades in on top of the
          previous one. No background color ever becomes visible, no gap,
          no flash.
        */}
        {slides.map((slide, i) => (
          <motion.div
            key={i}
            animate={{ opacity: i === current ? 1 : 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            className="absolute inset-0"
            style={{
              zIndex: i === current ? 1 : 0,
              willChange: 'opacity',
            }}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
          </motion.div>
        ))}

        {/* Subtle dark overlay — sits above all slides */}
        <div className="absolute inset-0 bg-black/10" style={{ zIndex: 2 }} />

        {/* Dot indicators */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5" style={{ zIndex: 10 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-3.5 h-3.5 bg-white opacity-100'
                  : 'w-3 h-3 bg-white opacity-50 hover:opacity-75'
              }`}
            />
          ))}
        </div>

        {/* Prev arrow */}
        <button
          onClick={() =>
            setCurrent(prev => (prev - 1 + slides.length) % slides.length)
          }
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors duration-200 backdrop-blur-sm"
          style={{ zIndex: 10 }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Next arrow */}
        <button
          onClick={() => setCurrent(prev => (prev + 1) % slides.length)}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors duration-200 backdrop-blur-sm"
          style={{ zIndex: 10 }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Divi-style chevron divider */}
      <div className="relative -mt-px overflow-hidden">
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="w-full h-[65px] md:h-[90px] block"
        >
          {/* Back layer — lighter blue */}
          <path
            d="M0,0 L720,90 L1440,0 L1440,0 L0,0 Z"
            fill="hsl(208 60% 60% / 0.45)"
          />
          {/* Front layer — primary blue */}
          <path
            d="M0,0 L720,75 L1440,0 L1440,0 L0,0 Z"
            fill="hsl(208,89%,40%)"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSlider;
