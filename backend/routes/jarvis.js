const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Node = require('../models/Node');

// ── JARVIS CHAT ──
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const nodes = await Node.find({ userId: req.user.id });

    const mindspaceContext = nodes.map(n => {
      const totalTasks = n.milestones.reduce((a, m) => a + m.tasks.length, 0);
      const doneTasks = n.milestones.reduce((a, m) => a + m.tasks.filter(t => t.done).length, 0);
      const overdue = n.milestones.reduce((a, m) =>
        a + m.tasks.filter(t => !t.done && t.deadline && new Date(t.deadline) < new Date()).length, 0);
      const days = n.lastVisited ? Math.round((Date.now() - new Date(n.lastVisited)) / (1000 * 60 * 60 * 24)) : 0;
      return `"${n.title}" — Goal: ${n.goal || 'not set'} | Progress: ${n.progress}% | Tasks: ${doneTasks}/${totalTasks} | Overdue: ${overdue} | Last visited: ${days} days ago | Time: ${n.timeSpent || 0} mins`;
    }).join('\n');

    const prompt = `You are JARVIS-I, a calm, precise AI assistant living inside the user's personal MindSpace — a neural universe mapping their mind, goals, and growth.

You deeply understand ADHD. The user may struggle with focus and task sequencing. Always:
- Be warm, precise, never overwhelming
- Give ONE clear next step at the end of your response
- If tasks should be done in order, mention it gently
- If a node is neglected, acknowledge without judgment
- Keep responses under 150 words

Current MindSpace state:
${mindspaceContext || 'No nodes yet.'}

User message: "${message}"

Respond as JARVIS. End with a clear next step.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Gemini error');
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'JARVIS is thinking...';
    res.json({ reply });
  } catch (err) {
    console.error('JARVIS chat error:', err);
    res.status(500).json({ reply: 'Systems temporarily offline.' });
  }
});

// ── JARVIS SUGGEST MILESTONES ──
router.post('/suggest', auth, async (req, res) => {
  try {
    const { goal, nodeTitle } = req.body;

    if (!goal || !goal.trim()) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    const prompt = `You are JARVIS-I. Create a structured learning plan for:
Node: "${nodeTitle}"
Goal: "${goal}"

Respond with ONLY a JSON object. No markdown, no backticks, no explanation. Just raw JSON.

{
  "milestones": [
    {
      "title": "Phase name",
      "description": "What this phase covers",
      "order": 1,
      "tasks": [
        {
          "text": "Specific actionable task",
          "difficulty": "easy",
          "shouldDoFirst": false
        }
      ]
    }
  ],
  "jarvisNote": "One warm sentence about where to start"
}

Rules:
- 2 to 4 milestones maximum
- 3 to 5 tasks per milestone
- difficulty must be exactly: easy, medium, or hard
- Mark shouldDoFirst true only on prerequisite tasks
- Be specific and actionable for the goal given
- Keep task descriptions concise — under 15 words each`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.4,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const data = await response.json();
    console.log('Gemini suggest response status:', response.status);

    if (!response.ok) {
      console.error('Gemini error:', data);
      throw new Error(data?.error?.message || 'Gemini API error');
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log('Raw Gemini text length:', text.length);

    // Strip markdown just in case
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Find JSON boundaries
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }

    // Attempt parse — if fails, repair truncated JSON
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.log('JSON parse failed, attempting repair...');
      const milestonesMatch = text.match(/"milestones"\s*:\s*(\[[\s\S]*)/);
      if (milestonesMatch) {
        let arrText = milestonesMatch[1];
        let depth = 0, lastGoodEnd = -1;
        for (let i = 0; i < arrText.length; i++) {
          if (arrText[i] === '{') depth++;
          if (arrText[i] === '}') {
            depth--;
            if (depth === 0) lastGoodEnd = i;
          }
        }
        if (lastGoodEnd > -1) {
          try {
            const repaired = '{"milestones":' + arrText.substring(0, lastGoodEnd + 1) + '],"jarvisNote":"Begin with the first milestone and take it one step at a time."}';
            parsed = JSON.parse(repaired);
            console.log('JSON repaired successfully, milestones:', parsed.milestones?.length);
          } catch (e) {
            console.error('Repair failed:', e);
            return res.status(500).json({ error: 'Could not parse JARVIS response' });
          }
        }
      }
    }

    if (!parsed) return res.status(500).json({ error: 'Empty response from JARVIS' });
    res.json(parsed);

  } catch (err) {
    console.error('JARVIS suggest error:', err);
    res.status(500).json({ error: err.message || 'Suggestion failed' });
  }
});

// ── ELEVENLABS VOICE ──
router.post('/speak', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    // Rachel voice ID — warm, calm, female
    const voiceId = '21m00Tcm4TlvDq8ikWAM';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.25,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('ElevenLabs error:', errData);
      throw new Error(errData?.detail?.message || 'ElevenLabs API error');
    }

    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error('Speech error:', err);
    res.status(500).json({ error: 'Speech generation failed' });
  }
});


router.get('/speak-test', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: 'Hello. This is a test.',
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.75, similarity_boost: 0.85 }
        })
      }
    );
    console.log('ElevenLabs status:', response.status);
    if (!response.ok) {
      const err = await response.json();
      console.log('ElevenLabs error:', err);
      return res.status(500).json(err);
    }
    const buf = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error('Test error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;