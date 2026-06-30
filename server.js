const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ✅ YOUR OPENROUTER API KEY
const OPENROUTER_API_KEY = 'YOUR OPENROUTER API KEY';

const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free',
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryModel(model, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Novara'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.7
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from model');
  return text;
}

// Tries every model, 3 attempts each, with increasing backoff —
// this absorbs cold-start failures on first request after server boot
async function callAI(prompt) {
  let lastError = '';
  const maxAttemptsPerModel = 3;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < maxAttemptsPerModel; attempt++) {
      try {
        const text = await tryModel(model, prompt);
        console.log(`✅ Success with ${model} (attempt ${attempt + 1})`);
        return text;
      } catch (err) {
        lastError = err.message;
        console.log(`⚠️  ${model} attempt ${attempt + 1}/${maxAttemptsPerModel} failed: ${lastError}`);
        if (attempt < maxAttemptsPerModel - 1) {
          await sleep(1000 * (attempt + 1)); // 1s, then 2s
        }
      }
    }
  }
  throw new Error(`All models failed after retries. Last error: ${lastError}`);
}

app.post('/gemini', async (req, res) => {
  try {
    const text = await callAI(req.body.prompt);
    res.json({ text });
  } catch (err) {
    console.error('Final error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/test', async (req, res) => {
  try {
    const text = await callAI('Say exactly: Novara API connected successfully');
    res.json({ success: true, response: text, message: 'API working!' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Warm up the models the instant the server starts, so the user's
// first real click in the app doesn't hit a cold model
async function warmUp() {
  console.log('🔥 Warming up models...');
  try {
    await callAI('Say hi');
    console.log('🔥 Warm-up complete — models are ready.');
  } catch (e) {
    console.log('⚠️  Warm-up failed (will retry on first real request):', e.message);
  }
}

app.listen(3001, () => {
  console.log('✅ Novara proxy running on http://localhost:3001');
  console.log('   Key set:', OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_API_KEY' ? '✅ Yes' : '❌ No — add your key!');
  console.log('   Test at: http://localhost:3001/test');
  warmUp();
});
