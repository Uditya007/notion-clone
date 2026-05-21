"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowRight, Play, X, Sun, Moon } from "lucide-react";
import styles from "./home.module.css";
import CoraLogo from "@/components/CoraLogo";

/* ─────────────────────────────────────────
   PIXEL 3D BOT – reusable colour-swappable
───────────────────────────────────────── */
type BotPalette = {
  m: string;   // main / front face
  t: string;   // top face (lighter)
  s: string;   // side face (darker)
  d: string;   // darkest shadow
  e: string;   // eye glow
  el: string;  // eye highlight
  af: string;  // antenna front
  at: string;  // antenna top
  as_: string; // antenna side
};

function PixelBot({ p, w = 64, h = 78 }: { p: BotPalette; w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 170 210" fill="none"
         xmlns="http://www.w3.org/2000/svg" className={styles.pixelBot}>
      {/* antenna ball */}
      <polygon points="62,4 98,4 104,0 68,0"          fill={p.at}/>
      <rect x="62" y="4" width="36" height="12"        fill={p.af}/>
      <polygon points="98,4 98,16 104,12 104,0"        fill={p.as_}/>
      <rect x="64" y="6" width="10" height="6"         fill="white" opacity="0.55"/>
      {/* antenna post */}
      <polygon points="76,16 90,16 96,12 82,12"        fill={p.t}/>
      <rect x="76" y="16" width="14" height="24"       fill={p.m}/>
      <polygon points="90,16 90,40 96,36 96,12"        fill={p.s}/>
      {/* head top */}
      <polygon points="18,40 142,40 148,35 24,35"      fill={p.t}/>
      {/* head front */}
      <rect x="18" y="40" width="124" height="72"      fill={p.m}/>
      {/* head right */}
      <polygon points="142,40 142,112 148,107 148,35"  fill={p.s}/>
      <rect x="18" y="112" width="130" height="4"      fill={p.d}/>
      {/* ear left */}
      <polygon points="2,60 18,60 18,56 2,56"          fill={p.t}/>
      <rect x="2" y="60" width="16" height="20"        fill={p.m}/>
      <rect x="18" y="56" width="6" height="24"        fill={p.s}/>
      <rect x="5" y="63" width="8" height="8"          fill={p.t}/>
      {/* ear right */}
      <rect x="142" y="60" width="6" height="20"       fill={p.s}/>
      <rect x="143" y="63" width="4" height="8"        fill={p.m}/>
      {/* eye sockets */}
      <rect x="30" y="52" width="40" height="30"       fill="#0f0f1e"/>
      <rect x="88" y="52" width="40" height="30"       fill="#0f0f1e"/>
      {/* left eye layers */}
      <rect x="32" y="54" width="36" height="26"       fill={p.e} opacity="0.45"/>
      <rect x="36" y="58" width="28" height="18"       fill={p.e}/>
      <rect x="34" y="56" width="14" height="8"        fill={p.el}/>
      <rect x="34" y="56" width="6" height="4"         fill="white" opacity="0.9"/>
      {/* right eye layers */}
      <rect x="90" y="54" width="36" height="26"       fill={p.e} opacity="0.45"/>
      <rect x="94" y="58" width="28" height="18"       fill={p.e}/>
      <rect x="92" y="56" width="14" height="8"        fill={p.el}/>
      <rect x="92" y="56" width="6" height="4"         fill="white" opacity="0.9"/>
      {/* mouth */}
      <rect x="44" y="96" width="78" height="10"       fill="#0f0f1e"/>
      <rect x="46" y="98" width="12" height="6"        fill={p.e}/>
      <rect x="62" y="98" width="12" height="6"        fill={p.e}/>
      <rect x="78" y="98" width="12" height="6"        fill={p.e}/>
      <rect x="94" y="98" width="12" height="6"        fill={p.e}/>
      <rect x="110" y="98" width="10" height="6"       fill={p.e}/>
      {/* neck */}
      <polygon points="56,116 114,116 120,111 62,111"  fill={p.t}/>
      <rect x="56" y="116" width="58" height="14"      fill={p.m}/>
      <polygon points="114,116 114,130 120,125 120,111" fill={p.s}/>
      {/* body top */}
      <polygon points="12,146 148,146 154,141 18,141"  fill={p.t}/>
      {/* body front */}
      <rect x="12" y="146" width="136" height="62"     fill={p.m}/>
      {/* body right */}
      <polygon points="148,146 148,208 154,203 154,141" fill={p.s}/>
      <rect x="12" y="208" width="142" height="4"      fill={p.d}/>
      {/* chest display */}
      <rect x="26" y="156" width="110" height="48"     fill="#0f0f1e"/>
      <rect x="29" y="159" width="104" height="42"     fill="#080816"/>
      <rect x="31" y="161" width="14" height="10"      fill={p.e}/>
      <rect x="49" y="161" width="14" height="10"      fill={p.t}/>
      <rect x="67" y="161" width="14" height="10"      fill={p.e}/>
      <rect x="85" y="161" width="14" height="10"      fill={p.af}/>
      <rect x="103" y="161" width="14" height="10"     fill={p.e}/>
      <rect x="31" y="175" width="14" height="10"      fill={p.m}/>
      <rect x="49" y="175" width="14" height="10"      fill={p.e}/>
      <rect x="67" y="175" width="14" height="10"      fill={p.t}/>
      <rect x="85" y="175" width="14" height="10"      fill={p.e}/>
      <rect x="103" y="175" width="14" height="10"     fill={p.m}/>
      <rect x="31" y="189" width="14" height="10"      fill={p.e}/>
      <rect x="49" y="189" width="14" height="10"      fill={p.af}/>
      <rect x="67" y="189" width="14" height="10"      fill={p.e}/>
      <rect x="85" y="189" width="14" height="10"      fill={p.m}/>
      <rect x="103" y="189" width="14" height="10"     fill={p.t}/>
      {/* left arm */}
      <polygon points="0,149 12,149 18,144 6,144"      fill={p.t}/>
      <rect x="0" y="149" width="12" height="50"       fill={p.m}/>
      <polygon points="12,149 12,199 18,194 18,144"    fill={p.s}/>
      {/* right arm */}
      <polygon points="148,149 160,149 166,144 154,144" fill={p.t}/>
      <rect x="148" y="149" width="12" height="50"     fill={p.s}/>
      <polygon points="160,149 160,199 166,194 166,144" fill={p.d}/>
    </svg>
  );
}

const BOTS: Array<{ p: BotPalette; label: string; delay: string }> = [
  {
    p: { m:'#6366F1', t:'#A5B4FC', s:'#4338CA', d:'#3730A3',
         e:'#38BDF8', el:'#BAE6FD', af:'#F59E0B', at:'#FDE68A', as_:'#B45309' },
    label: 'Thinking... 🤔', delay: '0s',
  },
  {
    p: { m:'#10B981', t:'#6EE7B7', s:'#059669', d:'#047857',
         e:'#F472B6', el:'#FBCFE8', af:'#EF4444', at:'#FCA5A5', as_:'#B91C1C' },
    label: 'On it! ⚡', delay: '0.45s',
  },
  {
    p: { m:'#F43F5E', t:'#FDA4AF', s:'#BE123C', d:'#9F1239',
         e:'#FDE68A', el:'#FEF9C3', af:'#8B5CF6', at:'#C4B5FD', as_:'#6D28D9' },
    label: '✨ Ready!', delay: '0.9s',
  },
  {
    p: { m:'#F59E0B', t:'#FCD34D', s:'#B45309', d:'#92400E',
         e:'#60A5FA', el:'#BFDBFE', af:'#06B6D4', at:'#67E8F9', as_:'#0E7490' },
    label: 'Done! 🎯', delay: '1.35s',
  },
  {
    p: { m:'#8B5CF6', t:'#C4B5FD', s:'#6D28D9', d:'#5B21B6',
         e:'#34D399', el:'#A7F3D0', af:'#F472B6', at:'#FBCFE8', as_:'#DB2777' },
    label: "🚀 Let's go!", delay: '1.8s',
  },
];

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

        {/* 5 PIXEL 3D BOTS – above CTA, each a different colour */}
        <div className={styles.pixelBotsRow} aria-hidden="true">
          {BOTS.map((bot, i) => (
            <div
              key={i}
              className={styles.botWrapper}
              style={{ '--bob-delay': bot.delay } as React.CSSProperties}
            >
              <PixelBot p={bot.p} />
              <div className={styles.botTag}>{bot.label}</div>
            </div>
          ))}
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
