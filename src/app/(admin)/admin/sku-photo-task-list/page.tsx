'use client'

import TaskListView from '@/components/admin/task-list-view'

export default function SkuPhotoTaskListPage() {
  return (
    <TaskListView
      list="sku-photo"
      title="SKU Photo Task List"
      subtitle="Active products missing an image, added automatically. Completed tasks turn green and disappear after 5 days."
      emptyHint="Every active product has an image. New products without one are added here automatically."
      createLabel="Add Photo Task"
      autoSyncNoImage
    />
  )
}
