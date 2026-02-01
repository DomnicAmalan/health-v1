import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compliance-status')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/compliance-status"!</div>
}
