import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PRIMARY = 'hsl(208,89%,40%)';

const DirectorMessage = () => (
  <>
    <Navbar />
    <main className="pt-[97px] min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Person image */}
        <div className="mb-8">
          <img
            src="http://sunshinecssc.com/wp-content/uploads/2019/03/PassportPicture.jpg"
            alt="Director of Academics"
            className="w-48 h-auto object-cover"
          />
        </div>

        {/* Letter content */}
        <div className="text-sm text-gray-800 leading-relaxed space-y-4 max-w-3xl">
          <p><strong>Dear Parents/Guardians,</strong></p>

          <p>
            As the{' '}
            <span style={{ color: PRIMARY }}>Director of Academics</span> of{' '}
            <span style={{ color: PRIMARY }}>Sunshine Education</span> for the past seven years, I have seen excellent
            performances from the students of{' '}
            <span style={{ color: PRIMARY }}>Chittagong Sunshine School &amp; College (CSSC)</span>.
          </p>

          <p>
            Established in 2005, <span style={{ color: PRIMARY }}>Chittagong Sunshine School</span> was created to meet
            the growing demand of National Curriculum in English Version (SSC) in Chattogram. Vision of the Institution
            was to provide quality education at a reasonable cost and as educationalists help in building the much needed
            human capital for our beloved country, Bangladesh. Records show that Sunshiners have consistently achieved
            brilliant results in their PECE, JSC and SSC examinations with 100% pass rate with the vast majority of
            students achieving 'A' grades alongside a number &nbsp;them getting Golden GPA 5.
          </p>

          <p>
            Dedication and support of the administration and teachers to give their possible effort has paid us rich
            dividends and the alumni of CSSC having graduated to become Doctors, Engineers, Bankers, etc after completing
            their studies in leading universities in Bangladesh and abroad. The curriculum of the School is comprehensive
            with emphasis on various extra-curricular activities to prepare the student for future challenges alongside
            academic excellence.
          </p>

          <p style={{ color: PRIMARY }}>
            Sunshine believes in the motto of following the latest teaching methodologies for the betterment of students
            and as a result following the global trend by implementing the increasing use of technology in the classrooms.
            The School strives to be recognized as a leading provider of National Curriculum in English Version in
            Bangladesh and is diligently working to achieve this noble objective.
          </p>

          <p>We look forward to the support of our well-wishers for a prosperous Bangladesh.</p>

          <p>Thank you,</p>
          <p>Yours sincerely,</p>
          <br />
          <br />
          <p>Sameer Ghazi Rahman</p>
          <p>BSc D.Econ(SOAS,UK)MSc E.Hist(LSE,UK)</p>
          <p>Director of Academics</p>
          <p style={{ color: PRIMARY }}>Sunshine Education</p>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default DirectorMessage;
