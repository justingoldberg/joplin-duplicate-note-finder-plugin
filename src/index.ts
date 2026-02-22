import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
  onStart: async function() {
    // Register the command
    await joplin.commands.register({
      name: 'findDuplicateNotes',
      label: 'Find Duplicate Notes',
      iconName: 'fas fa-copy',
      execute: async () => {
        await openDuplicateFinderDialog();
      },
    });

    // Add to Tools menu
    await joplin.views.menuItems.create(
      'menuItemFindDuplicates',
      'findDuplicateNotes',
      MenuItemLocation.Tools,
      { accelerator: 'CmdOrCtrl+Shift+D' }
    );

    // Create the panel/dialog view
    const panel = await joplin.views.panels.create('duplicateFinderPanel');
    await joplin.views.panels.setHtml(panel, '<p>Loading...</p>');
    await joplin.views.panels.hide(panel);

    async function openDuplicateFinderDialog() {
      await joplin.views.panels.setHtml(panel, buildUI());
      await joplin.views.panels.show(panel);
    }

    // Handle messages from the panel UI
    await joplin.views.panels.onMessage(panel, async (message: any) => {
      if (message.type === 'scan') {
        const threshold = message.threshold / 100;
        const duplicates = await findDuplicates(threshold);
        return { type: 'results', duplicates };
      }
      if (message.type === 'openNote') {
        await joplin.commands.execute('openNote', message.noteId);
      }
      if (message.type === 'close') {
        await joplin.views.panels.hide(panel);
      }
    });
  },
});

// ── Similarity helpers ────────────────────────────────────────────────────────

/**
 * Tokenise text into a bag-of-words set (lowercased words, stripped markdown).
 */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    // strip markdown syntax characters
    .replace(/[#*_`\[\]()>~\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Jaccard similarity between two token arrays.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  setA.forEach(token => { if (setB.has(token)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// ── Note fetching & duplicate detection ──────────────────────────────────────

interface NoteInfo {
  id: string;
  title: string;
  tokens: string[];
  bodyPreview: string;
}

interface DuplicatePair {
  a: { id: string; title: string; preview: string };
  b: { id: string; title: string; preview: string };
  similarity: number;
}

async function fetchAllNotes(): Promise<NoteInfo[]> {
  const notes: NoteInfo[] = [];
  let page = 1;

  while (true) {
    const result = await joplin.data.get(['notes'], {
      fields: ['id', 'title', 'body'],
      limit: 50,
      page,
    });

    for (const note of result.items) {
      const body: string = note.body || '';
      notes.push({
        id: note.id,
        title: note.title || '(Untitled)',
        tokens: tokenise(body),
        bodyPreview: body.slice(0, 200).replace(/\n/g, ' '),
      });
    }

    if (!result.has_more) break;
    page++;
  }

  return notes;
}

async function findDuplicates(threshold: number): Promise<DuplicatePair[]> {
  const notes = await fetchAllNotes();
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const sim = jaccardSimilarity(notes[i].tokens, notes[j].tokens);
      if (sim >= threshold) {
        pairs.push({
          a: { id: notes[i].id, title: notes[i].title, preview: notes[i].bodyPreview },
          b: { id: notes[j].id, title: notes[j].title, preview: notes[j].bodyPreview },
          similarity: Math.round(sim * 100),
        });
      }
    }
  }

  // Sort by similarity descending
  pairs.sort((x, y) => y.similarity - x.similarity);
  return pairs;
}

// ── UI HTML ───────────────────────────────────────────────────────────────────

function buildUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--joplin-background-color, #1e1e2e);
    color: var(--joplin-color, #cdd6f4);
    padding: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    background: var(--joplin-background-color-3, #181825);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--joplin-divider-color, #313244);
    flex-shrink: 0;
  }

  header h1 {
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  #closeBtn {
    background: none;
    border: none;
    color: var(--joplin-color, #cdd6f4);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    line-height: 1;
  }
  #closeBtn:hover { background: rgba(255,255,255,0.08); }

  .controls {
    padding: 14px 18px;
    background: var(--joplin-background-color-2, #1e1e2e);
    border-bottom: 1px solid var(--joplin-divider-color, #313244);
    flex-shrink: 0;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .slider-row label {
    font-size: 13px;
    color: var(--joplin-color-faded, #a6adc8);
    white-space: nowrap;
  }

  #thresholdSlider {
    flex: 1;
    -webkit-appearance: none;
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(
      to right,
      #89b4fa 0%,
      #89b4fa var(--val, 59%),
      #313244 var(--val, 59%),
      #313244 100%
    );
    outline: none;
    cursor: pointer;
  }

  #thresholdSlider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #89b4fa;
    cursor: pointer;
    border: 2px solid #1e1e2e;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  }

  #thresholdValue {
    font-size: 14px;
    font-weight: 700;
    color: #89b4fa;
    min-width: 36px;
    text-align: right;
  }

  .marks {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--joplin-color-faded, #585b70);
    padding: 0 2px;
    margin-top: -6px;
    margin-bottom: 10px;
  }

  #scanBtn {
    background: #89b4fa;
    color: #1e1e2e;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  #scanBtn:hover { background: #74c7ec; }
  #scanBtn:disabled { background: #45475a; color: #6c7086; cursor: default; }

  #status {
    font-size: 12px;
    color: var(--joplin-color-faded, #a6adc8);
    margin-top: 8px;
    min-height: 18px;
  }

  #results {
    flex: 1;
    overflow-y: auto;
    padding: 14px 18px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--joplin-color-faded, #585b70);
    font-size: 14px;
  }
  .empty-state .icon { font-size: 36px; margin-bottom: 12px; }

  .pair-card {
    background: var(--joplin-background-color-3, #181825);
    border: 1px solid var(--joplin-divider-color, #313244);
    border-radius: 8px;
    margin-bottom: 10px;
    overflow: hidden;
  }

  .pair-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--joplin-divider-color, #313244);
    background: rgba(137,180,250,0.06);
  }

  .similarity-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 12px;
    letter-spacing: 0.5px;
  }
  .sim-high { background: rgba(243,139,168,0.2); color: #f38ba8; }
  .sim-mid  { background: rgba(249,226,175,0.2); color: #f9e2af; }
  .sim-low  { background: rgba(166,227,161,0.2); color: #a6e3a1; }

  .notes-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }

  .note-cell {
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.12s;
    border-right: 1px solid var(--joplin-divider-color, #313244);
  }
  .note-cell:last-child { border-right: none; }
  .note-cell:hover { background: rgba(137,180,250,0.08); }

  .note-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--joplin-color, #cdd6f4);
  }

  .note-preview {
    font-size: 11px;
    color: var(--joplin-color-faded, #7f849c);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.5;
  }

  .open-hint {
    font-size: 10px;
    color: #89b4fa;
    margin-top: 4px;
  }
</style>
</head>
<body>

<header>
  <h1>🔍 Duplicate Note Finder</h1>
  <button id="closeBtn" title="Close">✕</button>
</header>

<div class="controls">
  <div class="slider-row">
    <label>Similarity threshold:</label>
    <input type="range" id="thresholdSlider" min="30" max="75" value="50" step="1"/>
    <span id="thresholdValue">50%</span>
  </div>
  <div class="marks">
    <span>30% (loose)</span>
    <span>50% (default)</span>
    <span>75% (strict)</span>
  </div>
  <button id="scanBtn">Scan All Notes</button>
  <div id="status">Ready — press Scan to begin.</div>
</div>

<div id="results">
  <div class="empty-state">
    <div class="icon">📋</div>
    <div>Adjust the slider, then press <strong>Scan All Notes</strong>.</div>
  </div>
</div>

<script>
  const slider = document.getElementById('thresholdSlider');
  const valueLabel = document.getElementById('thresholdValue');
  const scanBtn = document.getElementById('scanBtn');
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');
  const closeBtn = document.getElementById('closeBtn');

  function updateSliderTrack() {
    const min = 30, max = 75;
    const pct = ((slider.value - min) / (max - min)) * 100;
    slider.style.setProperty('--val', pct + '%');
    valueLabel.textContent = slider.value + '%';
  }

  slider.addEventListener('input', updateSliderTrack);
  updateSliderTrack();

  closeBtn.addEventListener('click', () => {
    webviewApi.postMessage({ type: 'close' });
  });

  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning…';
    statusEl.textContent = 'Fetching notes and comparing — this may take a moment…';
    resultsEl.innerHTML = '';

    const threshold = parseInt(slider.value, 10);

    try {
      const response = await webviewApi.postMessage({ type: 'scan', threshold });
      renderResults(response.duplicates, threshold);
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan All Notes';
    }
  });

  function simClass(sim) {
    if (sim >= 70) return 'sim-high';
    if (sim >= 50) return 'sim-mid';
    return 'sim-low';
  }

  function renderResults(duplicates, threshold) {
    if (!duplicates || duplicates.length === 0) {
      statusEl.textContent = 'No duplicates found at ' + threshold + '% threshold.';
      resultsEl.innerHTML = \`
        <div class="empty-state">
          <div class="icon">✅</div>
          <div>No duplicate notes found at <strong>\${threshold}%</strong> similarity.</div>
        </div>\`;
      return;
    }

    statusEl.textContent = \`Found \${duplicates.length} duplicate pair\${duplicates.length !== 1 ? 's' : ''} at ≥\${threshold}% similarity.\`;

    const html = duplicates.map(pair => {
      const cls = simClass(pair.similarity);
      return \`
      <div class="pair-card">
        <div class="pair-header">
          <span style="font-size:12px;color:var(--joplin-color-faded,#a6adc8)">Similar pair</span>
          <span class="similarity-badge \${cls}">\${pair.similarity}% similar</span>
        </div>
        <div class="notes-row">
          <div class="note-cell" data-id="\${pair.a.id}">
            <div class="note-title" title="\${escapeHtml(pair.a.title)}">\${escapeHtml(pair.a.title)}</div>
            <div class="note-preview">\${escapeHtml(pair.a.preview)}</div>
            <div class="open-hint">↗ Click to open</div>
          </div>
          <div class="note-cell" data-id="\${pair.b.id}">
            <div class="note-title" title="\${escapeHtml(pair.b.title)}">\${escapeHtml(pair.b.title)}</div>
            <div class="note-preview">\${escapeHtml(pair.b.preview)}</div>
            <div class="open-hint">↗ Click to open</div>
          </div>
        </div>
      </div>\`;
    }).join('');

    resultsEl.innerHTML = html;

    // Attach click handlers to open notes
    resultsEl.querySelectorAll('.note-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        webviewApi.postMessage({ type: 'openNote', noteId: cell.dataset.id });
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
</script>
</body>
</html>`;
}
