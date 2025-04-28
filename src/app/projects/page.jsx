"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "lucide-react";

export default function Projects() {
  return (
    <div className="container mx-auto mt-20 py-10 text-white">
      <h1 className="text-6xl font-black text-center my-10 mb-20">
        Progetti personali
      </h1>
      <div className="flex justify-center w-full gap-5">
        {/* let's play */}
        <Card
          className={
            "w-1/3 shadow-2xl flex flex-col justify-between hover:scale-101 transition"
          }
        >
          <CardHeader className={"grow"}>
            <CardTitle className={"text-3xl font-bold italic"}>
              Let's Play
            </CardTitle>
            <CardDescription className={"text-md"}>
              Ho sviluppato con <strong>Spring e React</strong>, un sito che
              permette di cercare/filtrare eventi per categoria, prezzo e
              ubicazione. <br />
              Backoffice con <strong>autenticazione</strong> per{" "}
              <strong>gestione CRUD</strong> di eventi. <br />
              Integra <strong>MySQL</strong> per il database,{" "}
              <strong>Tailwind</strong> per la grafica, <strong>EmailJS</strong>{" "}
              per il form di contatto e animazioni con{" "}
              <strong>Framer Motion</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <img
              className="w-full rounded-2xl"
              src="https://media.licdn.com/dms/image/v2/D562DAQGZ_M090-7l5A/profile-treasury-image-shrink_800_800/B56ZY6LX31HoAY-/0/1744732782626?e=1746453600&v=beta&t=iBg8Ooxad2MCv8SbcTgVfdNdykllVhrnPa1sORRgOeY"
              alt=""
            />
          </CardContent>
          <CardFooter>
            <a
              onClick={() =>
                window.open(
                  "https://www.linkedin.com/feed/update/urn:li:activity:7318199610559066112/"
                )
              }
              className="px-3 py-1 bg-lime-500 cursor-pointer  rounded-md hover:bg-lime-600 text-white transition"
            >
              <span>Vai al sito</span>
            </a>
          </CardFooter>
        </Card>
        {/* Weather App */}
        <Card
          className={
            "w-1/3 shadow-2xl flex flex-col justify-between hover:scale-101 transition"
          }
        >
          <CardHeader className={"grow"}>
            <CardTitle className={"text-3xl font-bold italic"}>
              Weather App
            </CardTitle>
            <CardDescription className={"text-md"}>
              Ho voluto sperimentare le <strong>API</strong> di terze parti per
              realizzare il mio <strong>sito del meteo</strong>. <br /> Un API
              ti permette di ricevere le coordinate in base all’indirizzo
              inserito e un API in grado di fornirti le previsioni
              metereologiche tramite le coordinate fornite. <br />
              Il sito è realizzato con <strong>React e Tailwind</strong> per la
              grafica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <img className="w-full rounded-2xl" src="/weatherApp.jpg" alt="" />
          </CardContent>
          <CardFooter>
            <a
              onClick={() =>
                window.open("https://weatherapp-federicobellezza.web.app/")
              }
              className="px-3 py-1 bg-lime-500 cursor-pointer  rounded-md hover:bg-lime-600 text-white transition"
            >
              <span>Vai al sito</span>
            </a>
          </CardFooter>
        </Card>
        {/* Task Manager */}
        <Card
          className={
            "w-1/3 shadow-2xl flex flex-col justify-between hover:scale-101 transition"
          }
        >
          <CardHeader className={"grow"}>
            <CardTitle className={"text-3xl font-bold italic "}>
              Task Manager
            </CardTitle>
            <CardDescription className={"text-md"}>
              Ho sviluppato un sito per imparare ad utilizzare{" "}
              <strong>Next.JS</strong>,{" "}
              <strong>
                l’autenticazione e il servizio di storage di SupaBase
              </strong>
              . <br />
              Il sito è un semplicissimo task manager che ti permette di gestire
              la tua lista delle cose da fare. <br />
              Ho utilizzato <strong>Vercel</strong> per il suo servizio gratuito
              di <strong>Hosting</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <img
              className="w-full rounded-2xl"
              src="/task-manager.jpg"
              alt=""
            />
          </CardContent>
          <CardFooter>
            <a
              onClick={() =>
                window.open("https://next-todo-list-swart.vercel.app/")
              }
              className="px-3 py-1 bg-lime-500 cursor-pointer  rounded-md hover:bg-lime-600 text-white transition"
            >
              <span>Vai al sito</span>
            </a>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
