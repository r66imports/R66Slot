'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'

type Tab = 'excl' | 'incl'

type Currency = {
  code: string
  symbol: string
  name: string
  toZAR: number // Exchange rate to ZAR
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

// Brand discount presets
const BRAND_DISCOUNTS = {
  NSR: 37.5,
  Revo: 35,
  Pioneer: 40,
  Sideways: 37,
}

export default function CostingPage() {
  // Discount Calculator State
  const [discountRetailPrice, setDiscountRetailPrice] = useState<string>('')
  const [discountCostPrice, setDiscountCostPrice] = useState<string>('')
  const [discountCurrency, setDiscountCurrency] = useState<Currency>(CURRENCIES[0])
  const [discountCustomRate, setDiscountCustomRate] = useState<string>('')
  const [useDiscountCustomRate, setUseDiscountCustomRate] = useState<boolean>(false)
  const [activeBrand, setActiveBrand] = useState<string | null>(null)

  // Main Calculator State
  const [cost, setCost] = useState<string>('')
  const [shippingCustomsMarkup, setShippingCustomsMarkup] = useState<string>('45')
  const [markup, setMarkup] = useState<string>('30')
  const [activeTab, setActiveTab] = useState<Tab>('excl')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0])
  const [includeVAT, setIncludeVAT] = useState<boolean>(true)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [customRate, setCustomRate] = useState<string>('')
  const [useCustomRate, setUseCustomRate] = useState<boolean>(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false)

  // Fetch exchange rates from API
  const fetchExchangeRates = async () => {
    setIsLoadingRates(true)
    try {
      // Using exchangerate-api.com (free tier available)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/ZAR')
      const data = await response.json()

      if (data.rates) {
        // Convert to ZAR base rates (inverse of the rates from ZAR)
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

  // Fetch rates on mount and every 20 minutes
  useEffect(() => {
    fetchExchangeRates()
    const interval = setInterval(fetchExchangeRates, 20 * 60 * 1000) // 20 minutes
    return () => clearInterval(interval)
  }, [])

  // Handle brand preset click
  const handleBrandClick = (brand: keyof typeof BRAND_DISCOUNTS) => {
    setActiveBrand(brand)
    const discountPercent = BRAND_DISCOUNTS[brand]

    // If retail price is entered, calculate cost price
    if (discountRetailPrice && parseFloat(discountRetailPrice) > 0) {
      const retail = parseFloat(discountRetailPrice)
      const cost = retail * (1 - discountPercent / 100)
      setDiscountCostPrice(cost.toFixed(2))
    }
  }

  // Constants
  const VAT_PERCENTAGE = 15

  // Get current exchange rate (custom or API)
  const getCurrentRate = () => {
    if (useCustomRate && customRate) {
      return parseFloat(customRate) || selectedCurrency.toZAR
    }
    return exchangeRates[selectedCurrency.code] || selectedCurrency.toZAR
  }

  // Get discount calculator exchange rate
  const getDiscountRate = () => {
    if (useDiscountCustomRate && discountCustomRate) {
      return parseFloat(discountCustomRate) || discountCurrency.toZAR
    }
    return exchangeRates[discountCurrency.code] || discountCurrency.toZAR
  }

  // Discount Calculator Calculations
  const retailPrice = parseFloat(discountRetailPrice) || 0
  const costPrice = parseFloat(discountCostPrice) || 0
  const discountPercentage = retailPrice > 0 && costPrice > 0
    ? ((retailPrice - costPrice) / retailPrice * 100).toFixed(2)
    : '0.00'
  const discountAmount = retailPrice - costPrice
  const discountRate = getDiscountRate()
  const retailPriceZAR = retailPrice * discountRate
  const costPriceZAR = costPrice * discountRate

  // Calculations
  const costValue = parseFloat(cost) || 0
  const shippingCustomsPercentage = parseFloat(shippingCustomsMarkup) || 0
  const shippingCustomsAmount = costValue * (shippingCustomsPercentage / 100)
  const costWithShipping = costValue + shippingCustomsAmount
  const markupPercentage = parseFloat(markup) || 0
  const markupAmount = costWithShipping * (markupPercentage / 100)
  const priceExclVAT = costWithShipping + markupAmount
  const vatAmount = includeVAT ? priceExclVAT * (VAT_PERCENTAGE / 100) : 0
  const priceInclVAT = priceExclVAT + vatAmount

  // Convert to ZAR
  const currentRate = getCurrentRate()
  const priceExclVAT_ZAR = priceExclVAT * currentRate
  const priceInclVAT_ZAR = priceInclVAT * currentRate
  const showConversion = selectedCurrency.code !== 'ZAR' && costValue > 0

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Product Costing Calculator</h1>
            <p className="text-xs text-gray-600">
              Calculate your selling price with custom markup and VAT
            </p>
          </div>
          {lastUpdated && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Exchange rates updated:</div>
              <div className="text-xs font-medium text-gray-700">
                {lastUpdated.toLocaleTimeString()}
              </div>
              <button
                onClick={fetchExchangeRates}
                disabled={isLoadingRates}
                className="text-xs text-blue-600 hover:text-blue-700 underline mt-1"
              >
                {isLoadingRates ? 'Updating...' : 'Refresh Now'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calculator Card */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {/* Two Column Layout */}
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          {/* Left Column - Estimate Retail Converter */}
          <div className="p-3 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Estimate Retail Converter</h3>

            {/* Currency Selector */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-900 mb-1">
                Currency
              </label>
              <select
                value={selectedCurrency.code}
                onChange={(e) => {
                  const currency = CURRENCIES.find(c => c.code === e.target.value)
                  if (currency) setSelectedCurrency(currency)
                }}
                className="w-full px-2 py-1.5 text-xs border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 font-medium"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost Price Input */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Cost Price ({selectedCurrency.code})
              </label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                  {selectedCurrency.symbol}
                </span>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-2 py-1.5 text-sm font-semibold border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* VAT Toggle */}
            <div className="mb-3">
              <div className="flex items-center gap-2 p-2 bg-white border border-gray-300 rounded w-full">
                <input
                  type="checkbox"
                  id="includeVAT"
                  checked={includeVAT}
                  onChange={(e) => setIncludeVAT(e.target.checked)}
                  className="w-3 h-3 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                />
                <label htmlFor="includeVAT" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                  Include VAT ({VAT_PERCENTAGE}%)
                </label>
              </div>
            </div>

            {/* Shipping & Customs Markup */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Shipping & Customs (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={shippingCustomsMarkup}
                  onChange={(e) => setShippingCustomsMarkup(e.target.value)}
                  placeholder="45"
                  step="0.1"
                  min="0"
                  max="1000"
                  className="w-full px-2 py-1.5 pr-7 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                  %
                </span>
              </div>
            </div>

            {/* Markup Input */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Markup Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  placeholder="30"
                  step="0.1"
                  min="0"
                  max="1000"
                  className="w-full px-2 py-1.5 pr-7 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                  %
                </span>
              </div>
            </div>

            {/* Custom Exchange Rate */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  id="useCustomRate"
                  checked={useCustomRate}
                  onChange={(e) => setUseCustomRate(e.target.checked)}
                  className="w-3 h-3 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                />
                <label htmlFor="useCustomRate" className="text-xs font-semibold text-gray-600 cursor-pointer select-none">
                  Use Custom Exchange Rate (1 {selectedCurrency.code} = ? ZAR)
                </label>
              </div>
              {useCustomRate && (
                <div className="relative">
                  <input
                    type="number"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder={currentRate.toFixed(4)}
                    step="0.0001"
                    min="0"
                    className="w-full px-2 py-1.5 text-sm border-2 border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                    ZAR
                  </span>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Current rate: 1 {selectedCurrency.code} = R {currentRate.toFixed(4)}
                {!useCustomRate && exchangeRates[selectedCurrency.code] && ' (Live from API)'}
              </div>
            </div>

            {/* Markup Info */}
            {costValue > 0 && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-700 font-medium">Shipping & Customs:</span>
                      <span className="text-blue-900 font-semibold">{shippingCustomsPercentage}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-blue-600">Amount:</span>
                      <span className="text-blue-800 font-medium">{selectedCurrency.symbol} {shippingCustomsAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-700 font-medium">Markup:</span>
                      <span className="text-blue-900 font-semibold">{markupPercentage}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-blue-600">Amount:</span>
                      <span className="text-blue-800 font-medium">{selectedCurrency.symbol} {markupAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results with Tabs */}
          <div className="bg-white">
            {/* Tabs */}
            {includeVAT && (
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('excl')}
                className={cn(
                  'flex-1 px-4 py-2.5 text-xs font-semibold transition-all relative',
                  activeTab === 'excl'
                    ? 'text-primary bg-white border-b-2 border-primary'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                VAT Excluded
              </button>
              <button
                onClick={() => setActiveTab('incl')}
                className={cn(
                  'flex-1 px-4 py-2.5 text-xs font-semibold transition-all relative',
                  activeTab === 'incl'
                    ? 'text-primary bg-white border-b-2 border-primary'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                VAT Included
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        <div className="p-4">
          {!includeVAT ? (
            // No VAT - Simple View
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Cost Price:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedCurrency.symbol} {costValue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Shipping & Customs ({shippingCustomsPercentage}%):</span>
                <span className="text-sm font-medium text-blue-600">
                  + {selectedCurrency.symbol} {shippingCustomsAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Markup ({markupPercentage}%):</span>
                <span className="text-sm font-medium text-green-600">
                  + {selectedCurrency.symbol} {markupAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 bg-primary/5 px-3 rounded-lg mt-3">
                <span className="text-base font-bold text-gray-900">
                  Final Retail Price:
                </span>
                <span className="text-2xl font-bold text-primary">
                  {selectedCurrency.symbol} {priceExclVAT.toFixed(2)}
                </span>
              </div>
              <div className="text-center text-xs text-gray-500 mt-1">
                VAT not included in final price
              </div>
            </div>
          ) : activeTab === 'excl' ? (
            // VAT Excluded Tab
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Cost Price:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedCurrency.symbol} {costValue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Shipping & Customs ({shippingCustomsPercentage}%):</span>
                <span className="text-sm font-medium text-blue-600">
                  + {selectedCurrency.symbol} {shippingCustomsAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Markup ({markupPercentage}%):</span>
                <span className="text-sm font-medium text-green-600">
                  + {selectedCurrency.symbol} {markupAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 bg-primary/5 px-3 rounded-lg mt-3">
                <span className="text-base font-bold text-gray-900">
                  Selling Price (Excl. VAT):
                </span>
                <span className="text-2xl font-bold text-primary">
                  {selectedCurrency.symbol} {priceExclVAT.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            // VAT Included Tab
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Cost Price:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedCurrency.symbol} {costValue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Shipping & Customs ({shippingCustomsPercentage}%):</span>
                <span className="text-sm font-medium text-blue-600">
                  + {selectedCurrency.symbol} {shippingCustomsAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Markup ({markupPercentage}%):</span>
                <span className="text-sm font-medium text-green-600">
                  + {selectedCurrency.symbol} {markupAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Price Excl. VAT:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedCurrency.symbol} {priceExclVAT.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">VAT ({VAT_PERCENTAGE}%):</span>
                <span className="text-sm font-medium text-orange-600">
                  + {selectedCurrency.symbol} {vatAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 bg-primary/5 px-3 rounded-lg mt-3">
                <span className="text-base font-bold text-gray-900">
                  Final Price (Incl. VAT):
                </span>
                <span className="text-2xl font-bold text-primary">
                  {selectedCurrency.symbol} {priceInclVAT.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

            {/* Currency Conversion to ZAR */}
            {showConversion && (
              <div className="px-4 pb-3">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-300">
                  <h3 className="text-xs font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <span>💱</span>
                    Converted to ZAR
                    <span className="text-xs font-normal text-green-700">
                      (1 {selectedCurrency.code} = R {currentRate.toFixed(4)})
                    </span>
                  </h3>
                  {!includeVAT ? (
                    <div className="bg-white rounded p-2 border border-green-200 text-center">
                      <div className="text-xs text-gray-600 mb-0.5">Final Retail Price (ZAR)</div>
                      <div className="text-xl font-bold text-primary">R {priceExclVAT_ZAR.toFixed(2)}</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded p-2 border border-green-200">
                        <div className="text-xs text-gray-600 mb-0.5">Price Excl. VAT</div>
                        <div className="text-base font-bold text-gray-900">R {priceExclVAT_ZAR.toFixed(2)}</div>
                      </div>
                      <div className="bg-white rounded p-2 border border-green-200">
                        <div className="text-xs text-gray-600 mb-0.5">Price Incl. VAT</div>
                        <div className="text-base font-bold text-primary">R {priceInclVAT_ZAR.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <span>ℹ️</span>
          How it works
        </h3>
        <div className="space-y-1 text-xs text-blue-800">
          <p>
            <strong>Step 1:</strong> Cost + Shipping & Customs ({shippingCustomsPercentage}%) = {selectedCurrency.symbol}{costWithShipping.toFixed(2)}
          </p>
          <p>
            <strong>Step 2:</strong> Add Markup ({markupPercentage}%) = {selectedCurrency.symbol}{priceExclVAT.toFixed(2)} (Excl. VAT)
          </p>
          {includeVAT && (
            <p>
              <strong>Step 3:</strong> Add VAT ({VAT_PERCENTAGE}%) = {selectedCurrency.symbol}{priceInclVAT.toFixed(2)} (Incl. VAT)
            </p>
          )}
        </div>
      </div>

      {/* Brand Preset Buttons */}
      <div className="my-6 flex justify-center">
        <div className="grid grid-cols-4 gap-2 w-1/2">
          <button
            onClick={() => handleBrandClick('NSR')}
            className={cn(
              "h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-bold text-xs",
              activeBrand === 'NSR'
                ? 'bg-gradient-to-r from-red-700 to-red-800 text-white border-red-900 shadow-xl transform -translate-y-1 scale-105'
                : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 shadow-md hover:shadow-lg'
            )}
          >
            <span className="tracking-wide">NSR</span>
            <span className="ml-1 text-[10px] opacity-90">(37.5%)</span>
          </button>

          <button
            onClick={() => handleBrandClick('Revo')}
            className={cn(
              "h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-bold text-xs",
              activeBrand === 'Revo'
                ? 'bg-gradient-to-r from-blue-700 to-blue-800 text-white border-blue-900 shadow-xl transform -translate-y-1 scale-105'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-700 shadow-md hover:shadow-lg'
            )}
          >
            <span className="tracking-wide">Revo</span>
            <span className="ml-1 text-[10px] opacity-90">(35%)</span>
          </button>

          <button
            onClick={() => handleBrandClick('Pioneer')}
            className={cn(
              "h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-bold text-xs",
              activeBrand === 'Pioneer'
                ? 'bg-gradient-to-r from-green-700 to-green-800 text-white border-green-900 shadow-xl transform -translate-y-1 scale-105'
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-700 shadow-md hover:shadow-lg'
            )}
          >
            <span className="tracking-wide">Pioneer</span>
            <span className="ml-1 text-[10px] opacity-90">(40%)</span>
          </button>

          <button
            onClick={() => handleBrandClick('Sideways')}
            className={cn(
              "h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-bold text-xs",
              activeBrand === 'Sideways'
                ? 'bg-gradient-to-r from-orange-700 to-orange-800 text-white border-orange-900 shadow-xl transform -translate-y-1 scale-105'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-700 shadow-md hover:shadow-lg'
            )}
          >
            <span className="tracking-wide">Sideways</span>
            <span className="ml-1 text-[10px] opacity-90">(37%)</span>
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-600 mb-3 text-center">
        <span className="font-semibold">Tip:</span> Enter retail price, then click a brand to auto-calculate cost price using preset discount %
      </div>


      {/* Wholesale % Costing */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-3 py-2 border-b border-purple-200">
          <h2 className="text-sm font-bold text-purple-900">Wholesale % Costing</h2>
          <p className="text-xs text-purple-700">Calculate percentage discount between retail and cost price</p>
        </div>

        <div className="p-3">
          {/* Currency and Exchange Rate Row */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">
                Currency
              </label>
              <select
                value={discountCurrency.code}
                onChange={(e) => {
                  const currency = CURRENCIES.find(c => c.code === e.target.value)
                  if (currency) setDiscountCurrency(currency)
                }}
                className="w-full px-2 py-1.5 text-xs border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 font-medium"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  id="useDiscountCustomRate"
                  checked={useDiscountCustomRate}
                  onChange={(e) => setUseDiscountCustomRate(e.target.checked)}
                  className="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="useDiscountCustomRate" className="text-xs font-semibold text-gray-600 cursor-pointer select-none">
                  Use Custom Exchange Rate
                </label>
                <span className="text-xs text-gray-500">
                  (1 {discountCurrency.code} = ? ZAR)
                </span>
              </div>
              {useDiscountCustomRate ? (
                <input
                  type="number"
                  value={discountCustomRate}
                  onChange={(e) => setDiscountCustomRate(e.target.value)}
                  placeholder={discountRate.toFixed(4)}
                  step="0.0001"
                  min="0"
                  className="w-full px-2 py-1.5 text-sm border-2 border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold"
                />
              ) : (
                <div className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 rounded bg-gray-50 font-semibold text-gray-700">
                  {discountRate.toFixed(4)} ZAR
                </div>
              )}
            </div>
          </div>

          {/* Retail and Cost Price Inputs */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Retail Price ({discountCurrency.code})
              </label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                  {discountCurrency.symbol}
                </span>
                <input
                  type="number"
                  value={discountRetailPrice}
                  onChange={(e) => setDiscountRetailPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-2 py-1.5 text-sm font-semibold border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Cost Price ({discountCurrency.code})
              </label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                  {discountCurrency.symbol}
                </span>
                <input
                  type="number"
                  value={discountCostPrice}
                  onChange={(e) => setDiscountCostPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-2 py-1.5 text-sm font-semibold border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>


          {/* Conversion Info */}
          {retailPrice > 0 && costPrice > 0 && discountCurrency.code !== 'ZAR' && (
            <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Retail in ZAR:</span>
                  <span className="font-semibold text-gray-900">R {retailPriceZAR.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost in ZAR:</span>
                  <span className="font-semibold text-gray-900">R {costPriceZAR.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Formula Explanation for Wholesale Costing */}
          {retailPrice > 0 && costPrice > 0 && (
            <div className="mt-3 p-2 bg-purple-50 rounded border border-purple-200">
              <div className="text-xs text-purple-800">
                <strong>Formula:</strong> ({discountCurrency.symbol}{retailPrice.toFixed(2)} - {discountCurrency.symbol}{costPrice.toFixed(2)}) ÷ {discountCurrency.symbol}{retailPrice.toFixed(2)} = <strong>{discountPercentage}%</strong>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
