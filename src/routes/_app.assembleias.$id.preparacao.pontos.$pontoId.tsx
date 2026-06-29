import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_app/assembleias/$id/preparacao/pontos/$pontoId',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/assembleias/$id/preparacao/pontos/$pontoId"!</div>
}
