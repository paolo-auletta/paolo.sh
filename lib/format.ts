export function formatMinutes(minutes: number) {
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
}

export function formatStreams(streams: number) {
  return `${streams} ${streams === 1 ? "stream" : "streams"}`
}
