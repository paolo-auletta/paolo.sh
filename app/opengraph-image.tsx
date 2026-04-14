import { readFile } from "node:fs/promises"
import path from "node:path"

import { ImageResponse } from "next/og"

export const runtime = "nodejs"
export const alt = "Paolo Auletta"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

const logoBuffer = await readFile(
  path.join(process.cwd(), "public", "logo.png")
)
const geistFont = await fetch(
  "https://raw.githubusercontent.com/vercel/geist-font/main/fonts/Geist/ttf/Geist-Bold.ttf"
).then((response) => response.arrayBuffer())

const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        padding: "56px 64px",
        color: "#171717",
      }}
    >
      <img
        src={logoSrc}
        alt=""
        width={84}
        height={84}
        style={{ borderRadius: "9999px" }}
      />

      <div
        style={{
          display: "flex",
          fontSize: 92,
          fontFamily: "Geist",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.05em",
        }}
      >
        Paolo Auletta
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Geist",
          data: geistFont,
          weight: 700,
          style: "normal",
        },
      ],
    }
  )
}
