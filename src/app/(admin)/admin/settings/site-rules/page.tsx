'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteRule {
  id: string
  name: string
  description: string
  active: boolean
  appliesTo: string[]
  value?: string
  options?: Array<{ label: string; value: string }>
  category?: string
  sortOrder?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_CATEGORIES = [
  'System', 'Inventory', 'Invoices', 'Orders', 'Online Store',
  'POS', 'Shipping', 'Products', 'Customers', 'Elements',
  'Page Editor', 'Editor', 'Admin UI',
]

const CATEGORY_COLORS: Record<string, { header: string; dot: string; border: string; ring: string }> = {
  System:         { header: 'bg-purple-700',  dot: 'bg-purple-500',  border: 'border-purple-200', ring: 'ring-purple-400' },
  Inventory:      { header: 'bg-orange-600',  dot: 'bg-orange-500',  border: 'border-orange-200', ring: 'ring-orange-400' },
  Invoices:       { header: 'bg-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200',   ring: 'ring-blue-400'   },
  Orders:         { header: 'bg-teal-700',    dot: 'bg-teal-500',    border: 'border-teal-200',   ring: 'ring-teal-400'   },
  'Online Store': { header: 'bg-green-700',   dot: 'bg-green-500',   border: 'border-green-200',  ring: 'ring-green-400'  },
  POS:            { header: 'bg-yellow-600',  dot: 'bg-yellow-500',  border: 'border-yellow-200', ring: 'ring-yellow-400' },
  Shipping:       { header: 'bg-cyan-700',    dot: 'bg-cyan-500',    border: 'border-cyan-200',   ring: 'ring-cyan-400'   },
  Products:       { header: 'bg-lime-700',    dot: 'bg-lime-500',    border: 'border-lime-200',   ring: 'ring-lime-400'   },
  Customers:      { header: 'bg-pink-700',    dot: 'bg-pink-500',    border: 'border-pink-200',   ring: 'ring-pink-400'   },
  Elements:       { header: 'bg-indigo-700',  dot: 'bg-indigo-500',  border: 'border-indigo-200', ring: 'ring-indigo-400' },
  'Page Editor':  { header: 'bg-violet-700',  dot: 'bg-violet-500',  border: 'border-violet-200', ring: 'ring-violet-400' },
  Editor:         { header: 'bg-fuchsia-700', dot: 'bg-fuchsia-500', border: 'border-fuchsia-200',ring: 'ring-fuchsia-400'},
  'Admin UI':     { header: 'bg-slate-700',   dot: 'bg-slate-500',   border: 'border-slate-200',  ring: 'ring-slate-400'  },
  Uncategorized:  { header: 'bg-gray-500',    dot: 'bg-gray-400',    border: 'border-gray-200',   ring: 'ring-gray-400'   },
}

function getCatStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Uncategorized
}

function getRuleNumber(name: string): number {
  const m = name.match(/Rule\s+(\d+)/i)
  return m ? parseInt(m[1], 10) : 999
}

function getShortName(name: string): string {
  return name.replace(/^Rule\s+\d+\s*[—–\-]+\s*/i, '').trim()
}

function descriptionToBullets(desc: string): string[] {
  const mainPart = desc.split('. Flow:')[0]
  const raw = mainPart.split('. ')
  const bullets: string[] = []
  let acc = ''
  for (const s of raw) {
    const part = s.trim()
    if (!part) continue
    if (!acc) { acc = part; continue }
    if (/^[A-Z]/.test(part)) {
      bullets.push(acc.endsWith('.') ? acc : acc + '.')
      acc = part
    } else {
      acc += '. ' + part
    }
  }
  if (acc) bullets.push(acc.endsWith('.') ? acc : acc + '.')
  return bullets.filter((b) => b.length > 5)
}

const ENFORCED_RULES = new Set([
  'site_font', 'enforce_stock_limit', 'auto_create_product', 'invoice_stock_deduction',
  'document_shipping', 'invoice_price_type', 'preorder_checkout_separation',
  'inventory_count_sync', 'button_alignment', 'product_grid_show_stock',
  'worksheet_wholesale_sync', 'worksheet_csv_export', 'products_supplier_filter',
  'reports_column_sort', 'header_sticky_top', 'event_sku_drill_down',
  'packing_list_autosave', 'hover_tooltips',
])

// ─── SortableRuleRow ──────────────────────────────────────────────────────────

function SortableRuleRow({
  rule, localNum, isExpanded, allCategories,
  onToggle, onToggleExpand, onSetValue, onCopy, onMoveTo,
  syncPreorder, syncingPreorder, syncPreorderResult,
  syncMobileCols, syncingMobileCols, syncMobileColsResult,
}: {
  rule: SiteRule
  localNum: number
  isExpanded: boolean
  allCategories: string[]
  onToggle: () => void
  onToggleExpand: () => void
  onSetValue: (v: string) => void
  onCopy: () => void
  onMoveTo: (cat: string) => void
  syncPreorder: () => void
  syncingPreorder: boolean
  syncPreorderResult: { set: number; cleared: number } | null
  syncMobileCols: () => void
  syncingMobileCols: boolean
  syncMobileColsResult: { pagesUpdated: number; gridsUpdated: number } | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.25 : 1 }

  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const enforced = ENFORCED_RULES.has(rule.id)
  const shortName = getShortName(rule.name)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={setNodeRef} style={style as React.CSSProperties}>
      {/* Compact row */}
      <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 last:border-0 transition-colors ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50/70'}`}>

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none p-0.5"
          title="Drag to reorder or move to another category"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
        </button>

        {/* Local number badge */}
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center">
          {localNum}
        </span>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`relative inline-flex h-4.5 w-8 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${rule.active ? 'bg-indigo-600' : 'bg-gray-200'}`}
          role="switch"
          aria-checked={rule.active}
          style={{ height: '18px', width: '34px' }}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-200 ${rule.active ? 'translate-x-4' : 'translate-x-0'}`} style={{ height: '14px', width: '14px' }} />
        </button>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`text-xs font-semibold leading-tight ${rule.active ? 'text-gray-900' : 'text-gray-400'}`}>{shortName}</span>
            {enforced ? (
              <span className="inline-flex items-center gap-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-semibold px-1 py-0.5 rounded-full flex-shrink-0">
                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Enforced
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 bg-gray-100 border border-gray-200 text-gray-400 text-[9px] font-semibold px-1 py-0.5 rounded-full flex-shrink-0">Docs</span>
            )}
          </div>
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {rule.appliesTo.slice(0, 3).map((area) => (
              <span key={area} className={`text-[9px] font-medium px-1 py-px rounded border ${rule.active ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                {area}
              </span>
            ))}
            {rule.appliesTo.length > 3 && (
              <span className="text-[9px] font-medium px-1 py-px rounded border bg-gray-50 text-gray-400 border-gray-100">+{rule.appliesTo.length - 3}</span>
            )}
          </div>
        </div>

        {/* ⋯ menu + chevron */}
        <div className="flex items-center gap-0.5 flex-shrink-0 relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="p-1 text-gray-300 hover:text-gray-600 rounded transition-colors"
            title="Options"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-6 top-0 z-50 bg-white rounded-xl border border-gray-200 shadow-xl w-52 py-1 text-sm">
              <button
                onClick={() => { onCopy(); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-xs font-medium text-gray-700"
              >
                <span>📋</span> Copy Rule
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Move to Category</p>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {allCategories.filter(c => c !== (rule.category || 'Uncategorized')).map(cat => {
                    const s = getCatStyle(cat)
                    return (
                      <button
                        key={cat}
                        onClick={() => { onMoveTo(cat); setShowMenu(false) }}
                        className="w-full text-left py-1.5 hover:text-indigo-600 flex items-center gap-1.5 text-xs text-gray-600"
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onToggleExpand}
            className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 bg-gray-50/80 border-b border-gray-100">
          <ul className="space-y-1 mb-3">
            {descriptionToBullets(rule.description).map((bullet, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                {bullet}
              </li>
            ))}
          </ul>

          {rule.description.includes('. Flow:') && (
            <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 mb-3">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Workflow</p>
              <div className="flex flex-wrap items-center gap-1">
                {rule.description.split(/\. (?=Flow:)/)[1]?.replace(/^Flow:\s*/, '').split(/\.\s+(?=[A-Z])/).map((step, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{step.replace(/\.$/, '')}</span>
                    {i < arr.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {rule.options && rule.options.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Default Selection</p>
              <div className="flex gap-1.5 flex-wrap">
                {rule.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onSetValue(opt.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      rule.value === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {rule.id === 'auto_preorder_on_oos' && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-xs font-semibold text-orange-700 mb-1">Apply to existing products</p>
              <p className="text-xs text-orange-600 mb-2">Click below to immediately apply to all current products.</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={syncPreorder}
                  disabled={syncingPreorder}
                  className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {syncingPreorder ? '⏳ Syncing…' : '⚡ Sync Now'}
                </button>
                {syncPreorderResult && (
                  <span className="text-xs text-green-700 font-semibold">
                    ✓ {syncPreorderResult.set} set · {syncPreorderResult.cleared} cleared
                  </span>
                )}
              </div>
            </div>
          )}

          {rule.id === 'product_grid_mobile_cols' && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs font-semibold text-green-700 mb-1">Apply to all pages now</p>
              <p className="text-xs text-green-600 mb-2">Sets mobile columns to 1 on every Product Grid across all pages.</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={syncMobileCols}
                  disabled={syncingMobileCols}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {syncingMobileCols ? '⏳ Updating…' : '📱 Apply to All Pages'}
                </button>
                {syncMobileColsResult && (
                  <span className="text-xs text-green-700 font-semibold">
                    ✓ {syncMobileColsResult.gridsUpdated} grid{syncMobileColsResult.gridsUpdated !== 1 ? 's' : ''} updated across {syncMobileColsResult.pagesUpdated} page{syncMobileColsResult.pagesUpdated !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">Rule #{getRuleNumber(rule.name)}</span>
            <span className="text-gray-200">·</span>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{rule.id}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CategoryBox ──────────────────────────────────────────────────────────────

function CategoryBox({
  category, ruleIds, ruleMap, expanded, copiedRule, allCategories,
  onToggle, onToggleExpand, onSetValue, onCopy, onMoveTo, onPaste,
  syncPreorder, syncingPreorder, syncPreorderResult,
  syncMobileCols, syncingMobileCols, syncMobileColsResult,
}: {
  category: string
  ruleIds: string[]
  ruleMap: Record<string, SiteRule>
  expanded: Set<string>
  copiedRule: SiteRule | null
  allCategories: string[]
  onToggle: (id: string) => void
  onToggleExpand: (id: string) => void
  onSetValue: (id: string, v: string) => void
  onCopy: (rule: SiteRule) => void
  onMoveTo: (id: string, cat: string) => void
  onPaste: (cat: string) => void
  syncPreorder: () => void
  syncingPreorder: boolean
  syncPreorderResult: { set: number; cleared: number } | null
  syncMobileCols: () => void
  syncingMobileCols: boolean
  syncMobileColsResult: { pagesUpdated: number; gridsUpdated: number } | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cat-${category}` })
  const style = getCatStyle(category)
  const categoryRules = ruleIds.map(id => ruleMap[id]).filter(Boolean)
  const canPaste = copiedRule && (copiedRule.category || 'Uncategorized') !== category

  const pasteLabel = copiedRule
    ? `"${getShortName(copiedRule.name).substring(0, 22)}${getShortName(copiedRule.name).length > 22 ? '…' : ''}"`
    : ''

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 overflow-hidden transition-all duration-150 ${
        isOver ? `${style.ring} ring-2 shadow-lg` : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`${style.header} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm tracking-wide">{category}</span>
          <span className="bg-black/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {ruleIds.length}
          </span>
        </div>
        {canPaste && (
          <button
            onClick={() => onPaste(category)}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/35 text-white text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
          >
            <span>📋</span>
            Paste {pasteLabel}
          </button>
        )}
      </div>

      {/* Drop hint when dragging over */}
      {isOver && (
        <div className="h-1 bg-indigo-400" />
      )}

      {/* Rules */}
      <div className="bg-white">
        <SortableContext items={ruleIds} strategy={verticalListSortingStrategy}>
          {categoryRules.length === 0 ? (
            <div className={`py-8 text-center text-xs text-gray-400 italic transition-colors ${isOver ? 'bg-indigo-50' : ''}`}>
              Drop a rule here
            </div>
          ) : (
            categoryRules.map((rule, i) => (
              <SortableRuleRow
                key={rule.id}
                rule={rule}
                localNum={i + 1}
                isExpanded={expanded.has(rule.id)}
                allCategories={allCategories}
                onToggle={() => onToggle(rule.id)}
                onToggleExpand={() => onToggleExpand(rule.id)}
                onSetValue={(v) => onSetValue(rule.id, v)}
                onCopy={() => onCopy(rule)}
                onMoveTo={(cat) => onMoveTo(rule.id, cat)}
                syncPreorder={syncPreorder}
                syncingPreorder={syncingPreorder}
                syncPreorderResult={syncPreorderResult}
                syncMobileCols={syncMobileCols}
                syncingMobileCols={syncingMobileCols}
                syncMobileColsResult={syncMobileColsResult}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}

// ─── Drag overlay ghost ───────────────────────────────────────────────────────

function DragGhost({ rule, localNum }: { rule: SiteRule; localNum: number }) {
  return (
    <div className="bg-white rounded-xl border-2 border-indigo-500 shadow-2xl px-3 py-2.5 flex items-center gap-2 cursor-grabbing max-w-xs">
      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
      </svg>
      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{localNum}</span>
      <span className="text-xs font-semibold text-gray-900 truncate">{getShortName(rule.name)}</span>
      {ENFORCED_RULES.has(rule.id) && (
        <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-semibold px-1 py-0.5 rounded-full flex-shrink-0">E</span>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function SiteRulesPage() {
  const [rules, setRules] = useState<SiteRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [syncingPreorder, setSyncingPreorder] = useState(false)
  const [syncPreorderResult, setSyncPreorderResult] = useState<{ set: number; cleared: number } | null>(null)
  const [syncingMobileCols, setSyncingMobileCols] = useState(false)
  const [syncMobileColsResult, setSyncMobileColsResult] = useState<{ pagesUpdated: number; gridsUpdated: number } | null>(null)
  const [copiedRule, setCopiedRule] = useState<SiteRule | null>(null)

  // dnd: category → ordered rule IDs
  const [items, setItems] = useState<Record<string, string[]>>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  const initialized = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ─── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/admin/site-rules')
      .then((r) => r.ok ? r.json() : [])
      .then((data: SiteRule[]) => {
        if (!Array.isArray(data)) return
        setRules(data)
        // Build items map: sort by sortOrder within each category
        const newItems: Record<string, string[]> = {}
        const sorted = [...data].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
        for (const rule of sorted) {
          const cat = rule.category || 'Uncategorized'
          if (!newItems[cat]) newItems[cat] = []
          newItems[cat].push(rule.id)
        }
        setItems(newItems)
        initialized.current = true
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ─── Save ─────────────────────────────────────────────────────────────────

  const doSave = useCallback(async (latestRules: SiteRule[]) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin/site-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latestRules),
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2500)
    }
  }, [])

  const scheduleAutoSave = useCallback((latestRules: SiteRule[]) => {
    if (!initialized.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveStatus('saving')
    debounceRef.current = setTimeout(() => doSave(latestRules), 700)
  }, [doSave])

  // ─── Derived ──────────────────────────────────────────────────────────────

  const ruleMap = useMemo(() => Object.fromEntries(rules.map(r => [r.id, r])), [rules])

  const allCategories = useMemo(() => {
    const active = Object.keys(items).filter(c => (items[c]?.length ?? 0) > 0)
    const ordered = PRESET_CATEGORIES.filter(c => active.includes(c))
    const extra = active.filter(c => !PRESET_CATEGORIES.includes(c))
    return [...ordered, ...extra]
  }, [items])

  // ─── dnd helpers ──────────────────────────────────────────────────────────

  const findContainer = useCallback((id: string): string | undefined => {
    if (id.startsWith('cat-')) return id.replace('cat-', '')
    for (const [cat, ids] of Object.entries(items)) {
      if (ids.includes(id)) return cat
    }
  }, [items])

  const commitItemsToRules = useCallback((newItems: Record<string, string[]>) => {
    setRules(prev => {
      const next = prev.map(rule => {
        for (const [cat, ids] of Object.entries(newItems)) {
          const idx = ids.indexOf(rule.id)
          if (idx !== -1) return { ...rule, category: cat, sortOrder: idx }
        }
        return rule
      })
      scheduleAutoSave(next)
      return next
    })
  }, [scheduleAutoSave])

  // ─── dnd events ───────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const aId = active.id as string
    const oId = over.id as string
    const aCat = findContainer(aId)
    const oCat = findContainer(oId)
    if (!aCat || !oCat || aCat === oCat) return

    setItems(prev => {
      const aList = [...(prev[aCat] || [])]
      const oList = [...(prev[oCat] || [])]
      const fromIdx = aList.indexOf(aId)
      if (fromIdx === -1) return prev
      aList.splice(fromIdx, 1)
      const toIdx = oList.indexOf(oId)
      if (toIdx === -1) oList.push(aId)
      else oList.splice(toIdx, 0, aId)
      return { ...prev, [aCat]: aList, [oCat]: oList }
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const aId = active.id as string
    const oId = over.id as string
    const aCat = findContainer(aId)
    const oCat = findContainer(oId)
    if (!aCat || !oCat) return

    if (aCat === oCat) {
      const list = [...(items[aCat] || [])]
      const from = list.indexOf(aId)
      const to = list.indexOf(oId)
      if (from !== -1 && to !== -1 && from !== to) {
        const newItems = { ...items, [aCat]: arrayMove(list, from, to) }
        setItems(newItems)
        commitItemsToRules(newItems)
        return
      }
    }
    // Cross-category already handled by onDragOver; just commit current items
    commitItemsToRules(items)
  }

  // ─── Rule mutations ───────────────────────────────────────────────────────

  const toggle = (id: string) => {
    setRules(prev => {
      const next = prev.map(r => r.id === id ? { ...r, active: !r.active } : r)
      scheduleAutoSave(next)
      return next
    })
  }

  const setValue = (id: string, value: string) => {
    setRules(prev => {
      const next = prev.map(r => r.id === id ? { ...r, value } : r)
      scheduleAutoSave(next)
      return next
    })
  }

  const moveTo = (id: string, destCat: string) => {
    setItems(prev => {
      const rule = rules.find(r => r.id === id)
      if (!rule) return prev
      const srcCat = rule.category || 'Uncategorized'
      if (srcCat === destCat) return prev
      const newItems = { ...prev }
      newItems[srcCat] = (newItems[srcCat] || []).filter(rid => rid !== id)
      newItems[destCat] = [...(newItems[destCat] || []), id]
      return newItems
    })
    setRules(prev => {
      const next = prev.map(r => r.id === id ? { ...r, category: destCat } : r)
      scheduleAutoSave(next)
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Copy / Paste ─────────────────────────────────────────────────────────

  const handleCopy = (rule: SiteRule) => setCopiedRule(rule)

  const handlePaste = (destCat: string) => {
    if (!copiedRule) return
    moveTo(copiedRule.id, destCat)
    setCopiedRule(null)
  }

  // ─── Sync preorder ────────────────────────────────────────────────────────

  const syncPreorder = async () => {
    setSyncingPreorder(true)
    setSyncPreorderResult(null)
    try {
      const res = await fetch('/api/admin/products/sync-preorder', { method: 'POST' })
      setSyncPreorderResult(await res.json())
    } catch {
      // silent
    } finally {
      setSyncingPreorder(false)
    }
  }

  const syncMobileCols = async () => {
    setSyncingMobileCols(true)
    setSyncMobileColsResult(null)
    try {
      const res = await fetch('/api/admin/pages/fix-mobile-cols', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cols: 1 }) })
      setSyncMobileColsResult(await res.json())
    } catch {
      // silent
    } finally {
      setSyncingMobileCols(false)
    }
  }

  // ─── Active rule info for overlay ─────────────────────────────────────────

  const activeRule = activeId ? ruleMap[activeId] : null
  const activeLocalNum = activeId && activeRule
    ? ((items[activeRule.category || 'Uncategorized'] || []).indexOf(activeId) + 1)
    : 1

  const statusLabel = {
    idle:   null,
    saving: <span className="text-xs text-gray-400 animate-pulse">Saving…</span>,
    saved:  <span className="text-xs text-green-600 font-semibold">✓ Saved</span>,
    error:  <span className="text-xs text-red-500 font-semibold">Save failed</span>,
  }[saveStatus]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <Link href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700 block mb-1">&larr; Site Settings</Link>
          <h1 className="text-2xl font-bold text-gray-900">Site Rules</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Rules are organised into category boxes. Drag to reorder within a box or move between boxes. Numbers update automatically.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 mt-1">
          {copiedRule && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span>📋</span>
              <span>Copied: &ldquo;{getShortName(copiedRule.name).substring(0, 28)}&rdquo;</span>
              <button onClick={() => setCopiedRule(null)} className="text-indigo-400 hover:text-indigo-700 ml-1 leading-none">✕</button>
            </div>
          )}
          {statusLabel}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Code Enforced
          </span>
          Toggle controls live API behavior
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" /></svg>
          Drag handle — reorder or move between categories
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-bold text-sm">⋯</span>
          Copy rule or move to category
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading rules…</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {allCategories.map((cat) => (
              <CategoryBox
                key={cat}
                category={cat}
                ruleIds={items[cat] || []}
                ruleMap={ruleMap}
                expanded={expanded}
                copiedRule={copiedRule}
                allCategories={allCategories}
                onToggle={toggle}
                onToggleExpand={toggleExpand}
                onSetValue={setValue}
                onCopy={handleCopy}
                onMoveTo={moveTo}
                onPaste={handlePaste}
                syncPreorder={syncPreorder}
                syncingPreorder={syncingPreorder}
                syncPreorderResult={syncPreorderResult}
                syncMobileCols={syncMobileCols}
                syncingMobileCols={syncingMobileCols}
                syncMobileColsResult={syncMobileColsResult}
              />
            ))}
          </div>

          <DragOverlay>
            {activeRule && <DragGhost rule={activeRule} localNum={activeLocalNum} />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
