import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { FaFacebookF } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logo from '@/assets/images/logo.png';

const navItems = [
  { label: 'Home', href: '/', isRoute: true },
  {
    label: 'Message',
    href: '#',
    dropdown: [
      {
        label: "Founder & Chairman's Message",
        href: '/message/founder',
        isRoute: true,
      },
      { label: "Director's Message", href: '/message/director', isRoute: true },
      {
        label: "Headmaster's Message",
        href: '/message/headmaster',
        isRoute: true,
      },
    ],
  },
  { label: 'Gallery', href: '/gallery', isRoute: true },
  {
    label: 'Academics',
    href: '#',
    dropdown: [
      { label: 'Classes', href: '/academics/classes', isRoute: true },
      { label: 'Departments', href: '/academics/departments', isRoute: true },
      { label: 'Our Teachers', href: '/academics/teachers', isRoute: true },
    ],
  },
  { label: 'Admissions', href: '/admissions', isRoute: true },
  { label: 'Notice and Events', href: '/notice-and-events', isRoute: true },
  { label: 'News and Media', href: '/news-and-media', isRoute: true },
  { label: 'Contact Us', href: '/contact-us', isRoute: true },
  {
    label: 'Login',
    href: '#',
    dropdown: [
      { label: 'Students & Parents', href: '/login/students', isRoute: true },
      { label: 'Teachers & Staffs', href: '/login/teachers', isRoute: true },
    ],
  },
];

const PRIMARY = 'hsl(208,89%,40%)';

/** Returns true if this nav item (or any of its children) matches the current path */
function useIsActive(item: (typeof navItems)[0]) {
  const { pathname } = useLocation();
  if (item.dropdown) {
    return item.dropdown.some(
      child => pathname === child.href || pathname.startsWith(child.href + '/'),
    );
  }
  if (item.href === '/') return pathname === '/';
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

const DropdownMenu = ({
  items,
  onMouseEnter,
  onMouseLeave,
}: {
  items: { label: string; href: string; isRoute?: boolean }[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const { pathname } = useLocation();
  return (
    <motion.ul
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute top-full left-0 z-50 min-w-[220px] bg-white shadow-xl border-t-[3px]"
      style={{ borderTopColor: PRIMARY }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {items.map(item => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');
        const cls =
          'block px-5 py-3.5 text-sm transition-colors duration-150 whitespace-nowrap';
        const content = (
          <span className={isActive ? 'font-semibold' : 'font-normal'}>
            {item.label}
          </span>
        );
        return (
          <li
            key={item.label}
            className="border-b border-gray-100 last:border-0"
          >
            {item.isRoute ? (
              <Link
                to={item.href}
                className={`${cls} ${
                  isActive
                    ? 'text-[hsl(208,89%,40%)] bg-blue-50/60'
                    : 'text-gray-700 hover:text-[hsl(208,89%,40%)] hover:bg-gray-50'
                }`}
              >
                {content}
              </Link>
            ) : (
              <a
                href={item.href}
                className={`${cls} ${
                  isActive
                    ? 'text-[hsl(208,89%,40%)] bg-blue-50/60'
                    : 'text-gray-700 hover:text-[hsl(208,89%,40%)] hover:bg-gray-50'
                }`}
              >
                {content}
              </a>
            )}
          </li>
        );
      })}
    </motion.ul>
  );
};

const NavItem = ({ item }: { item: (typeof navItems)[0] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = useIsActive(item);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (item.dropdown) setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const linkCls = `
    flex items-center gap-1 px-2 xl:px-3 py-[22px] text-sm whitespace-nowrap
    cursor-pointer select-none transition-colors duration-200
    ${
      isActive
        ? 'text-[hsl(208,89%,40%)] font-semibold'
        : 'text-gray-600 font-medium hover:text-[hsl(208,89%,40%)]'
    }
  `;

  return (
    <li
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item.isRoute ? (
        <Link to={item.href} className={linkCls}>
          {item.label}
        </Link>
      ) : (
        <button
          onClick={e => {
            if (item.dropdown) e.preventDefault();
          }}
          className={`${linkCls} bg-transparent border-0 outline-none`}
        >
          {item.label}
          {item.dropdown && (
            <ChevronDown
              className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          )}
        </button>
      )}

      <AnimatePresence>
        {item.dropdown && open && (
          <DropdownMenu
            items={item.dropdown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        )}
      </AnimatePresence>
    </li>
  );
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMobileExpanded(null);
  }, [pathname]);

  const isMobileItemActive = (item: (typeof navItems)[0]) => {
    if (item.dropdown) {
      return item.dropdown.some(
        child =>
          pathname === child.href || pathname.startsWith(child.href + '/'),
      );
    }
    if (item.href === '/') return pathname === '/';
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const isMobileSubActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Top social bar */}
      <div className="bg-[hsl(208,89%,45%)] text-white fixed top-0 left-0 right-0 z-[60]">
        <div className="max-w-[1400px] px-4 flex items-center h-[32px]">
          <div className="flex justify-end items-center gap-3 w-full lg:pr-28">
            <a
              href="https://www.facebook.com/chittagongsunshine/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-75 transition-opacity"
              aria-label="Facebook"
            >
              <FaFacebookF className="text-sm" />
            </a>
            <a
              href="https://twitter.com/sunshineedugrp"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-75 transition-opacity"
              aria-label="Twitter / X"
            >
              <FaXTwitter className="text-sm" />
            </a>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav
        className={`fixed top-[32px] left-0 right-0 z-50 bg-white border-b border-gray-200 transition-shadow duration-300 ${
          scrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-center px-4">
          <ul className="hidden lg:flex items-center justify-center w-full">
            {navItems.slice(0, 4).map(item => (
              <NavItem key={item.label} item={item} />
            ))}

            {/* Centre logo */}
            <li className="shrink-0">
              <Link
                to="/"
                className="flex items-center gap-2 px-2 xl:px-3 py-[22px]"
              >
                <img
                  src={logo}
                  alt="Sunshine logo"
                  className="h-8 w-auto object-contain"
                />
                <span className="text-sm text-gray-800 leading-tight whitespace-nowrap">
                  Chittagong Sunshine School &amp; College
                </span>
              </Link>
            </li>

            {navItems.slice(4).map(item => (
              <NavItem key={item.label} item={item} />
            ))}
          </ul>

          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between w-full py-6">
            {/* Hamburger — left */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1 text-gray-700 hover:text-[hsl(208,89%,40%)] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <HiX className="text-2xl" />
              ) : (
                <HiMenuAlt3 className="text-2xl" />
              )}
            </button>

            {/* Centred branding */}
            <Link
              to="/"
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
            >
              <img
                src={logo}
                alt="Sunshine logo"
                className="h-8 w-auto object-contain"
              />
              <span className="text-sm text-gray-800 leading-tight whitespace-nowrap">
                Chittagong Sunshine School &amp; College
              </span>
            </Link>

            {/* Spacer to balance the hamburger */}
            <div className="w-8" />
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden bg-white overflow-hidden border-t border-gray-100"
            >
              <ul className="flex flex-col py-2">
                {navItems.map(item => {
                  const active = isMobileItemActive(item);
                  return (
                    <li key={item.label}>
                      {item.isRoute && !item.dropdown ? (
                        <Link
                          to={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`w-full flex items-center justify-between px-6 py-3.5 text-sm transition-colors border-l-[3px] ${
                            active
                              ? 'font-semibold border-l-[hsl(208,89%,40%)] text-[hsl(208,89%,40%)] bg-blue-50/50'
                              : 'font-medium border-l-transparent text-gray-700 hover:text-[hsl(208,89%,40%)] hover:bg-gray-50'
                          }`}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              item.dropdown
                                ? setMobileExpanded(
                                    mobileExpanded === item.label
                                      ? null
                                      : item.label,
                                  )
                                : setMobileOpen(false)
                            }
                            className={`w-full flex items-center justify-between px-6 py-3.5 text-sm transition-colors border-l-[3px] ${
                              active
                                ? 'font-semibold border-l-[hsl(208,89%,40%)] text-[hsl(208,89%,40%)] bg-blue-50/50'
                                : 'font-medium border-l-transparent text-gray-700 hover:text-[hsl(208,89%,40%)] hover:bg-gray-50'
                            }`}
                          >
                            {item.label}
                            {item.dropdown && (
                              <ChevronDown
                                className={`w-4 h-4 opacity-40 transition-transform duration-200 ${
                                  mobileExpanded === item.label
                                    ? 'rotate-180'
                                    : ''
                                }`}
                              />
                            )}
                          </button>
                          <AnimatePresence>
                            {item.dropdown && mobileExpanded === item.label && (
                              <motion.ul
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden bg-gray-50"
                              >
                                {item.dropdown.map(
                                  (sub: {
                                    label: string;
                                    href: string;
                                    isRoute?: boolean;
                                  }) => {
                                    const subActive = isMobileSubActive(
                                      sub.href,
                                    );
                                    return (
                                      <li key={sub.label}>
                                        {sub.isRoute ? (
                                          <Link
                                            to={sub.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={`block px-8 py-3 text-sm transition-colors ${
                                              subActive
                                                ? 'text-[hsl(208,89%,40%)] font-semibold'
                                                : 'text-gray-600 hover:text-[hsl(208,89%,40%)]'
                                            }`}
                                          >
                                            {sub.label}
                                          </Link>
                                        ) : (
                                          <a
                                            href={sub.href}
                                            onClick={() => setMobileOpen(false)}
                                            className="block px-8 py-3 text-sm text-gray-600 hover:text-[hsl(208,89%,40%)] transition-colors"
                                          >
                                            {sub.label}
                                          </a>
                                        )}
                                      </li>
                                    );
                                  },
                                )}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default Navbar;
