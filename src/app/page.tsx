"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./home.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (user) {
      router.push("/workspace");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) return null; // or a simple spinner, but null avoids flash

  return (
    <div className={styles.container}>
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}></div>
          <span className={styles.logoText}>Clearspace</span>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.loginLink}>
            Log in
          </Link>
          <Link href="/signup" className={styles.primaryBtn}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.pillBadge}>Now in public beta ✦</div>
        <h1 className={styles.heroTitle}>
          Your workspace,<br />
          without the<br />
          clutter.
        </h1>
        <p className={styles.heroSubtext}>
          Clearspace is a focused productivity app for<br />
          people who want to think clearly and work fast.
        </p>
        <div className={styles.heroButtons}>
          <Link href="/signup" className={styles.primaryBtn}>
            Start for free →
          </Link>
          <Link href="#features" className={styles.secondaryBtn}>
            See how it works
          </Link>
        </div>
        <p className={styles.heroFineprint}>
          No credit card required · Free forever plan
        </p>

        <div className={styles.mockupWrapper}>
          <div className={styles.mockupFrame}>
            <div className={styles.mockupHeader}>
              <div className={styles.mockupDot}></div>
              <div className={styles.mockupDot}></div>
              <div className={styles.mockupDot}></div>
              <div className={styles.mockupUrl}></div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionLabel}>FEATURES</div>
        <h2 className={styles.sectionTitle}>Everything you need. Nothing you don't.</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>✦</div>
            <h3 className={styles.featureTitle}>AI-powered writing</h3>
            <p className={styles.featureDesc}>
              Write, summarize, and improve your content with one keystroke.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className={styles.featureTitle}>Smart automations</h3>
            <p className={styles.featureDesc}>
              Automate repetitive tasks so you can focus on what matters.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>□</div>
            <h3 className={styles.featureTitle}>Flexible databases</h3>
            <p className={styles.featureDesc}>
              Build tables, boards, and views that fit exactly how you think.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>Simple by design.</h2>
        <div className={styles.stepsContainer}>
          <div className={styles.stepsLine}></div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Create a workspace</h3>
            <p className={styles.stepDesc}>Set up your account in seconds.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Build your system</h3>
            <p className={styles.stepDesc}>Add pages and databases effortlessly.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Work without friction</h3>
            <p className={styles.stepDesc}>Stay focused on what matters.</p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className={styles.socialProof}>
        <p className={styles.socialText}>Trusted by 1,200+ teams and solo builders</p>
        <div className={styles.companyPills}>
          <span className={styles.companyPill}>Archway</span>
          <span className={styles.companyPill}>Solvd</span>
          <span className={styles.companyPill}>Loopkit</span>
          <span className={styles.companyPill}>Forma</span>
          <span className={styles.companyPill}>Trellis</span>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>Ready to clear the clutter?</h2>
        <Link href="/signup" className={styles.primaryBtn} style={{ marginBottom: "16px" }}>
          Get started free →
        </Link>
        <p className={styles.heroFineprint}>Takes 30 seconds to set up</p>
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
          <Link href="#" className={styles.footerLink}>Twitter</Link>
          <Link href="#" className={styles.footerLink}>GitHub</Link>
        </div>
      </footer>
    </div>
  );
}
