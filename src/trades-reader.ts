/**
 * 📁 交易日志读取器
 * 读取 Dollarprinter 的 trades.jsonl 和 trades-history.jsonl
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const TRADES_PATH = process.env.TRADES_PATH || "../Dollarprinter/data";

/** Dollarprinter executor.ts logTrade() 写入的交易记录 */
export interface TradeRecord {
    ts: number;
    date: string;
    symbol: string;
    side: string;
    window: string;
    dayOfWeek: number;
    entryPrice: number;
    signalPrice: number;
    slippage: number;
    pnlPt: number;
    netPnlU: number;
    reason: string;
    holdMinutes: number;
    bestProfitPt: number;
    breakevenHit: boolean;
    slPt: number;
    tpPt: number;
    qty: number;
    leverage: number;
    atr: number;
    mtfScore: number;
    fundingRate: number;
    ema3: number;
    ema7: number;
    ema20: number;
    volRatio: number;
    pocSlope: number;
}

/** 交易所原始交易（from trades-history.jsonl） */
export interface RawTrade {
    type: string;
    tradeId: string;
    symbol: string;
    side: string;
    price: number;
    qty: number;
    fee: number;
    realizedPnl: number;
    ts: number;
    date: string;
    raw: {
        leverage: number;
        reduceOnly: boolean;
        realizedPNL: string;
        [key: string]: any;
    };
}

/** 读取策略交易日志 (trades.jsonl) */
export function readStrategyTrades(days: number = 14): TradeRecord[] {
    const file = join(TRADES_PATH, "trades.jsonl");
    if (!existsSync(file)) return [];

    const cutoff = Date.now() - days * 24 * 3600_000;
    const lines = readFileSync(file, "utf-8").trim().split("\n");
    const trades: TradeRecord[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const t = JSON.parse(line) as TradeRecord;
            if (t.ts >= cutoff) trades.push(t);
        } catch { /* 跳过损坏行 */ }
    }

    return trades.sort((a, b) => a.ts - b.ts);
}

/** 读取交易所原始历史 (trades-history.jsonl) */
export function readRawHistory(days: number = 14): RawTrade[] {
    const file = join(TRADES_PATH, "trades-history.jsonl");
    if (!existsSync(file)) return [];

    const cutoff = Date.now() - days * 24 * 3600_000;
    const lines = readFileSync(file, "utf-8").trim().split("\n");
    const trades: RawTrade[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const t = JSON.parse(line) as RawTrade;
            if (t.ts >= cutoff) trades.push(t);
        } catch { /* 跳过损坏行 */ }
    }

    return trades.sort((a, b) => a.ts - b.ts);
}

/** 分析交易表现 */
export interface PerformanceStats {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
    longCount: number;
    longWins: number;
    longWinRate: number;
    longPnl: number;
    shortCount: number;
    shortWins: number;
    shortWinRate: number;
    shortPnl: number;
    currentStreak: number;
    maxLossStreak: number;
    slTradeCount: number;
    slAvgBestProfit: number;
    breakevenCount: number;
    breakevenProfitRate: number;
    avgSlippage: number;
    avgHoldMinutes: number;
    winAvgHold: number;
    lossAvgHold: number;
    hourlyStats: Record<number, { count: number; wins: number; pnl: number }>;
    dailyPnl: Record<string, number>;
}

export function analyzePerformance(trades: TradeRecord[]): PerformanceStats {
    const wins = trades.filter(t => t.netPnlU > 0);
    const losses = trades.filter(t => t.netPnlU <= 0);
    const totalPnl = trades.reduce((s, t) => s + t.netPnlU, 0);

    const longs = trades.filter(t => t.side === "long");
    const shorts = trades.filter(t => t.side === "short");
    const longWins = longs.filter(t => t.netPnlU > 0);
    const shortWins = shorts.filter(t => t.netPnlU > 0);

    // 连亏
    let currentStreak = 0, maxLossStreak = 0, tempStreak = 0;
    for (const t of trades) {
        tempStreak = t.netPnlU > 0 ? (tempStreak > 0 ? tempStreak + 1 : 1) : (tempStreak < 0 ? tempStreak - 1 : -1);
        if (tempStreak < maxLossStreak) maxLossStreak = tempStreak;
    }
    maxLossStreak = Math.abs(maxLossStreak);
    if (trades.length > 0) {
        currentStreak = trades[trades.length - 1].netPnlU > 0 ? 1 : -1;
        for (let i = trades.length - 2; i >= 0; i--) {
            if ((currentStreak > 0 && trades[i].netPnlU > 0) || (currentStreak < 0 && trades[i].netPnlU <= 0)) {
                currentStreak += currentStreak > 0 ? 1 : -1;
            } else break;
        }
    }

    // SL
    const slTrades = trades.filter(t => t.reason.includes("硬止损") || t.reason.includes("STOP"));
    const slAvg = slTrades.length > 0 ? slTrades.reduce((s, t) => s + t.bestProfitPt, 0) / slTrades.length : 0;

    // 保本
    const beTrades = trades.filter(t => t.breakevenHit);
    const beProfitable = beTrades.filter(t => t.netPnlU > 0);

    // 滑点
    const slips = trades.map(t => t.slippage).filter(s => s > 0);
    const avgSlip = slips.length > 0 ? slips.reduce((a, b) => a + b, 0) / slips.length : 0;

    // 时段
    const hourlyStats: Record<number, { count: number; wins: number; pnl: number }> = {};
    for (const t of trades) {
        const h = new Date(t.ts).getUTCHours();
        if (!hourlyStats[h]) hourlyStats[h] = { count: 0, wins: 0, pnl: 0 };
        hourlyStats[h].count++;
        if (t.netPnlU > 0) hourlyStats[h].wins++;
        hourlyStats[h].pnl += t.netPnlU;
    }

    // 每日PnL
    const dailyPnl: Record<string, number> = {};
    for (const t of trades) {
        const day = t.date.slice(0, 10);
        dailyPnl[day] = (dailyPnl[day] || 0) + t.netPnlU;
    }

    // 持仓时间
    const avgHold = trades.length > 0 ? trades.reduce((s, t) => s + t.holdMinutes, 0) / trades.length : 0;
    const winHold = wins.length > 0 ? wins.reduce((s, t) => s + t.holdMinutes, 0) / wins.length : 0;
    const lossHold = losses.length > 0 ? losses.reduce((s, t) => s + t.holdMinutes, 0) / losses.length : 0;

    return {
        totalTrades: trades.length,
        wins: wins.length,
        losses: losses.length,
        winRate: trades.length > 0 ? wins.length / trades.length : 0,
        totalPnl,
        avgPnl: trades.length > 0 ? totalPnl / trades.length : 0,
        longCount: longs.length, longWins: longWins.length,
        longWinRate: longs.length > 0 ? longWins.length / longs.length : 0,
        longPnl: longs.reduce((s, t) => s + t.netPnlU, 0),
        shortCount: shorts.length, shortWins: shortWins.length,
        shortWinRate: shorts.length > 0 ? shortWins.length / shorts.length : 0,
        shortPnl: shorts.reduce((s, t) => s + t.netPnlU, 0),
        currentStreak, maxLossStreak,
        slTradeCount: slTrades.length, slAvgBestProfit: slAvg,
        breakevenCount: beTrades.length,
        breakevenProfitRate: beTrades.length > 0 ? beProfitable.length / beTrades.length : 0,
        avgSlippage: avgSlip,
        avgHoldMinutes: avgHold, winAvgHold: winHold, lossAvgHold: lossHold,
        hourlyStats, dailyPnl,
    };
}

/** 构造给 Agent 看的交易数据摘要 */
export function buildTradeContext(days: number = 14): string {
    const trades = readStrategyTrades(days);
    if (trades.length === 0) return "无交易记录";

    const a = analyzePerformance(trades);
    const losses = trades.filter(t => t.netPnlU < 0);
    const wins = trades.filter(t => t.netPnlU > 0);

    let ctx = `## 交易数据摘要 (近${days}天)\n\n`;
    ctx += `总交易: ${a.totalTrades}笔 | 胜率: ${(a.winRate * 100).toFixed(0)}% | PnL: ${a.totalPnl >= 0 ? "+" : ""}${a.totalPnl.toFixed(1)}U\n`;
    ctx += `做多: ${a.longWins}/${a.longCount}(${a.longCount > 0 ? (a.longWinRate * 100).toFixed(0) : "—"}%) PnL ${a.longPnl >= 0 ? "+" : ""}${a.longPnl.toFixed(0)}U\n`;
    ctx += `做空: ${a.shortWins}/${a.shortCount}(${a.shortCount > 0 ? (a.shortWinRate * 100).toFixed(0) : "—"}%) PnL ${a.shortPnl >= 0 ? "+" : ""}${a.shortPnl.toFixed(0)}U\n`;
    ctx += `连亏: 当前${Math.abs(a.currentStreak)}笔 | 历史最大${a.maxLossStreak}笔\n`;
    ctx += `SL被扫: ${a.slTradeCount}笔 | 被扫前均浮盈+${a.slAvgBestProfit.toFixed(0)}pt\n`;
    ctx += `保本触发: ${a.breakevenCount}次 | ${(a.breakevenProfitRate * 100).toFixed(0)}%最终盈利\n`;
    ctx += `滑点: 均${a.avgSlippage.toFixed(1)}pt\n`;
    ctx += `持仓: 均${a.avgHoldMinutes.toFixed(0)}min | 赢单${a.winAvgHold.toFixed(0)}min | 亏单${a.lossAvgHold.toFixed(0)}min\n\n`;

    // 每日PnL
    const dailyEntries = Object.entries(a.dailyPnl).sort();
    if (dailyEntries.length > 0) {
        ctx += `## 每日PnL\n`;
        for (const [day, pnl] of dailyEntries) {
            ctx += `${day}: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}U ${pnl >= 300 ? "🎯" : pnl >= 0 ? "✅" : "❌"}\n`;
        }
        ctx += "\n";
    }

    // 时段
    const sortedHours = Object.entries(a.hourlyStats).sort((a, b) => +a[0] - +b[0]);
    if (sortedHours.length > 0) {
        ctx += `## 时段(UTC)\n`;
        for (const [h, s] of sortedHours) {
            const wr = (s.wins / s.count * 100).toFixed(0);
            ctx += `${s.pnl >= 0 ? "🟢" : "🔴"} UTC ${String(h).padStart(2)}h: ${s.count}笔 胜率${wr}% PnL ${s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}U\n`;
        }
        ctx += "\n";
    }

    // 亏损单明细（最多15笔）
    const recentLosses = losses.slice(-15);
    if (recentLosses.length > 0) {
        ctx += `## 最近${recentLosses.length}笔亏损单\n`;
        for (const t of recentLosses) {
            const utcH = new Date(t.ts).getUTCHours();
            ctx += `- ${t.date.slice(5, 16)} UTC${utcH}h | ${t.side.toUpperCase()} ${t.qty}ETH @ $${t.entryPrice.toFixed(0)} | PnL ${t.netPnlU.toFixed(1)}U | SL=${t.slPt.toFixed(0)}pt 最佳+${t.bestProfitPt.toFixed(0)}pt | ATR=${t.atr.toFixed(0)} Hold=${t.holdMinutes.toFixed(0)}min | ${t.reason.slice(0, 30)}\n`;
        }
        ctx += "\n";
    }

    // 赢单（最多10笔对比）
    const recentWins = wins.slice(-10);
    if (recentWins.length > 0) {
        ctx += `## 最近${recentWins.length}笔赢单（对比）\n`;
        for (const t of recentWins) {
            const utcH = new Date(t.ts).getUTCHours();
            ctx += `- ${t.date.slice(5, 16)} UTC${utcH}h | ${t.side.toUpperCase()} ${t.qty}ETH @ $${t.entryPrice.toFixed(0)} | PnL +${t.netPnlU.toFixed(1)}U | 最佳+${t.bestProfitPt.toFixed(0)}pt Hold=${t.holdMinutes.toFixed(0)}min\n`;
        }
        ctx += "\n";
    }

    // 当前策略参数
    ctx += `## 当前策略参数 (V104)\n`;
    ctx += `- 杠杆: 150x | 固定仓位: 2ETH\n`;
    ctx += `- Fire Candle: UTC 08-12 合成 | 实体≥35% | 范围≥35pt\n`;
    ctx += `- 诱导回踩: 深度≥5pt | 量能≥均量×1.3\n`;
    ctx += `- 5m入场: 回穿Fire Close | 强阳≥58% | 量能≥1.4x\n`;
    ctx += `- 动态SL: [15pt, 22pt] | 诱导低点+8pt\n`;
    ctx += `- 保本: +12pt | Trailing: -12pt | 分批TP: +30pt平50% / +100pt全平\n`;
    ctx += `- 每日: 最多4笔 | 亏损限$80 | 连亏2笔停\n`;
    ctx += `- Funding过滤: |Funding|>0.05%不逆势\n`;
    ctx += `- ATR: <avg20×0.62跳过 | >68跳过\n`;

    return ctx;
}
