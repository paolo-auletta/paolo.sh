import type { Metadata } from "next"

export const SITE_URL = "https://paolo.sh"
export const SITE_NAME = "Paolo Auletta"
const TITLE_TEMPLATE = `%s — ${SITE_NAME}`
const SITE_DESCRIPTION =
  "A student who cares about craft and detail, now bringing it to AI research: mechanistic interpretability and automated research."

type Image = {
  url: string
  width: number
  height: number
  alt: string
  type: string
}

/** A link preview, and the still X shows in its place. */
type Card = { image: Image; still: Image }

/**
 * The site's link previews: the homepage's two skies with just the name.
 * By day the seaplane swoops across the meadow; by night the Giant's eyes,
 * between the pines, sweep their searchlight across the valley and back.
 * Both are looping GIFs
 * (Discord, Slack, Telegram and iMessage play them; the rest show the first
 * frame, which is the pose each loop starts on). The stills are the same
 * first frames as full-colour JPEGs, for X, which never animates a card.
 *
 * A link preview can't follow the reader's theme, so one of them has to be
 * the card everywhere: `CARD` picks which.
 *
 * Rendered from the homepage's own code by scripts/og/build.sh.
 */
const SKIES = {
  day: sky(
    "day",
    "Paolo Auletta, over a painted meadow sky with a red seaplane"
  ),
  night: sky(
    "night",
    "Paolo Auletta, over a starry night where the Iron Giant's eyes sweep a searchlight across the pines"
  ),
}

const CARD: keyof typeof SKIES = "day"

function sky(name: string, alt: string): Card {
  const size = { width: 1200, height: 630 }
  return {
    image: { url: `/og/${name}.gif`, ...size, alt, type: "image/gif" },
    still: { url: `/og/${name}.jpg`, ...size, alt, type: "image/jpeg" },
  }
}

/**
 * The Open Graph and X cards for a page.
 * Next replaces a parent's `openGraph` and `twitter` wholesale when a page
 * sets its own, so every page gets the complete set from here.
 */
function shareCards(
  title: string,
  description: string,
  url: string,
  card: Card
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url,
      title,
      description,
      images: [card.image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [card.still],
    },
  }
}

/** Everything a page shares about itself, filled in from a few fields. */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  image,
}: {
  title: string
  description: string
  /** The page's canonical path, e.g. "/projects". */
  path: string
  /** Use the title as is, without " — Paolo Auletta". */
  absoluteTitle?: boolean
  /** The page's own link preview, a still; the homepage's sky otherwise. */
  image?: Image
}): Metadata {
  const fullTitle = absoluteTitle ? title : TITLE_TEMPLATE.replace("%s", title)
  return {
    // Always an object that carries the template on: a plain string in a
    // layout (mute's) would drop it for the pages under that layout.
    title: absoluteTitle
      ? { absolute: title, template: TITLE_TEMPLATE }
      : { default: title, template: TITLE_TEMPLATE },
    description,
    alternates: { canonical: path },
    ...shareCards(
      fullTitle,
      description,
      path,
      image ? { image, still: image } : SKIES[CARD]
    ),
  }
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: TITLE_TEMPLATE,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  // The homepage's two characters: the seaplane by day, the Giant by night.
  // These follow the browser's light or dark setting, not the site's own
  // toggle (an icon can't see that); Safari ignores `media` and takes the
  // first. /favicon.ico (the seaplane) is there for crawlers that ask for it.
  icons: {
    icon: [
      {
        url: "/icons/plane.png",
        type: "image/png",
        sizes: "64x64",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/giant.png",
        type: "image/png",
        sizes: "64x64",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  ...shareCards(SITE_NAME, SITE_DESCRIPTION, "/", SKIES[CARD]),
}
