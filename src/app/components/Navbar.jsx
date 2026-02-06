"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPage(window.location.pathname);
    }
  }, []);

  const linkClass = (path) =>
    `text-sm uppercase tracking-luxury transition-colors duration-300 ${
      currentPage === path
        ? "text-[var(--portfolio-accent)]"
        : "text-[var(--portfolio-text-secondary)] hover:text-[var(--portfolio-accent)]"
    }`;

  return (
    <nav className="w-full top-0 left-0 flex justify-center items-center fixed z-50 py-6 px-8 bg-black/90">
      <div className="flex items-center gap-8 lg:gap-16">
        {/* Left nav links */}
        <div className="hidden lg:flex gap-8">
          <Link
            href="/"
            onClick={() => setCurrentPage("/")}
            className={linkClass("/")}
          >
            Home
          </Link>
          <Link
            href="/projects"
            onClick={() => setCurrentPage("/projects")}
            className={linkClass("/projects")}
          >
            Progetti
          </Link>
        </div>

        {/* Center Logo/Initials */}
        <Link
          href="/"
          className="font-serif text-2xl text-white hover:text-[var(--portfolio-accent)] transition-colors duration-300"
        >
          FB
        </Link>

        {/* Right nav links */}
        <div className="hidden lg:flex gap-8">
          <Link
            href="/contacts"
            onClick={() => setCurrentPage("/contacts")}
            className={linkClass("/contacts")}
          >
            Contatti
          </Link>
        </div>

        {/* Mobile menu - icons only */}
        <div className="flex lg:hidden gap-6">
          <Link
            href="/"
            onClick={() => setCurrentPage("/")}
            className={linkClass("/")}
          >
            <i className="fa-solid fa-house text-lg"></i>
          </Link>
          <Link
            href="/projects"
            onClick={() => setCurrentPage("/projects")}
            className={linkClass("/projects")}
          >
            <i className="fa-solid fa-layer-group text-lg"></i>
          </Link>
          <Link
            href="/contacts"
            onClick={() => setCurrentPage("/contacts")}
            className={linkClass("/contacts")}
          >
            <i className="fa-solid fa-inbox text-lg"></i>
          </Link>
        </div>
      </div>
    </nav>
  );
}
