/**
 * 🤖 Gemini API 封装
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function log(msg: string) {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    console.log(`${ts} [5guys] ${msg}`);
}

export async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
    if (!GEMINI_API_KEY) return "❌ 未设置 GEMINI_API_KEY";

    const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000, topP: 0.9 },
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.text();
            log(`❌ Gemini ${res.status}: ${err.slice(0, 200)}`);
            return `❌ API错误: ${res.status}`;
        }
        const data = (await res.json()) as any;
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
        log(`❌ 请求失败: ${e}`);
        return `❌ 请求失败: ${e}`;
    }
}
