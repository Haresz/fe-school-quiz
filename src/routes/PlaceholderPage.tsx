import { EmptyState } from '@/components/ui/EmptyState'

export type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <EmptyState title={title} description={description} />
    </main>
  )
}
