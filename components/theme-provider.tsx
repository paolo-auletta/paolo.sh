"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

const THEME_STORAGE_KEY = "theme"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <>
      <SystemThemeScript />
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey={THEME_STORAGE_KEY}
        {...props}
      >
        <SystemThemeSync />
        {children}
      </NextThemesProvider>
    </>
  )
}

function SystemThemeScript() {
  const code = `try{localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)},'system')}catch(e){}`

  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: code }} />
}

function SystemThemeSync() {
  const { setTheme, theme } = useTheme()

  React.useEffect(() => {
    if (theme && theme !== "system") {
      setTheme("system")
    }
  }, [setTheme, theme])

  return null
}

export { ThemeProvider }
