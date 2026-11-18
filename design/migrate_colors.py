"""One-off migration: hard-coded slate/blue/green/amber/red hex colours in frontend/src -> design tokens.

Run from frontend/:  python ../design/migrate_colors.py
Also bumps inline fontSize 11/12/13px -> 12/13/14px so body text is >= 14px (DESIGN_TOKENS.md, Step D).
"""
import pathlib
import re

MAP = {
    # text / surfaces / borders (Tailwind slate scale used by the old UI)
    "#0f172a": "var(--foreground)", "#1e293b": "var(--foreground)", "#334155": "var(--foreground)",
    "#475569": "var(--muted-foreground)", "#64748b": "var(--muted-foreground)", "#94a3b8": "var(--muted-foreground)",
    "#cbd5e1": "var(--border)", "#e2e8f0": "var(--border)",
    "#f1f5f9": "var(--muted)", "#f8fafc": "var(--muted)", "#ffffff": "var(--card)", "#fff": "var(--card)",
    # brand blue
    "#2563eb": "var(--brand)", "#1d4ed8": "var(--brand)", "#1e3a8a": "var(--brand)",
    "#eff6ff": "var(--brand-soft)", "#bfdbfe": "var(--brand-border)", "#dbeafe": "var(--brand-soft)",
    # success
    "#16a34a": "var(--success)", "#15803d": "var(--success)", "#166534": "var(--success)",
    "#f0fdf4": "var(--success-soft)", "#bbf7d0": "var(--success-border)", "#dcfce7": "var(--success-soft)",
    # warning
    "#d97706": "var(--warning)", "#b45309": "var(--warning)", "#92400e": "var(--warning)", "#f59e0b": "var(--warning)",
    "#fffbeb": "var(--warning-soft)", "#fef3c7": "var(--warning-border)", "#fde68a": "var(--warning-border)",
    # danger
    "#dc2626": "var(--danger)", "#b91c1c": "var(--danger)", "#ef4444": "var(--danger)",
    "#fef2f2": "var(--danger-soft)", "#fecaca": "var(--danger-border)", "#fee2e2": "var(--danger-soft)",
}
FONT = {"11px": "12px", "12px": "13px", "13px": "14px"}

hex_re = re.compile(r"#[0-9a-fA-F]{6}\b|#fff\b", re.I)
font_re = re.compile(r"fontSize: '(1[123]px)'")

left = {}
for p in pathlib.Path("src").rglob("*.tsx"):
    if "components/ui" in p.as_posix():
        continue
    s = p.read_text(encoding="utf-8")
    t = hex_re.sub(lambda m: MAP.get(m.group(0).lower(), m.group(0)), s)
    t = font_re.sub(lambda m: f"fontSize: '{FONT[m.group(1)]}'", t)
    for h in hex_re.findall(t):
        left[h] = left.get(h, 0) + 1
    if t != s:
        p.write_text(t, encoding="utf-8")
print("unmapped hex colours left:", left or "none")
