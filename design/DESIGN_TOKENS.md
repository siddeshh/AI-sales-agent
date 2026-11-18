# Design tokens: v0 "AI Landing Page" template (webwedo-agency)

Source: `design/v0-template/` (Next.js 15 + Tailwind CSS v4 + shadcn/ui "new-york", base colour **neutral**).
Read from `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/ui/*`.

## 1. Colour palette

The template uses the standard shadcn neutral palette in OKLCH (`:root` = light, `.dark` = dark). Its **landing page** ignores the light tokens and paints everything black (`bg-black`) with white / neutral text. That landing look is what makes the template recognisable.

| Token | Light (`:root`) | Dark (`.dark`) | Used for |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` white | `oklch(0.145 0 0)` near-black | page background |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | main text |
| `--card` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | card / surface |
| `--primary` | `oklch(0.205 0 0)` near-black | `oklch(0.985 0 0)` | primary button |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | text on primary |
| `--secondary`, `--muted`, `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | subtle fills, hover |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | secondary text |
| `--border`, `--input` | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` | borders, inputs |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.439 0 0)` | focus ring |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.396 0.141 25.723)` | errors |
| `--chart-1..5` | orange / teal / blue / yellow / amber | blue / green / amber / purple / red | charts |
| `--sidebar*` | `oklch(0.985 0 0)` … | `oklch(0.205 0 0)`, primary `oklch(0.488 0.243 264.376)` (blue) | sidebar |

**Landing-page colours (hard-coded in `page.tsx` / components):**
- Background `#000` (`bg-black`), cards `bg-black/80` or `bg-black/[0.96]`, glass `bg-white/10` + `backdrop-blur-md`.
- Borders `border-white/10`, `border-white/20`, navbar `border-[#333]` on `bg-[#1f1f1f57]`.
- Text: headings white with gradient `bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text`, body `text-gray-300` / `text-neutral-300`, muted `text-gray-400`.
- **Accent: blue**. Navbar CTA `bg-gradient-to-br from-blue-400 to-blue-600` with a `bg-blue-400 blur-lg opacity-40` glow; dark-sidebar primary `oklch(0.488 0.243 264.376)`.
- Positive / negative markers: `text-green-400/500` check, `text-red-500` cross. Benefit icons on `bg-{green,blue,purple,orange}-900/40` circles.
- CTA gradient: `#0A0A0A, #2979FF, #FF80AB, #FF6D00, #FFD600, #00E676, #3D5AFE` at stops 35–100 %.

## 2. Fonts and sizes

- **Geist Sans** (`--font-sans`) and **Geist Mono** (`--font-mono`), loaded with `geist/font` in Next. In Vite we use `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` (same typefaces).
- `antialiased` on `body`.
- Headings: hero `text-4xl md:text-5xl font-bold`; section `text-3xl md:text-4xl font-bold`; card titles `text-xl font-semibold` / `text-2xl font-bold`.
- Body: `text-xl` section intros, base text, `text-sm` nav / buttons / meta, `text-xs` badges.

## 3. Radius

`--radius: 0.625rem` (10 px). `rounded-sm` = radius − 4 px, `rounded-md` = − 2 px, `rounded-lg` = radius, `rounded-xl` = + 4 px.
Cards `rounded-xl`; buttons / badges `rounded-md`; navbar and CTA buttons `rounded-full`; step numbers `rounded-full`.

## 4. Spacing and layout

- Sections `py-24`, `container mx-auto px-4`; section header `text-center space-y-4 mb-16`, intro `max-w-2xl mx-auto`.
- Grids: `grid lg:grid-cols-2 gap-16` (problem / solution), `md:grid-cols-2 lg:grid-cols-3 gap-8` (cards), `lg:grid-cols-4 gap-8` (benefits).
- Bento grid: `grid auto-rows-[22rem] grid-cols-3 gap-4`.
- Card padding `p-6`; shadcn `Card` = `flex flex-col gap-6 rounded-xl border py-6 shadow-sm`, `CardContent` `px-6`.

## 5. Buttons (shadcn `button.tsx`, cva)

Base: `inline-flex items-center gap-2 rounded-md text-sm font-medium transition-all`, focus `ring-[3px] ring-ring/50`, `[&_svg]:size-4`.
- `default`: `bg-primary text-primary-foreground shadow-xs hover:bg-primary/90`
- `outline`: `border bg-background shadow-xs hover:bg-accent`
- `secondary`: `bg-secondary hover:bg-secondary/80`
- `ghost`: `hover:bg-accent`
- `destructive`, `link`
- Sizes: `default` h-9 px-4, `sm` h-8 px-3, `lg` h-10 px-6, `icon` size-9.
- Landing overrides: primary CTA `bg-white text-black hover:bg-gray-100`; secondary `border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent`; navbar pill buttons `rounded-full`.

## 6. Cards

- shadcn Card (above). Landing: `bg-black/80 backdrop-blur-sm border-white/10`.
- BentoCard: `rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl`, icon `h-12 w-12 text-white/80`, title `text-xl font-semibold text-white`, text `text-white/70`.
- Badge: `rounded-md border px-2 py-0.5 text-xs font-medium` (variants default / secondary / destructive / outline).

## 7. Section patterns (landing `page.tsx`, top to bottom)

1. **Navbar**: fixed floating pill, `top-6`, centered, `rounded-full border-[#333] bg-[#1f1f1f57] backdrop-blur-sm`. Logo, two links, ghost pill + blue gradient pill CTA with glow.
2. **Hero**: `min-h-screen` black; one large card `h-[500px]` split left text / right 3D (Spline robot). Spotlight glow, gradient heading, 2 CTAs, two check-mark bullets.
3. **Problem & solution**: two columns, ✗ list vs ✓ list.
4. **Services**: bento grid of 5 cards.
5. **Testimonials**: 3 cards with ★★★★★ (fake). *Removed for Nova.*
6. **Benefits**: 4 round icons with big numbers (80 %, 300 %, 150 %: fake). *Replaced with real numbers.*
7. **Pricing**: 3 plans (fake). *Removed.*
8. **Process**: 3 numbered white circles `h-20 w-20 bg-white text-black rounded-full`.
9. **CTA**: animated breathing radial gradient + sparkles + gradient heading + 2 buttons.
10. **Footer**: 4 columns on `border-t border-white/10`, glass icon buttons `bg-white/5 border-white/10 rounded-lg`.

## 8. Animations

- Navbar links: two stacked labels; `group-hover:-translate-y-1/2` with `duration-400 ease-out`, so the hover colour slides up.
- Navbar CTA glow: `blur-lg → blur-xl`, `opacity-40 → 60` on hover, `duration-300`.
- BentoCard hover: content `-translate-y-10`, icon `scale-75`, CTA slides up from `translate-y-10 opacity-0`, overlay `bg-white/5`, all `duration-300`.
- Spotlight (framer-motion): radial `from-zinc-50 via-zinc-100 to-zinc-200` blob, `blur-xl`, follows the mouse with a spring, fades in on hover.
- AnimatedGradientBackground (framer-motion): fades in from `opacity 0, scale 1.5` over 2 s; the radial gradient "breathes" ±5 % in `requestAnimationFrame`.
- SparklesCore (tsParticles) and SplineScene (remote 3D scene). *Not used in Nova: heavy dependencies, and Spline loads a 3D file from the internet at runtime, which is risky on a projector without network.*
- `tw-animate-css` utility classes.

## 9. How Nova uses these

- **Landing (`/`)**: template's black look, floating pill navbar, spotlight hero, bento grid, numbered process steps, breathing-gradient CTA, footer. The right side of the hero shows a real dashboard screenshot instead of the 3D robot.
- **App (`/app`)**: the shadcn tokens above, light by default, `.dark` toggle. The blue accent (`--brand`) is taken from the template's CTA blue. Status colours (`--success`, `--warning`, `--danger`) are added for badges, since the template has only `--destructive`.
