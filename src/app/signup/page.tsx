"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/workspace");
      }
    });
  }, [router]);

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

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}></div>
            <span className={styles.logoText}>Clearspace</span>
          </div>
        </Link>
        <div className={styles.taglineWrapper}>
          <h1 className={styles.tagline}>The workspace built for focused people.</h1>
        </div>
        <div></div> {/* Spacer */}
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formWrapper}>
          <h2 className={styles.heading}>Create your account</h2>
          <p className={styles.subtext}>
            Already have an account? <Link href="/login" className={styles.link}>Log in</Link>
          </p>

          <form onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}
            {successMessage && <div className={styles.success} style={{ color: "#10b981", marginBottom: "16px", fontSize: "14px", fontWeight: 500 }}>{successMessage}</div>}
            
            <div className={styles.formGroup}>
              <input
                type="text"
                className={styles.input}
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <input
                type="email"
                className={styles.input}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.input}
                placeholder="Password"
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
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
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
