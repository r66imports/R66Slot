import { getPageBySlug } from '@/lib/pages/storage'
import type { PageComponent } from '@/lib/pages/schema'
import { notFound } from 'next/navigation'

export default async function CustomPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = await getPageBySlug(slug)

  if (!page || !page.published) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {page.components.map((component) => (
        <ComponentRenderer key={component.id} component={component} />
      ))}
    </div>
  )
}

function ComponentRenderer({ component }: { component: PageComponent }) {
  const style = {
    backgroundColor: component.styles.backgroundColor,
    color: component.styles.textColor,
    fontSize: component.styles.fontSize,
    fontWeight: component.styles.fontWeight,
    padding: component.styles.padding,
    margin: component.styles.margin,
    textAlign: component.styles.textAlign as any,
    borderRadius: component.styles.borderRadius,
    width: component.styles.width,
    height: component.styles.height,
  }

  switch (component.type) {
    case 'heading':
      return <h1 style={style}>{component.content}</h1>

    case 'text':
      return <p style={style}>{component.content}</p>

    case 'button':
      return (
        <div style={{ padding: component.styles.padding || '10px' }}>
          {component.settings.link ? (
            <a href={component.settings.link}>
              <button style={style}>{component.content}</button>
            </a>
          ) : (
            <button style={style}>{component.content}</button>
          )}
        </div>
      )

    case 'image':
      return (
        <img
          src={component.settings.imageUrl || ''}
          alt={component.settings.alt || ''}
          style={style}
        />
      )

    case 'section':
      return (
        <div style={style}>
          {component.children?.map((child) => (
            <ComponentRenderer key={child.id} component={child} />
          ))}
        </div>
      )

    case 'spacer':
      return <div style={style} />

    default:
      return <div style={style}>{component.content}</div>
  }
}
