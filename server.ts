import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@Google/Genai";
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = processes.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

// --- Interfaces ---
interface SearchRequestBody {
  query: string;
  filter: string;
  model: 'gemini' | 'open ai' | 'grok';
  apiKeys?: {
    exa?: string;
    gemini?: string;
    openai?: string;
    grok?: string;
  };
}

// --- Helper Functions ---

// 1. Exa Search
async function searchExa(query: string, filter: string, apiKey: string) {
  let finalQuery = query;
  let includeDomains: string[] | undefined = undefined;

  // Apply basic filters via query modification or Exa parameters
  if (filter === 'pdf') finalQuery += ' filetype:pdf';
  if (filter === 'github') includeDomains = ['github.com'];

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query: finalQuery,
      useAutoprompt: true,
      numResults: 5,
      contents: {
        text: true, // We need text for the AI to summarize
      },
      includeDomains: includeDomains,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Exa API Error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

// 2. AI Summarization
async function generateSummary(
  textParts: string[], 
  query: string, 
  modelProvider: string, 
  keys: { gemini?: string; openai?: string; grok?: string }
): Promise<string> {
  
  const systemPrompt = `You are a helpful research assistant. 
  User Query: "${query}"
  
  Task: Analyze the provided search results and generate a response in Markdown format with:
  1. A concise summary (2-3 paragraphs).
  2. Key Insights (bullet points).
  3. Pros & Cons (if applicable).
  
  Keep it objective and cite the sources by title if possible.`;

  const userContent = `Here are the search results content:\n\n${textParts.join('\n---\n')}`;

  // --- GEMINI IMPLEMENTATION ---
  if (modelProvider === 'gemini') {
    if (!keys.gemini) throw new Error("Missing Gemini API Key");
    
    const ai = new GoogleGenAI({ apiKey: keys.gemini });
    
    try {
      // Using 'gemini-2.5-flash' for efficiency
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemPrompt,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userContent }]
          }
        ]
      });
      return response.text || "No summary generated.";
    } catch (err: any) {
      console.error("Gemini Error:", err);
      return `Error generating summary with Gemini: ${err.message}`;
    }
  }

  // --- OPENAI IMPLEMENTATION ---
  if (modelProvider === 'openai') {
    if (!keys.openai) throw new Error("Missing OpenAI API Key");
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.openai}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Cost effective and fast
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API Error (${response.status}): ${err}`);
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || "No summary generated.";
    } catch (err: any) {
      console.error("OpenAI Error:", err);
      return `Error generating summary with OpenAI: ${err.message}`;
    }
  }

  // --- GROK (xAI) IMPLEMENTATION ---
  if (modelProvider === 'grok') {
    if (!keys.grok) throw new Error("Missing Grok API Key");
    
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.grok}`
        },
        body: JSON.stringify({
          model: 'grok-beta', // Standard Grok model
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Grok API Error (${response.status}): ${err}`);
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || "No summary generated.";
    } catch (err: any) {
      console.error("Grok Error:", err);
      return `Error generating summary with Grok: ${err.message}`;
    }
  }

  return "Selected model provider not implemented.";
}

// --- API Endpoint ---
app.post('/api/search', async (req, res) => {
  try {
    const { query, filter, model, apiKeys } = req.body as SearchRequestBody;

    // 1. Resolve Keys (Headers/Body > Env Vars)
    const exaKey = apiKeys?.exa || process.env.EXA_API_KEY;
    const geminiKey = apiKeys?.gemini || process.env.GEMINI_API_KEY;
    const openaiKey = apiKeys?.openai || process.env.OPENAI_API_KEY;
    const grokKey = apiKeys?.grok || process.env.GROK_API_KEY;

    // Debug log to help users verify keys are present (masked for security)
    console.log(`[Request] Provider: ${model}`);
    console.log(`[Keys] Exa: ${!!exaKey}, Gemini: ${!!geminiKey}, OpenAI: ${!!openaiKey}, Grok: ${!!grokKey}`);

    if (!exaKey) {
      return res.status(400).json({ error: "Exa API Key is missing. Please add it in Settings." });
    }

    // 2. Fetch Search Results
    console.log(`Searching Exa for: "${query}"...`);
    const searchData: any = await searchExa(query, filter, exaKey);
    const results = searchData.results || [];
    console.log(`Found ${results.length} results.`);

    // 3. Prepare Content for AI
    const snippets = results.map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.text ? r.text.slice(0, 1000) : 'No text available'}...`);

    // 4. Generate Summary
    let summary = "";
    if (snippets.length > 0) {
      console.log(`Generating summary with ${model}...`);
      summary = await generateSummary(snippets, query, model, {
        gemini: geminiKey,
        openai: openaiKey,
        grok: grokKey
      });
    } else {
      summary = "No results found to summarize.";
    }

    // 5. Return Clean Response
    res.json({
      results: results.map((r: any) => ({
        id: r.id || r.url,
        title: r.title || "Untitled",
        url: r.url,
        publishedDate: r.publishedDate,
        author: r.author,
        score: r.score,
        snippet: r.text ? r.text.slice(0, 200) + "..." : "No preview available."
      })),
      summary
    });

  } catch (error: any) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`SmartSearch Backend running on port ${PORT}`);
});
