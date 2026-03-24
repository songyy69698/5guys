import { AGENTS } from "./src/agents";
import { callAI, log } from "./src/gemini";

const PROBLEM = `
## 🚨 V104 策略三大核心问题 — 不是调参数，是入场逻辑有根本缺陷

CEO 亲自指出三大问题：
1. **进场不准** — 入了就亏，信号质量太差
2. **大段吃不到** — 大行情来了 bot 没有做，错过赚钱机会
3. **乱做亏钱** — 没行情时也在做，无谓的亏损

请你不要给调参数的建议（比如SL从15改18这种），要给入场逻辑本身的改进方案。

---

## V104 完整入场流程（来自 strategy.ts 源码）

### Step 1: Fire Candle 合成（UTC 08-12）
- 从 1h K线合成 UTC 08-12 的蜡烛
- 要求：实体占比 ≥35%，范围 ≥30pt
- 方向：阳线→做多，阴线→做空
- **问题：如果这4小时波动小(如27pt)，当天完全不交易！大行情可能在UTC 16点后才爆发，bot看不到**

### Step 2: 诱导回踩
- 等价格回踩到 Fire Close 以下（做多）
- 要求回踩深度 ≥5pt + 量能 ≥ 均量×1.3
- **问题：有时候趋势很强，根本不回踩就直接飞了，bot就错过整波行情**

### Step 3: 15m 结构确认
- EMA21 > EMA55（做多需要上升趋势）
- Higher Low / Lower High 结构
- **问题：如果15m还没有切换趋势，即使5m已经有完美入场点也不做**

### Step 4: 5m 3核心入场
条件全部满足才入场：
- ① 回穿 Fire Close（价格回到 Close±4pt 内）
- ② 强阳线（实体占比 ≥58%）
- ③ 量能爆发（≥ 均量×1.4）
- **问题：3个条件同时满足的概率很低，经常满足2个差1个就不做了**

### Step 5: 出场
- 动态SL [15-22pt]
- 保本 +12pt
- 分批 +30pt 平50%
- Trailing -12pt
- 全平 +100pt

### 交易限制
- 只在 UTC 12-20 交易（8小时窗口）
- 每天最多4笔
- 连亏2笔停

---

## 需要你解答的核心问题

### Q1: 为什么进场不准？
Fire Candle + 诱导回踩 + 3核心条件的组合是否有结构性缺陷？
是信号本身就不好，还是入场时机太晚？

### Q2: 为什么大段吃不到？
如果大行情在UTC 16-20爆发（不是UTC 08-12形成的Fire Candle方向），bot怎么办？
应该加什么机制来捕捉盘中出现的大行情（比如15m结构突破、大阳线直接入场）？

### Q3: 怎么判断"这个行情值不值得做"？
现在只要满足条件就入场，完全不考虑行情质量。
需要什么"行情过滤器"来避免在垃圾行情中乱做？
比如：波动率太低不做、横盘不做、接近支撑阻力不做？
`;

async function run() {
    log("🚨 三大核心问题 Council 召开中...");
    const t0 = Date.now();

    log("🗡️ Alpha 分析中...");
    const a = await callAI(AGENTS.alpha.systemPrompt, PROBLEM);
    console.log("\n🗡️ Alpha:\n" + a);

    log("📊 Quant 分析中...");
    const q = await callAI(AGENTS.quant.systemPrompt, PROBLEM);
    console.log("\n📊 Quant:\n" + q);

    log("🛡️ Guardian 分析中...");
    const g = await callAI(AGENTS.guardian.systemPrompt, PROBLEM);
    console.log("\n🛡️ Guardian:\n" + g);

    log("🧠 Psych 质疑中...");
    const p = await callAI(AGENTS.psych.systemPrompt,
        "以下是 Alpha 和 Quant 对 V104 入场逻辑三大缺陷的分析。请质疑他们的建议，特别注意是否会引入新的风险。\n\n🗡️ Alpha:\n" + a + "\n\n📊 Quant:\n" + q);
    console.log("\n🧠 Psych:\n" + p);

    log("⚖️ Judge 裁定中...");
    const j = await callAI(AGENTS.judge.systemPrompt,
        "V104三大核心问题辩论记录:\n\n🗡️Alpha:\n" + a + "\n\n🛡️Guardian:\n" + g + "\n\n📊Quant:\n" + q + "\n\n🧠Psych质疑:\n" + p);
    console.log("\n" + "═".repeat(60));
    console.log("  ⚖️ JUDGE 最终裁定");
    console.log("═".repeat(60));
    console.log("\n" + j);

    log("完成! " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
}

await run();
