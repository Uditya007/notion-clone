import React from "react";

interface CoraLogoProps {
  className?: string;
}

export default function CoraLogo({ className }: CoraLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      fill="none"
    >
      {/* Bold circular C shape with round endings */}
      <path
        d="M 68 28 A 28.28 28.28 0 1 0 68 72"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
      />
      {/* 4-pointed sparkle in the center */}
      <path
        d="M 50 34 Q 50 50 66 50 Q 50 50 50 66 Q 50 50 34 50 Q 50 50 50 34 Z"
        fill="currentColor"
      />
    </svg>
  );
}
