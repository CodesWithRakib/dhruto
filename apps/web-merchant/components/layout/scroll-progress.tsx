"use client";

import * as React from "react";

export function ScrollProgress() {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const current = window.scrollY / total;
      setProgress(Math.min(1, Math.max(0, current)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="prog"
      id="prog"
      style={{ transform: `scaleX(${progress})` }}
      aria-hidden="true"
    />
  );
}
