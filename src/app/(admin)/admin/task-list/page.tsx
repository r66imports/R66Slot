'use client'

import TaskListView from '@/components/admin/task-list-view'

export default function TaskListPage() {
  return (
    <TaskListView
      list="tasks"
      title="Task List"
      subtitle="Tasks grouped by date. Completed tasks turn green and disappear after 5 days."
      emptyHint='Use "+ Create Task" to add one. Missing product images live on the SKU Photo Task List.'
    />
  )
}
