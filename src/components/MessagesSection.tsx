import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import saifa from '@/assets/safia ghazi rahman.jpg';
import sameer from '@/assets/samir rahaman.jpg';

interface MessageCardProps {
  title: string;
  image: string; // set to "" or a real URL — layout never changes
  name: string;
  role: string;
  text: string;
  link: string;
  color: string; // one of the brand palette colours
}

interface CmsMessageCard {
  title: string;
  name: string;
  role: string;
  text: string;
  link: string;
  color: string;
  imageUrl?: string;
}

interface CmsMessagesSection {
  sectionTitle: string;
  cards: CmsMessageCard[];
}

/** Converts a hex colour to rgba with the given opacity */
const hex2rgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const AvatarImage = ({
  src,
  alt,
  color,
}: {
  src: string;
  alt: string;
  color: string;
}) => {
  const [failed, setFailed] = useState(!src);

  return (
    <div className="w-24 h-24 rounded-full overflow-hidden shrink-0 ring-4 ring-white shadow-md">
      {!failed ? (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div
          className="w-full h-full flex items-end justify-center"
          style={{
            background: `linear-gradient(160deg, ${hex2rgba(color, 0.55)} 0%, ${color} 100%)`,
          }}
        >
          <svg
            viewBox="0 0 80 80"
            className="w-[72%] translate-y-1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="40" cy="26" r="16" fill="white" fillOpacity="0.9" />
            <ellipse
              cx="40"
              cy="68"
              rx="26"
              ry="20"
              fill="white"
              fillOpacity="0.9"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

const MessageCard = ({
  title,
  image,
  name,
  role,
  text,
  link,
  color,
}: MessageCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ duration: 0.55, ease: 'easeOut' }}
    className="bg-card rounded-2xl shadow-lg overflow-hidden flex flex-col"
  >
    {/* Card header — light tint of the card's palette colour */}
    <div
      className="px-6 pt-7 pb-5 flex items-center gap-4"
      style={{
        background: `linear-gradient(135deg, ${hex2rgba(color, 0.1)} 0%, ${hex2rgba(color, 0.2)} 100%)`,
      }}
    >
      <AvatarImage src={image} alt={name} color={color} />
      <div>
        <p className="font-bold text-gray-800 leading-snug">{name}</p>
        <p
          className="text-xs font-semibold mt-0.5 leading-snug"
          style={{ color }}
        >
          {role}
        </p>
      </div>
    </div>

    {/* Card body */}
    <div className="px-6 py-5 flex flex-col flex-1">
      <h3 className="text-lg font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm flex-1 line-clamp-5">
        <strong>Dear Parents/Guardians,</strong>
        <br />
        <br />
        {text}
      </p>

      <Link
        to={link}
        className="mt-6 self-start inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold text-sm tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        style={{
          background: `linear-gradient(105deg, ${color}, ${hex2rgba(color, 0.75)})`,
        }}
      >
        Read More
        <svg
          className="w-3.5 h-3.5"
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
      </Link>
    </div>
  </motion.div>
);

const DEFAULT_SECTION_TITLE = 'Messages from Our Leadership';

const fallbackMessages: MessageCardProps[] = [
  {
    title: "Founder & Chairman's Message",
    image: saifa,
    name: 'Safia Ghazi Rahman',
    role: 'Founder & Principal, Sunshine Education',
    text: 'We welcome you to the Sunshine World. We are extremely happy to have your child with us in our Sunshine Family.\n\nThe objective of Chittagong Sunshine School and College, is to provide a stimulating and challenging learning environment that enables students to develop the capacity of learning and operating the skills required to excel in this highly competitive and rapidly changing world. Sunshiners shall be very good human beings and pride of Bangladesh at all times Inshallah.',
    link: '/message/founder',
    color: '#9C8ED7', // soft purple
  },
  {
    title: "Director's Message",
    image: sameer,
    name: 'Sameer Ghazi Rahman',
    role: 'Director of Academics, Sunshine Education',
    text: 'As the Director of Academics of Sunshine Education for the past seven years, I have seen excellent performances from the students of Chittagong Sunshine School & College (CSSC).\n\nEstablished in 2005, Chittagong Sunshine School was created to meet the growing demand of National Curriculum in English Version (SSC) in Chattogram.',
    link: '/message/director',
    color: '#3C76A6', // medium blue
  },
  {
    title: "Headmaster's Message",
    image: 'http://sunshinecssc.com/wp-content/uploads/2019/03/Shuva-Saha.jpg',
    name: 'Shuva Saha',
    role: 'Headmaster, CSSC',
    text: 'Welcome to the official website of Chittagong Sunshine School & College (CSSC). It is a great pleasure to share our views and thoughts through this website. Our mission is to nurture a child into a well-rounded person during their schooling years in our Institution.',
    link: '/message/headmaster',
    color: '#EBBA79', // warm amber
  },
];

const MessagesSection = () => {
  const { data } = useQuery({
    queryKey: ['public-homepage-hero'],
    queryFn: async () => (await api.get('/cms/homepage/public')).data.data as { messagesSection?: CmsMessagesSection },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const cms = data?.messagesSection;
  const sectionTitle = cms?.sectionTitle || DEFAULT_SECTION_TITLE;
  const messages: MessageCardProps[] =
    cms?.cards?.length
      ? cms.cards.map((c) => ({
          title: c.title,
          image: c.imageUrl ?? '',
          name: c.name,
          role: c.role,
          text: c.text,
          link: c.link,
          color: c.color,
        }))
      : fallbackMessages;

  return (
    <section id="message" className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center font-display text-foreground">
          {sectionTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {messages.map((m, i) => (
            <MessageCard key={m.link || i} {...m} />
          ))}
        </div>
      </div>

      {/* Divi-style chevron divider */}
      <div className="relative mt-20 overflow-hidden">
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="w-full h-[65px] md:h-[90px] block"
        >
          {/* Back layer — lighter blue */}
          <path
            d="M0,90 L720,0 L1440,90 L1440,90 L0,90 Z"
            fill="hsl(208 60% 60% / 0.45)"
          />
          {/* Front layer — primary blue */}
          <path
            d="M0,90 L720,15 L1440,90 L1440,90 L0,90 Z"
            fill="hsl(208,89%,40%)"
          />
        </svg>
      </div>
    </section>
  );
};

export default MessagesSection;
