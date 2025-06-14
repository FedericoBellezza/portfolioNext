"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [currentPage, setCurrentPage] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPage(window.location.pathname);
    }
  });

  return (
    <nav className="w-screen top-10 left-0 flex justify-center items-center fixed z-100">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
        integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg=="
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      <div className=" bg-white flex justify-center items-center gap-10 px-10 py-3 rounded-2xl  transition  ">
        <Link
          className="nav-link relative "
          href={"/"}
          onClick={() => setCurrentPage("/")}
        >
          <span className="nav-label absolute px-3 py-1 bg-white text-gray-800 font-bold rounded-2xl right-[-130%] hidden lg:inline ">
            Home
          </span>
          <i
            className={`fa-solid fa-house cursor-pointer text-lg ${
              currentPage === "/" ? "text-lime-500" : ""
            }`}
          ></i>
        </Link>
        <Link
          className="nav-link relative"
          href={"/projects"}
          onClick={() => setCurrentPage("/projects")}
        >
          <span className="nav-label absolute px-3 py-1 bg-white text-gray-800 font-bold rounded-2xl right-[-170%] hidden lg:inline ">
            Progetti
          </span>
          <i
            className={`fa-solid fa-layer-group cursor-pointer text-lg ${
              currentPage === "/projects" ? "text-lime-500" : ""
            }`}
          ></i>
        </Link>
        <Link
          className="nav-link relative"
          href={"/contacts"}
          onClick={() => setCurrentPage("/contacts")}
        >
          <span className="nav-label absolute px-3 py-1 bg-white text-gray-800 font-bold rounded-2xl right-[-190%] hidden lg:inline ">
            Contatti
          </span>
          <i
            className={`fa-solid fa-inbox cursor-pointer text-lg ${
              currentPage === "/contacts" ? "text-lime-500" : ""
            }`}
          ></i>
        </Link>
      </div>
    </nav>
  );
}
