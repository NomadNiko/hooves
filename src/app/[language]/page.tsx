import type { Metadata } from "next";
import { getServerTranslation } from "@/services/i18n";
import Link from "@/components/link";

type Props = {
  params: Promise<{ language: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { t } = await getServerTranslation(params.language, "home");

  return {
    title: t("title"),
    description:
      "Horse carriage ride-hailing on Mackinac Island. Hail a carriage from your phone.",
  };
}

export default async function Home() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-32 text-center relative z-10">
          <div className="text-6xl md:text-8xl mb-6">🐴</div>
          <h1
            className="text-4xl md:text-6xl font-bold tracking-tight mb-4"
            data-testid="home-title"
          >
            Hooves
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Mackinac Island&apos;s horse carriage taxi service.
            <br className="hidden md:inline" /> Hail a carriage from your phone
            — no cars, just hooves.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/ride"
              className="inline-flex items-center justify-center rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg font-medium transition-colors"
            >
              🐴 Hail a Carriage
            </Link>
            <Link
              href="/driver"
              className="inline-flex items-center justify-center rounded-lg border-2 border-orange-600 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 px-8 py-3 text-lg font-medium transition-colors"
            >
              🎠 Drive for Hooves
            </Link>
          </div>
        </div>
        {/* Decorative background shapes */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-orange-200/30 dark:bg-orange-900/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-200/30 dark:bg-yellow-900/10 rounded-full translate-x-1/3 translate-y-1/3" />
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          <div className="text-center">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-lg font-semibold mb-2">Pick Your Stand</h3>
            <p className="text-muted-foreground">
              Choose from 10 named pickup & dropoff locations across the island
              — the docks, Grand Hotel, Fort Mackinac, and more.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🐴</div>
            <h3 className="text-lg font-semibold mb-2">
              A Carriage Comes to You
            </h3>
            <p className="text-muted-foreground">
              Your nearest available driver accepts the ride. Track their
              carriage on a live map as they approach.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🏁</div>
            <h3 className="text-lg font-semibold mb-2">Enjoy the Ride</h3>
            <p className="text-muted-foreground">
              Sit back, take in the views, and arrive at your destination the
              way Mackinac was meant to be explored.
            </p>
          </div>
        </div>
      </section>

      {/* Island info */}
      <section className="bg-muted/40 dark:bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                The Only Way to Get Around
              </h2>
              <p className="text-muted-foreground mb-4">
                Mackinac Island has banned motor vehicles since 1898.
                Horse-drawn carriages are the island&apos;s taxis, buses, and
                delivery trucks — all rolled into one.
              </p>
              <p className="text-muted-foreground">
                Hooves connects riders with licensed carriage drivers instantly.
                No flagging down a passing cab, no waiting at the dock hoping
                one shows up. Just open the app and ride.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-background p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">10</div>
                <div className="text-sm text-muted-foreground">
                  Pickup Stands
                </div>
              </div>
              <div className="rounded-lg border bg-background p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">3.8</div>
                <div className="text-sm text-muted-foreground">
                  sq mi island
                </div>
              </div>
              <div className="rounded-lg border bg-background p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">0</div>
                <div className="text-sm text-muted-foreground">
                  Cars on the island
                </div>
              </div>
              <div className="rounded-lg border bg-background p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">126</div>
                <div className="text-sm text-muted-foreground">
                  Years car-free
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For drivers */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            🎠 Drive for Hooves
          </h2>
          <p className="text-muted-foreground mb-6">
            Licensed carriage operators — create a profile, go active when
            you&apos;re ready, and start accepting rides. Track your earnings,
            manage your schedule, all from one dashboard.
          </p>
          <Link
            href="/driver"
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 font-medium transition-colors"
          >
            Get Started as a Driver →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© 2026 Hooves · Mackinac Island Carriage Service</div>
          <div className="flex gap-4">
            <Link href="/sign-in" className="hover:text-foreground">
              Sign In
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Sign Up
            </Link>
            <Link href="/privacy-policy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
