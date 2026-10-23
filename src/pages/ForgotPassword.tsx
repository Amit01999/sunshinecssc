import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { api, getErrorMessage } from '@/lib/api';

const PRIMARY = 'hsl(208,89%,40%)';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main
        className="pt-[97px] min-h-screen flex flex-col"
        style={{ background: 'linear-gradient(135deg, hsl(208,89%,97%) 0%, hsl(208,89%,92%) 100%)' }}
      >
        <div className="flex-1 flex items-center justify-center px-4 py-14">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="h-1.5 w-full" style={{ backgroundColor: PRIMARY }} />
            <div className="px-8 py-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md" style={{ backgroundColor: 'hsl(208,89%,95%)' }}>
                  <Mail className="w-8 h-8" style={{ color: PRIMARY }} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">Reset Password</h2>
              <p className="text-sm text-gray-400 text-center mb-7">
                Enter your account email and we'll send you a reset link.
              </p>

              {sent ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600">
                    If that email is registered, a password reset link has been sent. Please check your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                  />
                  {error && <p className="text-xs text-red-600 text-center">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <Send className="w-4 h-4" /> {loading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
              )}

              <p className="text-center text-xs text-gray-400 mt-6">
                <Link to="/login/students" className="font-medium" style={{ color: PRIMARY }}>
                  Back to login
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ForgotPassword;
