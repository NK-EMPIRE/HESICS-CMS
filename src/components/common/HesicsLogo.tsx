import React from "react";

interface HesicsLogoProps {
  className?: string;
  size?: number | string;
  variant?: "icon" | "full" | "glow" | "dark" | "white";
}

export const HesicsLogo: React.FC<HesicsLogoProps> = ({
  className = "",
  size = 32,
  variant = "white",
}) => {
  const numericSize = typeof size === "number" ? size : 32;
  const logoSrc =
    variant === "dark"
      ? "/assets/hesics-logo-dark.png"
      : "/assets/hesics-logo-white.png";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        variant === "glow" ? "drop-shadow-[0_0_12px_rgba(119,114,126,0.5)]" : ""
      } ${className}`}
      style={{ width: numericSize, height: numericSize }}
    >
      <img
        src={logoSrc}
        alt="HESICS Logo"
        className="w-full h-full object-contain filter brightness-110 contrast-110 transition-transform duration-200"
      />
    </div>
  );
};
