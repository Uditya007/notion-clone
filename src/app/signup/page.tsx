"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Eye, EyeOff, Sparkles, FileText, Calendar, Database } from "lucide-react";
import styles from "./signup.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/workspace");
      }
    });
  }, [router]);

  useEffect(() => {
    let score = 0;
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setPasswordStrength(score);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      } else {
        setSuccessMessage("Please check your email to confirm your account!");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength === 1) return "Weak";
    if (passwordStrength === 2) return "Fair";
    if (passwordStrength === 3) return "Good";
    return "Strong";
  };

  return (
    <div className={styles.container}>
      {/* LEFT PANEL */}
      <div className={styles.leftPanel}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}></div>
            <span className={styles.logoText}>Clearspace</span>
          </div>
        </Link>

        <div className={styles.leftMainContent}>
          <blockquote className={styles.quote}>
            "The workspace that<br />thinks with you."
          </blockquote>
          
          <div className={styles.featurePills}>
            <span className={styles.featurePill}>✦ AI writing</span>
            <span className={styles.featurePill}>🗄 Databases</span>
            <span className={styles.featurePill}>📅 Calendar</span>
          </div>
        </div>

        {/* Abstract Floating Cards */}
        <div className={styles.floatingCardsWrapper}>
          <div className={`${styles.abstractCard} ${styles.card1}`}>
            <FileText size={18} color="var(--primary)" />
            <div className={styles.abstractCardLine} style={{ width: "70%" }}></div>
            <div className={styles.abstractCardLine} style={{ width: "40%" }}></div>
          </div>
          <div className={`${styles.abstractCard} ${styles.card2}`}>
            <Database size={18} color="var(--accent-green)" />
            <div style={{ display: "flex", gap: "4px", width: "100%" }}>
              <div className={styles.abstractGridSquare}></div>
              <div className={styles.abstractGridSquare}></div>
              <div className={styles.abstractGridSquare}></div>
            </div>
          </div>
          <div className={`${styles.abstractCard} ${styles.card3}`}>
            <Sparkles size={18} color="var(--primary)" />
            <div className={styles.abstractCardLine} style={{ width: "60%" }}></div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={styles.rightPanel}>
        <div className={styles.formWrapper}>
          {/* Mobile Logo */}
          <div className={styles.mobileLogo}>
            <div className={styles.logoIcon}></div>
            <span className={styles.logoText}>Clearspace</span>
          </div>

          <h2 className={styles.heading}>Create your account</h2>
          <p className={styles.subtext}>
            Already have an account? <Link href="/login" className={styles.link}>Log in</Link>
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            {successMessage && <div className={styles.success}>{successMessage}</div>}
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Full name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email address</label>
              <input
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password Strength Meter */}
            {password.length > 0 && (
              <div className={styles.strengthMeter}>
                <div className={styles.strengthBars}>
                  <div className={`${styles.strengthBar} ${passwordStrength >= 1 ? styles.barWeak : ""}`}></div>
                  <div className={`${styles.strengthBar} ${passwordStrength >= 2 ? styles.barFair : ""}`}></div>
                  <div className={`${styles.strengthBar} ${passwordStrength >= 3 ? styles.barGood : ""}`}></div>
                  <div className={`${styles.strengthBar} ${passwordStrength >= 4 ? styles.barStrong : ""}`}></div>
                </div>
                <span className={styles.strengthText}>{getStrengthLabel()}</span>
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? (
                <div className={styles.spinner}></div>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className={styles.fineprint}>
            By signing up you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
