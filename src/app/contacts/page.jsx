"use client";
import { useState } from "react";
import emailjs from "@emailjs/browser";
import { motion } from "motion/react";

export default function ContactsPage() {
  const [emailSent, setEmailSent] = useState(false);
  // send email function
  const sendEmail = (e) => {
    e.preventDefault();
    console.log({
      name: e.target.from_name.value,
      email: e.target.from_email.value,
      object: e.target.object.value,
      message: e.target.message.value,
    });

    emailjs
      .sendForm(
        "service_n4qr5hq",
        "template_gdpzsbm",
        e.target,
        "I5U0ciuEcNnc8z7_k"
      )
      .then((result) => {
        console.log(result.text);
      })
      .catch((error) => {
        console.log(error.text);
      });
    e.target.reset();

    setEmailSent(true);
    setTimeout(() => {
      setEmailSent(false);
    }, 3000);
  };
  return (
    <>
      <div className="text-white pt-25 min-h-screen">
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 100 }}
          className="container px-10   mx-auto flex flex-col xl:flex-row mt-25  justify-evenly items-center xl:items-start relative"
        >
          <h1 className="text-5xl text-center font-extrabold animate-entryfromleft mb-10">
            Contattami
            <span
              className={`text-center xl:text-left mt-5  text-2xl block duration-500  ease-in-out    ${
                emailSent ? "opacity-100 animate-entryfromright" : "opacity-0 "
              }`}
            >
              Email Inviata con successo!
            </span>
          </h1>
          <div className="animate-entryfromright  max-w-xl">
            <form
              onSubmit={sendEmail}
              className={` space-y-4 w-full duration-500 ease-in-out lg:relative lg:top-0  ${
                emailSent ? "relative top-0" : "top-[-80px] relative"
              } `}
            >
              <input
                required
                type="text"
                name="from_name"
                placeholder="Nome"
                className="w-full py-2.5 px-4 text-gray-800 bg-gray-100 border rounded-lg  text-sm outline-none transition-all"
              />
              <input
                required
                type="email"
                name="from_email"
                placeholder="Email"
                className="w-full py-2.5 px-4 text-gray-800 bg-gray-100 border rounded-lg text-sm outline-none transition-all"
              />
              <input
                required
                type="text"
                placeholder="Oggetto"
                name="object"
                className="w-full py-2.5 px-4 text-gray-800 bg-gray-100 border rounded-lg text-sm outline-none transition-all"
              />
              <textarea
                required
                placeholder="Messaggio"
                rows="4"
                name="message"
                className="w-full px-4 text-gray-800 bg-gray-100 border rounded-lg text-sm pt-3 outline-none transition-all"
              ></textarea>

              <input
                name="submitbutton"
                className="text-white font-bold cursor-pointer bg-slate-700 hover:bg-lime-500 hover:text-slate-800 rounded-lg tracking-wide text-sm px-4 py-2.5 w-full transition-all ease-in duration-100"
                type="submit"
                value="Invia"
              />
            </form>
          </div>
        </motion.div>
        <p className="text-lg text-gray-400 lg:mt-50 mt-15  text-center">
          Oppure scrivimi alla email:{" "}
          <strong>federico.bellezza2001@gmail.com</strong>
        </p>
      </div>
    </>
  );
}
