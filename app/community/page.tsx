import { CommunityFeed } from './components/CommunityFeed'
import { CommunitySearch } from './components/CommunitySearch'
import { CreatePostForm } from './components/CreatePostForm'
import { HelpersSidebar } from './components/HelpersSidebar'
import { getPosts, getRandomHelpers } from './actions'

export default async function CommunityPage({
  searchParams
}: {
  searchParams?: { q?: string; tag?: string }
}) {
  const searchTerm = typeof searchParams?.q === 'string' ? searchParams.q : undefined
  const selectedTag = typeof searchParams?.tag === 'string' ? searchParams.tag : undefined

  const { data: posts, error: postsError } = await getPosts({
    search: searchTerm,
    tag: selectedTag
  })
  const { data: helpers } = await getRandomHelpers(5)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Społeczność ADHD
        </h1>
        <p className="text-gray-600">
          Miejsce wsparcia dla osób z ADHD. Podziel się swoimi myślami i wspieraj innych.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <CommunitySearch />
          <CreatePostForm />
          
          {postsError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600">{postsError}</p>
            </div>
          ) : (
            <CommunityFeed
              initialPosts={posts || []}
              searchTerm={searchTerm}
              selectedTag={selectedTag}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <HelpersSidebar helpers={helpers || []} />
        </div>
      </div>
    </div>
  )
}
