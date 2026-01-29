'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'

type Tab = 'excl' | 'incl'

type Currency = {
  code: string
  symbol: string
  name: string
  toZAR: number
}

const CURRENCIES: Currency[] = [
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', toZAR: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', toZAR: 18.52 },
  { code: 'EUR', symbol: '€', name: 'Euro', toZAR: 19.48 },
  { code: 'GBP', symbol: '£', name: 'British Pound', toZAR: 22.83 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', toZAR: 11.62 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', toZAR: 12.88 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', toZAR: 0.1205 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', toZAR: 2.54 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', toZAR: 13.45 },
]

const BRAND_DISCOUNTS = {
  NSR: 37.5,
  Revo: 35,
  Pioneer: 40,
  Sideways: 37,
}

export type CostingState = {
  discountRetailPrice: string
  discountCostPrice: string
  discountCurrencyCode: string
  discountCustomRate: string
  useDiscountCustomRate: boolean
  activeBrand: string | null
  cost: string
  shippingCustomsMarkup: string
  markup: string
  activeTab: Tab
  selectedCurrencyCode: string
  includeVAT: boolean
  customRate: string
  useCustomRate: boolean
}

export const INITIAL_COSTING_STATE: CostingState = {
  discountRetailPrice: '',
  discountCostPrice: '',
  discountCurrencyCode: 'ZAR',
  discountCustomRate: '',
  useDiscountCustomRate: false,
  activeBrand: null,
  cost: '',
  shippingCustomsMarkup: '45',
  markup: '30',
  activeTab: 'excl',
  selectedCurrencyCode: 'ZAR',
  includeVAT: true,
  customRate: '',
  useCustomRate: false,
}

interface CostingModalProps {
  costingState: CostingState
  setCostingState: (state: CostingState) => void
  onMinimize: () => void
  onClose: () => void
}

export default function CostingModal({ costingState, setCostingState, onMinimize, onClose }: CostingModalProps) {
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false)

  const s = costingState
  const update = (partial: Partial<CostingState>) => setCostingState({ ...s, ...partial })

  const selectedCurrency = CURRENCIES.find(c => c.code === s.selectedCurrencyCode) || CURRENCIES[0]
  const discountCurrency = CURRENCIES.find(c => c.code === s.discountCurrencyCode) || CURRENCIES[0]

  const fetchExchangeRates = async () => {
    setIsLoadingRates(true)
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/ZAR')
      const data = await response.json()
      if (data.rates) {
        const zarRates: Record<string, number> = {}
        Object.keys(data.rates).forEach(code => {
          zarRates[code] = 1 / data.rates[code]
        })
        setExchangeRates(zarRates)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
    } finally {
      setIsLoadingRates(false)
    }
  }

  useEffect(() => {
    fetchExchangeRates()
  }, [])

  // Minimize on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMinimize()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onMinimize])

  const handleBrandClick = (brand: keyof typeof BRAND_DISCOUNTS) => {
    const discountPercent = BRAND_DISCOUNTS[brand]
    const retail = parseFloat(s.discountRetailPrice)
    if (retail > 0) {
      const costVal = retail * (1 - discountPercent / 100)
      update({ activeBrand: brand, discountCostPrice: costVal.toFixed(2) })
    } else {
      update({ activeBrand: brand })
    }
  }

  const VAT_PERCENTAGE = 15

  const getCurrentRate = () => {
    if (s.useCustomRate && s.customRate) return parseFloat(s.customRate) || selectedCurrency.toZAR
    return exchangeRates[selectedCurrency.code] || selectedCurrency.toZAR
  }

  const getDiscountRate = () => {
    if (s.useDiscountCustomRate && s.discountCustomRate) return parseFloat(s.discountCustomRate) || discountCurrency.toZAR
    return exchangeRates[discountCurrency.code] || discountCurrency.toZAR
  }

  const retailPrice = parseFloat(s.discountRetailPrice) || 0
  const costPrice = parseFloat(s.discountCostPrice) || 0
  const discountPercentage = retailPrice > 0 && costPrice > 0
    ? ((retailPrice - costPrice) / retailPrice * 100).toFixed(2)
    : '0.00'
  const discountRate = getDiscountRate()
  const retailPriceZAR = retailPrice * discountRate
  const costPriceZAR = costPrice * discountRate

  const costValue = parseFloat(s.cost) || 0
  const shippingCustomsPercentage = parseFloat(s.shippingCustomsMarkup) || 0
  const shippingCustomsAmount = costValue * (shippingCustomsPercentage / 100)
  const costWithShipping = costValue + shippingCustomsAmount
  const markupPercentage = parseFloat(s.markup) || 0
  const markupAmount = costWithShipping * (markupPercentage / 100)
  const priceExclVAT = costWithShipping + markupAmount
  const vatAmount = s.includeVAT ? priceExclVAT * (VAT_PERCENTAGE / 100) : 0
  const priceInclVAT = priceExclVAT + vatAmount

  const currentRate = getCurrentRate()
  const priceExclVAT_ZAR = priceExclVAT * currentRate
  const priceInclVAT_ZAR = priceInclVAT * currentRate
  const showConversion = selectedCurrency.code !== 'ZAR' && costValue > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onMinimize}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto font-play"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold font-play">Costing Calculator</h2>
            <p className="text-xs text-gray-600 font-play">Calculate your selling price with custom markup and VAT</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="text-right">
                <div className="text-xs text-gray-500 font-play">Rates: {lastUpdated.toLocaleTimeString()}</div>
                <button
                  onClick={fetchExchangeRates}
                  disabled={isLoadingRates}
                  className="text-xs text-blue-600 hover:text-blue-700 underline font-play"
                >
                  {isLoadingRates ? 'Updating...' : 'Refresh'}
                </button>
              </div>
            )}
            <button
              onClick={onMinimize}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-lg font-play"
              title="Minimize - keeps your data"
            >
              —
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold font-play"
              title="Close & Reset"
            >
              Close &amp; Reset
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Calculator */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              {/* Left Column */}
              <div className="p-3 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-900 mb-3 font-play">Estimate Retail Converter</h3>

                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-900 mb-1 font-play">Currency</label>
                  <select
                    value={selectedCurrency.code}
                    onChange={(e) => update({ selectedCurrencyCode: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary bg-white font-play"
                  >
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 font-play">Cost Price ({selectedCurrency.code})</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{selectedCurrency.symbol}</span>
                    <input type="number" value={s.cost} onChange={(e) => update({ cost: e.target.value })} placeholder="0.00" step="0.01" min="0"
                      className="w-full pl-8 pr-2 py-1.5 text-sm font-semibold border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary font-play" />
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-2 p-2 bg-white border border-gray-300 rounded w-full">
                    <input type="checkbox" id="modalIncludeVAT" checked={s.includeVAT} onChange={(e) => update({ includeVAT: e.target.checked })} className="w-3 h-3" />
                    <label htmlFor="modalIncludeVAT" className="text-xs font-medium text-gray-700 cursor-pointer font-play">Include VAT ({VAT_PERCENTAGE}%)</label>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 font-play">Shipping &amp; Customs (%)</label>
                  <div className="relative">
                    <input type="number" value={s.shippingCustomsMarkup} onChange={(e) => update({ shippingCustomsMarkup: e.target.value })} placeholder="45" step="0.1" min="0" max="1000"
                      className="w-full px-2 py-1.5 pr-7 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary font-semibold font-play" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 font-play">Markup Percentage (%)</label>
                  <div className="relative">
                    <input type="number" value={s.markup} onChange={(e) => update({ markup: e.target.value })} placeholder="30" step="0.1" min="0" max="1000"
                      className="w-full px-2 py-1.5 pr-7 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary font-semibold font-play" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <input type="checkbox" id="modalUseCustomRate" checked={s.useCustomRate} onChange={(e) => update({ useCustomRate: e.target.checked })} className="w-3 h-3" />
                    <label htmlFor="modalUseCustomRate" className="text-xs font-semibold text-gray-600 cursor-pointer font-play">Custom Rate (1 {selectedCurrency.code} = ? ZAR)</label>
                  </div>
                  {s.useCustomRate && (
                    <input type="number" value={s.customRate} onChange={(e) => update({ customRate: e.target.value })} placeholder={currentRate.toFixed(4)} step="0.0001" min="0"
                      className="w-full px-2 py-1.5 text-sm border-2 border-blue-300 rounded font-semibold font-play" />
                  )}
                  <div className="text-xs text-gray-500 mt-1 font-play">Rate: 1 {selectedCurrency.code} = R {currentRate.toFixed(4)}</div>
                </div>

                {costValue > 0 && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-play">
                        <span className="text-blue-700">Shipping &amp; Customs:</span>
                        <span className="text-blue-900 font-semibold">{selectedCurrency.symbol} {shippingCustomsAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-play">
                        <span className="text-blue-700">Markup:</span>
                        <span className="text-blue-900 font-semibold">{selectedCurrency.symbol} {markupAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Results */}
              <div className="bg-white">
                {s.includeVAT && (
                  <div className="border-b border-gray-200 flex">
                    <button onClick={() => update({ activeTab: 'excl' })} className={cn('flex-1 px-4 py-2.5 text-xs font-semibold font-play', s.activeTab === 'excl' ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:bg-gray-50')}>
                      VAT Excluded
                    </button>
                    <button onClick={() => update({ activeTab: 'incl' })} className={cn('flex-1 px-4 py-2.5 text-xs font-semibold font-play', s.activeTab === 'incl' ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:bg-gray-50')}>
                      VAT Included
                    </button>
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm font-play">
                    <span className="text-gray-600">Cost Price:</span>
                    <span className="font-medium">{selectedCurrency.symbol} {costValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm font-play">
                    <span className="text-gray-600">Shipping &amp; Customs ({shippingCustomsPercentage}%):</span>
                    <span className="font-medium text-blue-600">+ {selectedCurrency.symbol} {shippingCustomsAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm font-play">
                    <span className="text-gray-600">Markup ({markupPercentage}%):</span>
                    <span className="font-medium text-green-600">+ {selectedCurrency.symbol} {markupAmount.toFixed(2)}</span>
                  </div>
                  {s.includeVAT && s.activeTab === 'incl' && (
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-100 text-sm font-play">
                        <span className="text-gray-600">Price Excl. VAT:</span>
                        <span className="font-medium">{selectedCurrency.symbol} {priceExclVAT.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 text-sm font-play">
                        <span className="text-gray-600">VAT ({VAT_PERCENTAGE}%):</span>
                        <span className="font-medium text-orange-600">+ {selectedCurrency.symbol} {vatAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-3 bg-primary/5 px-3 rounded-lg mt-3 font-play">
                    <span className="text-base font-bold">
                      {!s.includeVAT ? 'Final Retail Price:' : s.activeTab === 'excl' ? 'Selling Price (Excl. VAT):' : 'Final Price (Incl. VAT):'}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {selectedCurrency.symbol} {(!s.includeVAT || s.activeTab === 'excl') ? priceExclVAT.toFixed(2) : priceInclVAT.toFixed(2)}
                    </span>
                  </div>
                </div>

                {showConversion && (
                  <div className="px-4 pb-3">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-300">
                      <h3 className="text-xs font-semibold text-green-900 mb-2 font-play">Converted to ZAR (1 {selectedCurrency.code} = R {currentRate.toFixed(4)})</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded p-2 border border-green-200 text-center">
                          <div className="text-xs text-gray-600 font-play">Excl. VAT</div>
                          <div className="text-base font-bold font-play">R {priceExclVAT_ZAR.toFixed(2)}</div>
                        </div>
                        <div className="bg-white rounded p-2 border border-green-200 text-center">
                          <div className="text-xs text-gray-600 font-play">Incl. VAT</div>
                          <div className="text-base font-bold text-primary font-play">R {priceInclVAT_ZAR.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Brand Presets */}
          <div className="my-4 flex justify-center">
            <div className="grid grid-cols-4 gap-2 w-1/2">
              {(Object.keys(BRAND_DISCOUNTS) as (keyof typeof BRAND_DISCOUNTS)[]).map((brand) => (
                <button key={brand} onClick={() => handleBrandClick(brand)}
                  className={cn(
                    "h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-bold text-xs font-play",
                    s.activeBrand === brand
                      ? 'bg-gray-800 text-white border-gray-900 shadow-xl transform -translate-y-1 scale-105'
                      : 'bg-gray-600 text-white border-gray-700 shadow-md hover:shadow-lg'
                  )}
                >
                  <span>{brand}</span>
                  <span className="ml-1 text-[10px] opacity-90">({BRAND_DISCOUNTS[brand]}%)</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 text-center font-play">Enter retail price, then click a brand to auto-calculate cost price</p>

          {/* Wholesale Section */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden mt-4">
            <div className="bg-purple-50 px-3 py-2 border-b border-purple-200">
              <h2 className="text-sm font-bold text-purple-900 font-play">Wholesale % Costing</h2>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1 font-play">Currency</label>
                  <select value={discountCurrency.code}
                    onChange={(e) => update({ discountCurrencyCode: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border-2 border-gray-300 rounded font-play">
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <input type="checkbox" id="modalUseDiscountCustomRate" checked={s.useDiscountCustomRate} onChange={(e) => update({ useDiscountCustomRate: e.target.checked })} className="w-3 h-3" />
                    <label htmlFor="modalUseDiscountCustomRate" className="text-xs font-semibold text-gray-600 font-play">Custom Rate</label>
                  </div>
                  {s.useDiscountCustomRate ? (
                    <input type="number" value={s.discountCustomRate} onChange={(e) => update({ discountCustomRate: e.target.value })} placeholder={discountRate.toFixed(4)} step="0.0001" min="0"
                      className="w-full px-2 py-1.5 text-sm border-2 border-purple-300 rounded font-semibold font-play" />
                  ) : (
                    <div className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 rounded bg-gray-50 font-semibold text-gray-700 font-play">{discountRate.toFixed(4)} ZAR</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 font-play">Retail Price ({discountCurrency.code})</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{discountCurrency.symbol}</span>
                    <input type="number" value={s.discountRetailPrice} onChange={(e) => update({ discountRetailPrice: e.target.value })} placeholder="0.00" step="0.01" min="0"
                      className="w-full pl-8 pr-2 py-1.5 text-sm font-semibold border-2 border-gray-300 rounded font-play" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 font-play">Cost Price ({discountCurrency.code})</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{discountCurrency.symbol}</span>
                    <input type="number" value={s.discountCostPrice} onChange={(e) => update({ discountCostPrice: e.target.value })} placeholder="0.00" step="0.01" min="0"
                      className="w-full pl-8 pr-2 py-1.5 text-sm font-semibold border-2 border-gray-300 rounded font-play" />
                  </div>
                </div>
              </div>
              {retailPrice > 0 && costPrice > 0 && (
                <div className="p-2 bg-purple-50 rounded border border-purple-200">
                  <div className="text-xs text-purple-800 font-play">
                    <strong>Discount:</strong> {discountPercentage}% | {discountCurrency.code !== 'ZAR' && `Retail ZAR: R${retailPriceZAR.toFixed(2)} | Cost ZAR: R${costPriceZAR.toFixed(2)}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
