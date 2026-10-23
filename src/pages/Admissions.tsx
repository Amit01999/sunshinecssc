import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  FileEdit,
  ClipboardCheck,
  GraduationCap,
  Send,
  CheckCircle2,
  Upload,
  FileText,
  X,
  Loader2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { api, getErrorMessage } from '@/lib/api';

const PRIMARY = 'hsl(208,89%,40%)';

interface PublicClass {
  _id: string;
  name: string;
}

const STEPS = [
  { icon: FileEdit, title: 'Submit Application', description: "Fill in the applicant's details and the class they're applying for." },
  { icon: Upload, title: 'Upload Documents', description: 'Add a birth certificate, previous school records, or photos — optional, can be done later too.' },
  { icon: ClipboardCheck, title: 'Application Review', description: 'Our admissions team reviews the application and may request more information.' },
  { icon: GraduationCap, title: 'Enrollment', description: "Once approved, we'll contact the guardian with login details to get started." },
];

const inputCls =
  'w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{children}</label>;
}

const Admissions = () => {
  const [form, setForm] = useState({
    applicantName: '',
    dateOfBirth: '',
    gender: '',
    appliedClassId: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  });
  const [step, setStep] = useState<'form' | 'documents' | 'done'>('form');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: classes } = useQuery({
    queryKey: ['public-classes'],
    queryFn: async () => (await api.get('/classes/public')).data.data as PublicClass[],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post('/admissions', { ...form, guardianEmail: form.guardianEmail || undefined });
      setApplicationId(res.data.data.id);
      setConfirmationMessage(res.data.data.message);
      setStep('documents');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !applicationId) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/admissions/${applicationId}/documents`, fd);
      setUploadedFiles((prev) => [...prev, file.name]);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setForm({ applicantName: '', dateOfBirth: '', gender: '', appliedClassId: '', guardianName: '', guardianPhone: '', guardianEmail: '' });
    setApplicationId(null);
    setUploadedFiles([]);
    setStep('form');
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
              Join Our School
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Admissions
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-3 text-blue-100 text-base max-w-xl mx-auto"
            >
              Start your child's journey with Chittagong Sunshine School &amp; College — apply online in minutes.
            </motion.p>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(208,89%,95%)' }}>
                    <s.icon className="w-5 h-5" style={{ color: PRIMARY }} />
                  </div>
                  <span className="text-xs font-bold text-gray-300">0{i + 1}</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Application form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-md p-8 max-w-2xl mx-auto"
          >
            {step === 'done' ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(208,89%,95%)' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: PRIMARY }} />
                </div>
                <p className="text-gray-700 font-semibold text-lg">Application Submitted!</p>
                <p className="text-gray-400 text-sm text-center max-w-sm">{confirmationMessage}</p>
                <button
                  onClick={resetForm}
                  className="mt-2 text-sm font-medium px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:text-white transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  Submit Another Application
                </button>
              </motion.div>
            ) : step === 'documents' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(208,89%,95%)' }}>
                    <CheckCircle2 className="w-6 h-6" style={{ color: PRIMARY }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Application received</h2>
                    <p className="text-xs text-gray-400">{confirmationMessage}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Upload supporting documents (optional)</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Birth certificate, previous school report, or a passport-size photo. PDF, Word, or image files up to 20MB. You can also skip this and send documents later.
                  </p>

                  {uploadedFiles.length > 0 && (
                    <ul className="space-y-1.5 mb-3">
                      {uploadedFiles.map((name, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: PRIMARY }} />
                          <span className="truncate">{name}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {uploadError && <p className="text-xs text-red-600 mb-3">{uploadError}</p>}

                  <label
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Uploading…' : 'Choose a file to upload'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif" />
                  </label>
                </div>

                <motion.button
                  onClick={() => setStep('done')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {uploadedFiles.length > 0 ? 'Finish' : 'Skip for Now & Finish'}
                </motion.button>
              </motion.div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Application Form</h2>
                <p className="text-sm text-gray-400 mb-6">All fields marked are required unless noted optional.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <FieldLabel>Applicant's Full Name</FieldLabel>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ayesha Rahman"
                      value={form.applicantName}
                      onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                      className={inputCls}
                      onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                      onBlur={(e) => (e.target.style.borderColor = '')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Date of Birth</FieldLabel>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().slice(0, 10)}
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        className={inputCls}
                        onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                        onBlur={(e) => (e.target.style.borderColor = '')}
                      />
                    </div>
                    <div>
                      <FieldLabel>Gender (optional)</FieldLabel>
                      <select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Select…</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Applying For</FieldLabel>
                    <select
                      required
                      value={form.appliedClassId}
                      onChange={(e) => setForm({ ...form, appliedClassId: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">{classes ? 'Select a class…' : 'Loading classes…'}</option>
                      {(classes ?? []).map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    {classes?.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1.5">
                        Classes for the upcoming year aren't published yet — please contact the school office directly.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Guardian Information</p>
                    <div className="space-y-4">
                      <div>
                        <FieldLabel>Guardian's Name</FieldLabel>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kamal Rahman"
                          value={form.guardianName}
                          onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                          className={inputCls}
                          onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                          onBlur={(e) => (e.target.style.borderColor = '')}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FieldLabel>Phone Number</FieldLabel>
                          <input
                            type="tel"
                            required
                            placeholder="01XXXXXXXXX"
                            value={form.guardianPhone}
                            onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                            className={inputCls}
                            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                            onBlur={(e) => (e.target.style.borderColor = '')}
                          />
                        </div>
                        <div>
                          <FieldLabel>Email (optional)</FieldLabel>
                          <input
                            type="email"
                            placeholder="you@example.com"
                            value={form.guardianEmail}
                            onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
                            className={inputCls}
                            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                            onBlur={(e) => (e.target.style.borderColor = '')}
                          />
                        </div>
                      </div>
                    </div>
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
                    {submitting ? 'Submitting…' : 'Submit Application'}
                  </motion.button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Admissions;
