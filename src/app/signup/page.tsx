"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveUser, isAuthenticated } from "@/lib/auth";
import styles from "./signup.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/workspace");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      saveUser(name, email, password);
      router.push("/workspace");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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
            
            <div className={styles.formGroup}>
              <input
                type="text"
                className={styles.input}
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" className={styles.submitBtn}>
              Create account
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
