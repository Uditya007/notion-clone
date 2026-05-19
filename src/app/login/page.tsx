"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser, isAuthenticated } from "@/lib/auth";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
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
    const user = loginUser(email, password);
    if (user) {
      router.push("/workspace");
    } else {
      setError("Invalid email or password");
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
          <h1 className={styles.tagline}>Clear thinking starts with a clear workspace.</h1>
        </div>
        <div></div> {/* Spacer */}
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formWrapper}>
          <h2 className={styles.heading}>Welcome back</h2>
          <p className={styles.subtext}>
            Don't have an account? <Link href="/signup" className={styles.link}>Sign up</Link>
          </p>

          <form onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}
            
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
              Log in
            </button>
          </form>

          <div className={styles.divider}>or</div>

          <button type="button" className={styles.googleBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <Link href="#" className={styles.bottomLink}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
