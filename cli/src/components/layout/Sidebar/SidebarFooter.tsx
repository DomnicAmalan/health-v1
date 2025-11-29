interface SidebarFooterProps {
  isCollapsed: boolean
}

export function SidebarFooter({ isCollapsed }: SidebarFooterProps) {
  if (isCollapsed) return null

  return (
    <div className="p-4 border-t shrink-0">
      <div className="text-xs text-muted-foreground text-center">HIPAA Compliant</div>
    </div>
  )
}

