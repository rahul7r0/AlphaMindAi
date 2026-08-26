const analysisData = {
  "15m": {
    signal: "BUY",
    entry: "118500",
    stoploss: "117800",
    target1: "119800",
    target2: "120500"
  },
  "30m": {
    signal: "BUY",
    entry: "118700",
    stoploss: "118000",
    target1: "120200",
    target2: "121000"
  },
  "1h": {
    signal: "SELL",
    entry: "118100",
    stoploss: "118900",
    target1: "117300",
    target2: "116800"
  },
  "4h": {
    signal: "BUY",
    entry: "119000",
    stoploss: "118200",
    target1: "121500",
    target2: "123000"
  },
  "1d": {
    signal: "BUY",
    entry: "120000",
    stoploss: "118500",
    target1: "125000",
    target2: "128000"
  }
};

function updateAnalysis(tf) {
  const data = analysisData[tf];

  document.getElementById("analysisTitle").innerText =
    "BTC/USDT Analysis (" + tf + ")";

  document.getElementById("signal").innerText = data.signal;
  document.getElementById("entry").innerText = data.entry;
  document.getElementById("stoploss").innerText = data.stoploss;
  document.getElementById("target1").innerText = data.target1;
  document.getElementById("target2").innerText = data.target2;
}

document.getElementById("btn15").onclick = () => updateAnalysis("15m");
document.getElementById("btn30").onclick = () => updateAnalysis("30m");
document.getElementById("btn1h").onclick = () => updateAnalysis("1h");
document.getElementById("btn4h").onclick = () => updateAnalysis("4h");
document.getElementById("btn1d").onclick = () => updateAnalysis("1d");

updateAnalysis("15m");

console.log("AlphaMind AI Loaded");

async function loadPrices() {
    const url = "https://api.binance.com/api/v3/ticker/24hr";

    const res = await fetch(url);
    const data = await res.json();

    function update(symbol, priceId, changeId) {
        const coin = data.find(x => x.symbol === symbol);

        if (!coin) return;

        document.getElementById(priceId).innerText =
            "$" + Number(coin.lastPrice).toLocaleString();

        const change = Number(coin.priceChangePercent).toFixed(2);

        const changeElement = document.getElementById(changeId);

        changeElement.innerText = change + "%";

        if (change >= 0) {
            changeElement.style.color = "#22c55e";
        } else {
            changeElement.style.color = "#ef4444";
        }
    }

    update("BTCUSDT", "btc-price", "btc-change");
    update("ETHUSDT", "eth-price", "eth-change");
    update("SOLUSDT", "sol-price", "sol-change");
    update("XRPUSDT", "xrp-price", "xrp-change");
}

loadPrices();

setInterval(loadPrices, 5000);
new TradingView.widget({
    width: "100%",
    height: 600,
    symbol: "BINANCE:BTCUSDT",
    interval: "15",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    toolbar_bg: "#131722",
    enable_publishing: false,
    allow_symbol_change: true,
    container_id: "tradingview_chart"
});

function changeCoin(symbol, coinName) {

    document.getElementById("tradingview_chart").innerHTML = "";

    new TradingView.widget({
        width: "100%",
        height: 600,
        symbol: symbol,
        interval: "15",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#131722",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingview_chart"
    });

    document.getElementById("analysisTitle").innerText =
        coinName + " Analysis (15 Min)";
     }   

async function loadNews() {

    const container = document.getElementById("newsContainer");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="news-card">
            <h3>📰 Crypto Market News</h3>
            <p>Loading latest crypto news...</p>
        </div>
    `;

    try {

        const response = await fetch(
            "http://localhost:3000/api/news"
        );

        if (!response.ok) {
            throw new Error("News API request failed");
        }

        const data = await response.json();

        if (!data.success || !data.articles) {
            throw new Error("No news available");
        }

        const news = data.articles.slice(0, 5);

        container.innerHTML = news.map(item => {

            const title =
                item.title || "Crypto Market Update";

            const description =
                item.description ||
                "Latest cryptocurrency market news.";

            const source =
                item.source || "Crypto News";

            const time =
                item.publishedAt
                    ? new Date(item.publishedAt).toLocaleString()
                    : "Recently";

            const image = item.image
                ? `
                    <img
                        src="${item.image}"
                        alt="Crypto News"
                        class="news-image"
                        onerror="this.style.display='none'"
                    >
                  `
                : "";

            return `
                <article class="news-card">

                    ${image}

                    <div class="news-content">

                        <span class="news-source">
                            📰 ${source}
                        </span>

                        <h3>${title}</h3>

                        <p>${description}</p>

                        <small>
                            🕐 ${time}
                        </small>

                        <br><br>

                        <a
                            href="${item.url}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Read Full News →
                        </a>

                    </div>

                </article>
            `;

        }).join("");

    } catch (error) {

        console.error("Crypto News Error:", error);

        container.innerHTML = `
            <div class="news-card">

                <h3>⚠️ Unable to Load News</h3>

                <p>
                    AlphaMind AI could not load the latest
                    crypto news right now.
                </p>

                <button
                    onclick="loadNews()"
                    class="news-refresh-btn"
                >
                    🔄 Refresh
                </button>

            </div>
        `;
    }
}

loadNews();

setInterval(loadNews, 300000);

async function loadTopCoins() {

    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    const data = await res.json();

    const usdtCoins = data.filter(c => c.symbol.endsWith("USDT"));

    usdtCoins.sort((a, b) => b.priceChangePercent - a.priceChangePercent);

    const gainers = usdtCoins.slice(0, 5);
    const losers = [...usdtCoins].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 5);

    document.getElementById("gainersList").innerHTML =
        gainers.map(c =>
            `<p>🟢 ${c.symbol} (${Number(c.priceChangePercent).toFixed(2)}%)</p>`
        ).join("");

    document.getElementById("losersList").innerHTML =
        losers.map(c =>
            `<p>🔴 ${c.symbol} (${Number(c.priceChangePercent).toFixed(2)}%)</p>`
        ).join("");
}

loadTopCoins();
setInterval(loadTopCoins, 30000);

async function loadMarketStats() {

    document.getElementById("fearGreed").innerText = "72 (Greed)";
    document.getElementById("btcDominance").innerText = "56.8%";
    document.getElementById("marketCap").innerText = "$3.8T";
    document.getElementById("trendingCoin").innerText = "BTC";

}

loadMarketStats();

// ================================
// ECONOMIC EVENTS
// ================================

async function loadEconomicEvents() {

    const container = document.getElementById(
        "economicEventsContainer"
    );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="event-card">
            <h3>📅 Loading Economic Events...</h3>
            <p>
                AlphaMind AI is loading economic events.
            </p>
        </div>
    `;

    try {

        const response = await fetch(
            "http://localhost:3000/api/economic-events"
        );

        if (!response.ok) {
            throw new Error(
                "Economic Events API request failed"
            );
        }

        const data = await response.json();

        console.log("Economic Events Data:", data);

        console.log("Events received:", data.events.length);

        if (!data.success || !data.events) {
            throw new Error(
                "Economic Events data unavailable"
            );
        }

        container.innerHTML = data.events.map(event => {

            let impactClass = "medium";
            let impactText = "🟠 MEDIUM IMPACT";

            if (event.impact === "HIGH") {
                impactClass = "high";
                impactText = "🔴 HIGH IMPACT";
            }

            if (event.impact === "LOW") {
                impactClass = "low";
                impactText = "🟢 LOW IMPACT";
            }

            return `
                <div class="event-card">

                    <div class="event-top">

                        <span class="event-impact ${impactClass}">
                            ${impactText}
                        </span>

                        <span class="event-country">
                            ${event.flag || ""} ${event.country || ""}
                        </span>

                    </div>

                    <h3>
                        ${event.title || "Economic Event"}
                    </h3>

                    <p>
                        ${
                            event.description ||
                            "Important economic event."
                        }
                    </p>

                    <div class="event-details">

                        <span>
                            📅 ${event.date || "Upcoming"}
                        </span>

                        <span>
                            ⏰ ${event.time || "Scheduled"}
                        </span>

                    </div>

                    <div class="event-market-impact">

                        🤖 Crypto Impact:

                        <strong>
                            ${
                                event.cryptoImpact ||
                                "Market impact possible"
                            }
                        </strong>

                    </div>

                </div>
            `;

        }).join("");

    } catch (error) {

        console.error(
            "Economic Events Error:",
            error
        );

        container.innerHTML = `
            <div class="event-card">

                <h3>
                    ⚠️ Unable to Load Economic Events
                </h3>

                <p>
                    AlphaMind AI could not load
                    economic events right now.
                </p>

                <button
                    onclick="loadEconomicEvents()"
                    class="news-refresh-btn"
                >
                    🔄 Refresh
                </button>

            </div>
        `;
    }
}


// Load economic events
loadEconomicEvents();

// ================================
// ECONOMIC EVENTS FILTER
// ================================

document.querySelectorAll(".event-filter").forEach(button => {

    button.addEventListener("click", () => {

        // सभी buttons से active हटाओ
        document.querySelectorAll(".event-filter").forEach(btn => {
            btn.classList.remove("active");
        });

        // clicked button active करो
        button.classList.add("active");

        const selectedImpact = button.dataset.impact;

        // सभी event cards खोजो
        document.querySelectorAll("#economicEventsContainer .event-card")
            .forEach(card => {

                // Loading/error card को ignore करो
                const impactElement =
                    card.querySelector(".event-impact");

                if (!impactElement) {
                    return;
                }

                if (selectedImpact === "ALL") {
                    card.style.display = "";
                    return;
                }

                if (
                    impactElement.classList.contains(
                        selectedImpact.toLowerCase()
                    )
                ) {
                    card.style.display = "";
                } else {
                    card.style.display = "none";
                }

            });

    });

});

// ================================
// ECONOMIC EVENTS REFRESH BUTTON
// ================================

document.addEventListener("DOMContentLoaded", () => {

    const refreshEventsBtn =
        document.getElementById("refreshEventsBtn");

    console.log("Refresh button:", refreshEventsBtn);

    if (!refreshEventsBtn) {
        console.error("Refresh button not found!");
        return;
    }

    refreshEventsBtn.addEventListener("click", async () => {

        console.log("Refresh button clicked");

        refreshEventsBtn.disabled = true;
        refreshEventsBtn.innerText = "⏳ Loading...";

        await loadEconomicEvents();

        refreshEventsBtn.disabled = false;
        refreshEventsBtn.innerText = "🔄 Refresh";

    });

});

// ================================
// PRICING PLAN BUTTONS
// ================================

// ================================
// PRICING PLAN SELECTION
// ================================

function selectPlan(plan) {

    localStorage.setItem("selectedPlan", plan);

    window.location.href =
        "login.html?plan=" + encodeURIComponent(plan);
}

const basicPlanBtn =
    document.getElementById("basicPlanBtn");

const premiumPlanBtn =
    document.getElementById("premiumPlanBtn");

const proPlanBtn =
    document.getElementById("proPlanBtn");


if (basicPlanBtn) {
    basicPlanBtn.addEventListener("click", () => {
        selectPlan("Basic");
    });
}


if (premiumPlanBtn) {
    premiumPlanBtn.addEventListener("click", () => {
        selectPlan("Premium");
    });
}


if (proPlanBtn) {
    proPlanBtn.addEventListener("click", () => {
        selectPlan("Pro");
    });
}