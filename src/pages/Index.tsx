import Navbar from '@/components/Navbar';
import HeroSlider from '@/components/HeroSlider';
import MessagesSection from '@/components/MessagesSection';
import AboutSection from '@/components/AboutSection';
import Gallery from '@/components/Gallery';
import Highlights from '@/components/Highlights';
import NoticeSection from '@/components/NoticeSection';
import NewsSection from '@/components/NewsSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';

const Index = () => (
  <>
    <Navbar />
    <HeroSlider />
    <MessagesSection />
    <AboutSection />
    <Gallery />
    <Highlights />
    <NoticeSection />
    {/* <NewsSection /> */}
    <ContactSection />
    <Footer />
  </>
);

export default Index;
