import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, GraduationCap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import logo from '@/assets/images/logo.png';

const PRIMARY = 'hsl(208,89%,40%)';

const LoginStudents = () => {
  const [form, setForm] = useState({ studentId: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <>
      <Navbar />
      <main
        className="pt-[97px] min-h-screen flex flex-col"
        style={{ background: 'linear-gradient(135deg, hsl(208,89%,97%) 0%, hsl(208,89%,92%) 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[97px] left-0 w-72 h-72 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(208,89%,60%), transparent)', transform: 'translate(-40%, -20%)' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(208,89%,40%), transparent)', transform: 'translate(30%, 30%)' }} />

        <div className="flex-1 flex items-center justify-center px-4 py-14 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
          >
            {/* Top accent bar */}
            <div className="h-1.5 w-full" style={{ backgroundColor: PRIMARY }} />

            <div className="px-8 py-8">
              {/* Logo + heading */}
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <img src={logo} alt="Sunshine logo" className="h-10 w-auto" />
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Chittagong</p>
                    <p className="text-sm font-bold text-gray-800 leading-tight">Sunshine School &amp; College</p>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="flex w-full rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                  <div
                    className="flex-1 py-2.5 text-center text-sm font-semibold text-white rounded-xl"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Students &amp; Parents
                  </div>
                  <Link
                    to="/login/teachers"
                    className="flex-1 py-2.5 text-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Teachers &amp; Staff
                  </Link>
                </div>
              </div>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: 'hsl(208,89%,95%)' }}
                >
                  <GraduationCap className="w-8 h-8" style={{ color: PRIMARY }} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">Welcome Back</h2>
              <p className="text-sm text-gray-400 text-center mb-7">Sign in to your student / parent portal</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Student ID */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Student ID / Roll Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SS-2024-001"
                    required
                    value={form.studentId}
                    onChange={e => setForm({ ...form, studentId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all"
                    onFocus={e => (e.target.style.borderColor = PRIMARY)}
                    onBlur={e => (e.target.style.borderColor = '')}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Enter your password"
                      required
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all"
                      onFocus={e => (e.target.style.borderColor = PRIMARY)}
                      onBlur={e => (e.target.style.borderColor = '')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot */}
                <div className="flex justify-end">
                  <a href="#" className="text-xs font-medium" style={{ color: PRIMARY }}>
                    Forgot password?
                  </a>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow disabled:opacity-70"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </>
                  )}
                </motion.button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-6">
                Having trouble?{' '}
                <Link to="/contact-us" className="font-medium" style={{ color: PRIMARY }}>
                  Contact the school office
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

export default LoginStudents;
