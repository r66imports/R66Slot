'use client'

import { ACCOUNT_SKINS } from '@/lib/account-skins'
import { useAccountSkin } from './AccountSkinProvider'

/**
 * The swatch row in the account sidebar. Every colour here is inline rather
 * than a Tailwind class on purpose: the skin stylesheet repaints grey/white
 * utilities inside the account area, which would flatten the swatches into
 * whatever skin is currently on.
 */
export function SkinPicker() {
  const { skinId, skin, setSkinId } = useAccountSkin()

  return (
    <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${skin.colors.border}` }}>
      <div className="flex items-baseline justify-between px-2 mb-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: skin.colors.faint }}
        >
          Theme
        </span>
        <span className="text-xs font-medium" style={{ color: skin.colors.muted }}>
          {skin.name}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 px-2">
        {ACCOUNT_SKINS.map((s) => {
          const selected = s.id === skinId
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSkinId(s.id)}
              title={`${s.name} — ${s.blurb}`}
              aria-label={`${s.name} theme`}
              aria-pressed={selected}
              className="w-8 h-8 rounded-full overflow-hidden transition-transform hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${s.colors.surface} 0 50%, ${s.colors.accent} 50% 100%)`,
                border: `1px solid ${s.colors.border}`,
                boxShadow: selected
                  ? `0 0 0 2px ${skin.colors.surface}, 0 0 0 4px ${s.colors.accent}`
                  : 'none',
              }}
            />
          )
        })}
      </div>

      <p className="text-[11px] mt-2 px-2 leading-snug" style={{ color: skin.colors.faint }}>
        {skin.blurb}
      </p>
    </div>
  )
}
