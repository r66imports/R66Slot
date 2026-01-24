export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  publishedAt: string
  updatedAt: string
  published: boolean
  featuredImage?: string
  tags: string[]
  seo?: {
    title?: string
    description?: string
    keywords?: string[]
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function generateId(): string {
  return `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
