"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { 
  FileText, 
  Brain, 
  Database, 
  Sparkles, 
  CheckSquare, 
  Layers, 
  Lock, 
  User, 
  Mail, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Award,
  BookOpen,
  UserPlus,
  ArrowRight,
  Play,
  Check,
  Star,
  X
} from "lucide-react";
import styles from "./home.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [stepsVisible, setStepsVisible] = useState([false, false, false]);
  
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
          <div className={styles.logoIcon}></div>
          <span className={styles.logoText}>Clearspace</span>
        </div>
        
        <div className={styles.navLinks}>
          <Link href="#features" className={styles.navLink}>Features</Link>
          <Link href="#how-it-works" className={styles.navLink}>How it works</Link>
          <Link href="#testimonials" className={styles.navLink}>Testimonials</Link>
        </div>

        <div className={styles.navActions}>
          <Link href="/login" className={styles.loginLink}>
            Log in
          </Link>
          <Link href="/signup" className={styles.primaryBtn}>
            Start free
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.pillBadge}>
          <span>✦ Now in public beta</span>
        </div>
        
        <h1 className={styles.heroTitle}>
          Your second brain,<br />
          <span className={styles.heroHighlight}>beautifully organized.</span>
        </h1>
        
        <p className={styles.heroSubtext}>
          Clearspace combines notes, tasks, databases, and AI in one warm, focused workspace. No learning curve — just start writing.
        </p>
        
        <div className={styles.heroButtons}>
          <Link href="/signup" className={styles.heroPrimaryBtn}>
            Start for free <ArrowRight size={16} />
          </Link>
          <button onClick={() => setShowDemoModal(true)} className={styles.heroSecondaryBtn}>
            <Play size={14} fill="currentColor" /> Watch demo
          </button>
        </div>
        
        <div className={styles.trustLine}>
          <span className={styles.trustItem}>
            <Check size={14} className={styles.greenCheck} /> Free forever
          </span>
          <span className={styles.trustItem}>
            <Check size={14} className={styles.greenCheck} /> No credit card
          </span>
          <span className={styles.trustItem}>
            <Check size={14} className={styles.greenCheck} /> Setup in 30 seconds
          </span>
        </div>

        {/* APP MOCKUP */}
        <div className={styles.mockupWrapper}>
          <div className={styles.appMockup}>
            {/* Fake browser chrome */}
            <div className={styles.mockupChrome}>
              <div className={styles.chromeDots}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <div className={styles.chromeUrl}>clearspace.app/workspace</div>
            </div>
            
            {/* Fake inner layout */}
            <div className={styles.mockupInner}>
              {/* Fake Sidebar */}
              <div className={styles.fakeSidebar}>
                <div className={styles.fakeAvatarRow}>
                  <div className={styles.fakeAvatar}>U</div>
                  <div className={styles.fakeSidebarLineShort}></div>
                </div>
                <div className={styles.fakeSearchInput}>🔍 Search pages...</div>
                <div className={styles.fakeSidebarGroup}>
                  <div className={styles.fakeSidebarLine}></div>
                  <div className={styles.fakeSidebarLineShort}></div>
                  <div className={styles.fakeSidebarLine}></div>
                </div>
                <div className={styles.fakeSidebarGroup}>
                  <div className={styles.fakeSidebarLineShort}></div>
                  <div className={styles.fakeSidebarLine}></div>
                </div>
              </div>
              
              {/* Fake Editor */}
              <div className={styles.fakeEditor}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "28px" }}>🚀</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                    <div style={{ height: "20px", background: "var(--text-main)", borderRadius: "4px", width: "65%" }}></div>
                    <div style={{ height: "10px", background: "var(--text-faint)", borderRadius: "2px", width: "35%" }}></div>
                  </div>
                </div>
                <div className={styles.fakeEditorLine}></div>
                <div className={styles.fakeEditorLine}></div>
                <div className={styles.fakeEditorLineShort}></div>
                
                <div className={styles.fakeDatabase}>
                  <div className={styles.fakeDatabaseHeader}>
                    <div style={{ width: "80px", height: "8px", background: "var(--border-strong)", borderRadius: "2px" }}></div>
                    <div style={{ width: "60px", height: "8px", background: "var(--border-strong)", borderRadius: "2px" }}></div>
                  </div>
                  <div className={styles.fakeDatabaseRow}>
                    <div className={styles.fakePillIndicator}>Checked</div>
                    <div style={{ width: "110px", height: "8px", background: "var(--border)", borderRadius: "2px" }}></div>
                  </div>
                  <div className={styles.fakeDatabaseRow}>
                    <div className={styles.fakePillIndicator}>In Progress</div>
                    <div style={{ width: "80px", height: "8px", background: "var(--border)", borderRadius: "2px" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.mockupGlow}></div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeadingArea}>
          <span className={styles.sectionPre}>Everything you need.</span>
          <h2 className={styles.sectionTitle}>Nothing to figure out.</h2>
        </div>

        <div className={styles.featuresGrid}>
          {/* Card 1 */}
          <div className={styles.featureCard} style={{ animationDelay: "0.1s" }}>
            <span className={styles.featureEmoji}>📝</span>
            <h3 className={styles.featureTitle}>Just start writing</h3>
            <p className={styles.featureDesc}>Click anywhere and type. The editor gets out of your way.</p>
          </div>

          {/* Card 2 */}
          <div className={styles.featureCard} style={{ animationDelay: "0.2s" }}>
            <span className={styles.featureEmoji}>🗄</span>
            <h3 className={styles.featureTitle}>Databases that make sense</h3>
            <p className={styles.featureDesc}>Build tables, boards, and lists without needing a tutorial.</p>
          </div>

          {/* Card 3 */}
          <div className={styles.featureCard} style={{ animationDelay: "0.3s" }}>
            <span className={styles.featureEmoji}>✦</span>
            <h3 className={styles.featureTitle}>AI that actually helps</h3>
            <p className={styles.featureDesc}>Ask questions, get summaries, let AI draft pages for you.</p>
          </div>

          {/* Card 4 */}
          <div className={styles.featureCard} style={{ animationDelay: "0.4s" }}>
            <span className={styles.featureEmoji}>📅</span>
            <h3 className={styles.featureTitle}>Your calendar, connected</h3>
            <p className={styles.featureDesc}>See all your events alongside your notes and tasks — no tab switching.</p>
          </div>

          {/* Card 5 */}
          <div className={styles.featureCard} style={{ animationDelay: "0.5s" }}>
            <span className={styles.featureEmoji}>⚡</span>
            <h3 className={styles.featureTitle}>Automations on autopilot</h3>
            <p className={styles.featureDesc}>Set up once. Let Clearspace handle repetitive work for you.</p>
          </div>

          {/* Card 6 */}
          <div className={styles.featureCard} style={{ animationDelay: "0.6s" }}>
            <span className={styles.featureEmoji}>🔒</span>
            <h3 className={styles.featureTitle}>Your data, safe</h3>
            <p className={styles.featureDesc}>End-to-end secure. Your workspace belongs to you.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className={styles.howItWorksSection}>
        <h2 className={styles.howItWorksTitle}>Up and running in 3 steps.</h2>
        
        <div className={styles.stepsContainer}>
          <div className={styles.dottedConnector}></div>
          
          {/* Step 1 */}
          <div 
            ref={stepRefs[0]} 
            className={`${styles.stepCard} ${stepsVisible[0] ? styles.visible : ""}`}
          >
            <div className={styles.stepCircle}>
              <UserPlus size={20} />
              <div className={styles.stepNumber}>1</div>
            </div>
            <h3 className={styles.stepTitle}>Create your account</h3>
            <p className={styles.stepDesc}>Sign up in seconds and get instant access to your private second brain workspace.</p>
          </div>

          {/* Step 2 */}
          <div 
            ref={stepRefs[1]} 
            className={`${styles.stepCard} ${stepsVisible[1] ? styles.visible : ""}`}
            style={{ transitionDelay: "0.15s" }}
          >
            <div className={styles.stepCircle}>
              <FileText size={20} />
              <div className={styles.stepNumber}>2</div>
            </div>
            <h3 className={styles.stepTitle}>Add your first page</h3>
            <p className={styles.stepDesc}>Click anywhere to start writing, planning project boards, or setting down personal tasks.</p>
          </div>

          {/* Step 3 */}
          <div 
            ref={stepRefs[2]} 
            className={`${styles.stepCard} ${stepsVisible[2] ? styles.visible : ""}`}
            style={{ transitionDelay: "0.3s" }}
          >
            <div className={styles.stepCircle}>
              <Sparkles size={20} />
              <div className={styles.stepNumber}>3</div>
            </div>
            <h3 className={styles.stepTitle}>Let AI do the rest</h3>
            <p className={styles.stepDesc}>Interact with our custom AI agent prompts to brainstorm, outline summaries, and auto-populate databases.</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL BAR */}
      <section id="testimonials" className={styles.testimonialsSection}>
        <div className={styles.testimonialsHeadingArea}>
          <span className={styles.testimonialsPre}>Loved by 1,200+ people who hate clutter</span>
          <div className={styles.avatarsRow}>
            <div className={styles.avatarCircle} style={{ background: "#7c6fcd", color: "white" }}>PS</div>
            <div className={styles.avatarCircle} style={{ background: "#10b981", color: "white" }}>AJ</div>
            <div className={styles.avatarCircle} style={{ background: "#3b82f6", color: "white" }}>LK</div>
            <div className={styles.avatarCircle} style={{ background: "#f59e0b", color: "white" }}>RM</div>
            <div className={styles.avatarCircle} style={{ background: "#ec4899", color: "white" }}>DH</div>
            <div className={styles.starsContainer}>
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
            </div>
          </div>
        </div>

        <blockquote className={styles.blockquote}>
          "Finally a workspace that doesn't need a YouTube tutorial to get started."
          <cite className={styles.cite}>— Priya S., Freelance Designer</cite>
        </blockquote>
      </section>

      {/* FINAL CTA */}
      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>Ready to think more clearly?</h2>
        <p className={styles.finalCtaSub}>Join thousands already using Clearspace to organize their work and life.</p>
        <Link href="/signup" className={styles.finalCtaBtn}>
          Create your free workspace →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.footerLogoIcon}></div>
          <span>Clearspace © 2026</span>
        </div>
        <div className={styles.footerLinks}>
          <Link href="#" className={styles.footerLink}>Privacy</Link>
          <Link href="#" className={styles.footerLink}>Terms</Link>
          <Link href="#" className={styles.footerLink}>Discord</Link>
          <Link href="#" className={styles.footerLink}>GitHub</Link>
        </div>
      </footer>

      {/* VIDEO DEMO MODAL */}
      {showDemoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDemoModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🎬 Clearspace Product Tour</h3>
              <button className={styles.closeBtn} onClick={() => setShowDemoModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalVideoBody}>
              <div className={styles.fakeVideoPlayer}>
                <Play size={48} fill="#7c6fcd" color="#7c6fcd" style={{ opacity: 0.85 }} />
                <span>Simulated Interactive Workspace Walkthrough</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
