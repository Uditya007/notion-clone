"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowRight, Play, X, Sun, Moon } from "lucide-react";
import styles from "./home.module.css";
import CoraLogo from "@/components/CoraLogo";

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [stepsVisible, setStepsVisible] = useState([false, false, false]);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("cora-theme") || "dark";
    if (savedTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
      setTheme(prefersDark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", savedTheme);
      setTheme(savedTheme);
    }
    setIsLoading(false);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("cora-theme", nextTheme);
  };
  
  const stepRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null)
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/workspace");
      } else {
        setIsLoading(false);
      }
    });
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = stepRefs.findIndex(ref => ref.current === entry.target);
          if (index !== -1) {
            setStepsVisible(prev => {
              const updated = [...prev];
              updated[index] = true;
              return updated;
            });
          }
        }
      });
    }, { threshold: 0.15 });

    stepRefs.forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <div className={styles.container}>
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea}>
          <CoraLogo className={styles.logoSvg} />
          <span className={styles.logoText}>cora</span>
        </div>
        
        <div className={styles.navLinks}>
          <Link href="#features" className={styles.navLink}>Features</Link>
          <Link href="#how-it-works" className={styles.navLink}>How it works</Link>
        </div>

        <div className={styles.navActions}>
          <button 
            onClick={toggleTheme} 
            className={styles.themeToggleBtn}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/login" className={styles.loginLink}>
            Log in
          </Link>
          <Link href="/signup" className={styles.primaryBtn}>
            Get started
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.pillBadge}>
          <span>Now in public beta</span>
        </div>
        
        <h1 className={styles.heroTitle}>
          Think clearly.<br />
          Work fast.
        </h1>
        
        <p className={styles.heroSubtext}>
          Cora is an AI-powered workspace for notes, tasks, and databases. No clutter. No learning curve.
        </p>
        
        <div className={styles.heroButtons}>
          <Link href="/signup" className={styles.heroPrimaryBtn}>
            Start for free <ArrowRight size={16} />
          </Link>
          <button onClick={() => setShowDemoModal(true)} className={styles.heroSecondaryBtn}>
            <Play size={14} fill="currentColor" /> See how it works →
          </button>
        </div>
        
        <div className={styles.trustLine}>
          <span>Free forever · No credit card required</span>
        </div>

        {/* APP MOCKUP */}
        <div className={styles.mockupWrapper}>
          <div className={styles.appMockup}>
            {/* Fake browser chrome */}
            <div className={styles.mockupChrome}>
              <div className={styles.chromeDots}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.chromeUrl}>cora.app</div>
            </div>
            
            {/* Fake inner layout */}
            <div className={styles.mockupInner}>
              {/* Fake Sidebar */}
              <div className={styles.fakeSidebar}>
                <div className={styles.fakeAvatarRow}>
                  <div className={styles.fakeAvatar}></div>
                  <div className={styles.fakeSidebarLineShort}></div>
                </div>
                <div className={styles.fakeSearchInput}>Search...</div>
                <div className={styles.fakeSidebarGroup}>
                  <div className={styles.fakeSidebarLine}></div>
                  <div className={styles.fakeSidebarLineShort}></div>
                  <div className={styles.fakeSidebarLine}></div>
                </div>
                <div className={styles.fakeSidebarGroup}>
                  <div className={styles.fakePageItem}>
                    <div className={styles.fakePageSquare} />
                    <div className={styles.fakeSidebarLineShort} />
                  </div>
                  <div className={styles.fakePageItem}>
                    <div className={styles.fakePageSquare} />
                    <div className={styles.fakeSidebarLine} />
                  </div>
                </div>
              </div>
              
              {/* Fake Editor */}
              <div className={styles.fakeEditor}>
                <div className={styles.fakeEditorTitle}></div>
                <div className={styles.fakeEditorLine}></div>
                <div className={styles.fakeEditorLine}></div>
                <div className={styles.fakeEditorLineShort}></div>
                <div style={{ height: "12px" }} />
                <div className={styles.fakeEditorLine}></div>
                <div className={styles.fakeEditorLineShort}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeadingArea}>
          <span className={styles.sectionPre}>Features</span>
          <h2 className={styles.sectionTitle}>Everything in one place.</h2>
        </div>

        <div className={styles.featuresGrid}>
          {/* Row 1 */}
          <div className={styles.featureRow}>
            <span className={styles.featureName}>AI Writing</span>
            <span className={styles.featureDesc}>Write, summarize, and improve with one keystroke.</span>
          </div>

          {/* Row 2 */}
          <div className={styles.featureRow}>
            <span className={styles.featureName}>Smart Databases</span>
            <span className={styles.featureDesc}>Tables, boards, and galleries that just work.</span>
          </div>

          {/* Row 3 */}
          <div className={styles.featureRow}>
            <span className={styles.featureName}>Task Management</span>
            <span className={styles.featureDesc}>Capture, organize, and complete work faster.</span>
          </div>

          {/* Row 4 */}
          <div className={styles.featureRow}>
            <span className={styles.featureName}>Google Calendar</span>
            <span className={styles.featureDesc}>All your events alongside your notes.</span>
          </div>

          {/* Row 5 */}
          <div className={styles.featureRow}>
            <span className={styles.featureName}>AI Agents</span>
            <span className={styles.featureDesc}>Autonomous workers that run while you focus.</span>
          </div>

          {/* Row 6 */}
          <div className={styles.featureRow}>
            <span className={styles.featureName}>Voice to Text</span>
            <span className={styles.featureDesc}>Record thoughts, AI transcribes and organizes.</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className={styles.howItWorksSection}>
        <h2 className={styles.howItWorksTitle}>Up and running in 3 steps.</h2>
        
        <div className={styles.stepsContainer}>
          {/* Step 1 */}
          <div 
            ref={stepRefs[0]} 
            className={`${styles.stepCard} ${stepsVisible[0] ? styles.visible : ""}`}
          >
            <div className={styles.stepNumberBig}>01</div>
            <h3 className={styles.stepTitle}>Create your account</h3>
            <p className={styles.stepDesc}>Sign up in 30 seconds. No credit card.</p>
          </div>

          {/* Step 2 */}
          <div 
            ref={stepRefs[1]} 
            className={`${styles.stepCard} ${stepsVisible[1] ? styles.visible : ""}`}
          >
            <div className={styles.stepNumberBig}>02</div>
            <h3 className={styles.stepTitle}>Set up your workspace</h3>
            <p className={styles.stepDesc}>Start blank or let AI build it for you.</p>
          </div>

          {/* Step 3 */}
          <div 
            ref={stepRefs[2]} 
            className={`${styles.stepCard} ${stepsVisible[2] ? styles.visible : ""}`}
          >
            <div className={styles.stepNumberBig}>03</div>
            <h3 className={styles.stepTitle}>Work without friction</h3>
            <p className={styles.stepDesc}>Everything you need, nothing you don't.</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>Ready to clear the clutter?</h2>
        <Link href="/signup" className={styles.finalCtaBtn}>
          Start for free
        </Link>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <CoraLogo className={styles.footerLogoSvg} />
          <span>Cora © 2026</span>
        </div>
        <div className={styles.footerLinks}>
          <Link href="#" className={styles.footerLink}>Privacy</Link>
          <Link href="#" className={styles.footerLink}>Terms</Link>
          <Link href="#" className={styles.footerLink}>GitHub</Link>
        </div>
      </footer>

      {/* VIDEO DEMO MODAL */}
      {showDemoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDemoModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🎬 Cora Product Tour</h3>
              <button className={styles.closeBtn} onClick={() => setShowDemoModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalVideoBody}>
              <div className={styles.fakeVideoPlayer}>
                <Play size={32} fill="var(--white)" color="var(--white)" style={{ opacity: 0.85 }} />
                <span>Simulated Product Walkthrough</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
