"use client";
import { useEffect } from "react";

// One observer, one entrance per section, no scroll handler or animation loop.
export function Reveal() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add("pw4-section-entered");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.06 });
    document.querySelectorAll(".pw4-section > .pw4-wrap").forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return null;
}
