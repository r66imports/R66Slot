'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'
import {
  DEFAULT_SKIN_ID,
  SKIN_STORAGE_KEY,
  getSkin,
  isSkinId,
  skinStyle,
  type AccountSkin,
} from '@/lib/account-skins'

interface AccountSkinContextValue {
  skinId: string
  skin: AccountSkin
  setSkinId: (id: string) => void
}

const AccountSkinContext = createContext<AccountSkinContextValue>({
  skinId: DEFAULT_SKIN_ID,
  skin: getSkin(DEFAULT_SKIN_ID),
  setSkinId: () => {},
})

export function useAccountSkin() {
  return useContext(AccountSkinContext)
}

/** Paint before the browser does on the client, without warning during SSR. */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Wraps the account area and puts the chosen skin's variables on the wrapper.
 *
 * The skin is applied from localStorage before first paint so switching pages
 * never flashes the default, then reconciled with the server copy so the choice
 * follows the client to another browser or device. The server is the winner
 * when the two disagree, except on a device that has never synced — there the
 * local choice is pushed up rather than thrown away.
 */
export function AccountSkinProvider({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  // First render must match the server: always the default.
  const [skinId, setSkinIdState] = useState(DEFAULT_SKIN_ID)

  useIsomorphicLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(SKIN_STORAGE_KEY)
      if (isSkinId(stored)) setSkinIdState(stored)
    } catch {
      /* private browsing — the server copy below still works */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/account/appearance')
        if (!res.ok || cancelled) return
        const data = await res.json()
        let local: string | null = null
        try {
          local = window.localStorage.getItem(SKIN_STORAGE_KEY)
        } catch {
          /* ignore */
        }
        if (isSkinId(data?.accountSkin) && data.accountSkin !== DEFAULT_SKIN_ID) {
          setSkinIdState(data.accountSkin)
          try {
            window.localStorage.setItem(SKIN_STORAGE_KEY, data.accountSkin)
          } catch {
            /* ignore */
          }
        } else if (isSkinId(local) && local !== DEFAULT_SKIN_ID) {
          // Chosen here before the account could store it — push it up.
          fetch('/api/account/appearance', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountSkin: local }),
          }).catch(() => {})
        }
      } catch {
        /* appearance is cosmetic — never block the page on it */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setSkinId = useCallback((id: string) => {
    if (!isSkinId(id)) return
    setSkinIdState(id)
    try {
      window.localStorage.setItem(SKIN_STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
    fetch('/api/account/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountSkin: id }),
    }).catch(() => {})
  }, [])

  const skin = getSkin(skinId)

  return (
    <AccountSkinContext.Provider value={{ skinId, skin, setSkinId }}>
      <div
        data-skin={skin.id}
        data-skin-dark={skin.dark ? '1' : '0'}
        style={skinStyle(skin)}
        className={className}
      >
        {children}
      </div>
    </AccountSkinContext.Provider>
  )
}
