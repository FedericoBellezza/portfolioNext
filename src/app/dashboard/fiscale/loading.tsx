export default function Loading() {
  const block = "animate-pulse rounded-xl bg-[var(--fi-fill)]";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Caricamento">
      <div className={`${block} h-10 w-48`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
      <div className={`${block} h-80`} />
    </div>
  );
}
