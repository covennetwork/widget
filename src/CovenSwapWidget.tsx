'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type CovenSwapToken = { address: string; symbol: string; decimals: number }

/** Posted by the widget when a swap confirms. Amounts are base-unit decimal strings. */
export type CovenSwapEvent = {
  hash: string
  /** Relative to USDC: `buy` paid USDC, `sell` received it, `swap` is anything else. */
  side: 'buy' | 'sell' | 'swap'
  tokenIn: CovenSwapToken
  tokenOut: CovenSwapToken
  amountIn: string
  amountOut: string
}

/** The minimal EIP-1193 surface the widget needs from a host wallet. */
export type Eip1193Provider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
  on?(event: string, handler: (data: unknown) => void): unknown
  removeListener?(event: string, handler: (data: unknown) => void): unknown
}

export type CovenView = 'swap' | 'connect' | 'account'

export type CovenSwapWidgetProps = {
  /** Where the widget is hosted. Defaults to the canonical Coven deployment. */
  origin?: string
  /** Which view to show. Default `swap`. */
  view?: CovenView
  /** Address that receives the integrator fee on every swap. */
  integrator?: string
  /** Integrator fee in basis points (capped by the router at 300). */
  integratorFee?: number
  /** Lock the widget to a pool by a single identifier: a v3 pool address or a v4 pool id. */
  pool?: string
  /** Token the user pays with: an Arc address, or a CAIP-19 id like `eip155:8453/erc20:0x…`. */
  tokenIn?: string
  /** Token the user receives, in the same forms as `tokenIn`. */
  tokenOut?: string
  /** Prefilled amount of `tokenIn`, in whole units. */
  amount?: string
  /** @deprecated Use `tokenIn`. */
  token0?: string
  /** @deprecated Use `tokenOut`. */
  token1?: string
  /** Full pool key fields — with `tokenIn` and `tokenOut`, route through that exact v4 pool. */
  poolFee?: number
  tickSpacing?: number
  hooks?: string
  /** Max slippage in basis points (default 50). */
  slippage?: number
  /** Background behind the widget: a hex color or "transparent". */
  bg?: string
  /** `auto` follows the visitor's system setting. */
  theme?: 'light' | 'dark' | 'auto'
  /** Hex color for the primary action. */
  accent?: string
  /** Corner radius in px. */
  radius?: number
  /** Tighter spacing and smaller headings. */
  compact?: boolean
  /**
   * Your app's wallet (any EIP-1193 provider, such as wagmi's `connector.getProvider()`). When set,
   * the widget uses it instead of connecting a wallet of its own, so your users connect once.
   */
  provider?: Eip1193Provider
  /** With `provider`: called when the user presses "Connect" inside the widget. */
  onConnectRequest?: () => void
  /** Called when a swap made in the widget confirms. */
  onSwap?: (swap: CovenSwapEvent) => void
  /** Every kit event: connect, disconnect, chainChanged, swapSubmitted, swapConfirmed, error… */
  onEvent?: (name: string, payload: unknown) => void
  /** Max width of the iframe (default 460px). */
  maxWidth?: number | string
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_ORIGIN = 'https://coven.network'

// Wallet methods the host answers for the iframe. Account, chain and transaction methods, plus
// the read calls made while preparing a transaction. Message signing is never bridged.
const BRIDGED_METHODS = new Set([
  'eth_accounts',
  'eth_requestAccounts',
  'eth_chainId',
  'eth_sendTransaction',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_getCapabilities',
  'wallet_sendCalls',
  'wallet_getCallsStatus',
  'eth_blockNumber',
  'eth_call',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
])

type Envelope = { protocol: 'coven'; version: 1; type: string; payload: Record<string, unknown> }

const isEnvelope = (data: unknown): data is Envelope =>
  typeof data === 'object' && data !== null && (data as Envelope).protocol === 'coven' && (data as Envelope).version === 1

const envelope = (type: string, payload: Record<string, unknown>): Envelope => ({ protocol: 'coven', version: 1, type, payload })

/**
 * Embeds the Coven widget in an auto-sizing iframe. Everything runs inside the iframe, so this
 * component depends only on React and never collides with the host app's own wallet setup. Pass
 * `provider` to have the widget use the host's wallet instead of connecting its own.
 */
export function CovenSwapWidget({
  origin = DEFAULT_ORIGIN,
  view,
  integrator,
  integratorFee,
  pool,
  tokenIn,
  tokenOut,
  amount,
  token0,
  token1,
  poolFee,
  tickSpacing,
  hooks,
  slippage,
  bg,
  theme,
  accent,
  radius,
  compact,
  provider,
  onConnectRequest,
  onSwap,
  onEvent,
  maxWidth = 460,
  className,
  style,
}: CovenSwapWidgetProps) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(520)
  // Kept in refs so new callback identities don't re-subscribe the message listener.
  const callbacks = useRef({ onSwap, onEvent, onConnectRequest })
  useEffect(() => {
    callbacks.current = { onSwap, onEvent, onConnectRequest }
  }, [onSwap, onEvent, onConnectRequest])

  const base = origin.replace(/\/$/, '')
  const iframeOrigin = useMemo(() => new URL(base).origin, [base])
  const hostWallet = Boolean(provider)

  const src = useMemo(() => {
    const params = new URLSearchParams()
    const set = (key: string, value: string | number | undefined) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    set('view', view)
    set('integrator', integrator)
    set('integratorFee', integratorFee)
    set('pool', pool)
    set('tokenIn', tokenIn ?? token0)
    set('tokenOut', tokenOut ?? token1)
    set('amount', amount)
    set('poolFee', poolFee)
    set('tickSpacing', tickSpacing)
    set('hooks', hooks)
    set('slippageBps', slippage)
    set('bg', bg)
    set('theme', theme)
    set('accent', accent)
    set('radius', radius)
    if (compact) set('compact', 1)
    if (hostWallet) set('wallet', 'host')
    return `${base}/embed?${params.toString()}`
  }, [accent, amount, base, bg, compact, hooks, hostWallet, integrator, integratorFee, pool, poolFee, radius, slippage, theme, tickSpacing, token0, token1, tokenIn, tokenOut, view])

  useEffect(() => {
    const post = (message: Envelope) => ref.current?.contentWindow?.postMessage(message, iframeOrigin)

    const onMessage = async (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow || event.origin !== iframeOrigin) return
      const data = event.data as unknown
      if (isEnvelope(data)) {
        const p = data.payload
        if (data.type === 'resize' && typeof p.height === 'number') setHeight(Math.ceil(p.height))
        else if (data.type === 'event' && typeof p.name === 'string') callbacks.current.onEvent?.(p.name, p.payload)
        else if (data.type === 'connect-request') callbacks.current.onConnectRequest?.()
        else if (data.type === 'rpc' && provider && typeof p.id === 'string' && typeof p.method === 'string') {
          if (!BRIDGED_METHODS.has(p.method)) {
            post(envelope('rpc-result', { id: p.id, error: { code: 4200, message: `${p.method} is not bridged.` } }))
            return
          }
          try {
            const result = await provider.request({ method: p.method, params: p.params })
            post(envelope('rpc-result', { id: p.id, result }))
          } catch (error) {
            const e = error as { code?: number; message?: string }
            post(envelope('rpc-result', { id: p.id, error: { code: typeof e.code === 'number' ? e.code : -32603, message: e.message ?? 'Request failed.' } }))
          }
        }
        return
      }
      // The pre-envelope message format, still sent for hosts on older versions of this package.
      const legacy = data as { type?: string }
      if (legacy?.type === 'coven:swap') {
        const { type: _, ...swap } = data as CovenSwapEvent & { type: string }
        callbacks.current.onSwap?.(swap)
      }
    }
    window.addEventListener('message', onMessage)

    const forward = (name: string) => (payload: unknown) => post(envelope('provider-event', { event: name, data: payload }))
    const handlers = provider ? { accountsChanged: forward('accountsChanged'), chainChanged: forward('chainChanged'), disconnect: forward('disconnect') } : {}
    for (const [name, handler] of Object.entries(handlers)) provider?.on?.(name, handler)

    return () => {
      window.removeEventListener('message', onMessage)
      for (const [name, handler] of Object.entries(handlers)) provider?.removeListener?.(name, handler)
    }
  }, [iframeOrigin, provider])

  return (
    <iframe
      ref={ref}
      src={src}
      title="Coven"
      loading="lazy"
      allow="clipboard-write"
      className={className}
      style={{ width: '100%', maxWidth, height, border: 0, display: 'block', colorScheme: 'normal', ...style }}
    />
  )
}
