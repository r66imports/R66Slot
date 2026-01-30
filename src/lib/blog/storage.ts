import { blobRead, blobWrite, blobDelete, blobList } from '@/lib/blob-storage'
import { BlogPost, generateId, generateSlug } from './schema'

const BLOG_PREFIX = 'data/blog/'

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const files = await blobList(BLOG_PREFIX)
    const posts: BlogPost[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const post = await blobRead<BlogPost | null>(file, null)
        if (post) posts.push(post)
      }
    }

    return posts.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch {
    return []
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts()
  return posts.find((post) => post.slug === slug) || null
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  try {
    return await blobRead<BlogPost | null>(`${BLOG_PREFIX}${id}.json`, null)
  } catch {
    return null
  }
}

export async function createPost(
  data: Omit<BlogPost, 'id' | 'publishedAt' | 'updatedAt'>
): Promise<BlogPost> {
  const now = new Date().toISOString()
  const post: BlogPost = {
    ...data,
    id: generateId(),
    slug: data.slug || generateSlug(data.title),
    publishedAt: now,
    updatedAt: now,
  }

  await blobWrite(`${BLOG_PREFIX}${post.id}.json`, post)
  return post
}

export async function updatePost(
  id: string,
  data: Partial<BlogPost>
): Promise<BlogPost | null> {
  const post = await getPostById(id)
  if (!post) return null

  const updated: BlogPost = {
    ...post,
    ...data,
    id: post.id,
    publishedAt: post.publishedAt,
    updatedAt: new Date().toISOString(),
  }

  await blobWrite(`${BLOG_PREFIX}${id}.json`, updated)
  return updated
}

export async function deletePost(id: string): Promise<boolean> {
  return await blobDelete(`${BLOG_PREFIX}${id}.json`)
}
