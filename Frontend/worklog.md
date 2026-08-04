---
Task ID: 1
Agent: main
Task: Major redesign - new orb, warm color palette, dark mode fix, landing page rework

Work Log:
- Analyzed uploaded reference images for desired warm orange/golden color palette
- Read all component files to understand current state
- Fixed globals.css: moved :root and .dark CSS variables inside @layer base (critical fix for Tailwind CSS 4 dev mode)
- Created proper dark theme with dark brown backgrounds (#0F0A04, #1C1208), orange/gold accents
- Created light theme with warm white (#FFFBF5), cream tones, orange/gold accents
- Fixed layout.tsx: defaultTheme=light, proper formatting
- Updated page.tsx to use bg-background/text-foreground CSS variables
- Completely redesigned AIOrb.tsx: 392 orbital particles across 7 tilted elliptical orbits with oval visible ring lines, central glowing core, audio equalizer ring, all in orange/gold/amber palette
- Completely redesigned LandingPage.tsx: warm gradient background (light: orange/golden/peach radial gradients on warm white; dark: subtle warm glows on dark brown), large SACHA title with golden gradient + black stroke using inline styles
- Updated all components (AuthScreen, DashboardScreen, ChatScreen, PreviewPanel, ThemeToggle, LanguageToggle) to use CSS variable-based Tailwind classes (bg-background, text-foreground, border-border, bg-card, bg-muted, text-muted-foreground, etc.)
- Added warm-hover utility class for orange glow on button hover
- Boosted orange/gold color presence throughout with --color-orange, --color-gold, --color-amber theme tokens
- 0 lint errors, clean build
- Verified: landing page light/dark, auth, dashboard, chat all render correctly in both themes

Stage Summary:
- Dark mode now works with brown backgrounds and orange/gold dominant accents
- Landing page has warm gradient background and large SACHA with golden gradient + black border
- AIOrb has 7 orbital rings with 392 particles orbiting in 3D space
- All components properly support light and dark themes via CSS variables
