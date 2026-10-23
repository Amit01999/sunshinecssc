import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Phone, MapPin, Mail, Send } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { api, getErrorMessage } from '@/lib/api';

const PRIMARY = 'hsl(208,89%,40%)';

interface SiteSettings {
  address?: string;
  phones?: string[];
  emails?: string[];
}

const ContactUs = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['public-site-settings'],
    queryFn: async () => (await api.get('/site-settings/public')).data.data as SiteSettings,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/contact-messages', form);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({ name: '', email: '', message: '' });
      }, 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-[97px] min-h-screen bg-gray-50">
        {/* Hero banner */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(208,89%,40%) 0%, hsl(208,89%,28%) 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-6 py-14 text-center">
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-blue-200 text-sm font-medium tracking-widest uppercase mb-2"
            >
              Get In Touch
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Contact Us
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-3 text-blue-100 text-base max-w-xl mx-auto"
            >
              We'd love to hear from you. Reach out to us anytime — we're here to help.
            </motion.p>
          </div>
        </div>

        {/* Info cards + form */}
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            {/* Phone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-md p-6 flex items-start gap-4 hover:shadow-lg transition-shadow"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'hsl(208,89%,95%)' }}
              >
                <Phone className="w-5 h-5" style={{ color: PRIMARY }} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Phone</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {settings?.phones?.length ? (
                    settings.phones.map((p, i) => <span key={i}>{p}<br /></span>)
                  ) : (
                    <>01713102143<br />01717149453<br />031655319</>
                  )}
                </p>
              </div>
            </motion.div>

            {/* Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-md p-6 flex items-start gap-4 hover:shadow-lg transition-shadow"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'hsl(208,89%,95%)' }}
              >
                <MapPin className="w-5 h-5" style={{ color: PRIMARY }} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Address</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {settings?.address?.trim() || (
                    <>House 11, Road 1,<br />Nasirabad H/S,<br />Chittagong – 4000,<br />Bangladesh</>
                  )}
                </p>
              </div>
            </motion.div>

            {/* Email */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-md p-6 flex items-start gap-4 hover:shadow-lg transition-shadow"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'hsl(208,89%,95%)' }}
              >
                <Mail className="w-5 h-5" style={{ color: PRIMARY }} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Email</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {settings?.emails?.length ? (
                    settings.emails.map((e, i) => <span key={i}>{e}<br /></span>)
                  ) : (
                    <>info@sunshinecssc.com<br />admin@sunshinecssc.com</>
                  )}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Map + Form row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Google Map */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3689.7114010019645!2d91.82610696495586!3d22.364523485290153!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30acd883dbef6e63%3A0x22ded4e41eb94755!2sChittagong+Sunshine+School!5e0!3m2!1sen!2sbd!4v1552730771636"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '420px', display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Chittagong Sunshine School Location"
              />
            </motion.div>

            {/* Contact form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-md p-8"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-1">Send us a message</h2>
              <p className="text-sm text-gray-400 mb-6">We'll get back to you as soon as possible.</p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-4"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'hsl(208,89%,95%)' }}
                  >
                    <Send className="w-7 h-7" style={{ color: PRIMARY }} />
                  </div>
                  <p className="text-gray-700 font-semibold text-lg">Message Sent!</p>
                  <p className="text-gray-400 text-sm text-center">
                    Thank you for reaching out. We'll respond shortly.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                      onFocus={e => (e.target.style.borderColor = PRIMARY)}
                      onBlur={e => (e.target.style.borderColor = '')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. john@example.com"
                      required
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
                      onFocus={e => (e.target.style.borderColor = PRIMARY)}
                      onBlur={e => (e.target.style.borderColor = '')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Message
                    </label>
                    <textarea
                      placeholder="Write your message here..."
                      required
                      rows={5}
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all resize-none"
                      onFocus={e => (e.target.style.borderColor = PRIMARY)}
                      onBlur={e => (e.target.style.borderColor = '')}
                    />
                  </div>
                  {error && <p className="text-xs text-red-600 text-center">{error}</p>}
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow disabled:opacity-70"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Sending…' : 'Send Message'}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ContactUs;
