# 🏛️ 5guys — 多 Agent 策略优化顾问团

> 5 个 AI Agent 角色分析你的交易日志，互相辩论，产出有证据的策略优化方案。

## 5 个 Agent

| Agent | 性格 | 职责 |
|---|---|---|
| 🗡️ **Alpha** | 暴躁贪婪 | "每天要赚$300-500！为什么赚那么少！" |
| 🛡️ **Guardian** | 保守谨慎 | 控杠杆、保本金、让账户稳定成长 |
| 📊 **Quant** | 冷静实干 | 用数据找更好的方式和参数 |
| 🧠 **Psych** | 怀疑质疑 | 挑战 Quant 的结论，防过拟合 |
| ⚖️ **Judge** | 权威裁定 | 综合裁定，只放有证据的方案 |

## 辩论流程

```
Round 1: Alpha + Guardian + Quant 并行独立分析（~5秒）
    ↓
Round 2: Psych 看到 Alpha 和 Quant 的结论后质疑（~5秒）
    ↓
Round 3: Judge 综合全部辩论，产出最终裁定（~5秒）
```

## 快速开始

```bash
# 1. 安装
pnpm install

# 2. 配置
cp .env.example .env
# 编辑 .env，填入 GEMINI_API_KEY 和 TRADES_PATH

# 3. 运行
bun run src/council.ts          # 完整辩论（5 Agent，~15秒）
bun run src/council.ts quick    # 快速版（3 Agent，~10秒）
bun run src/council.ts full 7   # 只看最近7天
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | 从 [aistudio.google.com](https://aistudio.google.com) 获取 |
| `TRADES_PATH` | ✅ | Dollarprinter 的 `data/` 目录的绝对路径 |
| `GEMINI_MODEL` | ❌ | 默认 `gemini-2.0-flash` |

## 费用

**$0** — 使用 Google Gemini API 免费额度。
