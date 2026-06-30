# Novara — AI Originality & Plagiarism Platform

A premium dark-themed React application for detecting AI-generated content and plagiarism in both text and source code. Powered by Gemini AI (free tier).

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Gemini API Key
Open `src/utils/gemini.js` and replace:
```js
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
```
with your actual key. Get a **free key** at: https://aistudio.google.com/app/apikey

### 3. Start the app
```bash
npm start
```
The app opens at http://localhost:3000

---

## ✨ Features

### Text Analysis
- Paste or drag-and-drop text files
- Fast / Deep mode toggle
- Similarity threshold slider (0.1 – 0.9)
- Sentence-level plagiarism detection with color-coded highlights
- Hover tooltips showing match % and source
- Top-K similar sources panel
- AI vs Human probability gauges
- **Humanize Text** — rewrites flagged content with Gemini AI
- Copy to clipboard / download report

### Code Analysis
- Support for 18+ programming languages (auto-detected)
- AI generation probability gauge
- Plagiarism score with pattern detection
- Highlights AI-style coding patterns
- **Humanize Code** — rewrites while preserving functionality
- Copy original / humanized code

### Dashboard
- Originality trend chart (Area chart)
- Risk distribution pie chart
- Stats: avg originality, words analyzed, flagged sentences, corpus size
- Recent checks preview

### Reference Library
- Add your own reference documents
- Documents are used for semantic plagiarism comparison
- Seeded with 3 example documents
- Preview / delete any document

### History
- Full history of all text and code checks
- Search and filter by type
- Delete individual records

### Settings
- Default analysis mode (Fast/Deep)
- Default similarity threshold
- Language preference

---

## 🎨 Design

- **Color palette:** Dark premium (#0B1120 background, #7C3AED accent)
- **Typography:** Inter font
- **Components:** Glassmorphism cards, animated circular gauges, gradient buttons
- **Animations:** Fade-in, count-up, smooth hover transitions
- **Responsive:** Works on desktop, laptop, tablet, and mobile

---

## 📁 Project Structure

```
novara/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   └── TopBar.jsx
│   │   └── CircularGauge.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── TextAnalysis.jsx
│   │   ├── CodeAnalysis.jsx
│   │   ├── History.jsx
│   │   ├── Library.jsx
│   │   └── Settings.jsx
│   ├── utils/
│   │   ├── gemini.js       ← Add your API key here
│   │   ├── storage.js
│   │   └── toast.js
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── index.js
└── package.json
```

---

## 🔑 Gemini API

The free tier of Gemini 1.5 Flash is used for:
- `humanizeText()` — rewrites text to sound human
- `humanizeCode()` — rewrites code while preserving logic
- `analyzeTextWithAI()` — deep semantic analysis
- `analyzeCodeWithAI()` — AI pattern detection

All calls include graceful fallback if the API is unavailable.

---

## 📝 Notes

- All data (checks, library) is stored in `localStorage` — no backend required
- The plagiarism engine uses **Jaccard similarity** on tokenized sentences against your reference library
- For a production setup, replace the frontend similarity engine with a real vector database (FAISS) + backend (FastAPI)
