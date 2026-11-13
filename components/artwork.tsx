import Image from "next/image"

function initialsOf(title: string) {
  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
}

/**
 * A cover or poster in its frame, or the title's initials when there is no
 * image. Each caller gives its own frame, sizes and alt text.
 */
export function Artwork({
  alt,
  className,
  imageClassName,
  initialsClassName,
  paper,
  sizes,
  src,
  title,
}: {
  alt: string
  className: string
  imageClassName: string
  initialsClassName: string
  /** The frame's data-paper part, for the Paper entrance. */
  paper?: string
  sizes: string
  src?: string
  title: string
}) {
  return (
    <div aria-label={title} data-paper={paper} className={className}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={imageClassName}
          sizes={sizes}
          unoptimized
        />
      ) : (
        <span className={initialsClassName}>{initialsOf(title)}</span>
      )}
    </div>
  )
}
