"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  BookOpen
} from "lucide-react";
import styles from "./home.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/workspace");
      } else {
        setIsLoading(false);
      }
    });
  }, [router]);

  if (isLoading) return null;

  return (
    <div className={styles.container}>
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}></div>
          <span className={styles.logoText}>Cora</span>
        </div>
        
        <div className={styles.navLinks}>
          <Link href="#features" className={styles.navLink}>Overview</Link>
          <Link href="#use-cases" className={styles.navLink}>Plans</Link>
          <Link href="#privacy" className={styles.navLink}>Privacy</Link>
        </div>

        <div className={styles.navActions}>
          <Link href="/login" className={styles.loginLink}>
            Log in
          </Link>
          <Link href="/signup" className={styles.primaryBtn}>
            Get the app <ChevronRight size={16} style={{ marginLeft: "4px" }} />
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.pillBadge}>Now in public beta ✦</div>
        <h1 className={styles.heroTitle}>
          Understand <span className={styles.heroHighlight}>Anything</span>
        </h1>
        <p className={styles.heroSubtext}>
          Your research and thinking partner, grounded in the information you trust, built with the latest Gemini models.
        </p>
        <div className={styles.heroButtons}>
          <Link href="/signup" className={styles.primaryBtn} style={{ padding: "12px 28px", fontSize: "15px" }}>
            Try Cora
          </Link>
        </div>
        <p className={styles.heroFineprint}>
          Free forever plan · Integrated Google Calendar & Gmail
        </p>
      </section>

      {/* PRODUCT FEATURES SHOWCASE (SPLIT ROWS) */}
      <section id="features" className={styles.productShowcase}>
        <div className={styles.sectionLabel}>Your AI-Powered Research Partner</div>
        <h2 className={styles.sectionTitle} style={{ marginBottom: "20px" }}>Simply powerful. Powerfully simple.</h2>
        
        {/* Row 1 */}
        <div className={showcaseRowClassName(false)}>
          <div className={styles.showcaseText}>
            <div className={styles.showcaseIconWrapper}>
              <Layers size={22} />
            </div>
            <h3 className={styles.showcaseTitle}>Upload your sources</h3>
            <p className={styles.showcaseDesc}>
              Upload PDFs, web articles, Google Docs, calendars, and emails. Cora instantly maps connections between disparate ideas, powered by state-of-the-art multimodal understanding.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <Link href="/signup" className={styles.secondaryBtn} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                Connect Sources <ChevronRight size={14} />
              </Link>
            </div>
          </div>
          <div className={styles.showcaseVisual}>
            <div className={styles.visualMockupFile}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <FileText size={18} color="#10b981" />
                <span style={{ fontSize: "13px", fontWeight: 600 }}>quarterly_report.pdf</span>
              </div>
              <div className={styles.mockupLine}></div>
              <div className={styles.mockupLine}></div>
              <div className={styles.mockupLineShort}></div>
              
              <div className={styles.mockupFilePill}>
                <Sparkles size={12} /> Key Insights Generated
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className={showcaseRowClassName(true)}>
          <div className={styles.showcaseVisual}>
            <div className={styles.visualMockupAI}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Brain size={18} color="#10b981" />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>Study Companion AI</span>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: "0 0 16px" }}>
                "Here is a comprehensive breakdown of the core strategies discussed in your uploaded briefs."
              </p>
              <div className={styles.aiPillsGrid}>
                <div className={styles.aiPill}>📝 Study Guide</div>
                <div className={styles.aiPill}>💡 Briefing Doc</div>
                <div className={styles.aiPill}>❓ FAQ sheet</div>
                <div className={styles.aiPill}>⏳ Timeline</div>
              </div>
            </div>
          </div>
          <div className={styles.showcaseText}>
            <div className={styles.showcaseIconWrapper}>
              <Sparkles size={22} />
            </div>
            <h3 className={styles.showcaseTitle}>Instant insights</h3>
            <p className={styles.showcaseDesc}>
              With all your materials in place, Cora becomes your personalized AI expert. Get auto-generated study guides, briefing documents, interactive timelines, and instant answers tailored exclusively to your documents.
            </p>
            <div>
              <Link href="/signup" className={styles.primaryBtn}>
                Try Live Chat
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW PEOPLE ARE USING IT */}
      <section id="use-cases" className={styles.howPeopleUse}>
        <div className={styles.sectionLabel}>USE CASES</div>
        <h2 className={styles.sectionTitle}>How people are using Cora</h2>
        
        <div className={styles.useGrid}>
          <div className={styles.useCard}>
            <span className={styles.useIcon}>🎓</span>
            <h4 className={styles.useTitle}>Power study</h4>
            <p className={styles.useDesc}>
              Upload lecture slides, textbook chapters, and syllabus briefs. Ask Cora to outline complex concepts, quiz your understanding, or draft instant summaries.
            </p>
            <span className={styles.useLinkText}>Learn faster and deeper.</span>
          </div>

          <div className={styles.useCard}>
            <span className={styles.useIcon}>📁</span>
            <h4 className={styles.useTitle}>Organize thinking</h4>
            <p className={styles.useDesc}>
              Import raw brainstorming sheets, competitor analyses, and notes. Ask Cora to convert chaotic streams of thought into beautifully formatted presentation templates.
            </p>
            <span className={styles.useLinkText}>Present with confidence.</span>
          </div>

          <span className={styles.useCard}>
            <span className={styles.useIcon}>💡</span>
            <h4 className={styles.useTitle}>Spark new ideas</h4>
            <p className={styles.useDesc}>
              Link Google calendars, task logs, and meeting agendas. Ask Cora to synthesize schedules, reveal hidden project trends, and recommend creative pathways.
            </p>
            <span className={styles.useLinkText}>Unlock your creative potential.</span>
          </span>
        </div>
      </section>

      {/* WHAT PEOPLE ARE SAYING */}
      <section className={styles.testimonials}>
        <div className={styles.sectionLabel}>TESTIMONIALS</div>
        <h2 className={styles.sectionTitle}>What people are saying</h2>

        <div className={styles.testimonialsGrid}>
          <div className={styles.testimonialCard}>
            <p className={styles.testimonialQuote}>
              "Cora blew our mind. The speed and quality of context retrieval is unmatched."
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>HF</div>
              <span className={styles.testimonialName}>HardFork</span>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <p className={styles.testimonialQuote}>
              "This could be the next killer app in generative AI. Perfect for research."
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>CB</div>
              <span className={styles.testimonialName}>CNBC Reports</span>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <p className={styles.testimonialQuote}>
              "A glimpse into AI's future in the workplace. Clean, focused, and intuitive."
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>BR</div>
              <span className={styles.testimonialName}>Barron's Tech</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY SECTION WITH ORBITAL ANIMATION */}
      <section id="privacy" className={styles.privacySection}>
        <div className={styles.privacyContent}>
          <h2 className={styles.privacyTitle}>Your data is safe with us</h2>
          <p className={styles.privacyDesc}>
            We value your privacy and never use your personal files, notes, emails, or schedules to train Cora AI models. Your workspace is 100% private.
          </p>
        </div>

        {/* ORBITAL WIDGET */}
        <div className={styles.orbitContainer}>
          <div className={styles.orbitCenter}>
            <Lock size={28} color="#10b981" />
          </div>
          
          <div className={`${styles.orbitRing} ${styles.orbitRing1}`}>
            <div className={styles.orbitItem}>
              <FileText size={14} color="#3b82f6" />
            </div>
            <div className={styles.orbitItem}>
              <User size={14} color="#10b981" />
            </div>
          </div>

          <div className={`${styles.orbitRing} ${styles.orbitRing2}`}>
            <div className={styles.orbitItem}>
              <Calendar size={14} color="#eab308" />
            </div>
            <div className={styles.orbitItem}>
              <Mail size={14} color="#ef4444" />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>Ready to clear the clutter?</h2>
        <Link href="/signup" className={styles.primaryBtn} style={{ padding: "14px 36px", fontSize: "16px", marginBottom: "16px" }}>
          Get Started Free
        </Link>
        <p className={styles.heroFineprint}>Takes 30 seconds to set up</p>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.footerLogoIcon}></div>
          <span>Cora © 2026</span>
        </div>
        <div className={styles.footerLinks}>
          <Link href="#" className={styles.footerLink}>Privacy</Link>
          <Link href="#" className={styles.footerLink}>Terms</Link>
          <Link href="#" className={styles.footerLink}>Discord</Link>
          <Link href="#" className={styles.footerLink}>GitHub</Link>
        </div>
      </footer>
    </div>
  );
}

// Helper to handle direction of row styling cleanly
function showcaseRowClassName(reversed: boolean): string {
  return reversed ? styles.showcaseRowReversed : styles.showcaseRow;
}
