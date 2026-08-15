import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-indigo-50 text-accent text-xs font-medium tracking-wide">
          NATURAL LANGUAGE → SQL
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Ask your database questions.
          <br />
          Get SQL back instantly.
        </h1>
        <p className="text-gray-500 text-lg mb-8">
          Paste your schema, ask in plain English, and get accurate SQL
          queries — with optional live execution against your own database.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-lg bg-accent text-white font-medium hover:bg-indigo-700 transition"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border border-gray-200 font-medium hover:bg-gray-50 transition"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
