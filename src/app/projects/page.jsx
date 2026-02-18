"use client";
import { useEffect } from "react";

export default function ProjectsRedirect() {
  useEffect(() => {
    window.location.href = "/#progetti";
  }, []);

  return null;
}
