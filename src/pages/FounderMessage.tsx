import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import saifa from '@/assets/safia ghazi rahman.jpg';
const PRIMARY = 'hsl(208,89%,40%)';

const FounderMessage = () => (
  <>
    <Navbar />
    <main className="pt-[97px] min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Person image */}
        <div className="mb-8">
          <img
            src={saifa}
            alt="Founder & Chairman"
            className="w-48 h-auto object-cover"
          />
        </div>

        {/* Letter content */}
        <div className="text-sm text-gray-800 leading-relaxed space-y-4 max-w-3xl">
          <p>
            <strong>Dear Parents/Guardians,</strong>
          </p>

          <p style={{ color: PRIMARY }}>
            We welcome you to the Sunshine World. We are extremely happy to have
            your child with us in our Sunshine Family.
          </p>

          <p>
            The objective of Chittagong Sunshine School and College, is to
            provide a stimulating and challenging learning environment that
            enables students to develop the capacity of learning and operating
            the skills required to excel in this highly competitive and rapidly
            changing world. Sunshiners shall be very good human beings and pride
            of Bangladesh at <span style={{ color: PRIMARY }}>all</span> times
            Inshallah.
          </p>

          <p>
            You must be aware that our SSC, PSC and JSC results have been
            extraordinary, with students achieving the best grades.{' '}
            <span style={{ color: PRIMARY }}>All</span> our students at Sunshine
            Education have brought laurels to the institutions by being awarded
            for the best results in Bangladesh. Sunshine Education has been
            providing a pioneering and positive approach to the development of a
            student's future for the last thirty-five years. Academic staff of
            the Institution enjoy national and international recognition for
            their teaching quality and{' '}
            <span style={{ color: PRIMARY }}>continually</span> strive to enrich
            their skills further. All students are expected to abide by the
            rules and regulations strictly. Please read the School Prospectus
            provided in this website carefully.
          </p>

          <p>
            You are welcome to meet me personally through appointments with my
            secretary at the reception, after 1.30 p.m. on working days. Your
            sincere co-operation in the grooming and upbringing of your
            child/children will be highly appreciated. May the Almighty grant{' '}
            <span style={{ color: PRIMARY }}>all</span> Sunshiners a{' '}
            <span style={{ color: PRIMARY }}>brilliant</span> and glorious
            student life.
          </p>

          <p>Thank you.</p>
          <p>Yours sincerely,</p>
          <br />
          <p>Safia Ghazi Rahman</p>
          <p style={{ color: PRIMARY }}>
            Founder &amp; Principal Sunshine Education
          </p>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default FounderMessage;
