import { CONFIG } from "./config.js";

let lastAlertedSignal =
    localStorage.getItem("alphaMindLastAlertedSignal") || "";

async function sendSignalNotification(signal, symbol) {

    if (
        signal !== "BUY 🟢" &&
        signal !== "SELL 🔴"
    ) {
        return;
    }

    const alertKey = symbol + "_" + signal;

    if (alertKey === lastAlertedSignal) {
        return;
    }

    if (!("Notification" in window)) {
        return;
    }

    if (Notification.permission === "default") {
        await Notification.requestPermission();
    }

    if (Notification.permission !== "granted") {
        return;
    }

    const isBuy = signal === "BUY 🟢";

    new Notification("AlphaMind AI", {
        body:
            (isBuy ? "🚀 BUY Signal आया" : "🔻 SELL Signal आया") +
            "\n" +
            symbol.replace("USDT", "/USDT"),
        icon: "favicon.png"
    });

    lastAlertedSignal = alertKey;

    localStorage.setItem(
        "alphaMindLastAlertedSignal",
        alertKey
    );
}

function calculateEMA(prices, period) {

    if (prices.length < period) return null;

    const multiplier = 2 / (period + 1);

    let ema =
        prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;

}

function calculateRSI(prices, period = 14) {

    if (prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {

        const change = prices[i] - prices[i - 1];

        if (change >= 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }

 }
     let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {

        const change = prices[i] - prices[i - 1];

        let gain = 0;
        let loss = 0;

        if (change >= 0) {
            gain = change;
        } else {
            loss = Math.abs(change);
        }

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    }
        if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;

    const rsi = 100 - (100 / (1 + rs));

    return rsi;

}

function calculateSupport(prices) {

    if (prices.length < 20) return null;

    const recentPrices = prices.slice(-20);

    return Math.min(...recentPrices);

}

function calculateResistance(prices) {

    if (prices.length < 20) return null;

    const recentPrices = prices.slice(-20);

    return Math.max(...recentPrices);

}

function calculateATR(klines, period = 14) {

    if (klines.length < period + 1) return null;

    let trueRanges = [];

    for (let i = 1; i < klines.length; i++) {

        const high = Number(klines[i][2]);
        const low = Number(klines[i][3]);
        const prevClose = Number(klines[i - 1][4]);

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );

        trueRanges.push(tr);

    }

    const recentTR = trueRanges.slice(-period);

    return recentTR.reduce((sum, tr) => sum + tr, 0) / period;

}
function calculateMACD(prices) {

    if (prices.length < 35) return null;

    const ema12List = [];
    const ema26List = [];

    for (let i = 0; i < prices.length; i++) {

        const slice = prices.slice(0, i + 1);

        const ema12 = calculateEMA(slice, 12);
        const ema26 = calculateEMA(slice, 26);

        if (ema12 !== null && ema26 !== null) {

            ema12List.push(ema12);
            ema26List.push(ema26);

        }
    }

    if (ema12List.length < 9) return null;

    const macdLineList = [];

    for (let i = 0; i < ema12List.length; i++) {

        macdLineList.push(
            ema12List[i] - ema26List[i]
        );

    }

    const signalLine = calculateEMA(
        macdLineList,
        9
    );

    if (signalLine === null) return null;

    const macdLine =
        macdLineList[macdLineList.length - 1];

    const histogram =
        macdLine - signalLine;

    return {
        macdLine: macdLine,
        signalLine: signalLine,
        histogram: histogram
    };

}

function detectCandlestickPattern(klines) {

    if (klines.length < 2) return "No Pattern 🟡";

    const last = klines[klines.length - 1];
    const prev = klines[klines.length - 2];

    const open = Number(last[1]);
    const high = Number(last[2]);
    const low = Number(last[3]);
    const close = Number(last[4]);

    const prevOpen = Number(prev[1]);
    const prevClose = Number(prev[4]);

    const body = Math.abs(close - open);
    const upperShadow = high - Math.max(open, close);
    const lowerShadow = Math.min(open, close) - low;

    let pattern = "No Pattern 🟡";

    // Hammer
    if (
        lowerShadow > body * 2 &&
        upperShadow < body
    ) {

        pattern = "Hammer 🟢";

    }

    // Shooting Star
    else if (
        upperShadow > body * 2 &&
        lowerShadow < body
    ) {

        pattern = "Shooting Star 🔴";

    }

    // Bullish Engulfing
    else if (
        prevClose < prevOpen &&
        close > open &&
        close > prevOpen &&
        open < prevClose
    ) {

        pattern = "Bullish Engulfing 🟢";

    }

    // Bearish Engulfing
    else if (
        prevClose > prevOpen &&
        close < open &&
        open > prevClose &&
        close < prevOpen
    ) {

        pattern = "Bearish Engulfing 🔴";

    }

    // Doji
    else if (
        Math.abs(close - open) <= ((high - low) * 0.1)
    ) {

        pattern = "Doji 🟡";

    }

    return pattern;

}
function calculateAverageVolume(klines, period = 20) {

    if (klines.length < period) return null;

    let totalVolume = 0;

   const recentKlines = klines.slice(-(period + 1), -1);

    for (let candle of recentKlines) {

        totalVolume += Number(candle[5]);

    }

    return totalVolume / period;

}

function calculateADX(klines, period = 14) {

    if (klines.length < (period * 2) + 1) {
        return null;
    }

    const trList = [];
    const plusDMList = [];
    const minusDMList = [];

    // ================================
    // TRUE RANGE + DIRECTIONAL MOVEMENT
    // ================================

    for (let i = 1; i < klines.length; i++) {

        const high = Number(klines[i][2]);
        const low = Number(klines[i][3]);

        const prevHigh = Number(klines[i - 1][2]);
        const prevLow = Number(klines[i - 1][3]);
        const prevClose = Number(klines[i - 1][4]);

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );

        const upMove = high - prevHigh;
        const downMove = prevLow - low;

        const plusDM =
            upMove > downMove && upMove > 0
                ? upMove
                : 0;

        const minusDM =
            downMove > upMove && downMove > 0
                ? downMove
                : 0;

        trList.push(tr);
        plusDMList.push(plusDM);
        minusDMList.push(minusDM);
    }

    // ================================
    // INITIAL WILDER SMOOTHING
    // ================================

    let smoothedTR = trList
        .slice(0, period)
        .reduce((a, b) => a + b, 0);

    let smoothedPlusDM = plusDMList
        .slice(0, period)
        .reduce((a, b) => a + b, 0);

    let smoothedMinusDM = minusDMList
        .slice(0, period)
        .reduce((a, b) => a + b, 0);

    const dxList = [];

    // ================================
    // CALCULATE DX
    // ================================

    for (let i = period; i < trList.length; i++) {

        smoothedTR =
            smoothedTR -
            (smoothedTR / period) +
            trList[i];

        smoothedPlusDM =
            smoothedPlusDM -
            (smoothedPlusDM / period) +
            plusDMList[i];

        smoothedMinusDM =
            smoothedMinusDM -
            (smoothedMinusDM / period) +
            minusDMList[i];

        if (smoothedTR === 0) {
            continue;
        }

        const plusDI =
            (smoothedPlusDM / smoothedTR) * 100;

        const minusDI =
            (smoothedMinusDM / smoothedTR) * 100;

        const diSum = plusDI + minusDI;

        if (diSum === 0) {
            continue;
        }

        const dx =
            (Math.abs(plusDI - minusDI) / diSum) * 100;

        dxList.push(dx);
    }

    // ================================
    // WILDER ADX
    // ================================

    if (dxList.length < period) {
        return null;
    }

    let adx = dxList
        .slice(0, period)
        .reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < dxList.length; i++) {

        adx =
            ((adx * (period - 1)) + dxList[i]) /
            period;
    }

    return adx;
}

async function fetch30DaysKlines(symbol, interval) {
    const intervalMs = {
        "15m": 15 * 60 * 1000,
        "30m": 30 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "4h": 4 * 60 * 60 * 1000
    }[interval];

    const now = Date.now();
    const startTime = now - (30 * 24 * 60 * 60 * 1000);

    const allKlines = [];
    let cursor = startTime;

    while (cursor < now) {
        const url =
            `${CONFIG.API_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${cursor}&limit=1000`;

        const response = await fetch(url);
        const batch = await response.json();

        if (!Array.isArray(batch) || batch.length === 0) {
            break;
        }

        allKlines.push(...batch);

        const lastOpenTime = Number(batch[batch.length - 1][0]);
        const nextCursor = lastOpenTime + intervalMs;

        if (nextCursor <= cursor) {
            break;
        }

        cursor = nextCursor;

        if (batch.length < 1000) {
            break;
        }
    }

    const unique = Array.from(
        new Map(
            allKlines.map(candle => [candle[0], candle])
        ).values()
    );

    return unique
        .filter(candle => Number(candle[0]) >= startTime)
        .sort(
            (a, b) =>
                Number(a[0]) - Number(b[0])
        );
}

async function getBTCPrice() {
        const selectedSymbol = localStorage.getItem("alphaMindSelectedSymbol") || CONFIG.SYMBOL;
        document.getElementById("scannerPair").textContent =
    selectedSymbol.replace("USDT", "/USDT");
    document.getElementById("scannerPairText").textContent =
    "Pair : " + selectedSymbol.replace("USDT", "/USDT");
const selectedTimeframe =
    localStorage.getItem("alphaMindSelectedTimeframe") || "15m";

    try {

        const klineResponse = await fetch(
    `${CONFIG.API_BASE}/api/v3/klines?symbol=${selectedSymbol}&interval=${selectedTimeframe}&limit=${CONFIG.LIMIT}`
);

    const klines = await klineResponse.json();

    // 30 Minute Data

const response30m = await fetch(
`${CONFIG.API_BASE}/api/v3/klines?symbol=${selectedSymbol}&interval=30m&limit=50`
);

const klines30m = await response30m.json();

const close30m = klines30m.map(candle => Number(candle[4]));

const ema9_30m = calculateEMA(close30m, 9);

const ema20_30m = calculateEMA(close30m, 20);

// 1 Hour Data

const response1h = await fetch(
`${CONFIG.API_BASE}/api/v3/klines?symbol=${selectedSymbol}&interval=1h&limit=50`
);

const klines1h = await response1h.json();

const close1h = klines1h.map(candle => Number(candle[4]));

const ema9_1h = calculateEMA(close1h, 9);

const ema20_1h = calculateEMA(close1h, 20);


// 4 Hour Data

const response4h = await fetch(
`${CONFIG.API_BASE}/api/v3/klines?symbol=${selectedSymbol}&interval=4h&limit=50`
);

const klines4h = await response4h.json();

const close4h = klines4h.map(candle => Number(candle[4]));

const ema9_4h = calculateEMA(close4h, 9);

const ema20_4h = calculateEMA(close4h, 20);

const chartKlines = await fetch30DaysKlines(
    selectedSymbol,
    selectedTimeframe
);

const chartData = chartKlines.map(candle => ({
    time: Math.floor(Number(candle[0]) / 1000),
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4])
}));

if (window.AlphaMindChart) {
    window.AlphaMindChart.setData(chartData);
}

    console.log("Klines:", klines);
    const closePrices = klines.map(candle => Number(candle[4]));

   
    const support = calculateSupport(closePrices);

    const resistance = calculateResistance(closePrices);
    
    const latestVolume = Number(klines[klines.length - 1][5]);

    const averageVolume = calculateAverageVolume(klines);

    let volumeRatio = 0;

if (averageVolume && averageVolume > 0) {
    volumeRatio = latestVolume / averageVolume;
}

console.log(
    "Volume Ratio:",
    volumeRatio.toFixed(2) + "x"
);

document.getElementById("volumeRatio").textContent =
    "Volume Ratio : " + volumeRatio.toFixed(2) + "x";

    let volumeConfirmation = "Normal 🟡";

if (
    averageVolume &&
    latestVolume >= averageVolume * 1.5
) {
    volumeConfirmation = "Strong 🟢";
}
else if (
    averageVolume &&
    latestVolume >= averageVolume * 1.2
) {
    volumeConfirmation = "Above Normal 🟢";
}
else if (
    averageVolume &&
    latestVolume >= averageVolume * 0.8
) {
    volumeConfirmation = "Normal 🟡";
}
else if (
    averageVolume &&
    latestVolume >= averageVolume * 0.7
) {
    volumeConfirmation = "Below Normal ⚠️";
}
else if (
    averageVolume
) {
    volumeConfirmation = "Weak 🔴";
}

console.log(
    "Volume Confirmation:",
    volumeConfirmation
);

console.log(
    "Volume Confirmation:",
    volumeConfirmation
);

    const atr = calculateATR(klines);

    const atrPrice = closePrices[closePrices.length - 1];

const atrPercent =
    atrPrice > 0
        ? (atr / atrPrice) * 100
        : 0;

console.log("ATR %:", atrPercent);

let volatilityStatus = "Normal 🟡";

if (atrPercent < 0.25) {
    volatilityStatus = "Low 🔵";
}
else if (atrPercent >= 0.60) {
    volatilityStatus = "High 🔴";
}

console.log(
    "Volatility:",
    volatilityStatus
);

    const macd = calculateMACD(closePrices);
    const pattern = detectCandlestickPattern(klines);

    const adx = calculateADX(klines);

    console.log("ADX:", adx);

    console.log("Latest Volume:", latestVolume);

    console.log("Close Prices:", closePrices);

    const ema9 = calculateEMA(closePrices, 9);

     console.log("EMA 9:", ema9);

     const ema20 = calculateEMA(closePrices, 20);

     console.log("EMA 20:", ema20);

     const rsi = calculateRSI(closePrices);

     console.log("RSI:", rsi);

     console.log("Support:", support);

     console.log("Resistance:", resistance);

     console.log("ATR:", atr);

     console.log("MACD:", macd);
     
     let signal = "NO SIGNAL";
     let confidence = 40;
     let aiScore = 45;
     let trend = "Sideways 🟡";
     let recommendation = "Hold 🟡";
     let riskLevel = "Medium 🟡";
     let marketStrength = "Neutral 🟡";
     let strategy = "Wait for Breakout 🟡";
     let volumeStatus = "Normal 🟡";

     const bearishCandle =
    pattern === "Bearish Engulfing 🔴" ||
    pattern === "Shooting Star 🔴";

     // 30 Minute Trend

let trend30m = "Sideways 🟡";

if (ema9_30m > ema20_30m) {

    trend30m = "Bullish 🟢";

}
else if (ema9_30m < ema20_30m) {

    trend30m = "Bearish 🔴";

}
// 1 Hour Trend

let trend1h = "Sideways 🟡";

if (ema9_1h > ema20_1h) {

    trend1h = "Bullish 🟢";

}
else if (ema9_1h < ema20_1h) {

    trend1h = "Bearish 🔴";

}


// 4 Hour Trend

let trend4h = "Sideways 🟡";

if (ema9_4h > ema20_4h) {

    trend4h = "Bullish 🟢";

}
else if (ema9_4h < ema20_4h) {

    trend4h = "Bearish 🔴";

}

     
if (rsi > 55) {
    aiScore += 15;
}
else if (rsi < 45) {
    aiScore += 5;
}
else {
    aiScore += 0;
}

// RSI Confidence

if (rsi > 55 || rsi < 45) {
    confidence += 20;
}
else {
    confidence += 10;
}

if (latestVolume > averageVolume * 1.5) {

    volumeStatus = "High 🟢";

}
else if (latestVolume < averageVolume * 0.7) {

    volumeStatus = "Low 🔴";

}
else {

    volumeStatus = "Normal 🟡";

}
// ================================
// VOLUME SCORE + CONFIDENCE
// ================================

if (volumeStatus === "High 🟢") {

    aiScore += 10;
    confidence += 20;

}
else if (volumeStatus === "Normal 🟡") {

    aiScore += 5;
    confidence += 10;

}
else if (volumeStatus === "Low 🔴") {

    confidence += 5;

}


// ================================
// SIGNAL GENERATION - UPGRADED
// ================================

let buyScore = 0;
let sellScore = 0;

// ================================
// SIDEWAYS MARKET FILTER
// ================================

let marketIsSideways = false;

if (
    adx < 20 &&
    Math.abs(ema9 - ema20) < atr * 0.25
) {
    marketIsSideways = true;
}

// ================================
// BUY CONDITIONS
// ================================

if (ema9 > ema20) {
    buyScore += 25;
}

if (rsi > 55) {
    buyScore += 15;
}

if (adx > 20 && ema9 > ema20) {

    buyScore += 15;

}

if (
    macd &&
    macd.macdLine > macd.signalLine &&
    macd.histogram > 0
) {
    buyScore += 15;
}

if (volumeConfirmation === "Strong 🟢") {
    buyScore += 10;
}
else if (volumeConfirmation === "Above Normal 🟢") {
    buyScore += 5;
}


// ================================
// SELL CONDITIONS
// ================================

if (ema9 < ema20) {
    sellScore += 25;
}

if (rsi < 45) {
    sellScore += 15;
}

if (adx > 20 && ema9 < ema20) {
    
    sellScore += 15;
}

if (
    macd &&
    macd.macdLine < macd.signalLine &&
    macd.histogram < 0
) {
    sellScore += 15;
}

if (volumeConfirmation === "Strong 🟢") {
    sellScore += 10;
}
else if (volumeConfirmation === "Above Normal 🟢") {
    sellScore += 5;
}


// ================================
// FINAL SIGNAL
// ================================

if (
    !marketIsSideways &&
    buyScore >= 60 &&
    buyScore > sellScore
) {

    signal = "BUY 🟢";

   aiScore = Math.min(
    60 + (buyScore - 60) * 0.75,
    75
);

    confidence = Math.min(
    55 + (buyScore - 60) * 0.75,
    70
);

    trend = "Bullish 🟢";
    recommendation = "Buy Confirmation 🟢";
    riskLevel = "Medium 🟡";
    marketStrength = "Bullish 🟢";
    strategy = "Trend Following Buy 🟢";

}

else if (
     !marketIsSideways &&
    sellScore >= 60 &&
    sellScore > buyScore
) {

    signal = "SELL 🔴";

   aiScore = Math.min(
    60 + (sellScore - 60) * 0.75,
    75
);

   confidence = Math.min(
    55 + (sellScore - 60) * 0.75,
    70
);

    trend = "Bearish 🔴";
    recommendation = "Sell Confirmation 🔴";
    riskLevel = "Medium 🟡";
    marketStrength = "Bearish 🔴";
    strategy = "Trend Following Sell 🔴";

}

else {

    signal = "NO SIGNAL 🟡";

    aiScore = 0;
    confidence = 0;

    recommendation = "Wait for Better Setup 🟡";
    riskLevel = "High 🔴";
    marketStrength = "Sideways 🟡";
    strategy = "Wait for Confirmation 🟡";

}


// ================================
// SAFETY LIMIT
// ================================

aiScore = Math.max(
    0,
    Math.min(aiScore, 100)
);

confidence = Math.max(
    0,
    Math.min(confidence, 100)
);

        const response = await fetch(
            `${CONFIG.API_BASE}/api/v3/ticker/price?symbol=${selectedSymbol}`
        );

        const data = await response.json();
        const currentPrice = Number(data.price);

        const distanceFromSupport = currentPrice - support;

        const distanceFromResistance = resistance - currentPrice;

        const nearSupport = distanceFromSupport <= atr;

        const nearResistance = distanceFromResistance <= atr;

        // Support / Resistance Confirmation

        // Breakout Detection

let breakout = "No Breakout 🟡";

if (
    closePrices[closePrices.length - 1] > resistance + (atr * 0.2) &&
    volumeConfirmation === "Strong 🟢" &&
    adx > 25
) {

    breakout = "Strong Resistance Breakout 🟢";

}

else if (
   closePrices[closePrices.length - 1] < support - (atr * 0.2) &&
    volumeConfirmation === "Strong 🟢" &&
    adx > 25
) {

    breakout = "Strong Support Breakdown 🔴";

}

else if ( 
    currentPrice > resistance && 
    latestVolume < averageVolume * 0.7 
) { 
    breakout = "Fake Breakout ⚠️"; 
}

else if ( 
    currentPrice < support && 
    latestVolume < averageVolume * 0.7 
) { 
    breakout = "Fake Breakdown ⚠️"; 
}

else if ( 
    currentPrice > resistance && 
    volumeConfirmation !== "Strong 🟢"
) { 
    breakout = "Weak Resistance Breakout ⚠️"; 
} 

else if ( 
    currentPrice < support && 
    volumeConfirmation !== "Strong 🟢"
) { 
    breakout = "Weak Support Breakdown ⚠️"; 
}
console.log("Current Price:", currentPrice);
console.log("Resistance Check:", currentPrice > resistance);
console.log("Support Check:", currentPrice < support);

console.log(
    "Distance From Resistance:",
    (resistance - currentPrice).toFixed(2)
);

console.log(
    "Distance From Support:",
    (currentPrice - support).toFixed(2)
);
console.log(
    "Support Distance / ATR:",
    ((currentPrice - support) / atr).toFixed(2) + "x"
);
// ================================
// SUPPORT / RESISTANCE DISTANCE
// ================================

const supportDistanceATR =
    (currentPrice - support) / atr;

const resistanceDistanceATR =
    (resistance - currentPrice) / atr;


// ================================
// RECENT CANDLE DATA
// Binance kline format:
// [0] openTime
// [1] open
// [2] high
// [3] low
// [4] close
// [5] volume
// ================================

const recentKlines =
    klines.slice(-5);


// ================================
// SUPPORT REACTION
// ================================

let supportReaction = false;

for (const candle of recentKlines) {

    const candleHigh = Number(candle[2]);
    const candleLow = Number(candle[3]);
    const candleClose = Number(candle[4]);

    const touchedSupport =
        candleLow <= support + (atr * 0.20);

    const bouncedFromSupport =
        candleClose > candleLow &&
        (candleClose - candleLow) >= atr * 0.15;

    if (
        touchedSupport &&
        bouncedFromSupport
    ) {

        supportReaction = true;
        break;

    }
}


// ================================
// RESISTANCE REACTION
// ================================

let resistanceReaction = false;

for (const candle of recentKlines) {

    const candleHigh = Number(candle[2]);
    const candleLow = Number(candle[3]);
    const candleClose = Number(candle[4]);

    const touchedResistance =
        candleHigh >= resistance - (atr * 0.20);

    const rejectedFromResistance =
        candleClose < candleHigh &&
        (candleHigh - candleClose) >= atr * 0.15;

    if (
        touchedResistance &&
        rejectedFromResistance
    ) {

        resistanceReaction = true;
        break;

    }
}

// ================================
// CURRENT PRICE DISTANCE FILTER
// ================================

if (supportDistanceATR > 0.75) {
    supportReaction = false;
}

if (resistanceDistanceATR > 0.75) {
    resistanceReaction = false;
}

// ================================
// VOLUME CONFIRMATION
// ================================

const volumeConfirmed =
    volumeRatio >= 1.0;


// ================================
// SUPPORT ZONE
// ================================

let supportZone = "Normal 🟡";

if (currentPrice < support) {

    supportZone = "Support Breakdown 🔴";

}
else if (
    supportDistanceATR <= 0.25 &&
    supportReaction &&
    volumeConfirmed
) {

    supportZone = "Strong Support 🟢";

}
else if (
    supportDistanceATR <= 0.5
) {

    supportZone = "Near Support 🔵";

}
else {

    supportZone = "Normal 🟡";

}


// ================================
// RESISTANCE ZONE
// ================================

let resistanceZone = "Normal 🟡";

if (currentPrice > resistance) {

    resistanceZone = "Resistance Breakout 🟢";

}
else if (
    resistanceDistanceATR <= 0.25 &&
    resistanceReaction &&
    volumeConfirmed
) {

    resistanceZone = "Strong Resistance 🔴";

}
else if (
    resistanceDistanceATR <= 0.5
) {

    resistanceZone = "Near Resistance 🔴";

}
else {

    resistanceZone = "Normal 🟡";

}


// ================================
// CONSOLE DEBUG
// ================================

console.log(
    "Support Distance / ATR:",
    supportDistanceATR.toFixed(2) + "x"
);

console.log(
    "Resistance Distance / ATR:",
    resistanceDistanceATR.toFixed(2) + "x"
);

console.log(
    "Support Reaction:",
    supportReaction
);

console.log(
    "Resistance Reaction:",
    resistanceReaction
);

console.log(
    "Volume Confirmed:",
    volumeConfirmed
);

console.log(
    "Support Zone:",
    supportZone
);

console.log(
    "Resistance Zone:",
    resistanceZone
);

console.log(
    "Breakout:",
    breakout
);
// ================================
// BREAKOUT SCORE BONUS
// ================================

if (breakout === "Strong Resistance Breakout 🟢") {
    buyScore += 10;
}

if (breakout === "Strong Support Breakdown 🔴") {
    sellScore += 10;
}

        console.log(data);

    document.getElementById("timeframe").textContent =
    "Timeframe : " + selectedTimeframe;

        document.getElementById("livePrice").textContent =
     "$" + Number(data.price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
    });

    document.getElementById("chartPriceLabel").textContent =
"$" + Number(data.price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});


        document.getElementById("ema9").textContent =
    "EMA 9 : " + ema9.toFixed(2);

       document.getElementById("ema20").textContent =
    "EMA 20 : " + ema20.toFixed(2);

      document.getElementById("rsi").textContent =
    "RSI : " + rsi.toFixed(2);
     "$" + Number(data.price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});
     document.getElementById("support").textContent =
    "Support : $" + support.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    document.getElementById("resistance").textContent =
    "Resistance : $" + resistance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    document.getElementById("supportZone").textContent =
    "Support Zone : " + supportZone;

document.getElementById("resistanceZone").textContent =
    "Resistance Zone : " + resistanceZone;

    document.getElementById("atr").textContent =
    "ATR : " + atr.toFixed(2);

    document.getElementById("adx").textContent =
    "ADX : " + adx.toFixed(2);

   document.getElementById("macd").textContent =
    "MACD : " + macd.macdLine.toFixed(2);

    document.getElementById("trend").textContent =
    "Trend : " + trend;

    document.getElementById("trend15m").textContent =
   "15m Trend : " + trend;

    document.getElementById("trend30m").textContent =
    "30m Trend : " + trend30m;

    document.getElementById("trend1h").textContent =
    "1H Trend : " + trend1h;

    document.getElementById("trend4h").textContent =
    "4H Trend : " + trend4h;

  let multiTrend = "Mixed Market 🟡";

if (
    trend === "Bullish 🟢" &&
    trend30m === "Bullish 🟢" &&
    trend1h === "Bullish 🟢" &&
    trend4h === "Bullish 🟢"
) {

    multiTrend = "Strong Bullish 🟢";

}

else if (
    trend === "Bearish 🔴" &&
    trend30m === "Bearish 🔴" &&
    trend1h === "Bearish 🔴" &&
    trend4h === "Bearish 🔴"
) {

    multiTrend = "Strong Bearish 🔴";

}

else if (
    trend === "Bearish 🔴" &&
    trend30m === "Bullish 🟢" &&
    trend1h === "Bullish 🟢" &&
    trend4h === "Bullish 🟢"
) {

    multiTrend = "Bullish Trend • Pullback 🟢";

}

else if (
    trend === "Bullish 🟢" &&
    trend30m === "Bearish 🔴" &&
    trend1h === "Bearish 🔴" &&
    trend4h === "Bearish 🔴"
) {

    multiTrend = "Bearish Trend • Pullback 🔴";

}

else {

    multiTrend = "Mixed Market 🟡";

}

document.getElementById("multiTrend").textContent =
"Multi Timeframe : " + multiTrend;

   

    document.getElementById("riskLevel").textContent =
    "Risk Level : " + riskLevel;

    document.getElementById("marketStrength").textContent =
    "Market Strength : " + marketStrength;

    document.getElementById("strategy").textContent =
    "Strategy : " + strategy;

    document.getElementById("pattern").textContent =
    "Candlestick : " + pattern;

    document.getElementById("volume").textContent =
    "Volume : " + volumeStatus;

    document.getElementById("breakout").textContent =
"Breakout : " + breakout;


    document.getElementById("entry").textContent =
    "Entry : $" + Number(data.price).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
 });
if (signal === "NO SIGNAL") {

    document.getElementById("entry").textContent =
        "Entry : --";

}
  let targetPrice = null;
let stopLoss = null;
let reward = 0;
let risk = 0;
let riskReward = "--";

const activeTrade =
    signal === "BUY 🟢" ||
    signal === "SELL 🔴";

if (activeTrade) {

    const currentPrice = Number(data.price);

    // Target
    if (signal === "BUY 🟢") {
        targetPrice = currentPrice + (atr * 4);
    }
    else if (signal === "SELL 🔴") {
        targetPrice = currentPrice - (atr * 4);
    }

    // Stop Loss
    if (signal === "BUY 🟢") {
        stopLoss = currentPrice - (atr * 2);
    }
    else if (signal === "SELL 🔴") {
        stopLoss = currentPrice + (atr * 2);
    }

    // Risk / Reward
    if (signal === "BUY 🟢") {

        reward = targetPrice - currentPrice;
        risk = currentPrice - stopLoss;

    }
    else if (signal === "SELL 🔴") {

        reward = currentPrice - targetPrice;
        risk = stopLoss - currentPrice;

    }

    if (risk > 0) {
        riskReward = (reward / risk).toFixed(2);
    }

    // Entry
    document.getElementById("entry").textContent =
        "Entry : $" + currentPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    // Target
    document.getElementById("target").textContent =
        "Target : $" + targetPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    // Stop Loss
    document.getElementById("stoploss").textContent =
        "Stop Loss : $" + stopLoss.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    // Risk Reward
    document.getElementById("riskReward").textContent =
        "Risk Reward : 1 : " + riskReward;

}
else {

    // NO SIGNAL = NO TRADE LEVELS

    document.getElementById("entry").textContent =
        "Entry : --";

    document.getElementById("target").textContent =
        "Target : --";

    document.getElementById("stoploss").textContent =
        "Stop Loss : --";

    document.getElementById("riskReward").textContent =
        "Risk Reward : --";
}

document.getElementById("lastUpdate").textContent =
    "Last Update : " + new Date().toLocaleTimeString();

console.log("Final Confidence:", confidence);
console.log("Final AI Score:", aiScore);


// Final signal processing starts after all base calculations

let finalSignal = signal;

if (volatilityStatus === "High 🔴") {
    aiScore += 5;
}
else if (volatilityStatus === "Low 🔵") {
    aiScore -= 10;
}

if (volatilityStatus === "High 🔴") {
    riskLevel = "High 🔴";
}
else if (volatilityStatus === "Low 🔵") {
    riskLevel = "High 🔴";
}
else {
    riskLevel = "Medium 🟡";
}

if (
    volatilityStatus === "Low 🔵" &&
    (
        finalSignal.includes("BUY") ||
        finalSignal.includes("SELL")
    )
) {
    finalSignal = "NO SIGNAL 🟡";
    aiScore = 0;
    confidence = 0;

    recommendation = "Low Volatility - Wait 🟡";
    strategy = "Wait for Volatility Confirmation 🟡";
    riskLevel = "High 🔴";
    marketStrength = "Low Volatility 🔵";
}



// ================================
// HIGHER TIMEFRAME CONFLICT PROTECTION
// UPGRADED
// ================================

// Higher timeframe conflict = penalty
// Signal completely cancel nahi hoga.

let higherTimeframeConflicts = 0;


// BUY vs Higher Timeframe

if (
    finalSignal.includes("BUY") &&
    trend1h === "Bearish 🔴"
) {

    higherTimeframeConflicts++;

    aiScore -= 8;
    confidence -= 5;

    recommendation = "Buy Against 1H Trend ⚠️";
    strategy = "Short-Term Buy / Higher TF Conflict ⚠️";
    riskLevel = "Medium 🟡";
}


if (
    finalSignal.includes("BUY") &&
    trend4h === "Bearish 🔴"
) {

    higherTimeframeConflicts++;

    aiScore -= 8;
    confidence -= 5;

    recommendation = "Buy Against 4H Trend ⚠️";
    strategy = "Short-Term Buy / Higher TF Conflict ⚠️";
    riskLevel = "Medium 🟡";
}


// SELL vs Higher Timeframe

if (
    finalSignal.includes("SELL") &&
    trend1h === "Bullish 🟢"
) {

    higherTimeframeConflicts++;

    aiScore -= 8;
    confidence -= 5;

    recommendation = "Sell Against 1H Trend ⚠️";
    strategy = "Short-Term Sell / Higher TF Conflict ⚠️";
    riskLevel = "Medium 🟡";
}


if (
    finalSignal.includes("SELL") &&
    trend4h === "Bullish 🟢"
) {

    higherTimeframeConflicts++;

    aiScore -= 8;
    confidence -= 5;

    recommendation = "Sell Against 4H Trend ⚠️";
    strategy = "Short-Term Sell / Higher TF Conflict ⚠️";
    riskLevel = "Medium 🟡";
}


// Both Higher Timeframes are against the signal
// Cancel the trade.

if (higherTimeframeConflicts === 2) {

    finalSignal = "NO SIGNAL 🟡";

    aiScore = 0;
    confidence = 0;

    recommendation = "Higher TF Strong Conflict ⚠️";
    strategy = "Wait for Higher TF Confirmation 🟡";
    riskLevel = "High 🔴";
    marketStrength = "Mixed ⚠️";
}

// ================================
// FINAL SCORE LIMIT
// ================================

aiScore = Math.max(
    0,
    Math.min(aiScore, 100)
);

confidence = Math.max(
    0,
    Math.min(confidence, 100)
);


// ================================
// FINAL AI SCORE FILTER
// ================================

// Sirf bahut weak signals ko reject karo.
// Pehle 80 se neeche sab reject ho rahe the.
// Ab threshold 65 hai.

if (
    (finalSignal.includes("BUY") ||
     finalSignal.includes("SELL")) &&
    volumeConfirmation === "Weak 🔴"
) {

    finalSignal = "NO SIGNAL 🟡";

    aiScore = 0;
    confidence = 0;

    recommendation = "Weak Volume Confirmation ⚠️";
    strategy = "Wait for Volume Confirmation 🟡";
    riskLevel = "High 🔴";
    marketStrength = "Weak Volume 🔴";

   
}

if (
    finalSignal.includes("BUY") &&
    breakout === "Weak Resistance Breakout ⚠️"
) {

    recommendation = "Weak Breakout ⚠️";
    strategy = "Wait for Strong Breakout 🟡";
    riskLevel = "High 🔴";
}

if (
    finalSignal.includes("SELL") &&
    breakout === "Weak Support Breakdown ⚠️"
) {

    recommendation = "Weak Breakdown ⚠️";
    strategy = "Wait for Strong Breakdown 🟡";
    riskLevel = "High 🔴";
}

if (
    (finalSignal.includes("BUY") ||
     finalSignal.includes("SELL")) &&
    volumeConfirmation === "Below Normal ⚠️"
) {

    confidence -= 10;

    recommendation = "Low Volume Confirmation ⚠️";
    riskLevel = "High 🔴";
    strategy = "Wait for Stronger Volume 🟡";
}

if (
    (finalSignal.includes("BUY") ||
     finalSignal.includes("SELL")) &&
    aiScore < 65
) {

    finalSignal = "NO SIGNAL 🟡";

    recommendation = "Wait for Better Setup 🟡";
    strategy = "Wait for Confirmation 🟡";
    riskLevel = "High 🔴";

   
}

// ================================
// ATR-BASED SUPPORT / RESISTANCE
// ================================

if (
    finalSignal.includes("BUY") &&
    distanceFromSupport <= atr
) {
    recommendation = "Strong Buy Near Support 🟢";
    aiScore += 5;
}

if (
    finalSignal.includes("SELL") &&
    distanceFromResistance <= atr
) {
    recommendation = "Strong Sell Near Resistance 🔴";
    aiScore += 5;
}

// ================================
// FINAL SCORE LIMIT AGAIN
// ================================

aiScore = Math.max(
    0,
    Math.min(aiScore, 100)
);

confidence = Math.max(
    0,
    Math.min(confidence, 100)
);

// ================================
// FINAL SIGNAL SAFETY FILTER
// ================================

if (
    finalSignal.includes("BUY") &&
    trend1h === "Bearish 🔴" &&
    trend4h === "Bearish 🔴"
) {
    finalSignal = "NO SIGNAL 🟡";
}

else if (
    finalSignal.includes("SELL") &&
    trend1h === "Bullish 🟢" &&
    trend4h === "Bullish 🟢"
) {
    finalSignal = "NO SIGNAL 🟡";
}

// ================================
// NO SIGNAL FINAL RESET
// ================================

if (finalSignal === "NO SIGNAL 🟡") {

    confidence = 0;
    aiScore = 0;

    recommendation = "Wait for Better Setup 🟡";
    strategy = "Wait for Confirmation 🟡";
    marketStrength = "Sideways 🟡";
    riskLevel = "High 🔴";

    document.getElementById("marketStrength").textContent =
    "Market Strength : " + marketStrength;

document.getElementById("strategy").textContent =
    "Strategy : " + strategy;

document.getElementById("riskLevel").textContent =
    "Risk Level : " + riskLevel;

    // Clear old trade levels
    document.getElementById("entry").textContent =
        "Entry : --";

    document.getElementById("target").textContent =
        "Target : --";

    document.getElementById("stoploss").textContent =
        "Stop Loss : --";

    document.getElementById("riskReward").textContent =
        "Risk Reward : --";

}

    // Fake Breakout Protection

if (
    finalSignal === "BUY 🟢" &&
    breakout === "Fake Breakout ⚠️"
) {

    finalSignal = "NO SIGNAL 🟡";
    signal = "NO SIGNAL 🟡";

    aiScore = 0;
    confidence = 0;

    recommendation = "Fake Breakout Detected ⚠️";
    riskLevel = "High 🔴";
    marketStrength = "Weak / Unconfirmed ⚠️";
    strategy = "Wait for Breakout Confirmation 🟡";
}

// ================================
// BUY NEAR RESISTANCE + LOW VOLUME
// TRADE BLOCK
// ================================

if (
    finalSignal === "BUY 🟢" &&
    nearResistance &&
    volumeStatus === "Low 🔴"
) {

    finalSignal = "NO SIGNAL 🟡";
    signal = "NO SIGNAL 🟡";

    aiScore = 0;
    confidence = 0;

    recommendation = "Buy Near Resistance - Weak Volume ⚠️";
    riskLevel = "High 🔴";
    marketStrength = "Weak / Unconfirmed ⚠️";
    strategy = "Wait for Breakout Confirmation 🟡";
}
if (
    finalSignal === "SELL 🔴" &&
    nearSupport &&
    volumeStatus === "Low 🔴"
) {

    finalSignal = "NO SIGNAL 🟡";
    signal = "NO SIGNAL 🟡";

    aiScore = 0;
    confidence = 0;

    recommendation = "Sell Near Support - Weak Volume ⚠️";
    riskLevel = "High 🔴";
    marketStrength = "Weak / Unconfirmed ⚠️";
    strategy = "Wait for Support Breakdown Confirmation 🟡";
}

  document.getElementById("confidence").textContent =
    "Confidence : " + confidence + "%";

    document.getElementById("aiScore").textContent =
    "AI Score : " + aiScore + "/100";

    document.getElementById("recommendation").textContent =
"Recommendation : " + recommendation;




document.getElementById("recommendation").textContent =
"Recommendation : " + recommendation;

aiScore = Math.min(aiScore, 100);

document.getElementById("aiScore").textContent =
"AI Score : " + aiScore + "/100";

// ==========================================
// FINAL SIGNAL LOCK
// ==========================================

if (finalSignal === "NO SIGNAL 🟡") {

    signal = "NO SIGNAL 🟡";

    confidence = 0;
    aiScore = 0;

} else {

    signal = finalSignal;

    confidence = Math.max(
        0,
        Math.min(confidence, 100)
    );

    aiScore = Math.max(
        0,
        Math.min(aiScore, 100)
    );
}


// ==========================================
// FINAL UI
// ==========================================

sendSignalNotification(finalSignal, selectedSymbol);

signal = finalSignal;

document.getElementById("signal").textContent =
    "Signal : " + finalSignal;

document.getElementById("confidence").textContent =
    "Confidence : " + confidence.toFixed(1) + "%";

document.getElementById("aiScore").textContent =
    "AI Score : " + aiScore.toFixed(1) + "/100";

document.getElementById("recommendation").textContent =
    "Recommendation : " + recommendation;

document.getElementById("strategy").textContent =
    "Strategy : " + strategy;

document.getElementById("marketStrength").textContent =
    "Market Strength : " + marketStrength;

document.getElementById("riskLevel").textContent =
    "Risk Level : " + riskLevel;

 // ================================
// SIGNAL BADGE
// ================================

const signalBadge =
    document.getElementById("signalBadge");

const signalStatus =
    document.getElementById("signalStatus");


if (finalSignal.includes("BUY")) {

    signalBadge.textContent =
        "BUY SIGNAL 🟢";

    signalBadge.style.background =
        "#16a34a";

    signalBadge.style.color =
        "white";

    signalBadge.style.borderColor =
        "#22c55e";

    signalStatus.textContent =
        "BUY setup detected. Check entry and risk management. 🟢";

}

else if (finalSignal.includes("SELL")) {

    signalBadge.textContent =
        "SELL SIGNAL 🔴";

    signalBadge.style.background =
        "#dc2626";

    signalBadge.style.color =
        "white";

    signalBadge.style.borderColor =
        "#ef4444";

    signalStatus.textContent =
        "SELL setup detected. Check entry and risk management. 🔴";

}

else {

    signalBadge.textContent =
        "NO SIGNAL 🟡";

    signalBadge.style.background =
        "#854d0e";

    signalBadge.style.color =
        "white";

    signalBadge.style.borderColor =
        "#eab308";

    signalStatus.textContent =
        "Waiting for a high-quality trade setup... 🟡";

}

if (finalSignal.includes("BUY")) {

    document.getElementById("marketStatus").textContent =
        "Market Status : Bullish 🟢";

}
else if (finalSignal.includes("SELL")) {

    document.getElementById("marketStatus").textContent =
        "Market Status : Bearish 🔴";

}
else {

    document.getElementById("marketStatus").textContent =
        "Market Status : Sideways 🟡";

}


if (
    (finalSignal.includes("BUY") || finalSignal.includes("SELL")) &&
    !localStorage.getItem("alphaMindPendingTrade")
) {
    savePendingTrade(
        finalSignal,
        Number(data.price),
        targetPrice,
        stopLoss,
        aiScore,
        confidence
    );

    displayPendingTrade();
}


    } catch (error) {

        console.error(error);

    }

}

getBTCPrice();
setInterval(getBTCPrice, 5000);

document.getElementById("scanBtn").addEventListener("click", async () => {

    const btn = document.getElementById("scanBtn");

    btn.disabled = true;
    btn.textContent = "⏳ Scanning...";

    await getBTCPrice();

    btn.disabled = false;
    btn.textContent = "🚀 Scan Market";

});

// ================================
// TRADE PERFORMANCE ANALYZER
// ================================

let tradeStats = JSON.parse(
    localStorage.getItem("alphaMindTradeStats")
) || {
    total: 0,
    wins: 0,
    losses: 0,
    buyTotal: 0,
    buyWins: 0,
    sellTotal: 0,
    sellWins: 0,
    scoreTotal: 0,
    confidenceTotal: 0
};

// Fix old SELL statistics once
if (tradeStats.sellAccuracyFixed !== true) {

    tradeStats.sellTotal = tradeStats.total - tradeStats.buyTotal;

    tradeStats.sellWins = 0;

    tradeStats.sellAccuracyFixed = true;

    localStorage.setItem(
        "alphaMindTradeStats",
        JSON.stringify(tradeStats)
    );
}

function updatePerformanceAnalyzer() {

    const total = tradeStats.total;

    const tradeHistory =
        JSON.parse(
            localStorage.getItem("alphaMindTradeHistory")
        ) || [];

    let buyTotal = 0;
    let buyWins = 0;
    let sellTotal = 0;
    let sellWins = 0;

    tradeHistory.forEach(trade => {

        if (trade.signal.includes("BUY")) {
            buyTotal++;

            if (trade.result === "WIN") {
                buyWins++;
            }
        }

        else if (trade.signal.includes("SELL")) {
            sellTotal++;

            if (trade.result === "WIN") {
                sellWins++;
            }
        }

    });

    const winRate =
        total > 0
            ? (tradeStats.wins / total) * 100
            : 0;

    const buyAccuracy =
        buyTotal > 0
            ? (buyWins / buyTotal) * 100
            : 0;

    const sellAccuracy =
        sellTotal > 0
            ? (sellWins / sellTotal) * 100
            : 0;

    const avgScore =
        total > 0
            ? tradeStats.scoreTotal / total
            : 0;

    const avgConfidence =
        total > 0
            ? tradeStats.confidenceTotal / total
            : 0;

    tradeStats.buyTotal = buyTotal;
    tradeStats.buyWins = buyWins;

    tradeStats.sellTotal = sellTotal;
    tradeStats.sellWins = sellWins;

    document.getElementById("totalTrades").textContent =
        total;

    document.getElementById("winningTrades").textContent =
        tradeStats.wins;

    document.getElementById("losingTrades").textContent =
        tradeStats.losses;

    document.getElementById("winRate").textContent =
        Math.min(winRate, 100).toFixed(1) + "%";

    document.getElementById("buyAccuracy").textContent =
        Math.min(buyAccuracy, 100).toFixed(1) + "%";

    document.getElementById("sellAccuracy").textContent =
        Math.min(sellAccuracy, 100).toFixed(1) + "%";

    document.getElementById("aiScoreAccuracy").textContent =
        "🤖 Average AI Score : " +
        avgScore.toFixed(1) +
        "/100";

    document.getElementById("confidenceAccuracy").textContent =
        "🎯 Average Confidence : " +
        avgConfidence.toFixed(1) +
        "%";

    if (total === 0) {

        document.getElementById("performanceStatus").textContent =
            "📊 Waiting for trade results...";

    }

    else if (winRate >= 60) {

        document.getElementById("performanceStatus").textContent =
            "🟢 Scanner performance is strong.";

    }

    else if (winRate >= 40) {

        document.getElementById("performanceStatus").textContent =
            "🟡 Scanner performance needs improvement.";

    }

    else {

        document.getElementById("performanceStatus").textContent =
            "🔴 Scanner accuracy is currently low.";

    }

    localStorage.setItem(
        "alphaMindTradeStats",
        JSON.stringify(tradeStats)
    );
}

updatePerformanceAnalyzer();

function savePendingTrade(signal, entry, target, stopLoss, aiScore, confidence) {

    if (!signal.includes("BUY") && !signal.includes("SELL")) {
        return;
    }

    // Existing pending trade check
    const existingTrade = JSON.parse(
        localStorage.getItem("alphaMindPendingTrade")
    );

    if (existingTrade && existingTrade.status === "PENDING") {

        // Same direction + nearly same entry = duplicate signal
        const sameSignal =
            existingTrade.signal === signal;

        const entryDifference =
            Math.abs(
                Number(existingTrade.entry) - Number(entry)
            );

        const entryPercentDifference =
            (entryDifference / Number(entry)) * 100;

        if (
            sameSignal &&
            entryPercentDifference < 0.50
        ) {

            console.log(
                "DUPLICATE SIGNAL BLOCKED:",
                signal
            );

            return;
        }
    }

    // ================================
// RECENT COMPLETED TRADE CHECK
// ================================

const tradeHistory = JSON.parse(
    localStorage.getItem("alphaMindTradeHistory") || "[]"
);

const recentTrades = tradeHistory.slice(0, 5);

const duplicateRecentTrade = recentTrades.some(trade => {

    const sameSignal =
        trade.signal === signal;

    const entryDifference =
        Math.abs(
            Number(trade.entry) - Number(entry)
        );

    const entryPercentDifference =
        (entryDifference / Number(entry)) * 100;

    return (
        sameSignal &&
        entryPercentDifference < 0.50
    );
});

if (duplicateRecentTrade) {

    console.log(
        "RECENT COMPLETED SIGNAL BLOCKED:",
        signal
    );

    return;
}

    const pendingTrade = {
        id: Date.now(),
        signal: signal,
        entry: Number(entry),
        target: Number(target),
        stopLoss: Number(stopLoss),
        aiScore: Number(aiScore),
        confidence: Number(confidence),
        status: "PENDING",
        createdAt: new Date().toISOString()
    };

    localStorage.setItem(
        "alphaMindPendingTrade",
        JSON.stringify(pendingTrade)
    );

    console.log(
        "PENDING TRADE SAVED:",
        pendingTrade
    );
}

// ================================
// WIN / LOSS TRADE RECORDING
// ================================

function recordTradeResult(result) {

    const pendingTrade = JSON.parse(
        localStorage.getItem("alphaMindPendingTrade")
    );

    if (!pendingTrade) {
        alert("No pending trade found.");
        return;
    }

    if (pendingTrade.status !== "PENDING") {
        alert("This trade is already recorded.");
        return;
    }

    const signal = pendingTrade.signal;

    const completedTrade = {
    id: pendingTrade.id,
    signal: pendingTrade.signal,
    entry: pendingTrade.entry,
    target: pendingTrade.target,
    stopLoss: pendingTrade.stopLoss,
    aiScore: pendingTrade.aiScore,
    confidence: pendingTrade.confidence,
    result: result,
    createdAt: pendingTrade.createdAt,
    completedAt: new Date().toISOString()
};

let tradeHistory =
    JSON.parse(localStorage.getItem("alphaMindTradeHistory")) || [];

tradeHistory.unshift(completedTrade);

localStorage.setItem(
    "alphaMindTradeHistory",
    JSON.stringify(tradeHistory)
);

    tradeStats.total++;

   if (result === "WIN") {

    tradeStats.wins++;

    if (signal.includes("BUY")) {
        tradeStats.buyWins++;
    }

    if (signal.includes("SELL")) {
        tradeStats.sellWins++;
    }

} else if (result === "LOSS") {

    tradeStats.losses++;

}

if (signal.includes("BUY")) {
    tradeStats.buyTotal++;
}

if (signal.includes("SELL")) {
    tradeStats.sellTotal++;
}

tradeStats.scoreTotal +=
    Number(pendingTrade.aiScore);

tradeStats.confidenceTotal +=
    Number(pendingTrade.confidence);

pendingTrade.status = result;

localStorage.removeItem(
    "alphaMindPendingTrade"
);

localStorage.setItem(
    "alphaMindTradeStats",
    JSON.stringify(tradeStats)
);

updatePerformanceAnalyzer();

displayTradeHistory();


console.log(
    "TRADE RESULT:",
    result,
    pendingTrade
);
}

// WIN BUTTON

document
    .getElementById("markWinBtn")
    .addEventListener("click", () => {

        recordTradeResult("WIN");

    });


// LOSS BUTTON

document
    .getElementById("markLossBtn")
    .addEventListener("click", () => {

        recordTradeResult("LOSS");

    });

    // ================================
// RESET PERFORMANCE
// ================================

document
    .getElementById("resetPerformanceBtn")
    .addEventListener("click", () => {

        const confirmReset = confirm(
            "Are you sure you want to reset all trade performance data?"
        );

        if (!confirmReset) {
            return;
        }

        tradeStats = {
            total: 0,
            wins: 0,
            losses: 0,
            buyTotal: 0,
            buyWins: 0,
            sellTotal: 0,
            sellWins: 0,
            scoreTotal: 0,
            confidenceTotal: 0
        };

        localStorage.removeItem(
            "alphaMindTradeStats"
        );

        localStorage.removeItem(
            "alphaMindPendingTrade"
        );

        updatePerformanceAnalyzer();

        alert("Performance data has been reset.");
    });

    // ================================
// SHOW PENDING TRADE
// ================================

function displayPendingTrade() {

    const pendingTrade = JSON.parse(
        localStorage.getItem("alphaMindPendingTrade")
    );

    if (!pendingTrade) {

        document.getElementById("pendingSignal").textContent =
            "Signal : --";

        document.getElementById("pendingEntry").textContent =
            "Entry : --";

        document.getElementById("pendingTarget").textContent =
            "Target : --";

        document.getElementById("pendingStopLoss").textContent =
            "Stop Loss : --";

        document.getElementById("pendingScore").textContent =
            "AI Score : --";

        document.getElementById("pendingConfidence").textContent =
            "Confidence : --";

        return;
    }

    document.getElementById("pendingSignal").textContent =
        "Signal : " + pendingTrade.signal;

    document.getElementById("pendingEntry").textContent =
        "Entry : $" + Number(pendingTrade.entry).toLocaleString();

    document.getElementById("pendingTarget").textContent =
        "Target : $" + Number(pendingTrade.target).toLocaleString();

    document.getElementById("pendingStopLoss").textContent =
        "Stop Loss : $" + Number(pendingTrade.stopLoss).toLocaleString();

    document.getElementById("pendingScore").textContent =
        "AI Score : " + pendingTrade.aiScore + "/100";

    document.getElementById("pendingConfidence").textContent =
        "Confidence : " + pendingTrade.confidence + "%";
}


displayPendingTrade();

// ================================
// DISPLAY TRADE HISTORY
// ================================

function displayTradeHistory() {

    const historyList =
        document.getElementById("tradeHistoryList");

    if (!historyList) {
        return;
    }

    const tradeHistory =
        JSON.parse(
            localStorage.getItem("alphaMindTradeHistory")
        ) || [];

    if (tradeHistory.length === 0) {

        historyList.innerHTML =
            "<p>No completed trades yet.</p>";

        return;
    }

    historyList.innerHTML = "";

    tradeHistory.forEach((trade, index) => {

        const tradeCard =
            document.createElement("div");

        tradeCard.className = "history-trade-card";

        tradeCard.innerHTML = `
            <h3>Trade #${tradeHistory.length - index}</h3>

            <p>
                Signal :
                <strong>${trade.signal}</strong>
            </p>

            <p>
                Entry :
                $${Number(trade.entry).toLocaleString()}
            </p>

            <p>
                Target :
                $${Number(trade.target).toLocaleString()}
            </p>

            <p>
                Stop Loss :
                $${Number(trade.stopLoss).toLocaleString()}
            </p>

            <p>
                AI Score :
                ${trade.aiScore}/100
            </p>

            <p>
                Confidence :
                ${trade.confidence}%
            </p>

            <p>
                Result :
                <strong>${trade.result}</strong>
            </p>

        `;

        historyList.appendChild(tradeCard);

    });
}

displayTradeHistory();

// ================================
// ONE TIME OLD TRADE MIGRATION
// ================================

if (!localStorage.getItem("alphaMindOldStatsMigrated")) {

    const history =
        JSON.parse(
            localStorage.getItem("alphaMindTradeHistory")
        ) || [];

    const oldTrades = [];

    // 9 पुराने BUY trades
    // 8 WIN + 1 LOSS

    for (let i = 0; i < 9; i++) {

        oldTrades.push({
            id: "old-buy-" + i,
            signal: "BUY 🟢",
            entry: 0,
            target: 0,
            stopLoss: 0,
            aiScore: 0,
            confidence: 0,
            result: i < 8 ? "WIN" : "LOSS",
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        });

    }

    // 2 पुराने SELL trades
    // दोनों LOSS

    for (let i = 0; i < 2; i++) {

        oldTrades.push({
            id: "old-sell-" + i,
            signal: "SELL 🔴",
            entry: 0,
            target: 0,
            stopLoss: 0,
            aiScore: 0,
            confidence: 0,
            result: "LOSS",
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        });

    }

    localStorage.setItem(
        "alphaMindTradeHistory",
        JSON.stringify([
            ...oldTrades,
            ...history
        ])
    );

    localStorage.setItem(
        "alphaMindOldStatsMigrated",
        "true"
    );

    updatePerformanceAnalyzer();

    displayTradeHistory();

    console.log(
        "OLD TRADES MIGRATED"
    );
}

// ================================
// REMOVE FAKE MIGRATED TRADES
// ================================

const history =
    JSON.parse(
        localStorage.getItem("alphaMindTradeHistory")
    ) || [];

const cleanedHistory = history.filter(trade => {
    return !String(trade.id).startsWith("old-buy-") &&
           !String(trade.id).startsWith("old-sell-");
});

localStorage.setItem(
    "alphaMindTradeHistory",
    JSON.stringify(cleanedHistory)
);

displayTradeHistory();

// ================================
// CRYPTO WATCHLIST LIVE PRICES
// ================================

const watchlistSymbols = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "XRPUSDT",
    "BNBUSDT",
    "DOGEUSDT"
];

async function updateWatchlist() {

    for (const symbol of watchlistSymbols) {

        try {

            const response = await fetch(
                `${CONFIG.API_BASE}/api/v3/ticker/price?symbol=${symbol}`
            );

            const data = await response.json();

            const priceElement =
                document.getElementById(`watch-${symbol}`);

            if (priceElement) {

                priceElement.textContent =
                    "$" + Number(data.price).toLocaleString(
                        undefined,
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );

            }

        } catch (error) {

            console.error(
                "Watchlist error:",
                symbol,
                error
            );

        }

    }

}

updateWatchlist();

setInterval(updateWatchlist, 5000);

// ================================
// WATCHLIST COIN SELECTION
// ================================

const cryptoItems = document.querySelectorAll(".crypto-item");

cryptoItems.forEach(item => {

    item.addEventListener("click", () => {

        const symbol = item.dataset.symbol;

        localStorage.setItem(
            "alphaMindSelectedSymbol",
            symbol
        );

        cryptoItems.forEach(button => {
            button.classList.remove("active");
        });

        item.classList.add("active");

        console.log(
            "Selected Crypto:",
            symbol
        );

        getBTCPrice();

    });

});

document.querySelectorAll(".timeframe-btn").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".timeframe-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        const selectedTimeframe = button.dataset.timeframe;

        localStorage.setItem(
            "alphaMindSelectedTimeframe",
            selectedTimeframe
        );

        console.log("Selected Timeframe:", selectedTimeframe);
    });

});
