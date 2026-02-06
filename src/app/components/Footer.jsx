"use client";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--portfolio-border)] py-12 mt-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          {/* Name */}
          <span
            onClick={() =>
              window.open("https://www.linkedin.com/in/federicobellezzadev/")
            }
            className="font-serif text-xl text-white cursor-pointer hover:text-[var(--portfolio-accent)] transition-colors duration-300"
          >
            Federico Bellezza
          </span>

          {/* Social Links */}
          <div className="flex gap-8">
            <i
              onClick={() =>
                window.open("https://www.linkedin.com/in/federicobellezzadev/")
              }
              className="fa-brands fa-linkedin text-lg text-[var(--portfolio-text-muted)] cursor-pointer hover:text-[var(--portfolio-accent)] transition-colors duration-300"
            ></i>
            <i
              onClick={() => window.open("https://github.com/FedericoBellezza")}
              className="fa-brands fa-github text-lg text-[var(--portfolio-text-muted)] cursor-pointer hover:text-[var(--portfolio-accent)] transition-colors duration-300"
            ></i>
          </div>

          {/* Copyright */}
          <span className="text-[var(--portfolio-text-muted)] text-sm">
            &copy; {new Date().getFullYear()} All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
