import { motion } from "framer-motion";

const notices = [
  {
    title: "35th Anniversary Celebrations",
    text: "Day long celebrations on the occasion of the 35th Anniversary of Sunshine Education will be held on 14th January. Location: Hall 24 Convention Center.",
    date: "Jan 11, 2020",
  },
  {
    title: "Sunshine Open Day",
    text: "Sunshine Open Day for Academic Session 2019-20 will be held on 7th July. Time: 09.30 am - 3.00 pm.",
    date: "Jul 2, 2019",
  },
];

const NoticeSection = () => (
  <section id="notice" className="py-16 px-4 sm:px-6 lg:px-8">
    <div className="container mx-auto">
      <h2 className="text-4xl font-bold text-center mb-10 font-display text-foreground">
        <strong>Notice and Events</strong>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {notices.map((n, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="bg-card shadow-md p-6"
          >
            <h3 className="text-xl font-bold font-display text-primary mb-2">
              <a href="#" className="hover:underline">{n.title}</a>
            </h3>
            <span className="text-sm text-muted-foreground">{n.date}</span>
            <p className="text-muted-foreground leading-relaxed mt-3">{n.text}</p>
          </motion.div>
        ))}
        <div />
      </div>
      <div className="text-center mt-10">
        <a
          href="#"
          className="inline-flex items-center gap-2 px-9 py-3 rounded-full text-white font-semibold text-base tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          style={{ background: "linear-gradient(105deg, hsl(208,89%,40%), hsl(208,89%,28%))" }}
        >
          View All Notices
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  </section>
);

export default NoticeSection;
