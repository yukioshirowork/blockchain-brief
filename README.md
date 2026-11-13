# Blockchain Brief

A daily bilingual (English / 日本語) brief on blockchain technology, published with GitHub Pages.

- Each brief has a **Dev** section (protocol upgrades, smart contracts, security details, tooling) and a **Non-dev** section (market, business, regulation, plain-language summaries of incidents).
- An **EN / 日本語** toggle switches language; the choice is remembered.
- A **Listen / 読み上げ** button reads the brief aloud with the browser's built-in Web Speech API (free, no audio files). It picks an English or Japanese voice to match the page language, can read the whole brief or just one section, and supports speed and voice choice.
  - No Japanese voice? iPhone/iPad: Settings › Accessibility › Spoken Content › Voices › Japanese. Android: Settings › Text-to-speech. Windows: Settings › Time & language › Speech. macOS: System Settings › Accessibility › Spoken Content.

## Layout

```
index.html            Home page: latest brief + archive (rendered from briefs.json)
briefs.json           Archive list, one entry per brief
briefs/YYYY-MM-DD.html One page per day
assets/style.css      Shared styles (light/dark, phone width)
assets/brief.js       Language toggle + read-aloud
assets/index.js       Renders the archive
```

## Adding a brief

1. Copy the most recent `briefs/YYYY-MM-DD.html` to today's date and replace the content only. Keep the structure:
   - two `<article>` elements, `data-lang="en"` and `data-lang="ja"` (the Japanese one has `hidden`), with the same items in both;
   - in each: `header.brief`, `section.track.dev`, `section.track.nondev`, `section.sources`;
   - items are `div.item` with an optional `span.tag` (`data-noread`), an `h3`, `p`s, and `p.unverified` for unconfirmed claims;
   - the `#audio` panel, the pager and `../assets/brief.js` unchanged;
   - update `<title>`, `<meta name="description">`, and `data-title-en` / `data-title-ja` on `<body>`.
2. Add an entry at the top of `briefs.json` with `date`, `file`, `title.en/ja`, `summary.en/ja`.
3. Commit and push to `main`. Pages redeploys in a minute or two.

Written with Claude from public sources. Not financial advice.
