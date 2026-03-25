# Design System Strategy: The Financial Architect

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Financial Architect."** 

In the world of tax and financial piloting, clarity is paramount, but prestige is what builds trust. This system moves away from the "SaaS-blue-box" trope. Instead, it adopts an editorial, high-contrast aesthetic that treats financial data like a curated exhibition. We break the grid through **intentional asymmetry**: large-scale display typography balanced against dense, microscopic data sets. By utilizing overlapping surfaces and a deep, nocturnal palette, we create an environment that feels authoritative yet warm—shifting the user's perception from "doing taxes" to "navigating wealth."

## 2. Colors & Tonal Philosophy
The palette is rooted in a deep navy foundation (`surface: #111125`), punctuated by a glowing amber accent (`secondary: #ffb955`) that guides the eye to critical actions.

*   **Primary & Sophistication:** We utilize `primary: #adc8f5` for interactive depth and `primary_container: #1e3a5f` for structural grounding.
*   **The "No-Line" Rule:** We strictly prohibit 1px solid borders for sectioning. Structural boundaries must be defined solely through background color shifts. For instance, a `surface_container_low` section should sit directly against a `surface` background. If you feel the need for a line, you haven't used your surface tiers effectively.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers of smoked glass. Use `surface_container_lowest` for the base canvas and "nest" higher importance data in `surface_container` or `surface_container_high`. This creates a natural, tactile depth that feels premium rather than flat.
*   **The "Glass & Gradient" Rule:** Floating modals or navigation bars should leverage Glassmorphism. Use semi-transparent surface colors with a `backdrop-blur`. 
*   **Signature Textures:** For primary CTAs and hero data visualizations, apply a subtle linear gradient from `primary` to `primary_container`. This adds a "soul" to the interface that flat hex codes cannot replicate.

## 3. Typography: Editorial Authority
We use **Manrope** exclusively. Its geometric yet approachable structure is the backbone of our "Professional/Warm" duality.

*   **Display & Headlines:** Use `display-lg` and `headline-lg` to create "Editorial Anchors." These should be used with generous leading to let the brand breathe.
*   **Data Density:** `label-md` and `body-sm` are the workhorses for financial tables. Despite the dark background, maintain high contrast using `on_surface` to ensure legibility of complex tax figures.
*   **The Hierarchy of Trust:** Large headlines convey the "story" (e.g., "Your Refund Status"), while tight, disciplined labels provide the "proof" (e.g., specific line items). This contrast in scale signals a sophisticated, well-organized system.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are largely replaced by **Tonal Layering**. We define hierarchy through light, not lines.

*   **The Layering Principle:** To lift a card, do not add a border. Instead, place a `surface_container_high` card on a `surface_container_low` background. The subtle shift in luminance creates a soft, natural lift.
*   **Ambient Shadows:** Where floating elements are required (like Tooltips), shadows must be extra-diffused. Use a blur of `16px` to `24px` with an opacity of `6%`. The shadow color should be a tinted version of the background (`#000000` is forbidden; use a darkened `primary_fixed_dim`).
*   **The "Ghost Border" Fallback:** If a container lacks sufficient contrast against its neighbor, use a "Ghost Border": the `outline_variant` token at **15% opacity**. This provides a whisper of a boundary without cluttering the visual field.

## 5. Components

### Buttons
*   **Primary:** A pill-shaped (`full` roundedness) container using the `secondary` (Amber) token for high-intent actions. Text should be `on_secondary`.
*   **Secondary:** Ghost-style buttons using `outline` but with a subtle `surface_container_highest` hover state.
*   **Tertiary:** No container. Just `primary` colored text with an icon, used for low-emphasis navigation.

### Input Fields
*   **Structure:** No 4-sided boxes. Use a `surface_container` background with a bottom-only "Ghost Border."
*   **States:** On focus, the bottom border transforms into a `primary` glow. Error states utilize `error` and `error_container` with high-contrast text to ensure accessibility in financial reporting.

### Chips & Tags
*   **Selection:** Use `primary_container` with `on_primary_container` text.
*   **Financial Status:** Use `tertiary_container` (warm gold) for pending items and `error_container` for alerts. Keep corners at `md` (0.375rem) to maintain a professional, architectural feel.

### Cards & Lists
*   **No Dividers:** Absolute prohibition of horizontal rules between list items. Use vertical white space (Scale `4` or `5`) or alternating tonal shifts between `surface_container_low` and `surface_container` to separate data rows.
*   **Layout:** Use asymmetrical padding—more breathing room at the top of a card than the bottom—to give the content an editorial "hang."

### Tooltips
*   **Visuals:** `surface_container_highest` with a backdrop-blur. 
*   **Interaction:** 200ms fade-in with a subtle 4px vertical slide-up.

## 6. Do's and Don'ts

### Do
*   **Do** use `secondary` (Amber) sparingly. It is a lighthouse, not a floodlight.
*   **Do** prioritize `Manrope` Medium and Bold weights for financial figures to ensure they "pop" against the dark surfaces.
*   **Do** use the Spacing Scale religiously. Consistent gaps (e.g., `8` or `10`) create the "rhythm" of a premium app.
*   **Do** leverage `surface_bright` for hover states to give the user immediate, tactile feedback.

### Don't
*   **Don't** use pure black `#000000`. It kills the "warmth" of the financial pilot experience. Use `surface_container_lowest`.
*   **Don't** use 1px dividers to separate sections. If the sections bleed together, your background tonal choices are too similar.
*   **Don't** use standard "system" roundedness. Stick to the `md` and `xl` tokens to maintain the architectural signature.
*   **Don't** cram data. If a table feels tight, increase the vertical spacing to `3` or `4` units. Premium experiences require room to think.