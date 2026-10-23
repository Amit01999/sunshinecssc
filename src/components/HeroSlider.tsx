import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import hero1 from '@/assets/images/hero1.png';
import hero2 from '@/assets/images/hero2.png';
import hero3 from '@/assets/images/hero3.png';

interface Slide {
  src: string;
  alt: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  focalPosition?: string;
}

const fallbackSlides: Slide[] = [
  { src: hero1, alt: 'Chittagong Sunshine School & College campus' },
  { src: hero2, alt: 'Students at Chittagong Sunshine School' },
  { src: hero3, alt: 'School event at Chittagong Sunshine School & College' },
];

interface CmsHeroSlide {
  imageUrl: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  focalPosition?: string;
}

const AUTOPLAY_DELAY = 5000;

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);

  const { data } = useQuery({
    queryKey: ['public-homepage-hero'],
    queryFn: async () => (await api.get('/cms/homepage/public')).data.data as { heroSlides: CmsHeroSlide[] },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // The CMS is the source of truth once it has at least one published slide; until then,
  // or if it's unreachable, the site keeps shipping with its original built-in hero images.
  const slides = useMemo<Slide[]>(() => {
    if (data?.heroSlides?.length) {
      return data.heroSlides.map((s) => ({
        src: s.imageUrl,
        alt: s.heading ?? 'Chittagong Sunshine School & College',
        heading: s.heading,
        subheading: s.subheading,
        ctaLabel: s.ctaLabel,
        ctaHref: s.ctaHref,
        focalPosition: s.focalPosition,
      }));
    }
    return fallbackSlides;
  }, [data]);

  const goTo = useCallback((index: number) => setCurrent(index), []);
  const next = useCallback(() => setCurrent((prev) => (prev + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [slides.length, current]);

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
            key={slide.src + i}
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
              style={{ objectPosition: slide.focalPosition ?? 'center' }}
              loading="eager"
              decoding="async"
            />
            {(slide.heading || slide.subheading) && (
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-[1400px] mx-auto px-6 w-full">
                  <div className="max-w-xl text-white drop-shadow-md">
                    {slide.heading && <h1 className="text-3xl md:text-5xl font-bold font-display mb-3">{slide.heading}</h1>}
                    {slide.subheading && <p className="text-base md:text-lg text-white/90 mb-5">{slide.subheading}</p>}
                    {slide.ctaLabel && slide.ctaHref && (
                      <a
                        href={slide.ctaHref}
                        className="inline-block px-6 py-3 rounded-xl text-sm font-semibold shadow-lg"
                        style={{ backgroundColor: 'hsl(208,89%,40%)' }}
                      >
                        {slide.ctaLabel}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
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
