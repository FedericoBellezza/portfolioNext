import Image from "next/image";

export default function Home() {
  return (
    <div className="container mx-auto mt-20 py-10">
      <div className="flex gap-5">
        <div className="w-3/6 px-10 py-4">
          <div className="card bg-white text-center p-5 rounded-2xl hover:scale-102 hover:rotate-1 transition duration-500 ">
            <Image
              width={500}
              height={200}
              className="rounded-2xl grayscale hover:grayscale-0 transition duration-500"
              src="/profilephoto.jpg"
              alt="foto profilo"
            />
            <h1 className="text-4xl mt-5 font-black ">Federico Bellezza</h1>
            <p className="mt-2 italic text-xl">Full Stack Web Developer</p>
          </div>
        </div>
        <div className="w-3/4">
          <div className="text-white min-h-screen">
            <h3 className="text-7xl text-lime-400 font-black">FULL STACK</h3>
            <h2 className="text-7xl font-black">Web Developer</h2>
            <p className="mt-10 text-xl">
              👋 Mi chiamo <strong>Federico Bellezza</strong>, ho 24 anni e vivo
              a <strong>Torino</strong>.<br />
              <br />
              🎓 Diplomato in <strong>Elettronica ed Elettrotecnica</strong>, ho
              sempre avuto una passione per la tecnologia.
              <br />
              💼 Dopo 1 anno e mezzo come operatore in fabbrica, ho sentito il
              bisogno di cambiare e...
              <br />
              <br />
              ✈️ <strong>Australia per 2 anni</strong>:<br />- Lavori nell'
              <strong>ospitalità</strong>
              <br />- Scuola di vita: <strong>adattamento</strong> e{" "}
              <strong>indipendenza</strong>
              <br />
              <br />
              💻 <strong>Svolta nella programmazione</strong>:<br />- Corso{" "}
              <strong>FullStack Developer</strong> @Boolean
              <br />- <strong>Front-end</strong>: HTML, CSS, JavaScript, React,
              Bootstrap
              <br />- <strong>Back-end</strong>: Node.js/Express, MySQL,
              Java/Spring
              <br />- Amo la sua <strong>evoluzione costante</strong> e l'
              <strong>impatto concreto</strong> sul mondo
              <br />
              <br />
              🔥 Punti forza: <strong>resilienza</strong>,{" "}
              <strong>curiosità</strong> e voglia di{" "}
              <strong>mettermi alla prova</strong>!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
