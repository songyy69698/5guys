#!/usr/bin/env bun
/**
 * 🏛️ 5guys Council — 多 Agent 策略优化顾问团
 * ═══════════════════════════════════════════════════════
 *
 * 用法:
 *   bun run src/council.ts          # 完整辩论（3轮，5 Agent）
 *   bun run src/council.ts quick    # 快速版（Quant + Guardian + Judge）
 *   bun run src/council.ts quick 7  # 只看最近7天
 *
 * 辩论流程:
 *   Round 1: 🗡️Alpha + 🛡️Guardian + 📊Quant 并行独立分析
 *   Round 2: 🧠Psych 看到 Alpha 和 Quant 的结论后质疑
 *   Round 3: ⚖️Judge 综合裁定，产出有证据的可执行方案
 */

import { buildTradeContext } from "./trades-reader";
import { AGENTS } from "./agents";
import { callAI, log } from "./gemini";

// ═══════════════════════════════════════
// 完整辩论（3轮 5 Agent）
// ═══════════════════════════════════════

async function runFullCouncil(days: number): Promise<string> {
    log("🏛️ Agent Council 召开中...");
    const startMs = Date.now();

    // 提取数据
    const tradeData = buildTradeContext(days);
    if (tradeData === "无交易记录") {
        console.log("⚠️ 无交易记录，无法召开 Council");
        return "";
    }
    log("📊 数据提取完成");

    // ═══ Round 1: Alpha / Guardian / Quant 并行 ═══
    log("🗡️🛡️📊 Round 1: 三位 Agent 独立分析...");
    const prompt = `以下是近期的交易数据，请从你的专业角度分析，给出具体的优化建议。\n\n${tradeData}`;

    const [alphaR, guardianR, quantR] = await Promise.all([
        callAI(AGENTS.alpha.systemPrompt, prompt),
        callAI(AGENTS.guardian.systemPrompt, prompt),
        callAI(AGENTS.quant.systemPrompt, prompt),
    ]);
    log("✅ Round 1 完成");

    console.log("\n" + "═".repeat(60));
    console.log("  Round 1: 独立分析");
    console.log("═".repeat(60));
    console.log(`\n🗡️ Alpha（暴躁交易员）:\n${alphaR}`);
    console.log(`\n🛡️ Guardian（资金管家）:\n${guardianR}`);
    console.log(`\n📊 Quant（量化师）:\n${quantR}`);

    // ═══ Round 2: Psych 质疑 ═══
    log("🧠 Round 2: Psych 质疑中...");
    const psychPrompt =
        `以下是 Alpha（交易员）和 Quant（量化师）的分析和建议。请从你的质疑者角度挑战他们的结论。\n\n` +
        `### 🗡️ Alpha 的意见:\n${alphaR}\n\n` +
        `### 📊 Quant 的建议:\n${quantR}\n\n` +
        `### 原始交易数据（供你交叉验证）:\n${tradeData.slice(0, 2000)}`;

    const psychR = await callAI(AGENTS.psych.systemPrompt, psychPrompt);
    log("✅ Round 2 完成");

    console.log("\n" + "═".repeat(60));
    console.log("  Round 2: 质疑环节");
    console.log("═".repeat(60));
    console.log(`\n🧠 Psych（质疑者）:\n${psychR}`);

    // ═══ Round 3: Judge 裁定 ═══
    log("⚖️ Round 3: Judge 综合裁定...");
    const judgePrompt =
        `以下是 Agent Council 的完整辩论记录，请做出最终裁定。\n\n` +
        `### 🗡️ Alpha（暴躁交易员）:\n${alphaR}\n\n` +
        `### 🛡️ Guardian（资金管家）:\n${guardianR}\n\n` +
        `### 📊 Quant（量化师）:\n${quantR}\n\n` +
        `### 🧠 Psych（质疑者）对 Alpha 和 Quant 的挑战:\n${psychR}`;

    const judgeResult = await callAI(AGENTS.judge.systemPrompt, judgePrompt);
    log("✅ Round 3 完成");

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

    console.log("\n" + "═".repeat(60));
    console.log("  Round 3: 最终裁定");
    console.log("═".repeat(60));
    console.log(`\n⚖️ Judge:\n${judgeResult}`);

    console.log("\n" + "═".repeat(60));
    log(`🏛️ Council 完成! 耗时 ${elapsed}s`);

    return judgeResult;
}

// ═══════════════════════════════════════
// 快速版（Quant + Guardian + Judge）
// ═══════════════════════════════════════

async function runQuickCouncil(days: number): Promise<string> {
    log("⚡ Quick Council 召开中...");
    const startMs = Date.now();

    const tradeData = buildTradeContext(days);
    if (tradeData === "无交易记录") {
        console.log("⚠️ 无交易记录");
        return "";
    }

    const prompt = `以下是近期的交易数据，请从你的专业角度分析，给出具体的优化建议。\n\n${tradeData}`;

    log("📊 Quant 分析中...");
    const quantR = await callAI(AGENTS.quant.systemPrompt, prompt);
    await new Promise(r => setTimeout(r, 3000)); // 避限流

    log("🛡️ Guardian 分析中...");
    const guardianR = await callAI(AGENTS.guardian.systemPrompt, prompt);

    console.log(`\n📊 Quant:\n${quantR}`);
    console.log(`\n🛡️ Guardian:\n${guardianR}`);

    const judgePrompt =
        `以下是2位专家的分析，请综合产出最终裁定。\n\n` +
        `### 📊 Quant:\n${quantR}\n\n` +
        `### 🛡️ Guardian:\n${guardianR}`;

    const judgeResult = await callAI(AGENTS.judge.systemPrompt, judgePrompt);
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

    console.log(`\n⚖️ Judge:\n${judgeResult}`);
    log(`⚡ Quick Council 完成! 耗时 ${elapsed}s`);

    return judgeResult;
}

// ═══════════════════════════════════════
// CLI 入口
// ═══════════════════════════════════════

console.log("═══════════════════════════════════════════════════");
console.log("  🏛️ 5guys — 多 Agent 策略优化顾问团");
console.log("═══════════════════════════════════════════════════\n");

if (!process.env.GEMINI_API_KEY) {
    console.log("❌ 请设置 GEMINI_API_KEY:");
    console.log("   export GEMINI_API_KEY=AIzaSy-xxxxx");
    console.log("   或在 .env 文件中配置\n");
    process.exit(1);
}

const mode = process.argv[2] || "full";
const days = parseInt(process.argv[3] || "14");

console.log(`模式: ${mode === "quick" ? "⚡快速" : "🏛️完整"} | 分析近 ${days} 天数据\n`);

if (mode === "quick") {
    await runQuickCouncil(days);
} else {
    await runFullCouncil(days);
}
