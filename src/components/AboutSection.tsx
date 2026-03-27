import { motion } from 'framer-motion';

const AboutSection = () => (
  <section id="about" className="py-8 px-4 sm:px-6 lg:px-8 bg-white">
    <div className="container mx-auto max-w-8xl text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl font-bold mb-6" style={{ color: '#2d3748' }}>
          About us
        </h2>
        <div className="space-y-3">
          <p
            style={{
              color: '#66758A',
              fontSize: '14px',
              fontFamily: '"Open Sans", Arial, sans-serif',
              lineHeight: '1.75',
            }}
          >
            Chittagong Sunshine School & College is one of Bangladesh's leading
            private English Medium schools for boys and girls aged 3–18. The
            institution is proud of the academic achievements of its students
            and strives to provide excellent facilities and resources to both
            students and staff for academic and personal development.
          </p>
          <p
            style={{
              color: '#66758A',
              fontSize: '14px',
              fontFamily: '"Open Sans", Arial, sans-serif',
              lineHeight: '1.75',
            }}
          >
            Chittagong Sunshine School & College is proud of its strong academic
            tradition. The School believes that a good education is the key to
            the development of character, values and morals. With this aim in
            view, Chittagong Sunshine School & College strives to offer a well
            balanced education, with particular emphasis on the intellectual,
            physical and spiritual development of each pupil of the school.
          </p>
        </div>
      </motion.div>
    </div>
  </section>
);

export default AboutSection;
