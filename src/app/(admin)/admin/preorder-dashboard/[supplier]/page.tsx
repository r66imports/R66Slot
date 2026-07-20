'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

interface Contact { id: string; firstName: string; lastName: string; email?: string; phone?: string }
interface SupplierContact { id: string; name: string; preferredCurrency?: string }
interface DashboardCustomer {
  id: string; name: string; email?: string; phone?: string
  qty: number; depositPaid?: boolean; depositPaidDate?: string
  linkedDocNumber?: string; linkedDocId?: string
}
interface DashboardItem {
  id: string; sku: string; description: string; retailPrice: string; estimatedRetailPrice: string
  wholesalePrice?: string; wholesaleCurrency?: string; supplierSRP?: string; supplierDiscount?: string
  wholesalePrice2?: string; wholesaleCurrency2?: string; supplierSRP2?: string; supplierDiscount2?: string
  estimatedRetailPrice2?: string; moq2Qty?: number; moq2Enabled?: boolean; moq2ResellerOnly?: boolean
  showRetail?: boolean; eta: string; cutoffDate?: string; orderPlaced?: boolean; published?: boolean
  supplier: string; brand: string; unit: string; imageUrl?: string; seoTitle?: string; seoDescription?: string
  seoImageUrl?: string; shipmentStatus?: 'preorder' | 'shipping_soon' | 'shipping'; linkedWsId?: string
  customers: DashboardCustomer[]; extraQty?: number; minOrderQty?: number | null
  resellerMoq?: number; resellerOnly?: boolean
  notes?: string; createdAt: string; updatedAt?: string
}
type FormState = Omit<DashboardItem, 'id' | 'createdAt'>
interface DashboardOptions { brands: string[]; units: string[]; etas: string[] }
interface CostingSettings { shippingMarkup: number; markup: number; includeVAT: boolean }
type SortBy = 'az' | 'sku' | 'brand' | 'price' | 'date' | 'cutoff'

const CURRENCIES = ['ZAR','USD','CNY','EUR','GBP','HKD','SGD','JPY','AUD','CAD']
const PAGE_SIZE = 25

function parsePrice(v: string | undefined | null): number { return parseFloat((v||'').replace(/[^\d.-]/g,''))||0 }

function daysUntilCutoff(date: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const cutoff = new Date(date); cutoff.setHours(0,0,0,0)
  return Math.ceil((cutoff.getTime()-today.getTime())/86_400_000)
}
function cutoffAlert(date?: string): { active: boolean; days: number } {
  if (!date) return { active: false, days: 999 }
  const days = daysUntilCutoff(date)
  return { active: days >= 0 && days <= 2, days }
}

function calcRetailPrice(wholesalePrice:string,currency:string,rates:Record<string,number>,settings:CostingSettings,supplier?:string): string {
  const price = parsePrice(wholesalePrice)
  if (!price||!currency) return ''
  const toZAR = currency==='ZAR' ? 1 : (rates[currency]||0)
  if (!toZAR) return ''
  if (supplier?.toLowerCase()==='motorhelix' && currency==='USD') return (price*1.20*1.30*toZAR).toFixed(2)
  const costZAR = price*toZAR
  const withShipping = costZAR*(1+settings.shippingMarkup/100)
  const withMarkup = withShipping*(1+settings.markup/100)
  return (settings.includeVAT ? withMarkup*1.15 : withMarkup).toFixed(2)
}

function TagInputDropdown({ value, onChange, options, onAddOption, placeholder }: {
  value:string; onChange:(v:string)=>void; options:string[]; onAddOption:(v:string)=>void; placeholder?:string
}) {
  const [open,setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filtered = value.trim() ? options.filter(o=>o.toLowerCase().includes(value.toLowerCase())) : options
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])
  return (
    <div ref={ref} className="relative">
      <input type="text" value={value} onChange={e=>{onChange(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
        placeholder={placeholder} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
      {open&&(filtered.length>0||(value.trim()&&!options.includes(value.trim())))&&(
        <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto mt-0.5">
          {filtered.map(o=><li key={o} onMouseDown={()=>{onChange(o);setOpen(false)}} className="px-3 py-1.5 cursor-pointer hover:bg-indigo-50 text-sm">{o}</li>)}
          {value.trim()&&!options.includes(value.trim())&&<li onMouseDown={async()=>{await onAddOption(value.trim());setOpen(false)}} className="px-3 py-1.5 cursor-pointer hover:bg-green-50 text-sm text-green-700 font-medium border-t border-gray-100">+ Add &ldquo;{value.trim()}&rdquo;</li>}
        </ul>
      )}
    </div>
  )
}

function ContactSearch({ contacts, onSelect, onAddManual }: {
  contacts:Contact[]; onSelect:(c:Contact)=>void; onAddManual:(name:string)=>void
}) {
  const [q,setQ]=useState(''); const [open,setOpen]=useState(false); const ref=useRef<HTMLDivElement>(null)
  const results = q.trim().length>0 ? contacts.filter(c=>`${c.firstName} ${c.lastName} ${c.email||''} ${c.phone||''}`.toLowerCase().includes(q.toLowerCase())).slice(0,8) : []
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false)}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])
  return (
    <div ref={ref} className="relative">
      <input type="text" value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
        placeholder="Search customers…" className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
      {open&&q.trim().length>0&&(
        <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto mt-0.5">
          {results.map(c=>(
            <li key={c.id} onMouseDown={()=>{onSelect(c);setQ('');setOpen(false)}} className="px-3 py-2 cursor-pointer hover:bg-indigo-50 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{c.firstName} {c.lastName}</span>
              {c.email&&<span className="text-xs text-gray-400 truncate">{c.email}</span>}
            </li>
          ))}
          {q.trim()&&<li onMouseDown={()=>{onAddManual(q.trim());setQ('');setOpen(false)}} className="px-3 py-2 cursor-pointer hover:bg-green-50 text-sm text-green-700 font-medium border-t border-gray-100">+ Add &ldquo;{q.trim()}&rdquo; manually</li>}
          {results.length===0&&!q.trim()&&<li className="px-3 py-2 text-sm text-gray-400">Type to search…</li>}
        </ul>
      )}
    </div>
  )
}

async function generatePoster(form: FormState, itemId: string): Promise<void> {
  const res = await fetch('/api/admin/preorder-poster', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: form.description, sku: form.sku, imageUrl: form.imageUrl, brand: form.brand, eta: form.eta,
      estimatedRetailPrice: form.estimatedRetailPrice, retailPrice: form.retailPrice, cutoffDate: form.cutoffDate, notes: form.notes,
    }),
  })
  if (!res.ok) return
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`preorder-${form.sku||itemId}.png`; a.click()
  setTimeout(()=>URL.revokeObjectURL(url),5000)
}

function SendToDropdown({ customer, form, unitPrice, onLinked }: {
  customer: DashboardCustomer; form: FormState; unitPrice: number
  onLinked: (docNumber: string, docId: string) => void
}) {
  const [open,setOpen]=useState(false); const [mode,setMode]=useState<'new'|'existing'>('new')
  const [docs,setDocs]=useState<any[]>([]); const [loading,setLoading]=useState(false)
  const [sending,setSending]=useState(false); const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false)}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])
  const loadDocs = async (m: 'new'|'existing') => {
    if(m==='existing'){setLoading(true);try{const d=await fetch('/api/admin/orders/bootstrap').then(r=>r.json());setDocs([...(d.quotes||[]).filter((q:any)=>q.status==='open'),(d.salesOrders||[]).filter((s:any)=>s.status!=='closed'),(d.invoices||[]).filter((i:any)=>i.status==='unpaid')].flat())}catch{}finally{setLoading(false)}}
  }
  const send = async (docType: string, targetDocId?: string) => {
    setSending(true);setOpen(false)
    try {
      const lineItem = { id:`li_${Date.now()}`, sku:`${form.sku} – ${form.description}`, description:form.description, qty:customer.qty, unitPrice, total:unitPrice*customer.qty }
      const res = await fetch('/api/admin/orders/from-preorder', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ docType, targetDocId, customerId:customer.id, customerName:customer.name, lineItem, preOrderSku:form.sku })
      })
      if(res.ok){ const d=await res.json(); onLinked(d.docNumber||'',d.id||'') }
    } finally { setSending(false) }
  }
  return (
    <div ref={ref} className="relative ml-auto">
      {customer.linkedDocNumber ? (
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-0.5 cursor-pointer hover:bg-indigo-100" onClick={()=>{if(customer.linkedDocId)window.open(`/admin/orders?doc=${customer.linkedDocId}`,'_blank')}}>{customer.linkedDocNumber}</span>
      ) : (
        <button disabled={sending} onClick={e=>{e.stopPropagation();setMode('new');setOpen(o=>!o)}} className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 whitespace-nowrap">{sending?'Sending…':'→ Send to'}</button>
      )}
      {open&&(
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-52 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button onClick={()=>{setMode('new')}} className={`flex-1 text-[11px] font-semibold px-2 py-1.5 transition-colors ${mode==='new'?'bg-indigo-600 text-white':'text-gray-500 hover:bg-gray-50'}`}>Create New</button>
            <button onClick={()=>{setMode('existing');loadDocs('existing')}} className={`flex-1 text-[11px] font-semibold px-2 py-1.5 transition-colors ${mode==='existing'?'bg-indigo-600 text-white':'text-gray-500 hover:bg-gray-50'}`}>Add to Existing</button>
          </div>
          {mode==='new'&&(
            <div className="p-1.5 space-y-0.5">
              {(['quote','so','invoice'] as const).map(t=>(
                <button key={t} onClick={()=>send(t)} className="w-full text-left text-[11px] px-3 py-1.5 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium transition-colors">
                  {t==='quote'?'📄 New Quote':t==='so'?'📋 New Sales Order':'🧾 New Invoice'}
                </button>
              ))}
            </div>
          )}
          {mode==='existing'&&(
            <div className="max-h-48 overflow-y-auto p-1.5">
              {loading?<p className="text-[11px] text-gray-400 text-center py-3">Loading…</p>
                :docs.length===0?<p className="text-[11px] text-gray-400 text-center py-3">No open documents</p>
                :docs.map(d=>(
                  <button key={d.id} onClick={()=>send('existing',d.id)} className="w-full text-left text-[11px] px-3 py-1.5 rounded-lg hover:bg-indigo-50 text-gray-700 transition-colors">
                    <span className="font-semibold">{d.docNumber||d.quoteNumber||d.soNumber}</span>
                    {d.clientName&&<span className="text-gray-400 ml-1">· {d.clientName}</span>}
                  </button>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ItemCard ────────────────────────────────────────────────────────────────
function ItemCard({
  item, contacts, suppliers, options, exchangeRates, costingSettings,
  onSave, onDelete, onDuplicate, onAddOption, onSendToWorksheet, isNew, onCancelNew, isSelected, onToggleSelect,
}: {
  item: DashboardItem & { _draft?: boolean }
  contacts: Contact[]; suppliers: SupplierContact[]; options: DashboardOptions
  exchangeRates: Record<string, number>; costingSettings: CostingSettings
  onSave: (id: string, data: Partial<FormState>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<void>
  onAddOption: (type: 'brand' | 'unit' | 'eta', value: string) => Promise<void>
  onSendToWorksheet: (id: string, form: FormState) => Promise<void>
  isNew?: boolean; onCancelNew?: () => void; isSelected?: boolean; onToggleSelect?: (id: string) => void
}) {
  const [form, setForm] = useState<FormState>({
    sku:item.sku, description:item.description, retailPrice:item.retailPrice??'', estimatedRetailPrice:item.estimatedRetailPrice,
    wholesalePrice:item.wholesalePrice??'', wholesaleCurrency:item.wholesaleCurrency??'ZAR', supplierSRP:item.supplierSRP??'', supplierDiscount:item.supplierDiscount??'',
    wholesalePrice2:item.wholesalePrice2??'', wholesaleCurrency2:item.wholesaleCurrency2??'CNY', supplierSRP2:item.supplierSRP2??'', supplierDiscount2:item.supplierDiscount2??'',
    estimatedRetailPrice2:item.estimatedRetailPrice2??'', moq2Qty:item.moq2Qty??0, moq2Enabled:item.moq2Enabled??false, moq2ResellerOnly:item.moq2ResellerOnly??false,
    eta:item.eta, cutoffDate:item.cutoffDate??'', orderPlaced:item.orderPlaced??false, published:item.published??false,
    supplier:item.supplier, brand:item.brand, unit:item.unit??'', imageUrl:item.imageUrl,
    customers:item.customers, extraQty:item.extraQty??0, minOrderQty:item.minOrderQty??0,
    resellerMoq:item.resellerMoq??1, resellerOnly:item.resellerOnly??false,
    seoTitle:item.seoTitle??'', seoDescription:item.seoDescription??'', seoImageUrl:item.seoImageUrl,
    shipmentStatus:item.shipmentStatus, linkedWsId:item.linkedWsId, showRetail:item.showRetail!==false, notes:item.notes??'',
  } as FormState)
  const formRef = useRef(form); formRef.current = form
  const customersDirty = useRef(false)
  const [saving,setSaving]=useState(false); const [deleting,setDeleting]=useState(false); const [confirmDelete,setConfirmDelete]=useState(false)
  const [sendingWs,setSendingWs]=useState(false); const [posterLoading,setPosterLoading]=useState(false)
  const [supplierOpen,setSupplierOpen]=useState(false); const [isDragging,setIsDragging]=useState(false)
  const [imageSize,setImageSize]=useState<'sm'|'md'|'lg'>('sm')
  const [autoSaveStatus,setAutoSaveStatus]=useState<'idle'|'pending'|'saving'|'saved'>('idle')
  const [autoCalc,setAutoCalc]=useState(true); const [autoCalc2,setAutoCalc2]=useState(true)
  const [copied,setCopied]=useState(false); const [showSeo,setShowSeo]=useState(false)
  const [showWsPicker,setShowWsPicker]=useState(false); const [wsList,setWsList]=useState<any[]>([]); const [loadingWsList,setLoadingWsList]=useState(false)
  const supplierRef=useRef<HTMLDivElement>(null); const imageInputRef=useRef<HTMLInputElement>(null)
  const imageZoneRef=useRef<HTMLDivElement>(null); const seoImageInputRef=useRef<HTMLInputElement>(null)
  const autoSaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null); const isFirstRender=useRef(true)

  useEffect(()=>{
    const srp=parseFloat(form.supplierSRP||''),disc=parseFloat(form.supplierDiscount||'')
    if(!isNaN(srp)&&srp>0&&!isNaN(disc)&&disc>=0&&disc<100) setForm(f=>({...f,wholesalePrice:(srp*(1-disc/100)).toFixed(2)}))
  },[form.supplierSRP,form.supplierDiscount])
  useEffect(()=>{
    if(!autoCalc) return
    const calc=calcRetailPrice(form.wholesalePrice||'',form.wholesaleCurrency||'ZAR',exchangeRates,costingSettings,form.supplier)
    if(calc) setForm(f=>({...f,estimatedRetailPrice:calc}))
  },[form.wholesalePrice,form.wholesaleCurrency,form.supplier,autoCalc])
  useEffect(()=>{
    if(!form.supplier) return
    const sup=suppliers.find(s=>s.name===form.supplier)
    if(sup?.preferredCurrency&&sup.preferredCurrency!==form.wholesaleCurrency) setForm(f=>({...f,wholesaleCurrency:sup.preferredCurrency!}))
  },[form.supplier])
  useEffect(()=>{
    if(isFirstRender.current){isFirstRender.current=false;return}
    if(isNew) return
    setAutoSaveStatus('pending')
    if(autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current=setTimeout(async()=>{
      setAutoSaveStatus('saving')
      try{
        const{customers,...fieldsOnly}=formRef.current
        const data=customersDirty.current?formRef.current:fieldsOnly
        await onSave(item.id,data)
        if(customersDirty.current) customersDirty.current=false
        setAutoSaveStatus('saved'); setTimeout(()=>setAutoSaveStatus('idle'),3000)
      }catch{setAutoSaveStatus('idle')}
    },1500)
    return()=>{if(autoSaveTimer.current) clearTimeout(autoSaveTimer.current)}
  },[form])
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(supplierRef.current&&!supplierRef.current.contains(e.target as Node)) setSupplierOpen(false)}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const set=(field:keyof FormState,value:any)=>setForm(f=>({...f,[field]:value}))
  const handleImageFile=(file:File)=>{const r=new FileReader();r.onload=e=>set('imageUrl',e.target?.result as string);r.readAsDataURL(file)}
  const handleDragOver=(e:React.DragEvent)=>{e.preventDefault();e.stopPropagation();setIsDragging(true)}
  const handleDragLeave=(e:React.DragEvent)=>{e.preventDefault();e.stopPropagation();setIsDragging(false)}
  const handleDrop=(e:React.DragEvent)=>{
    e.preventDefault();e.stopPropagation();setIsDragging(false)
    const file=Array.from(e.dataTransfer.files).find(f=>f.type.startsWith('image/'))
    if(file){handleImageFile(file);return}
    const url=e.dataTransfer.getData('text/uri-list')||e.dataTransfer.getData('text/plain')
    if(url&&(url.startsWith('http')||url.startsWith('data:image'))) set('imageUrl',url)
  }
  const isPastCutoff=!!form.cutoffDate&&daysUntilCutoff(form.cutoffDate)<=0
  const addCustomer=(c:Contact)=>{
    customersDirty.current=true
    setForm(f=>{
      if(f.customers.find(cu=>cu.id===c.id)) return f
      const moq=f.minOrderQty??0,currentTotal=f.customers.reduce((s,cu)=>s+cu.qty,0)
      const available=moq>0?Math.max(0,moq-currentTotal):(f.extraQty??0)
      return{...f,customers:[...f.customers,{id:c.id,name:`${c.firstName} ${c.lastName}`,email:c.email,phone:c.phone,qty:isPastCutoff?Math.min(1,available):1,depositPaid:false}]}
    })
  }
  const updateCustomer=(id:string,patch:Partial<DashboardCustomer>)=>{customersDirty.current=true;setForm(f=>({...f,customers:f.customers.map(c=>c.id===id?{...c,...patch}:c)}))}
  const removeCustomer=(id:string)=>{customersDirty.current=true;setForm(f=>({...f,customers:f.customers.filter(c=>c.id!==id)}))}
  const addManualCustomer=(name:string)=>{
    customersDirty.current=true
    setForm(f=>{
      if(f.customers.find(cu=>cu.name.toLowerCase()===name.toLowerCase())) return f
      const moq=f.minOrderQty??0,currentTotal=f.customers.reduce((s,cu)=>s+cu.qty,0)
      const available=moq>0?Math.max(0,moq-currentTotal):(f.extraQty??0)
      return{...f,customers:[...f.customers,{id:`manual_${Date.now()}`,name,qty:isPastCutoff?Math.min(1,available):1,depositPaid:false}]}
    })
  }
  const refreshCustomers=async()=>{
    try{const res=await fetch(`/api/admin/preorder-dashboard/${item.id}`);if(res.ok){const fresh=await res.json();setForm(f=>({...f,customers:fresh.customers||[]}));customersDirty.current=false}}catch{}
  }
  const openWsPicker=async()=>{
    setShowWsPicker(true);setLoadingWsList(true)
    try{const data=await fetch('/api/admin/worksheets').then(r=>r.json());setWsList(Array.isArray(data)?data.filter((w:any)=>!w.archived):[])}
    catch{setWsList([])}
    setLoadingWsList(false)
  }
  const addToExistingWorksheet=async(ws:any)=>{
    setShowWsPicker(false);setSendingWs(true)
    try{
      const totalQty=formRef.current.customers.reduce((sum,c)=>sum+c.qty,0)
      const newLineItem={id:`ws_${Date.now()}_item`,sku:formRef.current.sku,skuSearch:formRef.current.sku,description:formRef.current.description,unit:formRef.current.unit||'',category:formRef.current.brand||'',inStock:0,retailPrice:parsePrice(formRef.current.retailPrice||formRef.current.estimatedRetailPrice),preOrderPrice:0,qty:totalQty||1,wholesalePrice:parsePrice(formRef.current.wholesalePrice||'0'),retailOverride:'',sentToInventory:false}
      const updated={...ws,items:[...(ws.items||[]),newLineItem],preOrderItemId:item.id}
      const res=await fetch('/api/admin/worksheets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)})
      if(res.ok){await fetch(`/api/admin/preorder-dashboard/${item.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({shipmentStatus:'shipping_soon',linkedWsId:ws.id})});set('shipmentStatus','shipping_soon');set('linkedWsId',ws.id)}
    }finally{setSendingWs(false)}
  }
  const handleSave=async()=>{setSaving(true);try{const{customers,...fieldsOnly}=formRef.current;const data=customersDirty.current?formRef.current:fieldsOnly;await onSave(item.id,data);if(customersDirty.current) customersDirty.current=false}finally{setSaving(false)}}
  const handleDelete=async()=>{setDeleting(true);try{await onDelete(item.id)}finally{setDeleting(false);setConfirmDelete(false)}}
  const handleSendToWorksheet=async()=>{setSendingWs(true);try{await onSendToWorksheet(item.id,formRef.current)}finally{setSendingWs(false)}}

  const unitPrice=parsePrice(form.estimatedRetailPrice)
  const totalQty=form.customers.reduce((sum,c)=>sum+c.qty,0)
  const minOrderQty=form.minOrderQty??0; const moqGap=minOrderQty>0?minOrderQty-totalQty:0; const moqMet=minOrderQty>0&&moqGap<=0
  const alertRaw=cutoffAlert(form.cutoffDate); const alert={...alertRaw,active:alertRaw.active&&!form.orderPlaced}
  const cutoffColors=alert.active
    ?alert.days<=0?{badge:'bg-red-700 text-white',header:'bg-red-600 border-red-500',border:'border-red-400',pulse:true}
    :alert.days===1?{badge:'bg-orange-500 text-white',header:'bg-orange-500 border-orange-400',border:'border-orange-400',pulse:false}
    :{badge:'bg-yellow-400 text-black',header:'bg-yellow-400 border-yellow-300',border:'border-yellow-300',pulse:false}
    :null
  const isOrderLocked=!!form.orderPlaced; const extraQty=form.extraQty??0
  const inStock=minOrderQty>0?Math.max(0,minOrderQty-totalQty):extraQty; const canAddNew=!isPastCutoff||inStock>0
  const IMAGE_HEIGHTS={sm:'h-36',md:'h-52',lg:'h-72'}; const hasWholesale=!!(form.wholesalePrice&&parsePrice(form.wholesalePrice)>0)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm flex flex-col ${cutoffColors?cutoffColors.border:'border-gray-200'}`}>
      <div className={`px-3 pt-2 pb-1.5 border-b rounded-t-2xl ${cutoffColors?`${cutoffColors.header} ${cutoffColors.pulse?'animate-pulse':''}`:'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {!isNew&&onToggleSelect&&<input type="checkbox" checked={!!isSelected} onChange={()=>onToggleSelect(item.id)} onClick={e=>e.stopPropagation()} className="w-3.5 h-3.5 accent-red-600 flex-shrink-0 cursor-pointer" title="Select for bulk delete"/>}
            {alertRaw.active&&!form.orderPlaced&&cutoffColors&&<span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cutoffColors.badge}`}>⚠ Cut-off {alertRaw.days===0?'TODAY':`in ${alertRaw.days}d`}</span>}
            {form.orderPlaced&&<span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">✓ Placed</span>}
            {form.shipmentStatus==='shipping_soon'&&<span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">🚢 Soon</span>}
            {form.shipmentStatus==='shipping'&&<span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">📦 Shipped</span>}
            {form.linkedWsId&&<a href={`/admin/worksheet?id=${form.linkedWsId}`} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-indigo-600 hover:underline whitespace-nowrap">🧮 WS</a>}
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={!!form.orderPlaced} onChange={e=>set('orderPlaced',e.target.checked)} className="w-3.5 h-3.5 accent-green-600"/>
              <span className={`text-[11px] font-medium whitespace-nowrap ${alert.active?(alert.days<=1?'text-white':'text-black'):form.orderPlaced?'text-green-700':'text-gray-500'}`}>Order placed</span>
            </label>
            {!isNew&&<span className={`text-[10px] font-medium whitespace-nowrap ${alert.active?(alert.days<=1?'text-white/70':'text-black/60'):'text-gray-400'}`}>
              {autoSaveStatus==='pending'&&'…'}{autoSaveStatus==='saving'&&'Saving…'}{autoSaveStatus==='saved'&&'✓ Saved'}
              {autoSaveStatus==='idle'&&item.updatedAt&&`Saved ${new Date(item.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`}
            </span>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {confirmDelete?(
              <><button onClick={()=>setConfirmDelete(false)} className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 whitespace-nowrap">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="text-[11px] px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 font-semibold whitespace-nowrap">{deleting?'Deleting…':'Confirm'}</button></>
            ):(
              <>{isNew&&onCancelNew&&<button onClick={onCancelNew} className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 whitespace-nowrap">Cancel</button>}
              <button onClick={()=>setConfirmDelete(true)} className="text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap text-red-600 hover:bg-red-50">Delete</button>
              <button onClick={handleSave} disabled={saving} className="text-[11px] px-3 py-1 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60 font-semibold whitespace-nowrap">{saving?'Saving…':isNew?'Add':'Save'}</button></>
            )}
          </div>
        </div>
        {!isNew&&(
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {showWsPicker&&(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={()=>setShowWsPicker(false)}>
                <div className="bg-white rounded-2xl shadow-2xl p-4 w-80 max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-gray-800 text-sm">Send to Worksheet</h3><button onClick={()=>setShowWsPicker(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button></div>
                  {loadingWsList?<p className="text-sm text-gray-400 text-center py-6">Loading…</p>:(
                    <div className="space-y-1.5">
                      <button onClick={()=>{setShowWsPicker(false);handleSendToWorksheet()}} className="w-full text-left px-3 py-2.5 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700 font-semibold">+ New Worksheet</button>
                      {wsList.length>0&&<p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-1 px-1">Add to existing</p>}
                      {wsList.map(ws=>(
                        <button key={ws.id} onClick={()=>addToExistingWorksheet(ws)} className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50 border border-gray-100 transition-colors">
                          <div className="font-medium text-gray-800 truncate">{ws.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{ws.date}{ws.supplier?` · ${ws.supplier}`:''} · {ws.items?.length??0} item{ws.items?.length!==1?'s':''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <button onClick={openWsPicker} disabled={sendingWs} className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-semibold whitespace-nowrap">{sendingWs?'Sending…':'📋 Worksheet'}</button>
            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={form.showRetail!==false} onChange={e=>set('showRetail',e.target.checked)} className="w-3.5 h-3.5 accent-rose-600"/><span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">Show Retail</span></label>
            <button onClick={async()=>{setPosterLoading(true);try{await generatePoster(formRef.current,item.sku)}finally{setPosterLoading(false)}}} disabled={posterLoading} className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60 font-semibold whitespace-nowrap">{posterLoading?'⏳':'🖼 Poster'}</button>
            <button onClick={()=>set('published',!form.published)} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${form.published?'bg-emerald-600 text-white hover:bg-emerald-700':'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{form.published?'🟢 Published':'⚫ Publish'}</button>
            <button onClick={()=>onDuplicate(item.id)} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap transition-colors">⧉ Duplicate</button>
            <button onClick={()=>{const url=`${window.location.origin}/pre-order/${item.id}`;navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${copied?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{copied?'✓ Copied':'🔗 Copy Link'}</button>
            {form.published&&<button onClick={()=>window.open(`/pre-order/${item.id}`,'_blank')} className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold whitespace-nowrap">🌐 Pre-Order Page</button>}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        <div className="flex-1 p-4 space-y-3 border-b md:border-b-0 md:border-r border-gray-100">
          <div className="relative group">
            <div className="absolute top-1.5 right-1.5 z-10 flex gap-0.5 bg-white/80 backdrop-blur-sm rounded-md px-1 py-0.5 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
              {(['sm','md','lg'] as const).map(s=><button key={s} onClick={e=>{e.stopPropagation();setImageSize(s)}} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-colors ${imageSize===s?'bg-indigo-600 text-white':'text-gray-500 hover:bg-gray-100'}`}>{s.toUpperCase()}</button>)}
            </div>
            <div ref={imageZoneRef} tabIndex={0} onDragOver={handleDragOver} onDragEnter={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={()=>{if(!form.imageUrl) imageInputRef.current?.click()}}
              className={`relative w-full ${IMAGE_HEIGHTS[imageSize]} border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all flex items-center justify-center focus:outline-none ${isDragging?'border-indigo-500 bg-indigo-50 scale-[1.01]':'border-gray-200 bg-gray-50 hover:border-indigo-300'}`}>
              {form.imageUrl?(
                <><img src={form.imageUrl} alt="product" className="object-contain h-full w-full"/>
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                  <button onClick={e=>{e.stopPropagation();imageInputRef.current?.click()}} className="bg-white rounded-lg px-2 py-1 text-xs font-medium text-gray-700 shadow hover:bg-gray-100">Replace</button>
                  <button onClick={e=>{e.stopPropagation();set('imageUrl',undefined)}} className="bg-white rounded-lg px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-red-50">Remove</button>
                </div></>
              ):(
                <div className="text-center text-gray-400 text-xs select-none pointer-events-none">
                  {isDragging?<><div className="text-2xl mb-1">⬇️</div><div className="font-medium text-indigo-600">Drop image here</div></>
                  :<><div className="text-2xl mb-1">📷</div><div className="font-medium">Click to browse</div><div className="mt-0.5 text-gray-300">or drag &amp; drop</div></>}
                </div>
              )}
            </div>
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0]) handleImageFile(e.target.files[0])}}/>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs text-gray-500 mb-0.5">SKU</label><input type="text" value={form.sku} onChange={e=>set('sku',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="SKU-001"/></div>
            <div><label className="block text-xs text-gray-500 mb-0.5">Retail Price (R)</label><input type="text" value={form.retailPrice} onChange={e=>set('retailPrice',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00"/></div>
          </div>

          <div className="space-y-1">
            <div className="grid gap-2" style={{gridTemplateColumns:'64px 1fr 1fr 1fr'}}>
              <span className="text-xs text-gray-500">CCY</span><span className="text-xs text-gray-500">Wholesale / Cost Price</span><span className="text-xs text-gray-500">Supplier SRP</span><span className="text-xs text-gray-500">Supplier Disc. %</span>
            </div>
            <div className="grid gap-2" style={{gridTemplateColumns:'64px 1fr 1fr 1fr'}}>
              <select value={form.wholesaleCurrency||'ZAR'} onChange={e=>set('wholesaleCurrency',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <input type="text" value={form.wholesalePrice||''} onChange={e=>set('wholesalePrice',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00"/>
              <input type="number" value={form.supplierSRP||''} onChange={e=>set('supplierSRP',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00" min="0" step="0.01"/>
              <div className="relative"><input type="number" value={form.supplierDiscount||''} onChange={e=>set('supplierDiscount',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0" min="0" max="99" step="0.1"/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs text-gray-500">Est. Retail Price (R)</label>
                <button type="button" onClick={()=>setAutoCalc(a=>!a)} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-colors ${autoCalc?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-500 border-gray-200'}`}>{autoCalc?'⚡ Auto':'✏ Manual'}</button>
              </div>
              <input type="text" value={form.estimatedRetailPrice} onChange={e=>{setAutoCalc(false);set('estimatedRetailPrice',e.target.value)}} className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${autoCalc&&hasWholesale?'bg-green-50 border-green-300 text-green-800':'border-gray-300'}`} placeholder="0.00" readOnly={autoCalc&&hasWholesale}/>
            </div>
            <div className="flex flex-col justify-end pb-1 gap-1">
              {(totalQty>0||minOrderQty>0)&&<span className="text-xs font-semibold text-indigo-600">{totalQty>0&&<span>Total Qty: {totalQty}</span>}{minOrderQty>0&&<span className={`font-semibold ml-1 ${inStock>0?'text-emerald-600':'text-red-500'}`}>({inStock} in stock)</span>}</span>}
              {minOrderQty>0&&<span className={`text-xs font-semibold ${moqMet?'text-green-600':'text-orange-600'}`}>{moqMet?`✓ MOQ met`:`Need ${moqGap} more`}</span>}
              <div className="flex items-center gap-1"><label className="text-xs text-gray-500 whitespace-nowrap">Supplier Order:</label><input type="number" min={0} value={form.minOrderQty||''} placeholder="0" onChange={e=>{const v=parseInt(e.target.value);set('minOrderQty',(!isNaN(v)&&v>0)?v:null)}} className="w-16 text-xs border border-gray-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
            </div>
          </div>

          <div className="border border-dashed border-indigo-200 rounded-xl p-3 space-y-2 bg-indigo-50/30">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5"><input type="checkbox" id={`moq2-${item.id}`} checked={!!(form as any).moq2Enabled} onChange={e=>set('moq2Enabled',e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600"/><label htmlFor={`moq2-${item.id}`} className="text-xs font-bold text-indigo-700 cursor-pointer">Pricing Tier 2</label></div>
            </div>
            <div className="space-y-1">
              <div className="grid gap-2" style={{gridTemplateColumns:'64px 1fr 1fr 1fr'}}>
                <span className="text-[11px] text-indigo-500">CCY</span><span className="text-[11px] text-indigo-500">Wholesale 2</span><span className="text-[11px] text-indigo-500">SRP 2</span><span className="text-[11px] text-indigo-500">Disc. %</span>
              </div>
              <div className="grid gap-2" style={{gridTemplateColumns:'64px 1fr 1fr 1fr'}}>
                <select value={(form as any).wholesaleCurrency2||'CNY'} onChange={e=>set('wholesaleCurrency2',e.target.value)} className="w-full text-sm border border-indigo-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
                <input type="text" value={(form as any).wholesalePrice2||''} onChange={e=>set('wholesalePrice2',e.target.value)} className="w-full text-sm border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00"/>
                <input type="number" value={(form as any).supplierSRP2||''} onChange={e=>set('supplierSRP2',e.target.value)} className="w-full text-sm border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00" min="0" step="0.01"/>
                <div className="relative"><input type="number" value={(form as any).supplierDiscount2||''} onChange={e=>set('supplierDiscount2',e.target.value)} className="w-full text-sm border border-indigo-200 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0" min="0" max="99" step="0.1"/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-0.5"><label className="text-xs text-indigo-600 font-medium">Est. Retail 2 (R)</label><button type="button" onClick={()=>setAutoCalc2(a=>!a)} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-colors ${autoCalc2?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-500 border-gray-200'}`}>{autoCalc2?'⚡ Auto':'✏ Manual'}</button></div>
                <input type="text" value={(form as any).estimatedRetailPrice2||''} onChange={e=>{setAutoCalc2(false);set('estimatedRetailPrice2',e.target.value)}} className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${autoCalc2&&(form as any).wholesalePrice2?'bg-green-50 border-green-300 text-green-800':'border-indigo-200'}`} placeholder="0.00" readOnly={autoCalc2&&!!(form as any).wholesalePrice2}/>
              </div>
              <div className="flex flex-col justify-start gap-1 pt-4">
                <div className="flex items-center gap-1"><label className="text-xs text-indigo-600 whitespace-nowrap font-medium">MOQ 2:</label><input type="number" min={0} value={(form as any).moq2Qty??0} onChange={e=>set('moq2Qty',Math.max(0,parseInt(e.target.value)||0))} className="w-14 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
              </div>
            </div>
          </div>

          <div><label className="block text-xs text-gray-500 mb-0.5">Item Description</label><input type="text" value={form.description} onChange={e=>set('description',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="Description"/></div>
          <div><label className="block text-xs text-gray-500 mb-0.5">Notes</label><textarea value={form.notes??''} onChange={e=>set('notes',e.target.value)} rows={2} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" placeholder="Extra info for the pre-order poster…"/></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs text-gray-500 mb-0.5">Item / Brand</label><TagInputDropdown value={form.brand} onChange={v=>set('brand',v)} options={options.brands} onAddOption={v=>onAddOption('brand',v)} placeholder="Brand name"/></div>
            <div><label className="block text-xs text-gray-500 mb-0.5">Item / Unit</label><TagInputDropdown value={form.unit} onChange={v=>set('unit',v)} options={options.units} onAddOption={v=>onAddOption('unit',v)} placeholder="e.g. Each, Box"/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs text-gray-500 mb-0.5">ETA</label><TagInputDropdown value={form.eta} onChange={v=>set('eta',v)} options={options.etas} onAddOption={v=>onAddOption('eta',v)} placeholder="e.g. June 2026"/></div>
            <div ref={supplierRef} className="relative">
              <label className="block text-xs text-gray-500 mb-0.5">Supplier</label>
              <input type="text" value={form.supplier} onChange={e=>{set('supplier',e.target.value);setSupplierOpen(true)}} onFocus={()=>setSupplierOpen(true)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="Supplier name"/>
              {supplierOpen&&suppliers.length>0&&(
                <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto mt-0.5">
                  {suppliers.filter(s=>!form.supplier||s.name.toLowerCase().includes(form.supplier.toLowerCase())).map(s=>(
                    <li key={s.id} onMouseDown={()=>{set('supplier',s.name);setSupplierOpen(false)}} className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm flex items-center justify-between">
                      <span>{s.name}</span>{s.preferredCurrency&&<span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.preferredCurrency}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Order Cut-off Date</label>
            <input type="date" value={form.cutoffDate||''} onChange={e=>set('cutoffDate',e.target.value)} className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${alert.active?alert.days<=0?'border-red-400 bg-red-50 text-red-700 font-semibold':alert.days===1?'border-orange-400 bg-orange-50 text-orange-700 font-semibold':'border-yellow-400 bg-yellow-50 text-yellow-700 font-semibold':'border-gray-300'}`}/>
            {alert.active&&<p className={`text-xs font-semibold mt-0.5 ${alert.days<=0?'text-red-600':alert.days===1?'text-orange-600':'text-yellow-600'}`}>⚠ Cut-off {alert.days===0?'is TODAY':`in ${alert.days} day${alert.days!==1?'s':''}`}</p>}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button type="button" onClick={()=>setShowSeo(s=>!s)} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-colors">
              <span>🔍 SEO / Social Sharing</span><span className={`transition-transform text-gray-400 ${showSeo?'rotate-180':''}`}>▼</span>
            </button>
            {showSeo&&(
              <div className="p-3 space-y-2 bg-white">
                {!isNew&&<div><label className="block text-xs text-gray-500 mb-0.5">Pre-Order Page Link</label><div className="flex gap-1"><input type="text" readOnly value={`${typeof window!=='undefined'?window.location.origin:''}/pre-order/${item.id}`} className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-600 select-all"/><button type="button" onClick={()=>{const url=`${window.location.origin}/pre-order/${item.id}`;navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}} className={`shrink-0 text-xs px-2 py-1 rounded font-semibold transition-colors ${copied?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{copied?'✓ Copied':'Copy'}</button></div></div>}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">OG Image</label>
                  <input ref={seoImageInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0]){const r=new FileReader();r.onload=ev=>set('seoImageUrl',ev.target?.result as string);r.readAsDataURL(e.target.files![0])}}}/>
                  {form.seoImageUrl?(
                    <div className="relative group h-20 border border-gray-200 rounded-lg overflow-hidden bg-gray-50"><img src={form.seoImageUrl} alt="OG" className="h-full w-full object-contain"/><div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2"><button type="button" onClick={()=>seoImageInputRef.current?.click()} className="bg-white rounded px-2 py-0.5 text-xs font-medium shadow hover:bg-gray-100">Replace</button><button type="button" onClick={()=>set('seoImageUrl',undefined)} className="bg-white rounded px-2 py-0.5 text-xs font-medium text-red-600 shadow hover:bg-red-50">Remove</button></div></div>
                  ):(
                    <div className="h-20 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-2 cursor-pointer hover:border-indigo-300 text-xs text-gray-400 select-none" onClick={()=>seoImageInputRef.current?.click()}>
                      <span className="text-lg">🖼</span><span>Click to add OG image</span>
                    </div>
                  )}
                </div>
                <div><label className="block text-xs text-gray-500 mb-0.5">SEO Title</label><input type="text" value={form.seoTitle||''} onChange={e=>set('seoTitle',e.target.value)} placeholder={form.description||'Auto-fills from description'} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
                <div><label className="block text-xs text-gray-500 mb-0.5">SEO Description</label><textarea value={form.seoDescription||''} onChange={e=>set('seoDescription',e.target.value)} rows={2} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"/></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customers ({form.customers.length})</span>
              {!isNew&&<button onClick={refreshCustomers} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 font-medium">⟳ Refresh</button>}
              {!isNew&&form.customers.some((c:any)=>c.isNew)&&(
                <button onClick={()=>{const cleared=form.customers.map((c:any)=>({...c,isNew:false}));setForm(f=>({...f,customers:cleared}));customersDirty.current=true}} className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 font-bold animate-pulse">✓ Mark Seen</button>
              )}
            </div>
            {unitPrice>0&&<span className="text-xs text-gray-400">50% deposit = R{(unitPrice*0.5).toFixed(2)}</span>}
          </div>
          <div className="space-y-2 mb-3">
            {form.customers.length===0&&<p className="text-xs text-gray-400 italic">No customers added yet.</p>}
            {form.customers.map(c=>{
              const deposit=unitPrice>0?unitPrice*0.5*c.qty:0
              return (
                <div key={c.id} className={`rounded-lg px-2 py-2 space-y-1.5 ${(c as any).isNew?'bg-green-50 border border-green-300':'bg-indigo-50'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                        <span className="shrink-0 text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1.5 py-0.5 leading-none">×{c.qty}</span>
                        {(c as any).isNew&&<span className="text-[10px] font-bold bg-green-600 text-white rounded-full px-1.5 py-0.5 leading-none animate-pulse">NEW</span>}
                      </div>
                      {c.email&&<span className="text-xs text-gray-500 truncate block">{c.email}</span>}
                    </div>
                    <button onClick={()=>removeCustomer(c.id)} className="text-xs leading-none shrink-0 mt-0.5 text-gray-400 hover:text-red-500">✕</button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500">Qty</label>
                      <input type="number" min={1} value={c.qty} onChange={e=>updateCustomer(c.id,{qty:Math.max(1,parseInt(e.target.value)||1)})} className="w-12 text-xs border rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white border-gray-300"/>
                    </div>
                    {deposit>0&&<span className="text-xs text-indigo-700 font-medium">Deposit: R{deposit.toFixed(2)}</span>}
                    <label className="flex items-center gap-1 cursor-pointer ml-auto">
                      <input type="checkbox" checked={!!c.depositPaid} onChange={e=>updateCustomer(c.id,{depositPaid:e.target.checked,depositPaidDate:e.target.checked?(c.depositPaidDate||new Date().toISOString().slice(0,10)):undefined})} className="w-3.5 h-3.5 accent-indigo-600"/>
                      <span className="text-xs text-gray-600">Paid</span>
                    </label>
                    {c.depositPaid&&<input type="date" value={c.depositPaidDate||''} onChange={e=>updateCustomer(c.id,{depositPaidDate:e.target.value})} className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"/>}
                    <SendToDropdown customer={c} form={form} unitPrice={unitPrice} onLinked={(docNumber,docId)=>updateCustomer(c.id,{linkedDocNumber:docNumber,linkedDocId:docId})}/>
                  </div>
                </div>
              )
            })}
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-gray-500">Add+ Customer</label>
              {isPastCutoff&&<span className={`text-xs font-semibold ${canAddNew?'text-emerald-700':'text-red-600'}`}>{canAddNew?`In stock: ${inStock} remaining`:'🔒 Cut-off passed'}</span>}
            </div>
            {canAddNew?(
              <ContactSearch contacts={contacts} onSelect={addCustomer} onAddManual={addManualCustomer}/>
            ):(
              <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">Cut-off date has passed. Add extra stock units to accept new orders.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SupplierPreOrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supplierName = decodeURIComponent(params.supplier as string)

  const [items, setItems] = useState<DashboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [options, setOptions] = useState<DashboardOptions>({ brands: [], units: [], etas: [] })
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [costingSettings, setCostingSettings] = useState<CostingSettings>({ shippingMarkup: 20, markup: 30, includeVAT: true })
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [newItem, setNewItem] = useState<(DashboardItem & { _draft?: boolean }) | null>(null)
  const [showViewAll, setShowViewAll] = useState(false)
  const [viewAllSearch, setViewAllSearch] = useState('')

  const loadItems = async () => {
    const res = await fetch(`/api/admin/preorder-dashboard?supplier=${encodeURIComponent(supplierName)}`)
    if (res.ok) {
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    }
  }

  useEffect(() => {
    Promise.all([
      loadItems(),
      fetch('/api/admin/contacts').then(r => r.json()).then(d => setContacts(Array.isArray(d) ? d : [])).catch(() => {}),
      fetch('/api/admin/contacts?type=supplier').then(r => r.json()).then(d => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {}),
      fetch('/api/admin/preorder-dashboard/options').then(r => r.json()).then(d => { if (d && !d.error) setOptions(d) }).catch(() => {}),
      fetch('/api/admin/exchange-rates').then(r => r.json()).then(d => { if (d?.rates) setExchangeRates(d.rates) }).catch(() => {}),
      fetch('/api/admin/costing-settings').then(r => r.json()).then(d => { if (d && !d.error) setCostingSettings(d) }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [supplierName])

  useEffect(() => {
    if (!loading && searchParams.get('new') === '1') startNew()
  }, [loading])

  const sorted = [...items].sort((a, b) => {
    let v = 0
    if (sortBy === 'az') v = a.description.localeCompare(b.description)
    else if (sortBy === 'sku') v = a.sku.localeCompare(b.sku)
    else if (sortBy === 'brand') v = a.brand.localeCompare(b.brand)
    else if (sortBy === 'price') v = parsePrice(a.estimatedRetailPrice) - parsePrice(b.estimatedRetailPrice)
    else if (sortBy === 'date') v = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    else if (sortBy === 'cutoff') {
      const da = a.cutoffDate ? new Date(a.cutoffDate).getTime() : Infinity
      const db2 = b.cutoffDate ? new Date(b.cutoffDate).getTime() : Infinity
      v = da - db2
    }
    return sortAsc ? v : -v
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const newOrders = items.reduce((s, i) => s + i.customers.filter(c => (c as any).isNew).length, 0)

  const startNew = () => {
    const draft: DashboardItem & { _draft: boolean } = {
      id: `_new_${Date.now()}`, sku: '', description: '', retailPrice: '', estimatedRetailPrice: '',
      eta: '', supplier: supplierName === '— No Supplier' ? '' : supplierName, brand: '', unit: '',
      customers: [], createdAt: new Date().toISOString(), _draft: true,
    }
    setNewItem(draft)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (id: string, data: Partial<FormState>) => {
    if (id.startsWith('_new_')) {
      const res = await fetch('/api/admin/preorder-dashboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (res.ok) { await loadItems(); setNewItem(null) }
      return
    }
    const res = await fetch(`/api/admin/preorder-dashboard/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
    }
  }

  const handleDelete = async (id: string) => {
    if (id.startsWith('_new_')) { setNewItem(null); return }
    const res = await fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'DELETE' })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/admin/preorder-dashboard/${id}/duplicate`, { method: 'POST' })
    if (res.ok) { const dup = await res.json(); setItems(prev => [dup, ...prev]) }
  }

  const handleAddOption = async (type: 'brand' | 'unit' | 'eta', value: string) => {
    await fetch('/api/admin/preorder-dashboard/options', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, value }),
    })
    setOptions(prev => ({ ...prev, [`${type}s`]: [...prev[`${type}s` as keyof DashboardOptions], value] }))
  }

  const handleSendToWorksheet = async (id: string, form: FormState) => {
    const totalQty = form.customers.reduce((sum, c) => sum + c.qty, 0)
    const res = await fetch('/api/admin/worksheets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `ws_${Date.now()}`, name: `${form.supplier} — ${new Date().toLocaleDateString('en-ZA')}`,
        date: new Date().toISOString().slice(0, 10), supplier: form.supplier, status: 'draft', archived: false,
        items: [{ id: `ws_${Date.now()}_item`, sku: form.sku, skuSearch: form.sku, description: form.description, unit: form.unit || '', category: form.brand || '', inStock: 0, retailPrice: parsePrice(form.retailPrice || form.estimatedRetailPrice), preOrderPrice: 0, qty: totalQty || 1, wholesalePrice: parsePrice(form.wholesalePrice || '0'), retailOverride: '', sentToInventory: false }],
        preOrderItemId: id,
      }),
    })
    if (res.ok) {
      const ws = await res.json()
      await fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipmentStatus: 'shipping_soon', linkedWsId: ws.id }) })
      setItems(prev => prev.map(i => i.id === id ? { ...i, shipmentStatus: 'shipping_soon', linkedWsId: ws.id } : i))
      window.open(`/admin/worksheet?id=${ws.id}`, '_blank')
    }
  }

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map(id => fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'DELETE' })))
      setItems(prev => prev.filter(i => !selected.has(i.id)))
      setSelected(new Set()); setConfirmBulkDelete(false)
    } finally { setBulkDeleting(false) }
  }

  const SORT_OPTIONS: { value: SortBy; label: string }[] = [
    { value: 'date', label: 'Date Added' }, { value: 'az', label: 'A–Z' }, { value: 'sku', label: 'SKU' },
    { value: 'brand', label: 'Brand' }, { value: 'price', label: 'Price' }, { value: 'cutoff', label: 'Cut-off Date' },
  ]

  const fxPairs = Object.entries(exchangeRates).filter(([cur]) => cur !== 'ZAR' && items.some(i => i.wholesaleCurrency === cur))
  const viewAllFiltered = showViewAll
    ? sorted.filter(i => !viewAllSearch || i.description.toLowerCase().includes(viewAllSearch.toLowerCase()) || i.sku.toLowerCase().includes(viewAllSearch.toLowerCase()))
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <a href="/admin/preorder-dashboard" className="hover:text-indigo-600 font-medium transition-colors">← Pre-Order Dashboard</a>
        <span>/</span>
        <span className="text-gray-900 font-semibold">{supplierName}</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{supplierName}</h1>
          <p className="text-sm text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}{newOrders > 0 && <span className="ml-2 text-green-600 font-semibold animate-pulse">● {newOrders} new order{newOrders !== 1 ? 's' : ''}</span>}</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
          <span className="text-base leading-none">+</span> New Item
        </button>
      </div>

      {fxPairs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <span className="font-semibold text-blue-600">Live Rates:</span>
          {fxPairs.map(([cur, rate]) => <span key={cur} className="font-medium">1 {cur} = R{rate.toFixed(4)}</span>)}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-semibold text-red-700">{selected.size} item{selected.size !== 1 ? 's' : ''} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">Clear</button>
          {confirmBulkDelete ? (
            <><span className="text-sm font-bold text-red-700 ml-2">Delete {selected.size} items?</span>
            <button onClick={() => setConfirmBulkDelete(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100">Cancel</button>
            <button onClick={handleBulkDelete} disabled={bulkDeleting} className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60">{bulkDeleting ? 'Deleting…' : 'Confirm Delete'}</button></>
          ) : (
            <button onClick={() => setConfirmBulkDelete(true)} className="ml-auto text-sm font-bold bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700">Delete Selected</button>
          )}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort:</label>
          <select value={sortBy} onChange={e => { setSortBy(e.target.value as SortBy); setPage(1) }} className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-medium text-gray-700">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setSortAsc(a => !a)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium transition-colors">
            {sortAsc ? '↑ Asc' : '↓ Desc'}
          </button>
          <div className="h-4 w-px bg-gray-200"/>
          <button onClick={() => { setViewAllSearch(''); setShowViewAll(true) }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium transition-colors">
            👁 View All ({items.length})
          </button>
          <span className="ml-auto text-xs text-gray-400">Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}</span>
        </div>
      )}

      {loading && <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>}

      {newItem && (
        <ItemCard key={newItem.id} item={newItem} contacts={contacts} suppliers={suppliers} options={options}
          exchangeRates={exchangeRates} costingSettings={costingSettings}
          onSave={handleSave} onDelete={handleDelete} onDuplicate={handleDuplicate}
          onAddOption={handleAddOption} onSendToWorksheet={handleSendToWorksheet}
          isNew onCancelNew={() => setNewItem(null)}
          isSelected={false} onToggleSelect={toggleSelect}/>
      )}

      {!loading && (
        <div className="space-y-4">
          {pagedItems.length === 0 && !newItem ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">📦</div>
              <p className="font-medium">No items for {supplierName}</p>
              <p className="text-sm mt-1">Click &quot;+ New Item&quot; to add the first one.</p>
            </div>
          ) : pagedItems.map(item => (
            <ItemCard key={item.id} item={item} contacts={contacts} suppliers={suppliers} options={options}
              exchangeRates={exchangeRates} costingSettings={costingSettings}
              onSave={handleSave} onDelete={handleDelete} onDuplicate={handleDuplicate}
              onAddOption={handleAddOption} onSendToWorksheet={handleSendToWorksheet}
              isSelected={selected.has(item.id)} onToggleSelect={toggleSelect}/>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${p === safePage ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>
            ))}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
        </div>
      )}

      {showViewAll && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowViewAll(false)}>
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{supplierName} — All Items ({sorted.length})</h3>
              <button onClick={() => setShowViewAll(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="px-4 pt-3 pb-2">
              <input type="text" value={viewAllSearch} onChange={e => setViewAllSearch(e.target.value)} placeholder="Search SKU or description…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus/>
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-gray-100">
                  <tr className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    <th className="py-2 pr-3">SKU</th><th className="py-2 pr-3">Description</th><th className="py-2 pr-3">Retail</th><th className="py-2 pr-3">Qty</th><th className="py-2">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewAllFiltered.map(i => {
                    const qty = i.customers.reduce((s, c) => s + c.qty, 0)
                    return (
                      <tr key={i.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setShowViewAll(false); const idx = sorted.findIndex(s => s.id === i.id); if (idx >= 0) setPage(Math.ceil((idx + 1) / PAGE_SIZE)) }}>
                        <td className="py-2 pr-3 font-mono text-xs text-gray-500">{i.sku || '—'}</td>
                        <td className="py-2 pr-3 font-medium text-gray-800 max-w-xs truncate">{i.description}</td>
                        <td className="py-2 pr-3 text-gray-600 tabular-nums">R{parsePrice(i.estimatedRetailPrice || i.retailPrice).toFixed(2)}</td>
                        <td className="py-2 pr-3 font-semibold text-indigo-600">{qty > 0 ? qty : '—'}</td>
                        <td className="py-2 text-gray-400 text-xs">{i.eta || '—'}</td>
                      </tr>
                    )
                  })}
                  {viewAllFiltered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No items match &ldquo;{viewAllSearch}&rdquo;</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


