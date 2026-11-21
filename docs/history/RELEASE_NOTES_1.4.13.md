# Grim 1.4.13 — Matte Card Finish

This is a **visual finish polish patch** built on Grim 1.4.12, not a renderer redesign.

- Regular cards: matte charcoal, no constant glossy/gray veil over text or portraits.
- Active cards: small satin reflection and quiet silver/gray perimeter response.
- Burning: warm narrow foil + existing flame/ember edge treatment.
- Frozen: cool narrow foil + existing crystalline frost border.
- Damage: existing localized cracks, wear and 0-HP shatter remain intact.
- HTML card fallback: the broad shine was also reduced.

The foil is now a sparse GPU material whose visibility is disabled for ordinary inactive cards. The card image is still repainted only when its combat data or portrait changes. No new asset downloads or dependencies were added. The user-supplied ambience recordings are included unchanged.

**Verify after deployment:** open the Stage, compare a clean card against an active card, then add Burning/Frozen and rotate the Ground camera. Confirm the stage header says `MATTE FINISH 1.4.13`. Browser audio needs a click to enable, as before.
