"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import styles from "./home-page.module.css";

const heroSlides = [
  {
    src: "/images/home/hero-celestial.jpg",
    alt: "Arame Celestial Fragrance",
  },
  {
    src: "/images/home/hero-luxury-collection.jpg",
    alt: "Arame Luxury Perfume Collection",
  },
];

const features = [
  {
    title: "Natural Ingredients",
    body: "Every formula begins with ethically sourced botanicals - flowers, woods, and resins chosen for their purity and depth.",
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" aria-hidden="true">
        <path d="M12 2C8 7 4 10 4 14a8 8 0 0016 0c0-4-4-7-8-12z" />
        <path d="M12 8v8M9 14l3 3 3-3" />
      </svg>
    ),
  },
  {
    title: "Luxury Packaging",
    body: "Gift-ready presentation as standard. Every order arrives sealed with care - worthy of the moment it represents.",
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 014 0" />
        <path d="M12 12v4M10 14h4" />
      </svg>
    ),
  },
  {
    title: "Lasting Sillage",
    body: "Long-wear formulations designed to evolve on the skin - opening bright, settling warm, and lingering for hours.",
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Made with Love",
    body: "Every bottle is blended by hand in small batches - because a great fragrance deserves the full attention of those who create it.",
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
];

const polaroids = [
  {
    className: styles.p1,
    src: "/images/home/polaroid-atelier.jpg",
    alt: "Perfume atelier",
    title: "In the Atelier",
    sub: "A glimpse into the sacred space where every drop is born",
  },
  {
    className: styles.p2,
    src: "/images/home/polaroid-ingredients.jpg",
    alt: "Raw ingredients",
    title: "The Ingredients",
    sub: "Rare botanicals and ancient resins",
  },
  {
    className: styles.p3,
    src: "/images/home/polaroid-vessel.jpg",
    alt: "Perfume bottle",
    title: "The Vessel",
    sub: "Where fragrance meets form",
  },
  {
    className: styles.p4,
    src: "/images/home/polaroid-ritual.jpg",
    alt: "Applying perfume",
    title: "The Ritual",
    sub: "The moments that frame our scent",
  },
  {
    className: styles.p5,
    src: "/images/home/polaroid-launch-nights.jpg",
    alt: "Launch event",
    title: "Launch Nights",
    sub: "Where scent meets celebration",
  },
  {
    className: styles.p6,
    src: "/images/home/polaroid-perfumer.jpg",
    alt: "Perfumer at work",
    title: "The Perfumer's Hand",
    sub: "Decades of craft distilled into every bottle",
  },
  {
    className: styles.p7,
    src: "/images/home/polaroid-harvest.jpg",
    alt: "Flower fields",
    title: "The Harvest",
    sub: "Sourcing the finest blooms from Grasse",
  },
  {
    className: styles.p8,
    src: "/images/home/polaroid-finishing.jpg",
    alt: "Bottling line",
    title: "The Finishing",
    sub: "Every bottle sealed with intention",
  },
];

const faqs = [
  {
    question: "How long does it take to receive my order?",
    answer:
      "Orders are processed within 1-2 business days. Standard shipping takes 3-5 business days, express available at checkout.",
  },
  {
    question: "Do you offer custom fragrance design?",
    answer:
      "Yes - we collaborate with private clients for bespoke scents. Contact us to start the journey.",
  },
  {
    question: "What types of ingredients do you use?",
    answer:
      "Only ethically sourced naturals and safe synthetics. No parabens, phthalates, or animal testing.",
  },
  {
    question: "How do I care for my perfume?",
    answer:
      "Store in a cool, dark place away from sunlight and temperature changes. Use within 24 months of opening.",
  },
  {
    question: "What is your return policy?",
    answer:
      "Unopened bottles may be returned within 14 days. Opened bottles cannot be returned due to hygiene reasons.",
  },
];

export function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const onSplashComplete = () => {
      setIsVisible(true);
    };

    window.addEventListener("arame:splash-complete", onSplashComplete);

    const fallbackTimer = window.setTimeout(() => {
      setIsVisible(true);
    }, 1900);

    const slideTimer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => {
      window.removeEventListener("arame:splash-complete", onSplashComplete);
      window.clearTimeout(fallbackTimer);
      window.clearInterval(slideTimer);
    };
  }, []);

  return (
    <div
      id="landing"
      className={`${styles.landing} ${isVisible ? styles.visible : ""}`}
    >
      <Header variant="home" />

      <section className={styles.hero}>
        {heroSlides.map((slide, index) => (
          <div
            key={slide.src}
            className={`${styles.slide} ${
              currentSlide === index ? styles.active : ""
            }`}
          >
            <img className={styles.heroImg} src={slide.src} alt={slide.alt} />
          </div>
        ))}

        <div className={styles.heroOverlay} />

        <div className={styles.heroCopy}>
          <div className={styles.heroEyebrow}>Handcrafted with passion</div>

          <h1 className={styles.heroTitle}>
            A Scent to
            <br />
            Fall in Love With
          </h1>

          <p className={styles.heroBody}>
            A tender embrace of vanilla bean and amber, softened by a whisper of
            jasmine petals. Warm cashmere wood and honeyed tobacco linger like a
            sweet secret on the skin.
          </p>

          <div className={styles.heroActions}>
            <a href="/shop" className={styles.btnPrimary}>
              Shop Collection
            </a>

            <a href="#story" className={styles.btnGhost}>
              Our Story
            </a>
          </div>
        </div>

        <div className={styles.scrollDots}>
          {heroSlides.map((slide, index) => (
            <button
              suppressHydrationWarning
              key={slide.src}
              type="button"
              className={`${styles.dot} ${
                currentSlide === index ? styles.active : ""
              }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            ></button>
          ))}
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <div className={styles.featureTitle}>{feature.title}</div>
              <div className={styles.featureBody}>{feature.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.scentLife}>
        <div className={styles.scentLifeHeader}>
          <h2 className={styles.scentLifeTitle}>Scent Life</h2>

          <a href="/blog" className={styles.discoverLink}>
            Discover more stories {"\u2192"}
          </a>
        </div>

        <div className={styles.polaroidField}>
          {polaroids.map((polaroid) => (
            <div
              key={polaroid.title}
              className={`${styles.polaroid} ${polaroid.className}`}
            >
              <img src={polaroid.src} alt={polaroid.alt} />
              <div className={styles.capTitle}>{polaroid.title}</div>
              <div className={styles.capSub}>{polaroid.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="story" className={styles.ourStory}>
        <div className={styles.storyVideo}>
          <video autoPlay muted loop playsInline>
            <source
              src="https://v.etsystatic.com/video/upload/ac_none,du_15,q_auto:good/gxdtcobgpb1sih8uishl.mp4"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        </div>

        <div className={styles.storyText}>
          <div className={styles.storyEyebrow}>Our Story</div>

          <h2 className={styles.storyTitle}>
            A Legacy of
            <br />
            Rare Fragrance
          </h2>

          <div className={styles.storyGoldLine} />

          <p className={styles.storyBody}>
            Founded in the heart of Lagos, Aram{"\u00E8"} began as a singular
            obsession: to bring the world&apos;s most extraordinary scents to
            those who believe fragrance is more than a finishing touch - it is
            an identity.
          </p>

          <p className={styles.storyBody}>
            Our founder believed that every person deserves a signature that
            arrives before they do and lingers long after they leave. Today,
            that belief shapes every drop we craft.
          </p>

          <a href="/blog" className={styles.storyLink}>
            Discover our heritage {"\u2192"}
          </a>
        </div>
      </section>

      <section id="faq" className={styles.faqSection}>
        <div className={styles.faqContainer}>
          <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>

          <div className={styles.faqGrid}>
            {faqs.map((faq) => (
              <div key={faq.question} className={styles.faqItem}>
                <div className={styles.faqQuestion}>{faq.question}</div>
                <div className={styles.faqAnswer}>{faq.answer}</div>
              </div>
            ))}
          </div>

          <a href="#contact" className={styles.faqContactLink}>
            Still have questions? Contact us {"\u2192"}
          </a>
        </div>
      </section>

      <section id="contact" className={styles.contactSection}>
        <div className={styles.contactContainer}>
          <div className={styles.contactInfo}>
            <h3>Get in Touch</h3>

            <p>
              We&apos;d love to hear from you. Whether you have a question about
              our fragrances, need advice on finding your signature scent, or
              want to discuss a bespoke project, our team is here to help.
            </p>

            <div className={styles.contactDetail}>
              <h4>VISIT OUR SHOWROOM</h4>
              <p>1234 Fragrance Lane, Paris, France 75001</p>
            </div>

            <div className={styles.contactDetail}>
              <h4>EMAIL US</h4>
              <a href="mailto:hello@arame.com">hello@arame.com</a>
            </div>

            <div className={styles.contactDetail}>
              <h4>CALL US</h4>
              <a href="tel:+33123456789">+33 (0)1 23 45 67 89</a>
            </div>
          </div>

          <div className={styles.contactForm}>
            <textarea
              suppressHydrationWarning
              rows={5}
              placeholder="Tell us about your project..."
              autoComplete="off"
            />

            <button
              suppressHydrationWarning
              className={styles.sendBtn}
              type="button"
              onClick={() => {
                window.location.href = "mailto:hello@arame.com";
              }}
            >
              Send Message {"\u2192"}
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
