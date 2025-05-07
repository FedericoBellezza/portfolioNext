"use client";
export default function Footer() {
  return (
    <footer className="bg-gray-800 py-5 text-center text-white flex flex-col-reverse lg:flex-row gap-3 justify-between px-10 items-center">
      <div className="flex gap-5">
        <i
          onClick={() =>
            window.open("https://www.linkedin.com/in/federico-bellezza21/")
          }
          class="fa-brands fa-linkedin text-xl cursor-pointer hover:text-gray-300 transition"
        ></i>
        <i
          onClick={() => window.open("https://github.com/FedericoBellezza")}
          class="fa-brands fa-github text-xl cursor-pointer hover:text-gray-300 transition"
        ></i>
      </div>
      <div>
        &copy; {new Date().getFullYear()}{" "}
        <span
          onClick={() =>
            window.open("https://www.linkedin.com/in/federico-bellezza21/")
          }
          className="font-bold cursor-pointer"
        >
          Federico Bellezza.
        </span>{" "}
        All rights reserved.
      </div>
      <span></span>
    </footer>
  );
}
