/**
 * 🤖 AI API 封装 — 支持 OpenRouter / Gemini
 */

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.AI_MODEL || "qwen/qwen-2.5-72b-instruct";

// 自动选择后端
const USE_OPENROUTER = !!OPENROUTER_KEY;

export function log(msg: string) {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    console.log(`${ts} [5guys] ${msg}`);
}

export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
    if (USE_OPENROUTER) return callOpenRouter(systemPrompt, userMessage);
    if (GEMINI_KEY) return callGemini(systemPrompt, userMessage);
    return "❌ 未设置 OPENROUTER_API_KEY 或 GEMINI_API_KEY";
}

// ═══ OpenRouter ═══
async function callOpenRouter(systemPrompt: string, userMessage: string): Promise<string> {
    try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                temperature: 0.7,
                max_tokens: 2000,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            log(`❌ OpenRouter ${res.status}: ${err.slice(0, 200)}`);
            return `❌ API错误: ${res.status}`;
        }

        const data = (await res.json()) as any;
        return data?.choices?.[0]?.message?.content || "";
    } catch (e) {
        log(`❌ OpenRouter 请求失败: ${e}`);
        return `❌ 请求失败: ${e}`;
    }
}

// ═══ Gemini (备用) ═══
async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000, topP: 0.9 },
    };

    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.status === 429) {
                const wait = 20 * (attempt + 1);
                log(`⏳ 429 限流，${wait}秒后重试 (${attempt + 1}/${MAX_RETRIES})...`);
                await new Promise(r => setTimeout(r, wait * 1000));
                continue;
            }
            if (!res.ok) {
                const err = await res.text();
                log(`❌ Gemini ${res.status}: ${err.slice(0, 200)}`);
                return `❌ API错误: ${res.status}`;
            }
            const data = (await res.json()) as any;
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (e) {
            log(`❌ Gemini 请求失败: ${e}`);
            return `❌ 请求失败: ${e}`;
        }
    }
    return "❌ 重试3次后仍然 429 限流";
}
