import { ActivityArchivePage } from "@/components/activity-archive-page"
import { getCurrentMonthLabel } from "@/lib/date"

export const revalidate = 3600

export default function MusicPage() {
  return <ActivityArchivePage title="Music" monthLabel={getCurrentMonthLabel()} />
}
