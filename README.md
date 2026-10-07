# @covennetwork/widget

The Coven swap widget for React — a thin, dependency-free wrapper around the hosted Coven swap
iframe. Users connect their own wallet and swap on Arc without leaving your page.

The whole swap experience (wallet connection, routing, the SDK) runs **inside the iframe**, so
this package depends only on React. It can't bloat your bundle or collide with your app's wagmi
or wallet setup. For non-React sites, use the `embed.js` script loader instead — see the
[widget docs](https://docs.coven.network/guides/widget/).

## Install

```bash
npm install @covennetwork/widget
```

`react` (18 or 19) is a peer dependency.

## Use

Open widget — the user picks any Arc pair:

```tsx
import { CovenSwapWidget } from '@covennetwork/widget'

export function Swap() {
  return <CovenSwapWidget integrator="0xYourFeeWallet" integratorFee={30} />
}
```

Locked to one pool — pass a single identifier (a v3 pool address or a v4 pool id) and the widget
resolves the pair itself:

```tsx
<CovenSwapWidget integrator="0xYourFeeWallet" integratorFee={30} pool="0xYourPoolAddressOrId" />
```

Or name the pair explicitly, optionally with the full pool key to route through that exact pool:

```tsx
<CovenSwapWidget
  integrator="0xYourFeeWallet"
  integratorFee={30}
  token0="0xUSDC"
  token1="0xYourToken"
  poolFee={3000}
  tickSpacing={60}
  hooks="0x0000000000000000000000000000000000000000"
/>
```

## Props

| Prop            | Type                | Meaning                                                     |
| --------------- | ------------------- | ----------------------------------------------------------- |
| `integrator`    | `string`            | Address that receives the integrator fee.                   |
| `integratorFee` | `number`            | Integrator fee in basis points (capped by the router).      |
| `pool`          | `string`            | Single pool identifier — v3 pool address or v4 pool id.     |
| `token0`        | `string`            | Pool token the user pays with by default.                   |
| `token1`        | `string`            | Pool token the user receives by default.                    |
| `poolFee`       | `number`            | Pool fee tier.                                              |
| `tickSpacing`   | `number`            | Pool tick spacing.                                          |
| `hooks`         | `string`            | Pool hooks address (`0x0…0` for none).                      |
| `slippage`      | `number`            | Max slippage in basis points (default `50`).                |
| `bg`            | `string`            | Background color (hex, or `transparent`). Default `#EFECE4`. |
| `theme`         | `"light" \| "dark"` | Ink palette. `dark` for dark hosts; defaults `bg` to `#0E0E0D`. |
| `accent`        | `string`            | Hex color for the primary action.                            |
| `compact`       | `boolean`           | Tighter spacing, smaller headings, no hero heading.          |
| `onSwap`        | `(swap) => void`    | Called when a swap confirms. See [Swap events](#swap-events). |
| `maxWidth`      | `number \| string`  | Max iframe width (default `460`).                           |
| `origin`        | `string`            | Where the widget is hosted (default `https://coven.network`). |
| `className`     | `string`            | Passed to the iframe.                                       |
| `style`         | `React.CSSProperties` | Merged onto the iframe.                                    |

## Swap events

When a swap made in the widget confirms, the widget posts a `coven:swap` message to the host
window, and the React component passes the same payload (without `type`) to `onSwap`:

```ts
{
  type: 'coven:swap',
  hash: '0x…',                 // transaction hash on Arc
  side: 'buy',                 // relative to USDC: 'buy' paid USDC, 'sell' received it, else 'swap'
  tokenIn: { address: '0x…', symbol: 'USDC', decimals: 6 },
  tokenOut: { address: '0x…', symbol: 'TOKEN', decimals: 18 },
  amountIn: '1000000',         // base units, as a decimal string
  amountOut: '4213370000000000000',
}
```

Without React, listen for it next to the resize message, and check `event.source` is the widget's
iframe before trusting it.

## License

MIT
