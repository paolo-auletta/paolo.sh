import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Mute — privacy",
  description:
    "What the Mute extension sends, where it goes, and what it keeps.",
}

const UPDATED = "20 September 2026"

function Section({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium text-foreground">{title}</h2>
      <div className="flex flex-col gap-3 text-muted-foreground">{children}</div>
    </section>
  )
}

export default function MutePrivacyPage() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center [justify-content:safe_center] py-10 sm:py-14 md:py-16">
        <section className="w-full px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="mx-auto flex max-w-xl flex-col gap-8 text-base leading-relaxed">
            <div className="flex flex-col gap-3">
              <h1 className="text-xl font-medium text-foreground">
                Mute — privacy
              </h1>
              <p className="text-muted-foreground">
                Mute has one purpose: hide feed items that match rules you
                write. Everything below describes the extension only.
              </p>
            </div>

            <Section title="What leaves your browser">
              <p>
                To decide whether an item matches, Mute sends the visible text
                of candidate items on the page, the page title, the hostname,
                and your rule text to the provider you chose — TypeSafe, or
                OpenRouter if your key starts with <code>sk-or-</code>. That is
                the only network request the extension makes.
              </p>
              <p>
                It never sends URLs or query strings, cookies, browsing
                history, form input, passwords, or anything from a site on your
                blocklist. There is no analytics or telemetry of any kind.
              </p>
            </Section>

            <Section title="Where it goes">
              <p>
                Directly from your browser to your provider, authenticated with
                your own key. There is no server operated by this project, no
                account, and no copy of your data anywhere I control. Your
                provider handles that text under their terms:{" "}
                <a
                  href="https://typesafe.ai/legal/data-processing"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline decoration-muted-foreground/35 underline-offset-3"
                >
                  TypeSafe
                </a>{" "}
                and{" "}
                <a
                  href="https://openrouter.ai/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline decoration-muted-foreground/35 underline-offset-3"
                >
                  OpenRouter
                </a>
                . Under their default terms they retain it for as long as the
                service needs; zero retention is an enterprise arrangement, not
                the default.
              </p>
            </Section>

            <Section title="What stays on your machine">
              <p>
                Your API key, your rules, your blocklist, your corrections and
                cached verdicts live in extension storage in this browser. The
                key is never written to sync storage, logs or diagnostics, and
                page scripts cannot read it. Verdicts and corrections expire
                after six hours or when the browser session ends.
              </p>
              <p>
                Usage counts shown on the stats page are computed and kept
                locally, for 30 days, and are never sent anywhere.
              </p>
            </Section>

            <Section title="Deleting it">
              <p>
                <span className="text-foreground">Clear everything</span> in
                Settings → Advanced removes the key, rules, blocklist,
                corrections and cache, and stops muting. Uninstalling the
                extension removes the same data with it.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions or a privacy problem:{" "}
                <a
                  href="https://github.com/paolo-auletta/mute/issues"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline decoration-muted-foreground/35 underline-offset-3"
                >
                  open an issue
                </a>
                , or a private advisory for anything sensitive.
              </p>
            </Section>

            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/mute"
                className="font-medium text-muted-foreground underline decoration-muted-foreground/35 decoration-1 underline-offset-3 transition-colors hover:text-foreground hover:decoration-foreground/50"
              >
                Back
              </Link>
              <span className="text-muted-foreground">
                Last updated {UPDATED}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
