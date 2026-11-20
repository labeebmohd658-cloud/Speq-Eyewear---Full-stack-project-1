
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {

  UserRound,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import "./Landing.css";
import DepthText from "../components/ui/DepthText";
import {
  getCategories,
  getCollections,
  getOccasions,
} from "../services/catalogService";

// Static hero content is intentionally unchanged.
const heroSlides = [
  {
    tag: "SPEQ / ARCTIC EDITION",
    title: "See beyond",
    subtitle: "the ordinary.",
    description:
      "Contemporary eyewear shaped by clarity, confidence and movement.",
    product: "THE URBAN EDITION",
    frame: "Sculpted acetate · 48 mm",
    image:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=2200&q=90",
  },
  {
    tag: "THE CITY, REFRAMED",
    title: "A sharper point",
    subtitle: "of view.",
    description: "Clean silhouettes for a world that never stands still.",
    product: "THE OPTICAL COLLECTION",
    frame: "Refined metal · 52 mm",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2200&q=90",
  },
  {
    tag: "DESIGNED TO MOVE",
    title: "Made for your",
    subtitle: "perspective.",
    description: "Explore expressive frames with an architectural edge.",
    product: "THE SIGNATURE SERIES",
    frame: "Modern profile · 50 mm",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=2200&q=90",
  },
];

// Category images and presentation details stay in the frontend.
// The category name and slug come from the backend.
const categoryPresentation = {
  sunglasses: {
    subtitle: "Bold. Iconic. You.",
    image:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=90",
    tag: "SUN COLLECTION",
  },
  eyeglasses: {
    subtitle: "See clearly. Live better.",
    image:
      "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1000&q=90",
    tag: "OPTICAL COLLECTION",
  },
  "screenglasses": {
    subtitle: "For your digital life.",
    image:
      "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=90",
    tag: "SCREEN COLLECTION",
  },
};

// Fallback presentation if an admin category has a different slug.
const fallbackCategoryPresentation = {
  subtitle: "Explore the SpeQ collection.",
  image:
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=90",
  tag: "SPEQ COLLECTION",
};

// Convert names to a predictable slug when needed.
const normalizeSlug = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// These correspond to the Product.FrameShape choices in Django.
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



const FrameIllustration = ({ type }) => {
  const illustrations = {
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
      {illustrations[type]}
      <path d="M87 40 Q100 31 113 40" />
      <path d="M12 35 L2 29" />
      <path d="M188 35 L198 29" />
    </svg>
  );
};



const Landing = () => {
  // Hero carousel state.
  const [activeSlide, setActiveSlide] = useState(0);
  const [previousSlideIndex, setPreviousSlideIndex] = useState(null);
  const [isHeroPaused, setIsHeroPaused] = useState(false);

  // Catalog data from the Django public endpoints.
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [occasions, setOccasions] = useState([]);

  // Separate loading and error states so one failed endpoint
  // does not prevent the other catalog sections from appearing.
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogErrors, setCatalogErrors] = useState({
    categories: "",
    collections: "",
    occasions: "",
  });

  // Category carousel state.
  const [activeCategory, setActiveCategory] = useState(0);
  const [isCategoryPaused, setIsCategoryPaused] = useState(false);
  const categoryPointerStartX = useRef(null);
  const categoryDidDrag = useRef(false);

  // Fetch all admin-managed catalog data.
  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      setCatalogLoading(true);

      const results = await Promise.allSettled([
        getCategories(),
        getCollections(),
        getOccasions(),
      ]);

      if (!isMounted) return;

      const [categoryResult, collectionResult, occasionResult] = results;

      if (categoryResult.status === "fulfilled") {
        setCategories(categoryResult.value);
      } else {
        setCatalogErrors((current) => ({
          ...current,
          categories: "Categories could not be loaded.",
        }));
        console.error("Category API error:", categoryResult.reason);
      }

      if (collectionResult.status === "fulfilled") {
        setCollections(collectionResult.value);
      } else {
        setCatalogErrors((current) => ({
          ...current,
          collections: "Collections could not be loaded.",
        }));
        console.error("Collection API error:", collectionResult.reason);
      }

      if (occasionResult.status === "fulfilled") {
        setOccasions(occasionResult.value);
      } else {
        setCatalogErrors((current) => ({
          ...current,
          occasions: "Occasions could not be loaded.",
        }));
        console.error("Occasion API error:", occasionResult.reason);
      }

      setCatalogLoading(false);
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  // Build category cards using database names/slugs and local presentation.
  const displayedCategories = categories.map((category) => {
    const slug = category.slug || normalizeSlug(category.name);
    const presentation =
      categoryPresentation[slug] || fallbackCategoryPresentation;

    return {
      ...category,
      slug,
      subtitle: presentation.subtitle,
      image: presentation.image,
      tag: presentation.tag,
    };
  });

  // Keep the active index valid if the API data changes.
  useEffect(() => {
    if (activeCategory >= displayedCategories.length) {
      setActiveCategory(0);
    }
  }, [displayedCategories.length, activeCategory]);

  // Move to the previous category.
  const showPreviousCategory = () => {
    if (!displayedCategories.length) return;

    setActiveCategory((current) =>
      current === 0 ? displayedCategories.length - 1 : current - 1,
    );
  };

  // Move to the next category.
  const showNextCategory = () => {
    if (!displayedCategories.length) return;

    setActiveCategory((current) => (current + 1) % displayedCategories.length);
  };

  // Record where the user starts dragging.
  const handleCategoryPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    categoryPointerStartX.current = event.clientX;
    categoryDidDrag.current = false;
  };

  // Detect swipe direction.
  const handleCategoryPointerUp = (event) => {
    if (categoryPointerStartX.current === null) return;

    const movement = event.clientX - categoryPointerStartX.current;

    if (Math.abs(movement) > 50) {
      categoryDidDrag.current = true;

      if (movement < 0) {
        showNextCategory();
      } else {
        showPreviousCategory();
      }
    }

    categoryPointerStartX.current = null;
  };

  // Stop a drag from accidentally opening a category link.
  const handleCategoryClickCapture = (event) => {
    if (categoryDidDrag.current) {
      event.preventDefault();
      event.stopPropagation();
      categoryDidDrag.current = false;
    }
  };

  // Automatically rotate categories every 4.5 seconds.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (
      isCategoryPaused ||
      prefersReducedMotion ||
      displayedCategories.length < 2
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveCategory(
        (current) => (current + 1) % displayedCategories.length,
      );
    }, 4500);

    return () => window.clearInterval(timer);
  }, [isCategoryPaused, displayedCategories.length]);

  // Change hero slide while retaining the previous background for the fade.
  const changeSlide = (nextIndex) => {
    if (nextIndex === activeSlide) return;

    setPreviousSlideIndex(activeSlide);
    setActiveSlide(nextIndex);
  };

  const showPrevious = () => {
    changeSlide(activeSlide === 0 ? heroSlides.length - 1 : activeSlide - 1);
  };

  const showNext = () => {
    changeSlide(activeSlide === heroSlides.length - 1 ? 0 : activeSlide + 1);
  };

  const currentSlide = heroSlides[activeSlide];

  // Store the user's login status.
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("access")),
  );

  // Update login status when browser storage changes.
  useEffect(() => {
    const checkLoginStatus = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("access")));
    };

    window.addEventListener("storage", checkLoginStatus);
    window.addEventListener("focus", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
      window.removeEventListener("focus", checkLoginStatus);
    };
  }, []);

  // Automatically rotate hero slides.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (isHeroPaused || prefersReducedMotion) return undefined;

    const timer = window.setTimeout(() => {
      setPreviousSlideIndex(activeSlide);
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [activeSlide, isHeroPaused]);

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
            <DepthText
              text="SpeQ"
              layers={6}
              depth={0.6}
              faceColor="#263B4B"
              depthColor="#B9C8D5"
              fontSize="32px"
              fontWeight={900}
              tilt={12}
              pointerTracking={true}
              autoOrbit={false}
              intro={false}
              shadow={true}
            />
            <small>ATELIER OPTICAL / EYEWEAR</small>
          </Link>

          <div className="nav-right">


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

      {/* HERO CAROUSEL - UNCHANGED */}
      <section
        className="hero-section"
        aria-label="SpeQ featured collections"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
        onFocusCapture={() => setIsHeroPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsHeroPaused(false);
          }
        }}
      >
        {previousSlideIndex !== null && (
          <div
            className="hero-background hero-background-previous"
            style={{
              backgroundImage: `url("${heroSlides[previousSlideIndex].image}")`,
            }}
            aria-hidden="true"
          />
        )}

        <div
          key={currentSlide.image}
          className={`hero-background ${
            previousSlideIndex !== null ? "hero-background-current" : ""
          }`}
          style={{ backgroundImage: `url("${currentSlide.image}")` }}
          onAnimationEnd={() => setPreviousSlideIndex(null)}
          aria-hidden="true"
        />

        <div className="hero-overlay" />

        <button
          type="button"
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
          type="button"
          className="hero-arrow hero-arrow-right"
          onClick={showNext}
          aria-label="Next slide"
        >
          <ChevronRight size={24} />
        </button>

        <div className="hero-pagination">
          {heroSlides.map((slide, index) => (
            <button
              type="button"
              key={slide.tag}
              className={activeSlide === index ? "active" : ""}
              onClick={() => changeSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}

          <span>
            0{activeSlide + 1} / 0{heroSlides.length}
          </span>
        </div>
      </section>

      {/* TOP CATEGORIES - DATABASE CONNECTED */}
      <section className="categories-section" id="categories">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">IMAGE REGISTRY / SELECTIONS</span>
            <h2>Top Categories</h2>
          </div>

          <Link to="/products" className="view-all-link">
            View All Categories <ArrowUpRight size={16} />
          </Link>
        </div>

        {catalogLoading && displayedCategories.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#8295A5]">
            Loading categories...
          </p>
        ) : catalogErrors.categories ? (
          <p className="py-12 text-center text-sm text-red-600">
            {catalogErrors.categories}
          </p>
        ) : displayedCategories.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#8295A5]">
            No categories are available right now.
          </p>
        ) : (
          <div
            className="category-carousel"
            onMouseEnter={() => setIsCategoryPaused(true)}
            onMouseLeave={() => setIsCategoryPaused(false)}
            onFocusCapture={() => setIsCategoryPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsCategoryPaused(false);
              }
            }}
          >
            <div
              className="categories-grid"
              role="group"
              aria-roledescription="carousel"
              aria-label="Shop eyewear categories"
              onPointerDown={handleCategoryPointerDown}
              onPointerUp={handleCategoryPointerUp}
              onPointerCancel={() => {
                categoryPointerStartX.current = null;
              }}
              onClickCapture={handleCategoryClickCapture}
            >
              {displayedCategories.map((category, index) => {
                const position =
                  (index -
                    activeCategory +
                    displayedCategories.length) %
                  displayedCategories.length;

                const positionClass =
                  position === 0
                    ? "center"
                    : position === 1
                      ? "right"
                      : "left";

                return (
                  <Link
                    to={`/products?category=${encodeURIComponent(category.slug)}`}
                    className={`category-card category-card--${positionClass}`}
                    key={category.id ?? category.slug}
                    aria-label={`Explore ${category.name}`}
                    aria-current={position === 0 ? "true" : undefined}
                    tabIndex={position === 0 ? 0 : -1}
                  >
                    <div className="category-image">
                      <img
                        src={category.image}
                        alt={category.name}
                        draggable="false"
                      />

                      <span className="category-tag">{category.tag}</span>
                      <span className="category-number">
                        0{index + 1} / 0{displayedCategories.length}
                      </span>

                      <div className="category-info">
                        <div>
                          <h3>{category.name}</h3>
                          <p>{category.subtitle}</p>
                        </div>

                        <span className="category-explore" aria-hidden="true">
                          <ArrowUpRight size={20} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {displayedCategories.length > 1 && (
              <div className="category-carousel-footer">
                <p className="category-carousel-count">
                  <strong>
                    0{activeCategory + 1}
                  </strong>
                  <span>/ 0{displayedCategories.length}</span>
                  <span className="category-carousel-hint">
                    DRAG OR SWIPE TO EXPLORE
                  </span>
                </p>

                <div
                  className="category-carousel-controls"
                  aria-label="Category carousel controls"
                >
                  <button
                    type="button"
                    onClick={showPreviousCategory}
                    aria-label="Previous category"
                  >
                    <ChevronLeft size={19} />
                  </button>

                  <div className="category-carousel-dots">
                    {displayedCategories.map((category, index) => (
                      <button
                        type="button"
                        key={category.id ?? category.slug}
                        className={activeCategory === index ? "active" : ""}
                        onClick={() => setActiveCategory(index)}
                        aria-label={`Show ${category.name}`}
                        aria-pressed={activeCategory === index}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={showNextCategory}
                    aria-label="Next category"
                  >
                    <ChevronRight size={19} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* COLLECTIONS - DATABASE CONNECTED */}
      <section
        className="relative isolate w-full overflow-hidden border-t border-[#D8E3EB] bg-[#EAF2F8] py-24"
        id="brands"
      >
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2200&q=85')",
          }}
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-white/90 via-white/80 to-[#EAF2F8]"
          aria-hidden="true"
        />

        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-5 font-serif text-4xl font-medium tracking-tight text-[#172B3A] md:text-5xl">
              Our Iconic Collections
            </h2>

            <p className="mx-auto max-w-2xl text-sm leading-7 text-[#8295A5] md:text-base">
              Discover distinctive eyewear identities shaped by contemporary
              design, refined craftsmanship and an individual perspective.
            </p>
          </div>

          {catalogLoading && collections.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8295A5]">
              Loading collections...
            </p>
          ) : catalogErrors.collections ? (
            <p className="py-12 text-center text-sm text-red-600">
              {catalogErrors.collections}
            </p>
          ) : collections.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8295A5]">
              No collections are available right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {collections.map((collection, index) => (
                <article
                  className="group relative h-[500px] overflow-hidden rounded-3xl bg-[#DCE5EC] shadow-2xl"
                  key={collection.id ?? collection.slug}
                >
                  <img
                    src={
                      collection.image ||
                      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1400&q=90"
                    }
                    alt={collection.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-[#172B3A]/10 transition-colors duration-700 group-hover:bg-transparent" />

                  <div className="absolute bottom-6 left-6 right-6 translate-y-4 rounded-2xl border border-white/40 bg-white/20 p-5 shadow-[0_8px_32px_rgba(38,59,75,0.2)] backdrop-blur-xl transition-all duration-500 group-hover:translate-y-0">
                    <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#426782]">
                      SPEQ COLLECTION / 0{index + 1}
                    </span>

                    <h3 className="mb-3 font-serif text-3xl font-medium tracking-wide text-[#172B3A]">
                      {collection.name}
                    </h3>

                    <p className="mb-7 max-w-sm text-sm font-medium leading-7 text-[#263B4B]">
                      {collection.description ||
                        "Explore distinctive eyewear from this SpeQ collection."}
                    </p>

                    <Link
                      to={`/products?collection=${encodeURIComponent(collection.slug)}`}
                      className="group/button inline-flex items-center gap-3 rounded-full border border-white bg-white/70 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#172B3A] transition-all duration-300 hover:bg-white"
                    >
                      EXPLORE COLLECTION
                      <ArrowUpRight
                        size={15}
                        className="transition-transform duration-300 group-hover/button:translate-x-1"
                      />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FIND YOUR SHAPE - LINKS TO PRODUCT FILTER */}
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
            <Link
              to={`/products?frame_shape=${encodeURIComponent(shape.type)}`}
              className="shape-card"
              key={shape.type}
            >
              <span className="shape-number">0{index + 1}</span>

              <FrameIllustration type={shape.type} />

              <div className="shape-info">
                <h3>{shape.name}</h3>
                <span className="shape-dimensions">
                  {shape.dimensions} MM
                </span>
                <p>{shape.description}</p>
              </div>

              <span className="shape-arrow">
                <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* VIRTUAL TRY-ON - UNCHANGED */}
      <section className="w-full bg-[#EAF2F8] pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="group relative mx-auto aspect-square w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/60 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=2000&q=90"
              alt="Model wearing eyewear"
              className="absolute inset-0 h-full w-full object-cover object-[center_30%] transition-transform duration-[2000ms] group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-[#172B3A]/40 transition-colors duration-700 group-hover:bg-[#172B3A]/50" />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-[#C5AE87]">
                THE FUTURE OF EYEWEAR
              </span>

              <h2 className="font-serif text-4xl leading-tight text-white md:text-6xl">
                Try On Your Face
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/80 md:text-base">
                Discover your perfect look. Experience your favourite frames in
                a whole new way.
              </p>

              <a
                href="#categories"
                className="mt-9 inline-flex items-center gap-3 rounded-full border border-[#C5AE87] bg-transparent px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[#C5AE87] transition-all duration-300 hover:bg-[#C5AE87] hover:text-[#172B3A] hover:shadow-[0_0_20px_rgba(197,174,135,0.4)]"
              >
                Start Virtual Try-On
                <ArrowUpRight
                  size={17}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* OCCASIONS - DATABASE CONNECTED */}
      <section className="w-full border-t border-[#D8E3EB] bg-[#F5F8FA] py-24">
        <div className="mx-auto max-w-[1440px] px-6 md:px-12">
          <div className="mb-14 text-center">
            <span className="section-eyebrow">
              DISCOVER YOUR MOMENT / SPEQ EDIT
            </span>

            <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#172B3A] md:text-5xl">
              Frames for Every Occasion
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#8295A5] md:text-base">
              Find eyewear that fits the moments, places and experiences that
              make your style your own.
            </p>
          </div>

          {catalogLoading && occasions.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8295A5]">
              Loading occasions...
            </p>
          ) : catalogErrors.occasions ? (
            <p className="py-12 text-center text-sm text-red-600">
              {catalogErrors.occasions}
            </p>
          ) : occasions.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8295A5]">
              No occasions are available right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {occasions.map((occasion, index) => (
                <Link
                  to={`/products?occasion=${encodeURIComponent(occasion.slug)}`}
                  key={occasion.id ?? occasion.slug}
                  className="group relative min-h-[360px] overflow-hidden rounded-2xl bg-[#DCE5EC] shadow-lg"
                >
                  <img
                    src={
                      occasion.image ||
                      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85"
                    }
                    alt={occasion.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#172B3A]/90 via-[#172B3A]/15 to-transparent transition-colors duration-500 group-hover:from-[#172B3A]/95" />

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5AE87]">
                      OCCASION / 0{index + 1}
                    </span>

                    <h3 className="font-serif text-2xl font-medium text-white">
                      {occasion.name}
                    </h3>

                    {occasion.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/80">
                        {occasion.description}
                      </p>
                    )}

                    <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                      EXPLORE FRAMES
                      <ArrowUpRight
                        size={15}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>



      {/* CONTACT & CONCIERGE - UNCHANGED */}
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

      {/* FOOTER - UNCHANGED */}
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
            <Link to="/products?category=sunglasses">Sunglasses</Link>
            <Link to="/products?category=eyeglasses">Eyeglasses</Link>
            <Link to="/products?category=screenglasses">Screenglasses</Link>
            <Link to="/products">Collections</Link>
          </div>

          <div className="footer-column">
            <h4>THE SPEQ EXPERIENCE</h4>
            <Link to="/#brands">Our Brands</Link>
            <Link to="/#shapes">Find Your Shape</Link>
            <Link to="/signup">Face Analysis</Link>
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
