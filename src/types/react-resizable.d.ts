declare module 'react-resizable' {
  import * as React from 'react'

  export interface ResizableProps {
    children: React.ReactElement
    width: number
    height: number
    onResize?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void
    onResizeStart?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void
    onResizeStop?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void
    draggableOpts?: any
    minConstraints?: [number, number]
    maxConstraints?: [number, number]
    lockAspectRatio?: boolean
    axis?: 'both' | 'x' | 'y' | 'none'
    resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>
    handle?: React.ReactElement | ((resizeHandle: string) => React.ReactElement)
    transformScale?: number
  }

  export interface ResizeCallbackData {
    node: HTMLElement
    size: { width: number; height: number }
    handle: string
  }

  export class Resizable extends React.Component<ResizableProps> {}
  export class ResizableBox extends React.Component<ResizableProps> {}
}
