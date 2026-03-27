import { FaFacebookF, FaInstagram, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const quickLinks = [
  { label: "About Us",   href: "#about"      },
  { label: "Our Team",   href: "#message"    },
  { label: "Highlights", href: "#highlights" },
  { label: "Gallery",    href: "#gallery"    },
  { label: "News",       href: "#news"       },
  { label: "Contact",    href: "#contact"    },
];

const Footer = () => (
  <footer
    className="relative overflow-hidden"
    style={{
      background: "linear-gradient(160deg, hsl(215,35%,13%) 0%, hsl(215,40%,10%) 60%, hsl(215,45%,8%) 100%)",
    }}
  >
    {/* Top accent line */}
    <div
      className="h-1 w-full"
      style={{ background: "linear-gradient(90deg, hsl(208,89%,40%), hsl(208,89%,60%), hsl(208,89%,40%))" }}
    />

    {/* Decorative circle blobs */}
    <div
      className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-5 pointer-events-none"
      style={{ background: "radial-gradient(circle, hsl(208,89%,60%) 0%, transparent 70%)" }}
    />
    <div
      className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-5 pointer-events-none"
      style={{ background: "radial-gradient(circle, hsl(208,89%,60%) 0%, transparent 70%)" }}
    />

    <div className="container mx-auto px-6 py-14">
      {/* Main grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">

        {/* Brand column */}
        <div className="sm:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/logo.png"
              alt="Chittagong Sunshine School & College"
              className="w-12 h-12 object-contain flex-shrink-0"
            />
            <div>
              <p className="text-white font-bold text-sm leading-tight font-display">
                Chittagong Sunshine
              </p>
              <p className="text-white/50 text-xs">School &amp; College</p>
            </div>
          </div>
          <p className="text-white/40 text-xs italic mb-5 leading-relaxed">
            "Love, Discipline &amp; Faith"
          </p>
          <p className="text-white/50 text-xs leading-relaxed">
            One of Bangladesh's leading private English Medium schools for boys
            and girls aged 3–18, committed to academic excellence and character
            development.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h4
            className="text-xs font-bold uppercase tracking-[0.15em] mb-5"
            style={{ color: "hsl(208,89%,55%)" }}
          >
            Quick Links
          </h4>
          <ul className="space-y-2.5">
            {quickLinks.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="group flex items-center gap-2 text-sm text-white/55 hover:text-white transition-colors duration-200"
                >
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0 transition-all duration-200 group-hover:w-2"
                    style={{ background: "hsl(208,89%,50%)" }}
                  />
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h4
            className="text-xs font-bold uppercase tracking-[0.15em] mb-5"
            style={{ color: "hsl(208,89%,55%)" }}
          >
            Contact
          </h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FaMapMarkerAlt className="mt-0.5 flex-shrink-0 text-xs" style={{ color: "hsl(208,89%,50%)" }} />
              <p className="text-white/55 text-xs leading-relaxed">
                House 11, Road 1, Nasirabad H/S,<br />
                Chittagong – 4000, Bangladesh
              </p>
            </div>
            <div className="flex items-start gap-3">
              <FaPhone className="mt-0.5 flex-shrink-0 text-xs" style={{ color: "hsl(208,89%,50%)" }} />
              <p className="text-white/55 text-xs leading-relaxed">
                01713102143 · 01717149453<br />
                031655319
              </p>
            </div>
          </div>

          {/* Social icons */}
          <div className="flex gap-2.5 mt-6">
            {[
              { Icon: FaFacebookF, label: "Facebook" },
              { Icon: FaInstagram, label: "Instagram" },
              { Icon: FaXTwitter,  label: "X"         },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "hsl(208,89%,40%)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
                }
              >
                <Icon className="text-white/70 text-xs" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-white/30 text-xs">
          © {new Date().getFullYear()} Chittagong Sunshine School &amp; College. All rights reserved.
        </p>
        <p className="text-white/20 text-xs">
          Designed with care for education
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
