import { useState } from "react";
import { motion } from "framer-motion";
import { FaPhone, FaMapMarkerAlt, FaPaperPlane } from "react-icons/fa";

const ContactSection = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you for your message!");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <section id="contact" className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Light gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, hsl(210,60%,97%) 0%, hsl(208,70%,93%) 50%, hsl(205,65%,88%) 100%)",
        }}
      />
      {/* Decorative blobs */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 -z-10"
        style={{ background: "radial-gradient(circle, hsl(208,89%,80%) 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-20 -z-10"
        style={{ background: "radial-gradient(circle, hsl(208,89%,75%) 0%, transparent 70%)" }}
      />

      <div className="container mx-auto max-w-5xl">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(208,89%,40%)" }}>
            Get in Touch
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold font-display leading-tight" style={{ color: "hsl(215,25%,18%)" }}>
            Contact Us
          </h2>
          <div className="mt-4 mx-auto w-16 h-1 rounded-full" style={{ background: "hsl(208,89%,40%)" }} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Info card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-8 flex flex-col gap-8"
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(12,113,195,0.12)",
              boxShadow: "0 8px 32px rgba(12,113,195,0.10)",
            }}
          >
            <div>
              <h3 className="text-xl font-bold mb-1 font-display" style={{ color: "hsl(215,25%,18%)" }}>
                Let's connect
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(215,15%,47%)" }}>
                We'd love to hear from you. Reach out to us via phone or visit
                our campus.
              </p>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(208,89%,93%)" }}
              >
                <FaPhone className="text-base" style={{ color: "hsl(208,89%,40%)" }} />
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: "hsl(208,89%,40%)" }}>
                  Phone
                </h4>
                <p className="leading-relaxed text-sm" style={{ color: "hsl(215,25%,25%)" }}>
                  01713102143
                  <br />
                  01717149453
                  <br />
                  031655319
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(208,89%,93%)" }}
              >
                <FaMapMarkerAlt className="text-base" style={{ color: "hsl(208,89%,40%)" }} />
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: "hsl(208,89%,40%)" }}>
                  Address
                </h4>
                <p className="leading-relaxed text-sm" style={{ color: "hsl(215,25%,25%)" }}>
                  House 11, Road 1,
                  <br />
                  Nasirabad H/S,
                  <br />
                  Chittagong – 4000,
                  <br />
                  Bangladesh
                </p>
              </div>
            </div>
          </motion.div>

          {/* Form card */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-8 space-y-5"
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(12,113,195,0.12)",
              boxShadow: "0 8px 32px rgba(12,113,195,0.10)",
            }}
          >
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(215,15%,47%)" }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2"
                style={{
                  background: "hsl(210,60%,98%)",
                  border: "1px solid hsl(208,50%,85%)",
                  color: "hsl(215,25%,18%)",
                  // @ts-ignore
                  "--tw-ring-color": "hsl(208,89%,40%,0.3)",
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(215,15%,47%)" }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2"
                style={{
                  background: "hsl(210,60%,98%)",
                  border: "1px solid hsl(208,50%,85%)",
                  color: "hsl(215,25%,18%)",
                  // @ts-ignore
                  "--tw-ring-color": "hsl(208,89%,40%,0.3)",
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(215,15%,47%)" }}>
                Message
              </label>
              <textarea
                placeholder="How can we help you?"
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 resize-none"
                style={{
                  background: "hsl(210,60%,98%)",
                  border: "1px solid hsl(208,50%,85%)",
                  color: "hsl(215,25%,18%)",
                  // @ts-ignore
                  "--tw-ring-color": "hsl(208,89%,40%,0.3)",
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
              style={{
                background: "linear-gradient(105deg, hsl(208,89%,55%), hsl(208,89%,40%))",
                boxShadow: "0 4px 18px rgba(12,113,195,0.5)",
                color: "#fff",
              }}
            >
              <FaPaperPlane className="text-sm" />
              Send Message
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
