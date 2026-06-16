// Shared design tokens for the deck builders (build_deck*.js).
// Only the colour palette, fonts and canvas size live here — they're identical
// across every deck. Typography helpers (lightHeader, bullets, shadow…) stay
// local to each builder because they've intentionally diverged per deck.

// ---- Palette: Forest & Moss ----
const FOREST = "1E3A24";   // deep forest (dark bg)
const FOREST2 = "2C5F2D";  // forest green
const MOSS = "97BC62";     // moss accent
const MINT = "5EC57A";     // bright leaf
const CREAM = "F5F7F2";    // light bg
const INK = "26312A";      // body text
const MUTE = "6B7A6E";     // muted text
const WHITE = "FFFFFF";
const PALE = "E9F0E3";     // pale tint

// ---- Fonts (Tahoma renders Thai) ----
const HF = "Tahoma";       // header font
const BF = "Tahoma";       // body font

// ---- Canvas (LAYOUT_WIDE = 13.33in × 7.5in) ----
const W = 13.33, H = 7.5;

module.exports = { FOREST, FOREST2, MOSS, MINT, CREAM, INK, MUTE, WHITE, PALE, HF, BF, W, H };
