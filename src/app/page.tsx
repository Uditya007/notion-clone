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

        {/* CARTOON BOT SLIDING ANIMATION */}
        <div className={styles.botTrack} aria-hidden="true">
          <div className={styles.botSlider}>
            {/* Bot 1 */}
            <div className={styles.botUnit}>
              <svg width="72" height="88" viewBox="0 0 72 88" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.botSvg}>
                {/* Antenna */}
                <rect x="34" y="0" width="4" height="12" rx="2" fill="currentColor" opacity="0.3"/>
                <circle cx="36" cy="0" r="4" fill="currentColor" opacity="0.5"/>
                {/* Head */}
                <rect x="8" y="12" width="56" height="40" rx="12" fill="currentColor" opacity="0.12"/>
                <rect x="10" y="14" width="52" height="36" rx="10" fill="currentColor" opacity="0.08"/>
                {/* Eyes */}
                <rect x="18" y="24" width="14" height="10" rx="5" fill="currentColor" opacity="0.35"/>
                <rect x="40" y="24" width="14" height="10" rx="5" fill="currentColor" opacity="0.35"/>
                <circle cx="25" cy="29" r="3" fill="currentColor" opacity="0.7"/>
                <circle cx="47" cy="29" r="3" fill="currentColor" opacity="0.7"/>
                <circle cx="26" cy="28" r="1" fill="white" opacity="0.9"/>
                <circle cx="48" cy="28" r="1" fill="white" opacity="0.9"/>
                {/* Smile */}
                <path d="M24 38 Q36 46 48 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4"/>
                {/* Ear bolts */}
                <rect x="2" y="26" width="8" height="14" rx="4" fill="currentColor" opacity="0.2"/>
                <rect x="62" y="26" width="8" height="14" rx="4" fill="currentColor" opacity="0.2"/>
                {/* Body */}
                <rect x="14" y="54" width="44" height="28" rx="10" fill="currentColor" opacity="0.1"/>
                {/* Chest light */}
                <circle cx="36" cy="65" r="5" fill="currentColor" opacity="0.25"/>
                <circle cx="36" cy="65" r="2.5" fill="currentColor" opacity="0.45"/>
                {/* Arms */}
                <rect x="0" y="56" width="12" height="22" rx="6" fill="currentColor" opacity="0.12"/>
                <rect x="60" y="56" width="12" height="22" rx="6" fill="currentColor" opacity="0.12"/>
                {/* Legs */}
                <rect x="18" y="80" width="12" height="8" rx="4" fill="currentColor" opacity="0.15"/>
                <rect x="42" y="80" width="12" height="8" rx="4" fill="currentColor" opacity="0.15"/>
              </svg>
              <div className={styles.botBubble}>Thinking...</div>
            </div>

            {/* Bot 2 - slightly different */}
            <div className={`${styles.botUnit} ${styles.botUnit2}`}>
              <svg width="60" height="76" viewBox="0 0 72 88" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${styles.botSvg} ${styles.botSvg2}`}>
                <rect x="34" y="0" width="4" height="12" rx="2" fill="currentColor" opacity="0.25"/>
                <circle cx="36" cy="0" r="4" fill="currentColor" opacity="0.4"/>
                <rect x="8" y="12" width="56" height="40" rx="12" fill="currentColor" opacity="0.1"/>
                <rect x="18" y="22" width="14" height="12" rx="6" fill="currentColor" opacity="0.3"/>
                <rect x="40" y="22" width="14" height="12" rx="6" fill="currentColor" opacity="0.3"/>
                <circle cx="25" cy="28" r="4" fill="currentColor" opacity="0.6"/>
                <circle cx="47" cy="28" r="4" fill="currentColor" opacity="0.6"/>
                <circle cx="26" cy="27" r="1.5" fill="white" opacity="0.9"/>
                <circle cx="48" cy="27" r="1.5" fill="white" opacity="0.9"/>
                <path d="M22 40 Q36 48 50 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35"/>
                <rect x="2" y="24" width="8" height="16" rx="4" fill="currentColor" opacity="0.18"/>
                <rect x="62" y="24" width="8" height="16" rx="4" fill="currentColor" opacity="0.18"/>
                <rect x="14" y="54" width="44" height="28" rx="10" fill="currentColor" opacity="0.08"/>
                <circle cx="36" cy="65" r="6" fill="currentColor" opacity="0.2"/>
                <rect x="0" y="56" width="12" height="22" rx="6" fill="currentColor" opacity="0.1"/>
                <rect x="60" y="56" width="12" height="22" rx="6" fill="currentColor" opacity="0.1"/>
                <rect x="18" y="80" width="12" height="8" rx="4" fill="currentColor" opacity="0.12"/>
                <rect x="42" y="80" width="12" height="8" rx="4" fill="currentColor" opacity="0.12"/>
              </svg>
              <div className={`${styles.botBubble} ${styles.botBubble2}`}>On it! ⚡</div>
            </div>

            {/* Bot 3 */}
            <div className={`${styles.botUnit} ${styles.botUnit3}`}>
              <svg width="80" height="96" viewBox="0 0 72 88" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${styles.botSvg} ${styles.botSvg3}`}>
                <rect x="32" y="0" width="4" height="14" rx="2" fill="currentColor" opacity="0.28"/>
                <rect x="38" y="2" width="3" height="10" rx="1.5" fill="currentColor" opacity="0.2"/>
                <circle cx="34" cy="0" r="5" fill="currentColor" opacity="0.45"/>
                <rect x="6" y="14" width="60" height="42" rx="14" fill="currentColor" opacity="0.11"/>
                <rect x="16" y="23" width="16" height="12" rx="6" fill="currentColor" opacity="0.3"/>
                <rect x="40" y="23" width="16" height="12" rx="6" fill="currentColor" opacity="0.3"/>
                <circle cx="24" cy="29" r="4" fill="currentColor" opacity="0.65"/>
                <circle cx="48" cy="29" r="4" fill="currentColor" opacity="0.65"/>
                <circle cx="25" cy="28" r="1.5" fill="white" opacity="0.95"/>
                <circle cx="49" cy="28" r="1.5" fill="white" opacity="0.95"/>
                <path d="M20 40 Q36 50 52 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.38"/>
                <rect x="0" y="25" width="8" height="18" rx="4" fill="currentColor" opacity="0.2"/>
                <rect x="64" y="25" width="8" height="18" rx="4" fill="currentColor" opacity="0.2"/>
                <rect x="12" y="58" width="48" height="24" rx="10" fill="currentColor" opacity="0.09"/>
                <circle cx="36" cy="67" r="7" fill="currentColor" opacity="0.22"/>
                <circle cx="36" cy="67" r="3" fill="currentColor" opacity="0.4"/>
                <rect x="0" y="60" width="10" height="20" rx="5" fill="currentColor" opacity="0.12"/>
                <rect x="62" y="60" width="10" height="20" rx="5" fill="currentColor" opacity="0.12"/>
                <rect x="16" y="80" width="14" height="8" rx="4" fill="currentColor" opacity="0.14"/>
                <rect x="42" y="80" width="14" height="8" rx="4" fill="currentColor" opacity="0.14"/>
              </svg>
              <div className={`${styles.botBubble} ${styles.botBubble3}`}>✨ Ready!</div>
            </div>
          </div>
        </div>

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
