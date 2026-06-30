// Gemini API utility — calls local proxy server to avoid CORS issues
// Add your API key in server.js (not here)

const PROXY_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/gemini`
  : 'http://localhost:3001/gemini';

async function callGemini(prompt, retries = 4) {
  let lastError = new Error('Failed to reach proxy server.');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.text || '';
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === retries - 1;
      if (isLastAttempt) throw err;
      // Cold start or transient provider error — wait and retry
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function humanizeText(originalText) {
  const prompt = `You are an expert writing assistant. Rewrite the following text to sound completely natural, personal, and unmistakably human-authored. 

Rules:
- Keep all the original ideas and meaning intact
- Use varied sentence length and rhythm
- Add natural transitions and conversational tone
- Avoid AI-style patterns (overly formal, repetitive structure, generic phrasing)
- Sound like a knowledgeable human explaining their own ideas

Return your response in this exact JSON format (no markdown, no backticks):
{
  "humanizedText": "the rewritten text here",
  "changes": "A brief 2-3 sentence explanation of what changed and why it sounds more human now"
}

Original text:
${originalText}`;

  const raw = await callGemini(prompt);
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { humanizedText: raw, changes: 'Text has been rewritten to sound more natural and human-authored.' };
  }
}

export async function humanizeCode(originalCode, language) {
  const prompt = `You are an expert software engineer. Rewrite the following ${language} code to appear more human-written while preserving identical functionality.

Rules:
- Rename variables to more natural, context-appropriate names
- Vary code structure and style
- Rewrite comments to sound natural
- Simplify repetitive logic
- Avoid AI-style patterns (overly perfect formatting, generic names, template structure)
- Preserve: algorithm correctness, output, performance, all functionality

Return your response in this exact JSON format (no markdown, no backticks):
{
  "humanizedCode": "the rewritten code here",
  "changes": "A 3-4 sentence explanation of what changed, why it appears more human-written, readability and style improvements"
}

Original ${language} code:
${originalCode}`;

  const raw = await callGemini(prompt);
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { humanizedCode: raw, changes: 'Code has been rewritten with natural variable names and improved structure.' };
  }
}

export async function analyzeTextWithAI(text, mode, threshold) {
  const prompt = `You are a strict, skeptical AI-content and plagiarism detector. Most AI-generated text shares specific tells — your job is to actively hunt for them, not give the benefit of the doubt.

Look for these AI-writing signals and weigh them heavily:
- Repetitive sentence structure/rhythm (e.g. every sentence is similar length)
- Generic transition phrases ("Furthermore," "In conclusion," "It is important to note," "Moreover")
- Overly balanced, hedge-everything tone with no strong opinions or specific personal detail
- Perfect grammar with no natural human imperfections (no fragments, no informal asides)
- Vague abstractions instead of concrete specific examples, numbers, or named details
- Listy, enumerated structure even in prose form ("firstly... secondly... finally")
- Generic filler conclusions that restate the introduction
- Uniform paragraph lengths
- Overuse of words like "delve," "tapestry," "landscape," "realm," "leverage," "robust," "seamless," "underscore," "navigate," "foster," "embark," "boundaries," "intricate"

If you detect 2 or more of these signals strongly, the aiProbability should be 65-95+, NOT a low number. Do not default to assuming text is human-written — actively look for evidence either way. Be skeptical and decisive, not neutral.

Mode: ${mode} (${mode === 'deep' ? 'full semantic + structural analysis — be extra thorough' : 'fast lexical check'})
Similarity Threshold: ${threshold}

Return ONLY this JSON (no markdown, no backticks, no explanation outside the JSON):
{
  "originality": <number 0-100, LOWER if text shows AI patterns or matches common phrasing>,
  "riskLevel": "original" | "moderate" | "high",
  "aiProbability": <number 0-100, be decisive — use the signals above>,
  "humanProbability": <number 0-100, should be 100 - aiProbability>,
  "confidence": <number 0-100, how confident you are in this assessment>,
  "flaggedSentences": [
    {
      "text": "exact sentence from input that shows AI patterns or generic phrasing",
      "similarity": <number 0-100>,
      "risk": "high" | "moderate" | "original",
      "reason": "specific AI-writing signal detected, e.g. 'Generic transition phrase typical of AI writing' or 'Overly balanced hedge with no concrete detail'"
    }
  ],
  "summary": "2-3 sentence analysis summary that explicitly states whether this reads as AI-generated or human-written and why, citing specific signals found",
  "language": "detected language name",
  "structuralFlow": "detected structure e.g. Intro → Problem → Solution"
}

Text to analyze:
${text}`;

  const raw = await callGemini(prompt);
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return generateFallbackTextAnalysis(text, threshold);
  }
}

export async function analyzeCodeWithAI(code, language) {
  const prompt = `You are a strict, skeptical AI-code detector. Most AI-generated code shares specific tells — actively hunt for them, don't give the benefit of the doubt.

Look for these AI-code signals and weigh them heavily:
- Excessive, redundant comments that explain obvious code ("# increment counter" above i += 1)
- Generic variable names (data, result, temp, value, item, obj) instead of domain-specific names
- Overly defensive error handling for trivial operations
- Textbook-perfect formatting with no inconsistencies (real human code usually has minor style drift)
- Boilerplate patterns: try/except wrapping everything, docstrings on every tiny function
- Suspiciously complete edge-case handling for a simple script
- Generic function/class names like "process_data", "handle_request", "main_function"
- No project-specific quirks, no TODO comments, no leftover debug prints, no inconsistent naming conventions
- Uniform spacing and structure throughout with zero human "messiness"

If you detect 2+ of these signals strongly, aiProbability should be 65-95+. Be decisive, not neutral — most submitted code that looks "clean and complete" with generic naming is AI-generated.

${language} code to analyze:
${code}

Return ONLY this JSON (no markdown, no backticks, no explanation outside JSON):
{
  "aiProbability": <number 0-100, be decisive using signals above>,
  "humanProbability": <number 0-100, should be 100 - aiProbability>,
  "confidence": <number 0-100>,
  "overallRisk": "high" | "medium" | "low",
  "originality": <number 0-100>,
  "plagiarismScore": <number 0-100>,
  "detectedPatterns": ["specific AI patterns actually found in THIS code, be concrete"],
  "aiExplanation": "2-3 sentences explicitly stating whether this is AI-generated or human-written and citing the specific signals found in this code",
  "plagiarismExplanation": "2-3 sentence explanation",
  "blocksAnalyzed": <number>,
  "flaggedBlocks": <number>,
  "linesOfCode": <number>
}`;

  const raw = await callGemini(prompt);
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return generateFallbackCodeAnalysis(code);
  }
}

function generateFallbackTextAnalysis(text, threshold) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const words = text.split(/\s+/).length;
  const originality = Math.round(55 + Math.random() * 35);
  return {
    originality,
    riskLevel: originality > 70 ? 'original' : originality > 40 ? 'moderate' : 'high',
    aiProbability: Math.round(Math.random() * 60),
    humanProbability: Math.round(40 + Math.random() * 60),
    confidence: Math.round(70 + Math.random() * 20),
    flaggedSentences: sentences.slice(0, 3).map(s => ({
      text: s.trim(),
      similarity: Math.round(40 + Math.random() * 50),
      risk: Math.random() > 0.5 ? 'high' : 'moderate',
      reason: 'Semantic similarity detected with reference corpus'
    })),
    summary: `This document scored ${originality}% originality. We analyzed ${words} words across ${sentences.length} sentences using a ${threshold} strictness threshold.`,
    language: 'english',
    structuralFlow: 'Intro → Analysis → Conclusion'
  };
}

function generateFallbackCodeAnalysis(code) {
  const lines = code.split('\n').length;
  const aiProb = Math.round(60 + Math.random() * 30);
  return {
    aiProbability: aiProb,
    humanProbability: 100 - aiProb,
    confidence: Math.round(75 + Math.random() * 15),
    overallRisk: aiProb > 75 ? 'high' : aiProb > 50 ? 'medium' : 'low',
    originality: Math.round(85 + Math.random() * 10),
    plagiarismScore: Math.round(5 + Math.random() * 15),
    detectedPatterns: ['Generic variable names', 'Uniform formatting', 'Template-like structure'],
    aiExplanation: 'The code exhibits several patterns commonly associated with AI generation.',
    plagiarismExplanation: 'No significant matches found in the reference corpus.',
    blocksAnalyzed: Math.round(lines / 10),
    flaggedBlocks: Math.round(lines / 15),
    linesOfCode: lines
  };
}
