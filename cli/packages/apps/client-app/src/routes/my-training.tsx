import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-training")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/my-training"!</div>;
}
