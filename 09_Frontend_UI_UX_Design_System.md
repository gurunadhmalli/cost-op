# Frontend UI / UX Design System — Milky White Neumorphism
## AI-Powered Industrial Cost Optimization Assistant — Soft UI Design Language

---

## 1. Executive Design Philosophy

The AI-Powered Industrial Cost Optimization Assistant uses an **Ultra-Premium Milky White Neumorphism (Soft UI)** design language. 

Elements appear physically extruded and embossed from a creamy, soft porcelain canvas (`#EBF0F7`), combining organic tactile soft-shadows with vibrant industrial telemetry accents (Sky Blue `#0284C7`, Emerald `#059669`, Amber `#D97706`, Rose `#E11D48`, and Violet `#7C3AED`).

### 1.1 Core Principles of the Milky White Neumorphic UI
1. **Extruded & Molded Soft Surfaces**: Components share the same background tone as the base canvas (`#EBF0F7`), achieved via paired multi-directional soft shadows:
   - **Light highlight (top-left)**: `#FFFFFF` (soft white ambient glow).
   - **Dark shadow (bottom-right)**: `#CAD4E2` / `#B0BCCE` (soft diffused slate shadow).
2. **Tactile Depressed / Inset States**: Interactive controls (active navigation links, inputs, telemetry metric boxes, filter pill containers) use inner inset shadows (`box-shadow: inset 4px 4px 8px #cad4e2, inset -4px -4px 8px #ffffff`).
3. **High-Contrast Typography**: Deep slate and charcoal typography (`#0F172A`, `#1E293B`, `#334155`) paired with tabular monospace numbers (`JetBrains Mono`) for maximum readability in shop-floor environments.
4. **Vibrant Status Accents**: Soft pill badges with rich color contrast ensure critical anomalies and verified savings remain immediately recognizable.

---

## 2. Color Palette & Neumorphic Tokens

### 2.1 Surfaces & Canvas
| Token | Hex Value | Role / Usage |
|---|---|---|
| `bg-milky-base` | `#EBF0F7` | Global canvas and card extrusion background |
| `neu-highlight` | `#FFFFFF` | Top-left specular light bounce |
| `neu-shadow` | `#CAD4E2` | Bottom-right ambient shadow |
| `neu-shadow-dark` | `#B0BCCE` | Deep shadow for interactive hover |
| `neu-text-primary` | `#0F172A` | High-contrast headers & primary metrics |
| `neu-text-secondary` | `#475569` | Subtitles, descriptions & labels |

### 2.2 Functional Accents & Soft Indicators
| Accent | Hex Value | Meaning / Usage |
|---|---|---|
| **Sky Blue** | `#0284C7` | Primary AI intelligence, 90-day baseline, active buttons |
| **Industrial Emerald** | `#059669` | Optimal machine state, verified quarterly savings |
| **Warning Amber** | `#D97706` | Cost drift, 7-day verification in progress, medium anomaly |
| **Critical Rose** | `#E11D48` | Power draw spikes, overdue maintenance, threshold breaches |
| **Intelligence Violet** | `#7C3AED` | SHAP TreeExplainer feature attribution, AI Co-Pilot badge |

---

## 3. Neumorphic Shadow Specifications

```css
/* Extruded Flat Card */
box-shadow: 8px 8px 18px #cad4e2, -8px -8px 18px #ffffff;

/* Hover State */
box-shadow: 12px 12px 24px #c2cee0, -12px -12px 24px #ffffff;

/* Depressed / Inset Input & Active State */
box-shadow: inset 4px 4px 8px #cad4e2, inset -4px -4px 8px #ffffff;

/* Primary Action Button (Tactile Raised) */
background: linear-gradient(145deg, #0284C7, #0369A1);
box-shadow: 6px 6px 16px rgba(2, 132, 199, 0.35), -6px -6px 16px #ffffff;
```

---

## 4. Typography Hierarchy

```
Primary Sans: 'Inter', 'Plus Jakarta Sans', system-ui, sans-serif
Monospace Data: 'JetBrains Mono', 'Fira Code', monospace
```

- **H1 / Page Title**: `text-xl font-extrabold tracking-tight text-slate-800 font-sans`
- **H2 / Section Title**: `text-base font-extrabold text-slate-800 font-sans`
- **KPI Metrics**: `text-2xl font-extrabold font-mono text-slate-900 tracking-tight`
- **Telemetry Readout**: `text-xs font-mono font-extrabold text-slate-800`
- **Badges & Micro-Labels**: `text-[10px] font-mono font-bold uppercase tracking-wider`

---

## 5. Screen Layout Wireframe (Milky White Neumorphic)

```
+---------------------------------------------------------------------------------------------------+
|  [AURA.COST v2.5]  [Facility Dropdown v]  [Line Dropdown v]  | [7D|30D|90D] [₹ INR] [● LIVE] [AI Co-Pilot] |
+------------------+--------------------------------------------------------------------------------+
| NEUMORPHIC SIDEBAR | MAIN WORKSPACE (MILKY WHITE #EBF0F7)                                          |
|                  |                                                                                |
| ⊞ Command Center | [ KPI 1: Cost/Unit ] [ KPI 2: Baseline ] [ KPI 3: Savings ₹ ] [ KPI 4: OEE ]  |
| ⚠ Anomaly Radar  |                                                                                |
| ⑂ Root Cause AI  | [ Unit Cost Trajectory vs Baseline Chart ]   [ ABC Cost Distribution Donut ]   |
| ☵ What-If Studio |                                                                                |
| 🤖 AI Co-Pilot   | [ Shop-Floor Asset Telemetry Radar ]        [ High-Impact AI Action Radar ]   |
| ✓ Closed-Loop    |                                                                                |
| 🗠 ABC Reports   |                                                                                |
+------------------+--------------------------------------------------------------------------------+
```
