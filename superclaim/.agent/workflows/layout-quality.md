---
description: Layout quality checklist — mandatory rules for all UI builds
---

# Layout Quality Checklist

// turbo-all

## Before writing any layout code

1. **Know the target viewport.** The primary viewport is **1680×858**. All layouts must fit within this without scrolling (unless the page is intentionally scrollable content like a feed).

2. **Count vertical elements.** Before placing elements, count how many distinct vertical blocks you're adding. Calculate:
   - Available height = viewport height − (top padding + bottom padding)
   - Each element needs: its own height + gap spacing
   - **If it doesn't fit, remove elements.** Don't shrink everything to unreadable sizes.

3. **Padding rules:**
   - Page-level section padding: **max `p-8` (32px)** on desktop. Never use `p-12` or `p-16` on contained layouts.
   - Card internal padding: **`p-3` to `p-4`** (12–16px). Never `p-5` or `p-6` on cards inside panels.
   - Form spacing: **`space-y-3` to `space-y-4`**. Never `space-y-6` or larger between form fields.

4. **Font size rules:**
   - Hero headings in split-panel layouts: **max `text-3xl`**. Never `text-4xl` or `text-5xl` in a panel.
   - Section headings (e.g. "Välkommen tillbaka"): **`text-xl`**. Never `text-2xl` or larger for form headings.
   - Body/label text: **`text-xs` to `text-sm`**. Never `text-base` for labels.
   - Stat values: **`text-sm`**. Never `text-lg` in compact layouts.

5. **Width rules for split-panel layouts:**
   - Decorative panel: **max 42%**
   - Content/form panel: **min 58%**
   - Form container max-width: **`max-w-md` (28rem = 448px)**. Never `max-w-lg` (512px) — it makes forms feel too wide.

## After writing layout code

6. **Always verify with a browser screenshot** at the actual viewport size before considering the task done.
7. **Check for overflow:** Ensure no content is clipped or pushed below the fold unintentionally.
8. **Check for overlaps:** Ensure no absolutely-positioned elements overlap interactive content.

## Common mistakes to avoid

- ❌ Adding "impressive" elements (charts, testimonials, stats) without checking if they fit
- ❌ Using `p-12`, `p-16`, `space-y-8` in contained layouts
- ❌ Using `text-4xl` or larger headings in a split-panel design
- ❌ Setting `max-w-lg` or wider for login/signup forms
- ❌ Not verifying at real viewport before finishing
