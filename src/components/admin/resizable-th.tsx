'use client'

interface ResizableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  colWidth?: number
  onResize?: (w: number) => void
}

function mkResizeHandler(onResize: (w: number) => void, colWidth?: number) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? (colWidth ?? 100)
    const onMove = (ev: MouseEvent) => onResize(Math.max(40, startW + ev.clientX - startX))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
}

export const resizeHandleEl = (onResize: (w: number) => void, colWidth?: number) => (
  <div
    onMouseDown={mkResizeHandler(onResize, colWidth)}
    onClick={(e) => e.stopPropagation()}
    title="Drag to resize"
    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10"
  />
)

export function ResizableTh({ colWidth, onResize, children, style, className, ...props }: ResizableThProps) {
  return (
    <th
      style={{ position: 'relative', ...style }}
      className={className}
      {...props}
    >
      {children}
      {onResize && resizeHandleEl(onResize, colWidth)}
    </th>
  )
}
