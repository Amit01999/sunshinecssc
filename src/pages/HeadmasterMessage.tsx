import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PRIMARY = 'hsl(208,89%,40%)';

const HeadmasterMessage = () => (
  <>
    <Navbar />
    <main className="pt-[97px] min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Person image */}
        <div className="mb-8">
          <img
            src="http://sunshinecssc.com/wp-content/uploads/2019/03/Shuva-Saha.jpg"
            alt="Headmaster"
            className="w-48 h-auto object-cover"
          />
        </div>

        {/* Letter content */}
        <div className="text-sm text-gray-800 leading-relaxed space-y-4 max-w-3xl">
          <p><strong>Dear parents/guardians,</strong></p>

          <p>
            Welcome to the official website of{' '}
            <span style={{ color: PRIMARY }}>Chittagong Sunshine School &amp; College (CSSC)</span>. It is a great
            pleasure to share our views and thoughts through this website.{' '}
            <span style={{ color: PRIMARY }}>
              Our mission is to nurture a child into a well-rounded person during their schooling years in our
              Institution.
            </span>{' '}
            To achieve such a noble objective requires efficient teachers, proper teaching aids and a perfect learning
            environment as a prerequisite. &nbsp;Here in CSSC we strongly believe in meeting such prerequisites which
            includes employing{' '}
            <span style={{ color: PRIMARY }}>
              highly motivated and skilled teachers with the most modern infrastructure such as interactive classrooms,
              science laboratories, fully furnished auditorium, digital computer lab, CCTV surveillance, SMS service,
              etc.
            </span>{' '}
            and giving due emphasis on various extra-curricular activities such as debating, sports, art &amp; crafts,
            music, etc. Such dedication towards it's students has allowed CSSC to be one &nbsp;recognized as one of the
            best schools in National Curriculum in English Version under the Chattogram Board of Education.
          </p>

          <p style={{ color: PRIMARY }}>
            I hope that our website can provide your comprehensive information on Chittagong Sunshine School &amp;
            College will and guide you take the correct decision for the proper development your child.
          </p>

          <br />
          <p>Thank you</p>
          <p>Yours sincerely</p>
          <br />
          <p>Shuva Saha</p>
          <p>Headmaster, CSSC</p>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default HeadmasterMessage;
