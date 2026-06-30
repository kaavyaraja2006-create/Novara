// Local storage helpers for Novara — all data namespaced per logged-in user

import { getSession } from './auth';

function userKey(base) {
  const session = getSession();
  const uid = session?.id || 'guest';
  return `novara_${base}_${uid}`;
}

// --- Checks (history) ---
export function getChecks() {
  try { return JSON.parse(localStorage.getItem(userKey('checks')) || '[]'); }
  catch { return []; }
}
export function saveCheck(check) {
  const checks = getChecks();
  const entry = { ...check, id: Date.now().toString(), createdAt: new Date().toISOString() };
  checks.unshift(entry);
  localStorage.setItem(userKey('checks'), JSON.stringify(checks.slice(0, 100)));
  return entry;
}
export function deleteCheck(id) {
  const checks = getChecks().filter(c => c.id !== id);
  localStorage.setItem(userKey('checks'), JSON.stringify(checks));
}

// --- Reference Library ---
export function getLibrary() {
  try {
    const stored = JSON.parse(localStorage.getItem(userKey('library')) || 'null');
    if (stored) return stored;
    // Default seed documents for brand-new accounts
    const seeded = [
      { id: '1', title: 'On the Architecture of Attention', author: 'Mira Holst', content: 'Attention in modern transformer models is essentially a learned routing mechanism. Each token decides dynamically how much to listen to every other token in the sequence. The math involves dot products between queries and keys, scaled and normalized through softmax, used to weight values. What gives this power is not the algebra but the scale across layers and billions of parameters. Something resembling reasoning emerges at scale.', words: 218, addedAt: '2026-04-30' },
      { id: '2', title: 'The Quiet Death of the Open Web', author: 'Sade Okafor', content: 'The open web that once promised free information exchange has been gradually enclosed by platform capitalism. Social media companies, search giants, and cloud providers have built walls around content that was once freely accessible. Independent publishers struggle against algorithmic gatekeeping that favors engagement over truth. The hyperlink economy that Tim Berners-Lee envisioned has been replaced by notification-driven silos.', words: 216, addedAt: '2026-04-30' },
      { id: '3', title: 'Notes on Climate Risk and Long Bonds', author: 'Daniel Erez', content: 'Long-duration bonds face an increasingly complex risk environment as climate change introduces novel systemic factors. Coastal infrastructure debt, agricultural commodity volatility, and energy transition costs create tail risks that traditional fixed-income models fail to capture. Investors pricing long bonds over 20-30 year horizons must now incorporate physical climate risk scenarios alongside conventional interest rate and credit analysis.', words: 208, addedAt: '2026-04-30' },
    ];
    localStorage.setItem(userKey('library'), JSON.stringify(seeded));
    return seeded;
  } catch { return []; }
}
export function saveToLibrary(doc) {
  const lib = getLibrary();
  const entry = { ...doc, id: Date.now().toString(), addedAt: new Date().toISOString().split('T')[0] };
  lib.push(entry);
  localStorage.setItem(userKey('library'), JSON.stringify(lib));
  return entry;
}
export function deleteFromLibrary(id) {
  const lib = getLibrary().filter(d => d.id !== id);
  localStorage.setItem(userKey('library'), JSON.stringify(lib));
}

// --- Settings ---
export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(userKey('settings')) || 'null') || {
      threshold: 0.5,
      defaultMode: 'fast',
      language: 'auto',
    };
  } catch { return { threshold: 0.5, defaultMode: 'fast', language: 'auto' }; }
}
export function saveSettings(settings) {
  localStorage.setItem(userKey('settings'), JSON.stringify(settings));
}

// --- Plagiarism scoring against library ---
export function computePlagiarism(text, library) {
  if (!library.length) return { matches: [], topSources: [] };
  const inputSentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const results = [];

  library.forEach(doc => {
    const docSentences = doc.content.match(/[^.!?]+[.!?]+/g) || [doc.content];
    let matchCount = 0;
    const matchedSentences = [];

    inputSentences.forEach(inSent => {
      docSentences.forEach(docSent => {
        const sim = jaccardSimilarity(tokenize(inSent), tokenize(docSent));
        if (sim > 0.3) {
          matchCount++;
          matchedSentences.push({ sentence: inSent.trim(), similarity: Math.round(sim * 100) });
        }
      });
    });

    if (matchCount > 0) {
      const overallSim = Math.round((matchCount / inputSentences.length) * 100);
      results.push({ doc, similarity: overallSim, matchedSentences: matchedSentences.slice(0, 5) });
    }
  });

  results.sort((a, b) => b.similarity - a.similarity);
  return { matches: results, topSources: results.slice(0, 5) };
}

function tokenize(text) {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  );
}

function jaccardSimilarity(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size ? intersection.size / union.size : 0;
}

const STOPWORDS = new Set(['this','that','with','have','from','they','been','were','there','their','what','when','where','which','will','would','could','should','about','into','more','also','than','then','each','such','these','those','some','many','most','very','just','like','only','even','both','well','much','over','after','before','through','between','under','while','during','other','same','your','here','them','being','itself','himself','herself','ourselves','themselves']);

export function detectLanguage(text) {
  const commonEnglish = ['the', 'is', 'in', 'and', 'to', 'of'];
  const words = text.toLowerCase().split(/\s+/);
  const englishCount = words.filter(w => commonEnglish.includes(w)).length;
  return englishCount > 2 ? 'English' : 'Unknown';
}

export function detectCodeLanguage(code) {
  if (/def |import |print\(|#/.test(code)) return 'python';
  if (/public class|System\.out|void main/.test(code)) return 'java';
  if (/function |const |let |var |=>/.test(code)) return 'javascript';
  if (/interface |type |: string|: number/.test(code)) return 'typescript';
  if (/#include|int main|cout|cin/.test(code)) return 'cpp';
  if (/func |fmt\.|package main/.test(code)) return 'go';
  if (/fn |let mut|use std/.test(code)) return 'rust';
  if (/<\?php|echo |->/.test(code)) return 'php';
  if (/SELECT|FROM|WHERE|INSERT/.test(code)) return 'sql';
  if (/<html|<div|<body/.test(code)) return 'html';
  return 'auto';
}

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getRiskBadge(originality) {
  if (originality >= 70) return { label: 'Original', cls: 'badge-success' };
  if (originality >= 40) return { label: 'Moderate', cls: 'badge-warning' };
  return { label: 'High Risk', cls: 'badge-danger' };
}
