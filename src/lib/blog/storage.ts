import { promises as fs } from 'fs'
import path from 'path'
import { BlogPost, generateId, generateSlug } from './schema'

const BLOG_DIR = path.join(process.cwd(), 'data', 'blog')

// Ensure blog directory exists
async function ensureBlogDir() {
  try {
    await fs.access(BLOG_DIR)
  } catch {
    await fs.mkdir(BLOG_DIR, { recursive: true })
  }
}

// Get all blog posts
export async function getAllPosts(): Promise<BlogPost[]> {
  await ensureBlogDir()

  try {
    const files = await fs.readdir(BLOG_DIR)
    const posts: BlogPost[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(BLOG_DIR, file), 'utf-8')
        posts.push(JSON.parse(content))
      }
    }

    // Sort by publish date, newest first
    return posts.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch (error) {
    return []
  }
}

// Get a single post by slug
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts()
  return posts.find((post) => post.slug === slug) || null
}

// Get a single post by ID
export async function getPostById(id: string): Promise<BlogPost | null> {
  await ensureBlogDir()

  try {
    const content = await fs.readFile(path.join(BLOG_DIR, `${id}.json`), 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    return null
  }
}

// Create a new post
export async function createPost(
  data: Omit<BlogPost, 'id' | 'publishedAt' | 'updatedAt'>
): Promise<BlogPost> {
  await ensureBlogDir()

  const now = new Date().toISOString()
  const post: BlogPost = {
    ...data,
    id: generateId(),
    slug: data.slug || generateSlug(data.title),
    publishedAt: now,
    updatedAt: now,
  }

  await fs.writeFile(
    path.join(BLOG_DIR, `${post.id}.json`),
    JSON.stringify(post, null, 2),
    'utf-8'
  )

  return post
}

// Update an existing post
export async function updatePost(
  id: string,
  data: Partial<BlogPost>
): Promise<BlogPost | null> {
  const post = await getPostById(id)
  if (!post) return null

  const updated: BlogPost = {
    ...post,
    ...data,
    id: post.id, // Prevent ID change
    publishedAt: post.publishedAt, // Preserve original publish date
    updatedAt: new Date().toISOString(),
  }

  await fs.writeFile(
    path.join(BLOG_DIR, `${id}.json`),
    JSON.stringify(updated, null, 2),
    'utf-8'
  )

  return updated
}

// Delete a post
export async function deletePost(id: string): Promise<boolean> {
  try {
    await fs.unlink(path.join(BLOG_DIR, `${id}.json`))
    return true
  } catch (error) {
    return false
  }
}
