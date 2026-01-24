import { ComponentRenderer } from '@/components/page-renderer/component-renderer'
import fs from 'fs'
import path from 'path'

async function getHomepageData() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'pages', 'frontend-homepage.json')
    const fileContents = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(fileContents)
  } catch (error) {
    // Return default homepage if file doesn't exist
    return null
  }
}

export default async function HomePage() {
  const homepageData = await getHomepageData()

  // If we have stored homepage data, render it dynamically
  if (homepageData && homepageData.components) {
    return (
      <div className="bg-white">
        {homepageData.components.map((component: any) => (
          <ComponentRenderer
            key={component.id}
            component={component}
          />
        ))}
      </div>
    )
  }

  // Fallback to default homepage (shouldn't happen after setup)
  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to R66SLOT</h1>
        <p className="text-gray-600">Homepage is being configured...</p>
      </div>
    </div>
  )
}
