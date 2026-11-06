import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  UserRound,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import "./Landing.css";

const heroSlides = [
  {
    tag: "SPRING / SUMMER COLLECTION Nº 04",
    title: "The latest collection.",
    subtitle: "View frames.",
    description: "A considered collection of frames for every perspective.",
    product: "THE SIGNATURE EDITION",
    frame: "Sculpted acetate · 48 mm",
    image:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=2000&q=90",
  },
  {
    tag: "THE ART OF EVERYDAY VISION",
    title: "A different point",
    subtitle: "of view.",
    description: "Discover distinctive silhouettes made for modern living.",
    product: "THE ATELIER COLLECTION",
    frame: "Refined metal · 52 mm",
    image:
      "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=2000&q=90",
  },
];

const categories = [
  {
    name: "Executive",
    subtitle: "The frames everyone loves",
    image:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=85",
    tag: "MOST LOVED",
  },
  {
    name: "Bureau",
    subtitle: "Expressions of individuality",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=85",
    tag: "COLLECTION",
  },
  {
    name: "Air Edition",
    subtitle: "Defined by character",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=85",
    tag: "COLLECTION",
  },
  {
    name: "Alpha Edition",
    subtitle: "Distinctive by design",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=700&q=85",
    tag: "LIMITED EDITION",
  },
  {
    name: "Junior Atelier",
    subtitle: "Made around your vision",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=700&q=85",
    tag: "PERSONAL EXPERIENCE",
  },
];

const frameShapes = [
  {
    name: "RECTANGLE",
    dimensions: "48-21-145",
    description: "Clean lines. Timeless character.",
    type: "rectangle",
  },
  {
    name: "ROUND",
    dimensions: "46-22-145",
    description: "A softer, expressive silhouette.",
    type: "round",
  },
  {
    name: "AVIATOR",
    dimensions: "58-14-145",
    description: "An iconic shape with attitude.",
    type: "aviator",
  },
  {
    name: "GEOMETRIC",
    dimensions: "50-19-145",
    description: "Distinctive angles. Modern appeal.",
    type: "geometric",
  },
  {
    name: "SQUARE",
    dimensions: "49-20-145",
    description: "Bold proportions. Strong presence.",
    type: "square",
  },
];

const editorialImages = [
  {
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
    title: "THE ART OF SEEING",
    category: "EDITORIAL",
  },
  {
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85",
    title: "DEFINED BY DETAIL",
    category: "PORTRAITS",
  },
  {
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85",
    title: "EFFORTLESS ELEGANCE",
    category: "LIFESTYLE",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85",
    title: "BEYOND THE ORDINARY",
    category: "COLLECTION",
  },
  {
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85",
    title: "A PERSONAL STATEMENT",
    category: "PORTRAITS",
  },
  {
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85",
    title: "THE SPEQ PERSPECTIVE",
    category: "EDITORIAL",
  },
];

const FrameIllustration = ({ type }) => {
  const frameShapes = {
    rectangle: (
      <>
        <rect x="12" y="25" width="75" height="52" rx="7" />
        <rect x="113" y="25" width="75" height="52" rx="7" />
      </>
    ),
    round: (
      <>
        <circle cx="50" cy="51" r="27" />
        <circle cx="150" cy="51" r="27" />
      </>
    ),
    aviator: (
      <>
        <path d="M12 25 H87 L82 65 Q50 100 20 65 Z" />
        <path d="M113 25 H188 L180 65 Q150 100 118 65 Z" />
      </>
    ),
    geometric: (
      <>
        <path d="M20 25 L80 25 L90 45 L80 75 L20 75 L10 45 Z" />
        <path d="M120 25 L180 25 L190 45 L180 75 L120 75 L110 45 Z" />
      </>
    ),
    square: (
      <>
        <rect x="12" y="20" width="75" height="62" rx="2" />
        <rect x="113" y="20" width="75" height="62" rx="2" />
      </>
    ),
  };

  return (
    <svg
      className="frame-illustration"
      viewBox="0 0 200 105"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {frameShapes[type]}

      <path d="M87 40 Q100 31 113 40" />
      <path d="M12 35 L2 29" />
      <path d="M188 35 L198 29" />
    </svg>
  );
};

const Landing = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const currentSlide = heroSlides[activeSlide];

  const showPrevious = () => {
    setActiveSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const showNext = () => {
    setActiveSlide((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1));
  };

  // Store the user's login status.
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("access")),
  );

  // Update login status when the browser storage changes.
  useEffect(() => {
    const checkLoginStatus = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("access")));
    };

    // Listen for login changes in other browser tabs.
    window.addEventListener("storage", checkLoginStatus);

    // Check again when the user returns to this page.
    window.addEventListener("focus", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
      window.removeEventListener("focus", checkLoginStatus);
    };
  }, []);
  return (
    <div className="landing-page">
      {/* NAVBAR */}
      <header className="landing-header">
        <nav className="main-nav">
          <div className="nav-left">
            <a href="#categories">Boutique</a>
            <a href="#categories">Optical</a>
            <a href="#categories">Sunwear</a>
            <a href="#brands">Atelier</a>
          </div>

          <Link to="/" className="brand-logo">
            <span>SpeQ</span>
            <small>ATELIER OPTICAL / EYEWEAR</small>
          </Link>

          <div className="nav-right">
            <div className="nav-search">
              <Search size={16} />
              <input type="text" placeholder="Search frames, orders..." />
            </div>

            <div className="nav-actions">
              {isLoggedIn ? (
                <Link
                  to="/profile"
                  className="profile-link"
                  aria-label="User profile"
                  title="User profile"
                >
                  <UserRound size={34} strokeWidth={2.8} />
                </Link>
              ) : (
                <Link to="/login">Sign In</Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* HERO CAROUSEL */}
      <section className="hero-section">
        <div
          className="hero-background"
          style={{ backgroundImage: `url("${currentSlide.image}")` }}
        />

        <div className="hero-overlay" />

        <button
          className="hero-arrow hero-arrow-left"
          onClick={showPrevious}
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="hero-content">
          <div className="hero-copy">
            <span className="hero-tag">
              <span className="tag-dot">•</span>
              {currentSlide.tag}
            </span>

            <h1>
              {currentSlide.title}
              <br />
              {currentSlide.subtitle}
            </h1>

            <p>{currentSlide.description}</p>

            <a href="#categories" className="hero-appointment">
              BY ATELIER APPOINTMENT <ArrowUpRight size={15} />
            </a>
          </div>

          <div className="hero-product-card">
            <span className="product-card-label">{currentSlide.product}</span>

            <h3>{currentSlide.frame}</h3>

            <Link to="/signup" className="discover-button">
              DISCOVER NOW <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        <button
          className="hero-arrow hero-arrow-right"
          onClick={showNext}
          aria-label="Next slide"
        >
          <ChevronRight size={24} />
        </button>

        <div className="hero-pagination">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.tag}
              className={activeSlide === index ? "active" : ""}
              onClick={() => setActiveSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}

          <span>
            0{activeSlide + 1} / 0{heroSlides.length}
          </span>
        </div>
      </section>

      {/* TOP CATEGORIES */}
      <section className="categories-section" id="categories">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">IMAGE REGISTRY / SELECTIONS</span>
            <h2>Top Categories</h2>
          </div>

          <a href="#brands" className="view-all-link">
            View All Categories <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="categories-grid">
          {categories.map((category, index) => (
            <a href="#brands" className="category-card" key={category.name}>
              <div className="category-image">
                <img src={category.image} alt={category.name} />

                <span className="category-tag">{category.tag}</span>

                <span className="category-number">0{index + 1}</span>
              </div>

              <div className="category-info">
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.subtitle}</p>
                </div>

                <ArrowUpRight size={19} />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* HOUSE OF BRANDS */}
      <section className="brands-section" id="brands">
        <div className="brands-heading">
          <div>
            <span className="section-eyebrow">EXPLORE SIGNATURE LABELS</span>
            <h2>House of Brands</h2>
          </div>

          <p>
            A curated expression of design,
            <br />
            craftsmanship and individuality.
          </p>
        </div>

        <div className="brands-grid">
          <article className="brand-card">
            <img
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=85"
              alt="Male model wearing eyewear"
            />

            <div className="brand-overlay" />

            <div className="brand-content">
              <span>THE MODERN ICON</span>
              <h3>VINCENT CHASE</h3>
              <p>
                Bold expressions. Contemporary design.
                <br />
                Made for those who define their own style.
              </p>

              <a href="#categories" className="brand-button">
                EXPLORE COLLECTION <ArrowUpRight size={15} />
              </a>
            </div>
          </article>

          <article className="brand-card">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85"
              alt="Female fashion model"
            />

            <div className="brand-overlay" />

            <div className="brand-content">
              <span>DESIGNED TO BE DISTINCT</span>
              <h3>JOHN JACOBS</h3>
              <p>
                Refined silhouettes. Thoughtful details.
                <br />A signature for every perspective.
              </p>

              <a href="#categories" className="brand-button">
                DISCOVER BRAND <ArrowUpRight size={15} />
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* FIND YOUR SHAPE */}
      <section className="shapes-section" id="shapes">
        <div className="shapes-heading">
          <span className="section-eyebrow">
            SHAPE PREFERENCES / SCHEMATICS
          </span>
          <h2>Find your shape</h2>
          <p>
            Every face has its own character. Discover the frame silhouette that
            complements yours.
          </p>
        </div>

        <div className="shapes-grid">
          {frameShapes.map((shape, index) => (
            <a href="/signup" className="shape-card" key={shape.name}>
              <span className="shape-number">0{index + 1}</span>

              <FrameIllustration type={shape.type} />

              <div className="shape-info">
                <h3>{shape.name}</h3>
                <span className="shape-dimensions">{shape.dimensions} MM</span>
                <p>{shape.description}</p>
              </div>

              <span className="shape-arrow">
                <ArrowUpRight size={17} />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* FACE ANALYSIS CAMPAIGN */}
      <section className="face-analysis-section">
        <div className="face-analysis-image">
          <div className="face-analysis-overlay">
            <span>PERSONALISED EYEWEAR EXPERIENCE</span>

            <h2>
              Discover Frames
              <br />
              Made for Your Face
            </h2>

            <p>
              Find the frame styles that complement your unique facial features.
            </p>

            <Link to="/signup" className="tryon-button">
              DISCOVER YOUR FRAME
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* EDITORIAL LIFESTYLE GALLERY */}
      <section className="editorial-section">
        <div className="editorial-heading">
          <span>THE SPEQ JOURNAL / VISUAL STORIES</span>
          <h2>Beyond the Frames</h2>
          <p>
            A perspective shaped by individuality, style and the art of seeing
            differently.
          </p>
        </div>

        <div className="editorial-grid">
          {editorialImages.map((item, index) => (
            <article className="editorial-card" key={index}>
              <img src={item.image} alt={item.title} />

              <div className="editorial-card-overlay">
                <span>{item.category}</span>
                <h3>{item.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CONTACT & CONCIERGE */}
      <section className="concierge-section">
        <div className="concierge-heading">
          <span>PERSONAL SERVICE / SPEQ ATELIER</span>
          <h2>Experience SpeQ Beyond the Screen</h2>
          <p>
            From finding your perfect frame to personal assistance, we're here
            to make your experience effortless.
          </p>
        </div>

        <div className="concierge-grid">
          <a href="#" className="concierge-card">
            <span>01 / VISIT</span>
            <h3>Visit Our Atelier</h3>
            <p>Explore our collections in person.</p>
            <span className="concierge-link">EXPLORE STORES ↗</span>
          </a>

          <a href="#" className="concierge-card">
            <span>02 / CONNECT</span>
            <h3>WhatsApp Concierge</h3>
            <p>Connect with our team for personal assistance.</p>
            <span className="concierge-link">CHAT WITH US ↗</span>
          </a>

          <a href="#" className="concierge-card">
            <span>03 / GUIDANCE</span>
            <h3>Consult a Specialist</h3>
            <p>Get expert guidance for your eyewear needs.</p>
            <span className="concierge-link">GET ASSISTANCE ↗</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="speq-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <h2>SPEQ</h2>
            <span>ATELIER OPTICAL / EYEWEAR</span>

            <p>
              A considered approach to eyewear. Discover your perspective with
              SpeQ.
            </p>
          </div>

          <div className="footer-column">
            <h4>EXPLORE</h4>
            <Link to="/">Home</Link>
            <Link to="/">Sunglasses</Link>
            <Link to="/">Eyeglasses</Link>
            <Link to="/">Screen Glasses</Link>
            <Link to="/">Collections</Link>
          </div>

          <div className="footer-column">
            <h4>THE SPEQ EXPERIENCE</h4>
            <Link to="/">Our Brands</Link>
            <Link to="/">Find Your Shape</Link>
            <Link to="/">Face Analysis</Link>
            <Link to="/">Visit Our Atelier</Link>
          </div>

          <div className="footer-column">
            <h4>ASSISTANCE</h4>
            <Link to="/">Contact Us</Link>
            <Link to="/">Shipping & Delivery</Link>
            <Link to="/">Returns & Refunds</Link>
            <Link to="/">FAQs</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} SPEQ EYEWEAR. ALL RIGHTS RESERVED.</p>

          <div className="footer-legal">
            <Link to="/">PRIVACY POLICY</Link>
            <Link to="/">TERMS & CONDITIONS</Link>
          </div>

          <span>CRAFTED FOR YOUR PERSPECTIVE.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
