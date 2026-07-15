export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex max-w-xl flex-col items-center gap-4 px-6 py-32 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          FitRetro
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Track workouts, nutrition, body measurements, and habits in one place.
        </p>
      </main>
    </div>
  );
}
