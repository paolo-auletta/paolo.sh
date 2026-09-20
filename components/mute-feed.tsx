"use client"

import { useEffect, useState } from "react"

import styles from "./mute-feed.module.css"

export const MUTED_RULE = "engagement bait and rage posts"

type Post = {
  avatar: string
  body: string
  handle: string
  id: string
  likes: string
  muted?: boolean
  name: string
  replies: string
  reposts: string
  time: string
  verified?: boolean
  views: string
}

/*
 * The two muted posts are written in the register the extension is built to
 * catch — the "nobody wants to work" employer post and the grindset scold —
 * rather than quoted from real accounts.
 */
const POSTS: Post[] = [
  {
    avatar: "linear-gradient(140deg, #f4b8c1, #d76d8c)",
    body: "Spent the weekend rewriting our build step. 40s down to 6s.\n\nNothing clever, mostly deleting things we stopped needing two years ago.",
    handle: "ludo_dev",
    id: "build",
    likes: "412",
    name: "Ludovica Serra",
    replies: "18",
    reposts: "31",
    time: "1h",
    views: "24K",
  },
  {
    avatar: "linear-gradient(140deg, #9aa7b4, #4a5764)",
    body: "Nobody wants to work anymore. Posted an entry-level role at €1,100/month, got 300 applications, and not one of them would come in on Saturdays.\n\nThis generation is cooked.",
    handle: "derekbuilds",
    id: "bait-work",
    likes: "22.4K",
    muted: true,
    name: "Derek Mallory",
    replies: "8,142",
    reposts: "2,907",
    time: "2h",
    verified: true,
    views: "4.1M",
  },
  {
    avatar: "linear-gradient(140deg, #b8d8f4, #5a86b8)",
    body: "The RAM remaster sounds unreal on headphones. Long Haired Lady especially — the bass is doing something completely different than I remembered.",
    handle: "marcob",
    id: "ram",
    likes: "96",
    name: "Marco Bianchi",
    replies: "7",
    reposts: "4",
    time: "3h",
    views: "3,201",
  },
  {
    avatar: "linear-gradient(140deg, #f4d8a8, #c98a2e)",
    body: "If you are under 30 and sleeping eight hours you are choosing to be poor.\n\nYour competition is awake right now. Screenshot this and read it again when they pass you.",
    handle: "growthdaily",
    id: "bait-grind",
    likes: "47.2K",
    muted: true,
    name: "Growth Daily",
    replies: "12.3K",
    reposts: "6,701",
    time: "5h",
    verified: true,
    views: "9.8M",
  },
  {
    avatar: "linear-gradient(140deg, #c9e8d2, #4f8f68)",
    body: "Finally finished the thesis draft. 94 pages. Going to sleep for approximately one week.",
    handle: "sofiar",
    id: "thesis",
    likes: "233",
    name: "Sofia Rinaldi",
    replies: "24",
    reposts: "6",
    time: "6h",
    views: "11K",
  },
]

/* X's own icon set, so the action row is the real one and not a lookalike. */
const ICONS = {
  like: "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z",
  reply:
    "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z",
  repost:
    "M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z",
  share:
    "M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z",
  verified:
    "M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z",
  views: "M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z",
} as const

function Action({ count, path }: { count?: string; path: string }) {
  return (
    <span className={styles.action}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d={path} />
      </svg>
      {count}
    </span>
  )
}

function RevealedMarker({
  onDismiss,
  onHide,
}: {
  onDismiss: () => void
  onHide: () => void
}) {
  const [entering, setEntering] = useState(true)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntering(false))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={styles.pill} data-entering={entering}>
      <button type="button" className={styles.pillButton} onClick={onHide}>
        Hide again
      </button>
      <button
        type="button"
        className={styles.pillButton}
        title="Stop flagging this item for this rule"
        onClick={onDismiss}
      >
        Not a match
      </button>
    </div>
  )
}

export function MuteFeed() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  // "Not a match" is a correction: the marker goes away and stays away.
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})

  return (
    <div className={styles.frame}>
      <div className={styles.tabs}>
        <span className={styles.tab} data-active="true">
          <span className={styles.tabLabel}>For you</span>
        </span>
        <span className={styles.tab} data-active="false">
          <span className={styles.tabLabel}>Following</span>
        </span>
      </div>

      <div className={styles.scroll}>
        {POSTS.map((post) => {
          const hidden = post.muted === true && revealed[post.id] !== true

          return (
            <article key={post.id} className={styles.post} data-hidden={hidden}>
              <span
                aria-hidden
                className={styles.avatar}
                style={{ backgroundImage: post.avatar }}
              />
              <div
                className={styles.body}
                // Hidden content leaves the reading paths, exactly as the
                // extension does: out of focus order, selection and search.
                aria-hidden={hidden}
                inert={hidden}
              >
                <div className={styles.head}>
                  <span className={styles.name}>{post.name}</span>
                  {post.verified === true ? (
                    <svg className={styles.badge} viewBox="0 0 24 24" aria-hidden>
                      <path d={ICONS.verified} />
                    </svg>
                  ) : null}
                  <span className={styles.meta}>
                    @{post.handle} · {post.time}
                  </span>
                </div>
                <p className={styles.text}>{post.body}</p>
                <div className={styles.actions}>
                  <Action path={ICONS.reply} count={post.replies} />
                  <Action path={ICONS.repost} count={post.reposts} />
                  <Action path={ICONS.like} count={post.likes} />
                  <Action path={ICONS.views} count={post.views} />
                  <Action path={ICONS.share} />
                </div>
              </div>

              {post.muted === true ? (
                <>
                  <button
                    type="button"
                    className={styles.veil}
                    data-hidden={hidden}
                    aria-label={`Hidden by your rule: ${MUTED_RULE}. Activate to show.`}
                    onClick={() =>
                      setRevealed((current) => ({ ...current, [post.id]: true }))
                    }
                  >
                    <span
                      className={`${styles.layer} ${styles.floor}`}
                      /*
                       * Inline, not in the stylesheet: the CSS pipeline drops
                       * `backdrop-filter` declarations, and this is the whole
                       * effect. The transition stays in the module.
                       */
                      style={{
                        backdropFilter: hidden
                          ? "blur(18px) saturate(0.75)"
                          : "blur(0px) saturate(1)",
                        WebkitBackdropFilter: hidden
                          ? "blur(18px) saturate(0.75)"
                          : "blur(0px) saturate(1)",
                      }}
                    />
                    <span className={`${styles.layer} ${styles.wash}`} />
                    <span className={styles.label}>
                      <span className={styles.labelRule}>
                        <svg
                          className={styles.labelIcon}
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                        <span className={styles.labelText}>{MUTED_RULE}</span>
                      </span>
                      <span className={styles.labelShow}>Show</span>
                    </span>
                  </button>
                  {hidden || dismissed[post.id] === true ? null : (
                    <RevealedMarker
                      onHide={() =>
                        setRevealed((current) => ({
                          ...current,
                          [post.id]: false,
                        }))
                      }
                      onDismiss={() =>
                        setDismissed((current) => ({
                          ...current,
                          [post.id]: true,
                        }))
                      }
                    />
                  )}
                </>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}
