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

export type CovenSwapWidgetProps = {
  /** Where the widget is hosted. Defaults to the canonical Coven deployment. */
  origin?: string
  /** Address that receives the integrator fee on every swap. */
  integrator?: string
  /** Integrator fee in basis points (capped by the router). */
  integratorFee?: number
  /** Lock the widget to a pool by a single identifier: a v3 pool address or a v4 pool id. */
  pool?: string
  /** Or lock it by naming the two token addresses the user may swap between. */
  token0?: string
  token1?: string
  /** Full pool key fields — supply all three to route through that exact pool. */
  poolFee?: number
  tickSpacing?: number
  hooks?: string
  /** Max slippage in basis points (default 50). */
  slippage?: number
  /** Background behind the widget: a hex color or "transparent". */
  bg?: string
  /** Ink palette. Use "dark" on dark backgrounds; it also defaults `bg` to a dark surface. */
  theme?: 'light' | 'dark'
  /** Hex color for the primary action. */
  accent?: string
  /** Tighter spacing and smaller headings, with no hero heading. */
  compact?: boolean
  /** Called when a swap made in the widget confirms. */
  onSwap?: (swap: CovenSwapEvent) => void
  /** Max width of the iframe (default 460px). */
  maxWidth?: number | string
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_ORIGIN = 'https://coven.network'

/**
 * Embeds the Coven swap widget in an auto-sizing iframe. The whole swap experience — wallet
 * connection, routing, the SDK — runs inside the iframe, so this component depends only on React
 * and never collides with the host app's own wallet or wagmi setup.
 */
export function CovenSwapWidget({
  origin = DEFAULT_ORIGIN,
  integrator,
  integratorFee,
  pool,
  token0,
  token1,
  poolFee,
  tickSpacing,
  hooks,
  slippage,
  bg,
  theme,
  accent,
  compact,
  onSwap,
  maxWidth = 460,
  className,
  style,
}: CovenSwapWidgetProps) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(520)
  // Kept in a ref so a new callback identity doesn't re-subscribe the message listener.
  const onSwapRef = useRef(onSwap)
  useEffect(() => {
    onSwapRef.current = onSwap
  }, [onSwap])

  const src = useMemo(() => {
    const params = new URLSearchParams()
    const set = (key: string, value: string | number | undefined) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    set('integrator', integrator)
    set('integratorFee', integratorFee)
    set('pool', pool)
    set('token0', token0)
    set('token1', token1)
    set('poolFee', poolFee)
    set('tickSpacing', tickSpacing)
    set('hooks', hooks)
    set('slippage', slippage)
    set('bg', bg)
    set('theme', theme)
    set('accent', accent)
    if (compact) set('compact', 1)
    return `${origin.replace(/\/$/, '')}/widget?${params.toString()}`
  }, [accent, bg, compact, hooks, integrator, integratorFee, origin, pool, poolFee, slippage, theme, tickSpacing, token0, token1])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return
      const data = event.data as { type?: string; height?: number }
      if (data?.type === 'coven:resize' && typeof data.height === 'number') setHeight(Math.ceil(data.height))
      if (data?.type === 'coven:swap') {
        const { type: _, ...swap } = event.data as CovenSwapEvent & { type: string }
        onSwapRef.current?.(swap)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <iframe
      ref={ref}
      src={src}
      title="Coven swap"
      loading="lazy"
      allow="clipboard-write; ethereum"
      className={className}
      style={{ width: '100%', maxWidth, height, border: 0, display: 'block', colorScheme: 'normal', ...style }}
    />
  )
}
