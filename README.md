# daisy-daisy-cards-gifts

Independent zero-dependency static site for Henry Goldsmith. Open index.html via any static server. No build or paid services required.

## Functional scope
Forms prepare a visible request or call note. Email links open the visitor's email app; no message is automatically sent. A reference is local, not a server booking. No payments, confirmed bookings, delivery promises or invented prices.

## Before owner launch
Confirm contact details, hours, service/menu content and accessibility needs with the owner. Replace the candidate GitHub Pages canonical/social URLs with the actual deployment URL. Search indexing is blocked by robots.txt pending owner launch approval. Remove that block and submit sitemap.xml only at approved launch. No real merchant checkout is configured.

## Security and privacy
No third-party scripts, fonts, trackers or card handling. Executable JavaScript is self-hosted and CSP permits only self scripts. Form input is escaped or inserted as text. Gift shortlists use localStorage; visit details stay in the current tab.

Prepared 15 November 2026.

## Verification — 15 November 2026
Browser checks: 375px, 390px, 768px and 1440px widths; no horizontal overflow. Form flows exercised without sending an email or calling. All local assets, scripts, JSON-LD, single h1 and external-link protections checked. Not tested: live telephone ownership, owner acceptance, live checkout, Safari/Firefox, Lighthouse, formal WCAG certification or Google Rich Results.

## 15 November 2026: reference-led design and evidence pass
See DESIGN.md for sources, design decisions and attribution. Live Maps and publicly accessible social details were audited; full private/social archives were not accessible. Site changes use confirmed details, original code-native illustrations and keyboard/touch interaction. No client launch or payments enabled.
## Final polish — 15 November 2026
Scroll-reveal section entrances (IntersectionObserver, reduced-motion safe), pointer parallax on the hero visual (fine-pointer only), Daisy shortlist-count pop feedback, and added structured data: contactPoint, hasOfferCatalog (barbers) and FAQPage schema, plus og:locale/og:site_name/twitter parity and sentence-case ribbon copy. All zero-dependency, still no pricing or unverified claims. Verified one h1, strict script policy, no overflow at 375/768/1440/1920, and keyboard/touch flows.

## Vibrancy & real flower photos — 15 November 2026
- Added a real-photo gallery (Fresh flowers & gift styling) using free Unsplash images, self-hosted and optimised under `assets/photos/`. Photos are labelled illustrative styling, not a live inventory.
- Photo sources (Unsplash, free licence): bouquet-2 `photo-1496062031456-07b8f162a322`, tulips `photo-1506197603052-3cc9c3a201bd`, bouquet-1 `photo-1490750967868-88aa4486c946`, single-rose `photo-1518895949257-7621c3c786d7`, gift-bouquet `photo-1519225421980-715cb0215aed`, floral-pink `photo-1466692476868-aef1dfb1e735`.
- Brand vibrancy pass: richer rose/gold/sage palette, gradient headline and section headings, gradient primary buttons, glowing hero halo (blur, pointer-events none), selected-card emphasis, and a responsive 3/2 + 3/4 photo grid. All motion/depth respects `prefers-reduced-motion`; no external requests; strict CSP unchanged; one h1 retained.
