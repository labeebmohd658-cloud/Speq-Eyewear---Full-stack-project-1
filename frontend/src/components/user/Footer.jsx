
import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

const Footer = ({ variant = "midnight" }) => {
  const isMidnight = variant === "midnight";

  const theme = {
    footer: isMidnight
      ? "bg-[#172B3A] text-[#EAF2F8] border-[#426782]/30"
      : "bg-[#DFEAF3] text-[#172B3A] border-white",

    watermark: isMidnight
      ? "text-white/[0.025]"
      : "text-[#172B3A]/[0.035]",

    border: isMidnight
      ? "border-white/10"
      : "border-[#172B3A]/10",

    muted: isMidnight
      ? "text-[#B9C8D5]"
      : "text-[#426782]",

    eyebrow: isMidnight
      ? "text-[#C5AE87]"
      : "text-[#426782]",

    iconTile: isMidnight
      ? "bg-white/[0.05] border-white/10 text-[#C5AE87]"
      : "bg-white/75 border-white text-[#426782]",

    card: isMidnight
      ? "bg-white/[0.05] border-white/10"
      : "bg-white/75 border-white shadow-[0_6px_24px_rgba(23,43,58,0.04)]",

    button: isMidnight
      ? "bg-[#C5AE87] text-[#172B3A] hover:bg-white"
      : "bg-[#172B3A] text-white hover:bg-[#426782]",

    legal: isMidnight
      ? "text-[#8295A5]"
      : "text-[#426782]",
  };

  const trustItems = [
    {
      icon: ShieldCheck,
      title: "1-Year Atelier Warranty",

    },
    {
      icon: Truck,
      title: "Trustable Express Delivery",

    },
    {
      icon: RefreshCw,
      title: "14-Day Effortless Returns",

    },
  ];

  const exploreLinks = [
    { label: "Eyeglasses", to: "/products?category=eyeglasses" },
    { label: "Sunglasses", to: "/products?category=sunglasses" },
    { label: "Screen Glasses", to: "/products?category=screenglasses" },
    { label: "All Collections", to: "/products" },
  ];

  const accountLinks = [
    { label: "My Account", to: "/profile" },
    { label: "Wishlist", to: "/wishlist" },
    { label: "Shopping Bag", to: "/cart" },
    { label: "Sign In", to: "/login" },
  ];

  const renderLinks = (links) => (
    <div className={`flex flex-col gap-3 ${theme.muted}`}>
      {links.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="group flex w-fit items-center text-sm transition-colors hover:text-[#C5AE87]"
        >
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );

  return (
    <footer
      className={`relative mt-auto overflow-hidden border-t transition-colors duration-300 ${theme.footer}`}
    >
      {/* TOP CHAMPAGNE HAIRLINE */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#C5AE87]/70 to-transparent" />

      {/* CSS BRAND WATERMARK */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-10 right-6 select-none font-serif text-[140px] font-bold leading-none tracking-[0.15em] sm:text-[210px] ${theme.watermark}`}
      >
        SPEQ
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">

        {/* BOUTIQUE TRUST STRIP */}
        <div
          className={`grid grid-cols-1 gap-4 border-b py-7 sm:grid-cols-3 ${theme.border}`}
        >
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme.iconTile}`}
                >
                  <Icon size={19} strokeWidth={1.5} />
                </div>

                <div>
                  <h3 className="text-xs font-bold">{item.title}</h3>
                  <p className={`mt-1 text-[11px] ${theme.muted}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* MAIN FOOTER GRID */}
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">

          {/* BRAND STATEMENT */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex flex-col">
              <span className="flex items-center gap-1.5 font-serif text-3xl font-bold tracking-[0.18em]">
                SPEQ
                <span className="h-1.5 w-1.5 rounded-full bg-[#C5AE87]" />
              </span>

              <span
                className={`mt-1.5 text-[9px] font-bold uppercase tracking-[0.34em] ${theme.eyebrow}`}
              >
                Atelier Optical
              </span>
            </Link>

            <p className={`mt-6 max-w-xs text-sm leading-relaxed ${theme.muted}`}>
              Thoughtfully designed eyewear. A balance of contemporary form,
              everyday comfort, and timeless expression.
            </p>
          </div>

          {/* EXPLORE */}
          <div className="lg:col-span-2">
            <h3
              className={`mb-5 text-[10px] font-bold uppercase tracking-[0.26em] ${theme.eyebrow}`}
            >
              Explore
            </h3>

            {renderLinks(exploreLinks)}
          </div>

          {/* ACCOUNT */}
          <div className="lg:col-span-2">
            <h3
              className={`mb-5 text-[10px] font-bold uppercase tracking-[0.26em] ${theme.eyebrow}`}
            >
              Account
            </h3>

            {renderLinks(accountLinks)}
          </div>

          {/* CONCIERGE CARD */}
          <div className="lg:col-span-4">
            <div className={`rounded-2xl border p-6 ${theme.card}`}>
              <h3
                className={`mb-3 text-[10px] font-bold uppercase tracking-[0.26em] ${theme.eyebrow}`}
              >
                Get in Touch
              </h3>

              <p className={`mb-5 text-sm leading-relaxed ${theme.muted}`}>
                Have a question about our frames, lenses, or your order? Our
                atelier concierge is happy to help.
              </p>

              <a
                href="mailto:support@speq.com"
                className={`group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${theme.button}`}
              >
                Contact Us

                <ArrowUpRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            </div>
          </div>
        </div>

        {/* BOTTOM LEGAL BAR */}
        <div
          className={`flex flex-col items-center justify-between gap-3 border-t py-6 text-center text-[10px] font-semibold uppercase tracking-[0.2em] sm:flex-row sm:text-left ${theme.border} ${theme.legal}`}
        >
          <p>
            © {new Date().getFullYear()} SPEQ ATELIER OPTICAL. ALL RIGHTS
            RESERVED.
          </p>

          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C5AE87]" />
            Designed with Intention.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
