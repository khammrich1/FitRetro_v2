export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <main className="flex max-w-xl flex-col items-center gap-4 px-6 py-32 text-center">
        <h1 className="retro-heading text-4xl font-bold text-primary">FitRetro</h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Track workouts, nutrition, body measurements, and habits in one place.
        </p>
      </main>
    </div>
  );
}
