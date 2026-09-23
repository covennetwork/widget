'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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
  maxWidth = 460,
  className,
  style,
}: CovenSwapWidgetProps) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(520)

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
    return `${origin.replace(/\/$/, '')}/widget?${params.toString()}`
  }, [bg, hooks, integrator, integratorFee, origin, pool, poolFee, slippage, tickSpacing, token0, token1])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return
      const data = event.data as { type?: string; height?: number }
      if (data?.type === 'coven:resize' && typeof data.height === 'number') setHeight(Math.ceil(data.height))
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
