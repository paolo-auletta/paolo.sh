"use client"

import { AnimatePresence, motion } from "motion/react"
import { HoverCard } from "radix-ui"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

/**
 * A link that shows a picture of where it goes on hover: the artwork when
 * there is one, otherwise a screenshot of the page from microlink. The card
 * springs open above the link and is itself a link to the same place.
 */

type Card = {
  href: string
  src: string
  width: number
  height: number
  isOpen: boolean
}

const CardContext = createContext<Card | null>(null)

function useCard() {
  const card = useContext(CardContext)
  if (!card) throw new Error("PreviewLinkCard parts must sit inside a PreviewLinkCard")
  return card
}

type PreviewLinkCardProps = {
  children: ReactNode
  href: string
  src?: string
  width: number
  height: number
  colorScheme: "light" | "dark"
  openDelay: number
  closeDelay: number
}

function PreviewLinkCard({
  children,
  href,
  src,
  width,
  height,
  colorScheme,
  openDelay,
  closeDelay,
}: PreviewLinkCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const imageSrc = src ?? screenshotUrl(href, colorScheme, width, height)

  // Fetch the picture ahead of the hover so the card opens with it.
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "preload"
    link.as = "image"
    link.href = imageSrc
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [imageSrc])

  return (
    <CardContext.Provider value={{ href, src: imageSrc, width, height, isOpen }}>
      <HoverCard.Root
        openDelay={openDelay}
        closeDelay={closeDelay}
        onOpenChange={setIsOpen}
      >
        {children}
      </HoverCard.Root>
    </CardContext.Provider>
  )
}

function screenshotUrl(
  href: string,
  colorScheme: "light" | "dark",
  width: number,
  height: number
) {
  const query = new URLSearchParams({
    url: href,
    screenshot: "true",
    meta: "false",
    embed: "screenshot.url",
    colorScheme,
    "viewport.isMobile": "true",
    "viewport.deviceScaleFactor": "1",
    "viewport.width": String(width * 3),
    "viewport.height": String(height * 3),
  })
  return `https://api.microlink.io/?${query}`
}

/** Wraps the link itself (`asChild`: the child is the element). */
function PreviewLinkCardTrigger({ children }: { children: ReactNode }) {
  return (
    <HoverCard.Trigger data-slot="preview-link-card-trigger" asChild>
      {children}
    </HoverCard.Trigger>
  )
}

type PreviewLinkCardContentProps = Omit<ComponentProps<"a">, "href"> & {
  side: "top" | "right" | "bottom" | "left"
}

function PreviewLinkCardContent({
  side,
  className,
  children,
  ...anchor
}: PreviewLinkCardContentProps) {
  const { href, isOpen } = useCard()

  return (
    <AnimatePresence>
      {isOpen && (
        <HoverCard.Portal forceMount data-slot="preview-link-card-portal">
          <HoverCard.Content
            asChild
            forceMount
            align="center"
            side={side}
            sideOffset={4}
          >
            <motion.div
              key="hover-card-content"
              data-slot="preview-link-card-content"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <a
                style={{ display: "block" }}
                href={href}
                className={cn(
                  "z-50 origin-(--radix-hover-card-content-transform-origin) rounded-md border shadow-md outline-hidden overflow-hidden",
                  className
                )}
                {...anchor}
              >
                {children}
              </a>
            </motion.div>
          </HoverCard.Content>
        </HoverCard.Portal>
      )}
    </AnimatePresence>
  )
}

function PreviewLinkCardImage({ className }: { className?: string }) {
  const { src, width, height } = useCard()

  // A remote picture at the card's own size: nothing for next/image to do.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={width} height={height} alt="preview image" className={className} />
}

export {
  PreviewLinkCard,
  PreviewLinkCardContent,
  PreviewLinkCardImage,
  PreviewLinkCardTrigger,
}
