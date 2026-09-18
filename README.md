# Shoshana Over — Portfolio Site

A single-page portfolio site centered on algae's contribution to sustainability across
research, fashion, and photography.

## Structure

- `index.html` — all page content and section markup
- `styles.css` — theme, layout, animations
- `script.js` — mobile nav toggle, scroll-reveal, and parallax scroll effect
- `assets/resume/` — downloadable resume PDF
- `assets/img/` — image assets (photography section, once ready)

No build step — plain HTML/CSS/JS, safe to hand-edit directly.

## Local preview

From this folder:

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173 in a browser.

## Deploying (GitHub Pages, free)

1. Create a new GitHub repository and push this folder to it.
2. In the repo settings, enable **GitHub Pages** for the `main` branch (root folder).
3. GitHub will publish the site at `https://<username>.github.io/<repo-name>/`.

## Editing content later

All section content lives directly in `index.html`, split into clearly labeled
`<section>` blocks (Research, Fashion, Modeling, Photography, About, Contact).
Colors and fonts are defined as CSS variables at the top of `styles.css`.
