"use client";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [currentPage, setCurrentPage] = useState("home");

  return (
    <nav className="w-screen top-10 left-0 flex justify-center items-center fixed ">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
        integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
      />
      <div className=" bg-white flex justify-center items-center gap-10 px-5 py-3 rounded-2xl  transition shadow-2xl shadow-black ">
        <Link href={"/"} onClick={() => setCurrentPage("home")}>
          <i
            class={`fa-solid fa-house cursor-pointer text-lg ${
              currentPage === "home" ? "text-lime-500" : ""
            }`}
          ></i>
        </Link>
        <Link href={"/projects"} onClick={() => setCurrentPage("projects")}>
          <i
            class={`fa-solid fa-layer-group cursor-pointer text-lg ${
              currentPage === "projects" ? "text-lime-500" : ""
            }`}
          ></i>
        </Link>
      </div>
    </nav>
  );
}
