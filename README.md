# Joplin Duplicate Note Finder Plugin

A Joplin plugin that detects duplicate or near-duplicate notes using **Jaccard token similarity**, with an adjustable threshold slider from 30% to 75%.

---

## Features

- 🔍 Scans **all notes** in your Joplin library
- 📊 Adjustable similarity threshold slider (**30% – 75%**, default 50%)
- 🎨 Clean dark-themed panel UI
- ↗ Click any note in the results to open it directly
- ⌨️ Keyboard shortcut: `Ctrl+Shift+D` / `Cmd+Shift+D`

---

## How it works

The plugin uses **Jaccard similarity** on tokenised note bodies:

1. Each note's body is stripped of markdown syntax and split into words (tokens ≥ 3 characters).
2. For every pair of notes, the ratio of shared unique tokens to total unique tokens is computed.
3. If the ratio is ≥ the chosen threshold, the pair is shown as a duplicate.

This means two notes with mostly the same vocabulary will be flagged, even if sentence order differs.

---

## Installation

### From source (developer mode)

**Prerequisites:** Node.js 16+, npm

```bash
# 1. Clone / download this folder
cd joplin-duplicate-finder

# 2. Install dependencies
npm install

# 3. Build the plugin
npm run dist
```

This produces `dist/index.js` — the compiled plugin entry point.

### Loading in Joplin

1. Open Joplin → **Tools → Options → Plugins**
2. Click the gear icon → **Install from file**
3. Select the **entire plugin folder** (Joplin packages it automatically), or:
   - Alternatively, zip the folder and rename it `joplin-duplicate-finder.jpl`, then install that file.

> **Tip:** For development, use Joplin's built-in plugin developer tools and point them at this directory.

---

## Usage

1. Open **Tools → Find Duplicate Notes** (or press `Ctrl+Shift+D`)
2. Adjust the **similarity slider**:
   - **30%** → loose match (flags notes with some shared vocabulary)
   - **50%** → default (good balance)
   - **75%** → strict (only near-identical notes)
3. Click **Scan All Notes**
4. Review the results — each card shows the two similar notes side by side with a similarity percentage badge
5. Click either note cell to open it in Joplin

---

## Similarity thresholds guide

| Range | Badge colour | Meaning |
|-------|-------------|---------|
| 70–75% | 🔴 Red | Very likely duplicates |
| 50–69% | 🟡 Yellow | Probably related / heavily overlapping |
| 30–49% | 🟢 Green | Somewhat similar topic / shared vocabulary |

---

## File structure

```
joplin-duplicate-finder/
├── manifest.json        ← Plugin metadata
├── package.json
├── tsconfig.json
├── webpack.config.js
└── src/
    └── index.ts         ← All plugin logic + embedded panel HTML/CSS/JS
```

---

## License

MIT
