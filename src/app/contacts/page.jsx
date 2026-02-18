"use client";
import { useEffect } from "react";

export default function ContactsRedirect() {
  useEffect(() => {
    window.location.href = "/#contatti";
  }, []);

  return null;
}
