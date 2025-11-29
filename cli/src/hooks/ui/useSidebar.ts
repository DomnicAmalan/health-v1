import { useState } from "react"

export function useSidebar() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpand = (path: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        // Auto-collapse other items (Excel-style: only one section open at a time)
        next.clear()
        next.add(path)
      }
      return next
    })
  }

  return { expandedItems, toggleExpand }
}

