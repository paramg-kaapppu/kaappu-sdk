import { createContext, useContext } from 'react'
import type { KaappuContextValue } from '../types'

export const KaappuContext = createContext<KaappuContextValue | null>(null)

export function useKaappu(): KaappuContextValue {
  const ctx = useContext(KaappuContext)
  if (!ctx) {
    throw new Error(
      '[Kaappu] useKaappu() must be used inside <KaappuProvider>. ' +
      'Wrap your app: <KaappuProvider publishableKey="pk_live_..."><App /></KaappuProvider>'
    )
  }
  return ctx
}
