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

        {/* PIXEL 3D ISOMETRIC BOT — above CTA */}
        <div className={styles.pixelBotWrap} aria-hidden="true">
          <svg
            width="170"
            height="210"
            viewBox="0 0 170 210"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.pixelBot}
          >
            {/* ── ANTENNA BALL ── */}
            {/* top face */}
            <polygon points="62,4 98,4 104,0 68,0" fill="#FDE68A"/>
            {/* front face */}
            <rect x="62" y="4" width="36" height="12" fill="#F59E0B"/>
            {/* right face */}
            <polygon points="98,4 98,16 104,12 104,0" fill="#B45309"/>
            {/* glint */}
            <rect x="64" y="6" width="10" height="6" fill="#FEF9C3"/>

            {/* ── ANTENNA POST ── */}
            <polygon points="76,16 90,16 96,12 82,12" fill="#A5B4FC"/>
            <rect x="76" y="16" width="14" height="24" fill="#6366F1"/>
            <polygon points="90,16 90,40 96,36 96,12" fill="#4338CA"/>

            {/* ── HEAD BLOCK ── */}
            {/* top face (lightest) */}
            <polygon points="18,40 142,40 148,35 24,35" fill="#A5B4FC"/>
            {/* front face */}
            <rect x="18" y="40" width="124" height="72" fill="#6366F1"/>
            {/* right face (darkest) */}
            <polygon points="142,40 142,112 148,107 148,35" fill="#4338CA"/>
            {/* bottom shadow */}
            <rect x="18" y="112" width="130" height="4" fill="#3730A3"/>

            {/* ── EAR BOLTS LEFT ── */}
            <polygon points="2,60 18,60 18,56 2,56" fill="#818CF8"/>
            <rect x="2" y="60" width="16" height="20" fill="#6366F1"/>
            <rect x="18" y="56" width="6" height="24" fill="#4338CA"/>
            <rect x="5" y="63" width="8" height="8" fill="#818CF8"/>

            {/* ── EAR BOLTS RIGHT (on right face) ── */}
            <rect x="142" y="60" width="6" height="20" fill="#4338CA"/>
            <rect x="143" y="63" width="4" height="8" fill="#4F46E5"/>

            {/* ── EYE SOCKETS ── */}
            <rect x="30" y="52" width="40" height="30" fill="#1E1B4B"/>
            <rect x="88" y="52" width="40" height="30" fill="#1E1B4B"/>

            {/* ── LEFT EYE ── */}
            <rect x="32" y="54" width="36" height="26" fill="#075985"/>
            <rect x="34" y="56" width="32" height="22" fill="#0369A1"/>
            <rect x="36" y="58" width="28" height="18" fill="#0EA5E9" className={styles.eyePixel}/>
            <rect x="38" y="60" width="20" height="12" fill="#38BDF8"/>
            {/* highlight */}
            <rect x="34" y="56" width="14" height="8" fill="#BAE6FD"/>
            <rect x="34" y="56" width="6" height="4" fill="#E0F2FE"/>

            {/* ── RIGHT EYE ── */}
            <rect x="90" y="54" width="36" height="26" fill="#075985"/>
            <rect x="92" y="56" width="32" height="22" fill="#0369A1"/>
            <rect x="94" y="58" width="28" height="18" fill="#0EA5E9" className={styles.eyePixel}/>
            <rect x="96" y="60" width="20" height="12" fill="#38BDF8"/>
            <rect x="92" y="56" width="14" height="8" fill="#BAE6FD"/>
            <rect x="92" y="56" width="6" height="4" fill="#E0F2FE"/>

            {/* ── MOUTH PIXEL GRID ── */}
            <rect x="44" y="96" width="78" height="10" fill="#1E1B4B"/>
            <rect x="46" y="98" width="12" height="6" fill="#38BDF8"/>
            <rect x="62" y="98" width="12" height="6" fill="#38BDF8"/>
            <rect x="78" y="98" width="12" height="6" fill="#38BDF8"/>
            <rect x="94" y="98" width="12" height="6" fill="#38BDF8"/>
            <rect x="110" y="98" width="10" height="6" fill="#38BDF8"/>

            {/* ── NECK ── */}
            <polygon points="56,116 114,116 120,111 62,111" fill="#818CF8"/>
            <rect x="56" y="116" width="58" height="14" fill="#6366F1"/>
            <polygon points="114,116 114,130 120,125 120,111" fill="#4338CA"/>

            {/* ── BODY BLOCK ── */}
            {/* top face */}
            <polygon points="12,146 148,146 154,141 18,141" fill="#818CF8"/>
            {/* front face */}
            <rect x="12" y="146" width="136" height="62" fill="#6366F1"/>
            {/* right face */}
            <polygon points="148,146 148,208 154,203 154,141" fill="#4338CA"/>
            {/* bottom shadow */}
            <rect x="12" y="208" width="142" height="4" fill="#3730A3"/>

            {/* ── CHEST DISPLAY ── */}
            <rect x="26" y="156" width="110" height="48" fill="#1E1B4B"/>
            <rect x="29" y="159" width="104" height="42" fill="#0F0F3D"/>
            {/* row 1 */}
            <rect x="31" y="161" width="14" height="10" fill="#38BDF8" className={styles.screenPixel}/>
            <rect x="49" y="161" width="14" height="10" fill="#818CF8"/>
            <rect x="67" y="161" width="14" height="10" fill="#38BDF8" className={styles.screenPixel}/>
            <rect x="85" y="161" width="14" height="10" fill="#F472B6"/>
            <rect x="103" y="161" width="14" height="10" fill="#38BDF8" className={styles.screenPixel}/>
            <rect x="121" y="161" width="10" height="10" fill="#818CF8"/>
            {/* row 2 */}
            <rect x="31" y="175" width="14" height="10" fill="#4F46E5"/>
            <rect x="49" y="175" width="14" height="10" fill="#38BDF8" className={styles.screenPixel}/>
            <rect x="67" y="175" width="14" height="10" fill="#818CF8"/>
            <rect x="85" y="175" width="14" height="10" fill="#38BDF8" className={styles.screenPixel}/>
            <rect x="103" y="175" width="14" height="10" fill="#F472B6"/>
            <rect x="121" y="175" width="10" height="10" fill="#38BDF8" className={styles.screenPixel}/>
            {/* row 3 */}
            <rect x="31" y="189" width="14" height="10" fill="#38BDF8" className={styles.screenPixel}/>
            <rect x="49" y="189" width="14" height="10" fill="#F472B6"/>
            <rect x="67" y="189" width="14" height="10" fill="#38BDF8" className={styles.screenPixel}/>
            <rect x="85" y="189" width="14" height="10" fill="#4F46E5"/>
            <rect x="103" y="189" width="14" height="10" fill="#818CF8"/>
            <rect x="121" y="189" width="10" height="10" fill="#38BDF8" className={styles.screenPixel}/>

            {/* ── LEFT ARM ── */}
            <polygon points="0,149 12,149 18,144 6,144" fill="#818CF8"/>
            <rect x="0" y="149" width="12" height="50" fill="#6366F1"/>
            <polygon points="12,149 12,199 18,194 18,144" fill="#4338CA"/>

            {/* ── RIGHT ARM ── */}
            <polygon points="148,149 160,149 166,144 154,144" fill="#818CF8"/>
            <rect x="148" y="149" width="12" height="50" fill="#4F46E5"/>
            <polygon points="160,149 160,199 166,194 166,144" fill="#3730A3"/>

            {/* ── PIXEL SHADOW UNDER FEET ── */}
            <ellipse cx="83" cy="212" rx="50" ry="5" fill="#6366F1" opacity="0.18"/>
          </svg>

          {/* Speech bubble */}
          <div className={styles.pixelBubble}>
            <span>I got this! ⚡</span>
          </div>
        </div>

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
