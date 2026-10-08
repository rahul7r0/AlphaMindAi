const express = require("express");
const webpush = require("web-push");
const crypto = require("crypto");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
);
const cors = require("cors");
require("dotenv").config();


// ==================================================
// FIREBASE
// ==================================================

initializeApp({
    credential: cert(serviceAccount)
});

const adminAuth = getAuth();

const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();


// ==================================================
// RAZORPAY
// ==================================================

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


// ==================================================
// EXPRESS SERVER
// ==================================================

webpush.setVapidDetails(
    "mailto:test121212@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const app = express();

app.use(cors());
app.use(express.json());

// ==================================================
// PUSH SUBSCRIPTIONS
// ==================================================

const pushSubscriptions = new Map();

app.post("/api/subscribe-push", async (req, res) => {

    const { subscription } = req.body;

    if (!subscription) {
        return res.status(400).json({
            success: false,
            message: "Push subscription is required"
        });
    }

    const key = subscription.endpoint;

    pushSubscriptions.set(key, subscription);

    await db.collection("pushSubscriptions")
    .doc(key.replace(/[^a-zA-Z0-9]/g, "_"))
    .set({
        subscription: subscription,
        updatedAt: new Date().toISOString()
    });

    console.log(
        "Push subscription saved:",
        key
    );

    res.json({
        success: true,
        message: "Push subscription saved"
    });

});

app.get("/api/vapid-public-key", (req, res) => {

    res.json({
        success: true,
        publicKey: process.env.VAPID_PUBLIC_KEY
    });

});
app.post("/api/test-push", async (req, res) => {

    const payload = JSON.stringify({
        title: "AlphaMind AI",
        body: "🔔 Test Alert — Push notifications working!",
        url: "/scanner.html"
    });

    let sent = 0;
    let removed = 0;

    for (const [key, subscription] of pushSubscriptions.entries()) {

        try {

            await webpush.sendNotification(
                subscription,
                payload
            );

            sent++;

        } catch (error) {

            console.error(
                "Push send error:",
                error.statusCode,
                error.body
            );

            if (
                error.statusCode === 404 ||
                error.statusCode === 410
            ) {

                pushSubscriptions.delete(key);

                removed++;

                console.log(
                    "Expired push subscription removed:",
                    key
                );

            }

        }

    }

    res.json({
        success: true,
        message: "Test push completed",
        sent: sent,
        removed: removed
    });

});

app.post("/api/send-signal", async (req, res) => {

    const { symbol, signal } = req.body;

    if (!symbol || !signal) {
        return res.status(400).json({
            success: false,
            message: "Symbol and signal are required"
        });
    }

    const payload = JSON.stringify({
        title: "AlphaMind AI",
        body: `${signal} — ${symbol.replace("USDT", "/USDT")}`,
        url: "/scanner.html"
    });

    let sent = 0;
    let removed = 0;

    for (const [key, subscription] of pushSubscriptions.entries()) {

        try {

            await webpush.sendNotification(
                subscription,
                payload
            );

            sent++;

        } catch (error) {

            console.error(
                "Signal push error:",
                error.statusCode,
                error.body
            );

            if (
                error.statusCode === 404 ||
                error.statusCode === 410
            ) {

                pushSubscriptions.delete(key);
                removed++;

            }

        }

    }

    res.json({
        success: true,
        sent: sent,
        removed: removed
    });

});
// ==================================================
// PASSWORD RESET OTP SYSTEM
// ==================================================

const { Resend } = require("resend");

const resend = new Resend(
    process.env.RESEND_API_KEY
);

const otpStore = new Map();


// Generate 6 digit OTP
function generateOTP() {

    return Math.floor(
        100000 + Math.random() * 900000
    ).toString();

}


// ==================================================
// SEND OTP
// ==================================================

app.post("/api/send-otp", async (req, res) => {

    try {

        const email =
            (req.body.email || "")
                .trim()
                .toLowerCase();


        if (!email) {

            return res.status(400).json({

                success: false,

                message:
                    "Email is required"

            });

        }


        const otp =
            generateOTP();


        otpStore.set(email, {

            otp: otp,

            expiresAt:
                Date.now() +
                5 * 60 * 1000

        });


        const { data, error } =
            await resend.emails.send({

                from:
                    "AlphaMind AI <onboarding@resend.dev>",

                to: [email],

                subject:
                    "AlphaMind AI Password Reset OTP",

                html: `

                    <div
                        style="
                            font-family:Arial,sans-serif;
                            max-width:600px;
                            margin:auto;
                        "
                    >

                        <h2>
                            🤖 AlphaMind AI
                        </h2>

                        <p>
                            Your password reset OTP is:
                        </p>

                        <h1
                            style="
                                letter-spacing:8px;
                            "
                        >
                            ${otp}
                        </h1>

                        <p>
                            This OTP will expire
                            in 5 minutes.
                        </p>

                        <p>
                            If you did not request
                            this, ignore this email.
                        </p>

                    </div>

                `

            });


        if (error) {

            console.error(
                "Resend Error:",
                error
            );


            otpStore.delete(email);


            return res.status(500).json({

                success: false,

                message:
                    "Failed to send OTP"

            });

        }


        console.log(
            "OTP sent to:",
            email
        );


        res.json({

            success: true,

            message:
                "OTP sent successfully"

        });


    } catch (error) {

        console.error(
            "OTP Error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to send OTP"

        });

    }

});


// ==================================================
// VERIFY OTP
// ==================================================

app.post("/api/verify-otp", (req, res) => {

    try {

        const email =
            (req.body.email || "")
                .trim()
                .toLowerCase();


        const otp =
            (req.body.otp || "")
                .trim();


        if (!email || !otp) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and OTP are required"

            });

        }


        const storedData =
            otpStore.get(email);


        if (!storedData) {

            return res.status(400).json({

                success: false,

                message:
                    "OTP not found or already used"

            });

        }


        if (
            Date.now() >
            storedData.expiresAt
        ) {

            otpStore.delete(email);


            return res.status(400).json({

                success: false,

                message:
                    "OTP has expired"

            });

        }


        if (
            storedData.otp !== otp
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid OTP"

            });

        }


        // OTP successfully verified
        otpStore.delete(email);


        res.json({

            success: true,

            message:
                "OTP verified successfully"

        });


    } catch (error) {

        console.error(
            "Verify OTP Error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to verify OTP"

        });

    }

});


// ==================================================
// RESET PASSWORD
// ==================================================

app.post(
    "/api/reset-password",
    async (req, res) => {

        try {

            const email =
                (req.body.email || "")
                    .trim()
                    .toLowerCase();


            const newPassword =
                req.body.newPassword || "";


            if (
                !email ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and new password are required"

                });

            }


            if (
                newPassword.length < 6
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must be at least 6 characters"

                });

            }


            const userRecord =
                await adminAuth
                    .getUserByEmail(email);


            await adminAuth.updateUser(
                userRecord.uid,
                {
                    password:
                        newPassword
                }
            );


            res.json({

                success: true,

                message:
                    "Password updated successfully"

            });


        } catch (error) {

            console.error(
                "Reset Password Error:",
                error
            );


            if (
                error.code ===
                "auth/user-not-found"
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No account found with this email"

                });

            }


            res.status(500).json({

                success: false,

                message:
                    "Failed to update password"

            });

        }

    }
);


// ==================================================
// SENTIMENT SCORE
// ==================================================

function getSentimentScore(
    title,
    description
) {

    const titleText =
        (title || "")
            .toLowerCase();


    const descriptionText =
        (description || "")
            .toLowerCase();


    let score = 0;


    // ------------------------------------------
    // STRONG BULLISH
    // ------------------------------------------

    const strongBullish = [

        "all-time high",
        "record high",
        "etf approval",
        "bitcoin etf inflow",
        "massive inflow",
        "institutional adoption",
        "major adoption",
        "regulatory approval",
        "breakout",
        "surges",
        "surged",
        "soars",
        "soared"

    ];


    // ------------------------------------------
    // MODERATE BULLISH
    // ------------------------------------------

    const bullish = [

        "rally",
        "bullish",
        "rise",
        "rises",
        "rising",
        "gain",
        "gains",
        "growth",
        "adoption",
        "inflow",
        "positive",
        "approval",
        "recovery",
        "rebound"

    ];


    // ------------------------------------------
    // STRONG BEARISH
    // ------------------------------------------

    const strongBearish = [

        "crash",
        "crashes",
        "crashed",
        "collapse",
        "collapsed",
        "massive outflow",
        "major outflow",
        "etf outflow",
        "hack",
        "hacked",
        "security breach",
        "record liquidation",
        "mass liquidation",
        "major liquidation"

    ];


    // ------------------------------------------
    // MODERATE BEARISH
    // ------------------------------------------

    const bearish = [

        "drop",
        "drops",
        "dropped",
        "fall",
        "falls",
        "falling",
        "decline",
        "declines",
        "declined",
        "bearish",
        "plunge",
        "plunges",
        "outflow",
        "liquidation",
        "loss",
        "losses",
        "risk",
        "downside",
        "negative",
        "selling pressure"

    ];


    // ------------------------------------------
    // STRONG BULLISH SCORE
    // ------------------------------------------

    strongBullish.forEach(word => {

        if (
            titleText.includes(word)
        ) {

            score += 35;

        }


        if (
            descriptionText.includes(word)
        ) {

            score += 15;

        }

    });


    // ------------------------------------------
    // BULLISH SCORE
    // ------------------------------------------

    bullish.forEach(word => {

        if (
            titleText.includes(word)
        ) {

            score += 20;

        }


        if (
            descriptionText.includes(word)
        ) {

            score += 8;

        }

    });


    // ------------------------------------------
    // STRONG BEARISH SCORE
    // ------------------------------------------

    strongBearish.forEach(word => {

        if (
            titleText.includes(word)
        ) {

            score -= 35;

        }


        if (
            descriptionText.includes(word)
        ) {

            score -= 15;

        }

    });


    // ------------------------------------------
    // BEARISH SCORE
    // ------------------------------------------

    bearish.forEach(word => {

        if (
            titleText.includes(word)
        ) {

            score -= 20;

        }


        if (
            descriptionText.includes(word)
        ) {

            score -= 8;

        }

    });


    // ------------------------------------------
    // LIMIT SCORE
    // ------------------------------------------

    return Math.max(
        -100,
        Math.min(100, score)
    );

}


// ==================================================
// SENTIMENT TYPE
// ==================================================

function getSentiment(score) {

    const numericScore =
        Number(score);


    if (
        numericScore >= 30
    ) {

        return "BULLISH";

    }


    if (
        numericScore <= -30
    ) {

        return "BEARISH";

    }


    return "NO EFFECT";

}


// ==================================================
// AI CONFIDENCE
// ==================================================

function getConfidence(score) {

    const numericScore =
        Math.abs(
            Number(score)
        );


    if (
        numericScore >= 80
    ) {

        return 95;

    }


    if (
        numericScore >= 60
    ) {

        return 88;

    }


    if (
        numericScore >= 40
    ) {

        return 80;

    }


    if (
        numericScore >= 30
    ) {

        return 72;

    }


    if (
        numericScore >= 15
    ) {

        return 60;

    }


    return 50;

}


// ==================================================
// IMAGE PROXY
// ==================================================

app.get(
    "/api/image",
    async (req, res) => {

        try {

            const imageUrl =
                req.query.url;


            if (!imageUrl) {

                return res
                    .status(400)
                    .send(
                        "Image URL missing"
                    );

            }


            let response =
                await fetch(imageUrl);


            // Backup image proxy
            if (!response.ok) {

                const backupUrl =
                    "https://wsrv.nl/?url=" +
                    encodeURIComponent(
                        imageUrl
                    );


                response =
                    await fetch(
                        backupUrl
                    );

            }


            if (!response.ok) {

                return res
                    .status(404)
                    .send(
                        "Image not found"
                    );

            }


            const contentType =
                response.headers.get(
                    "content-type"
                );


            if (contentType) {

                res.set(
                    "Content-Type",
                    contentType
                );

            }


            const buffer =
                Buffer.from(
                    await response.arrayBuffer()
                );


            res.send(buffer);


        } catch (error) {

            console.error(
                "Image proxy error:",
                error
            );


            res.status(500).send(
                "Failed to load image"
            );

        }

    }
);


// ==================================================
// CRYPTO NEWS API
// ==================================================

app.get(
    "/api/news",
    async (req, res) => {

        try {

            const apiKey =
                process.env.NEWS_API_KEY;


            // --------------------------------------
            // CHECK NEWS API KEY
            // --------------------------------------

            if (!apiKey) {

                return res.status(500).json({

                    success: false,

                    message:
                        "NEWS_API_KEY is missing in .env"

                });

            }


            // --------------------------------------
            // NEWS API URL
            // --------------------------------------

            const url =
                "https://newsapi.org/v2/everything" +
                "?qInTitle=bitcoin%20OR%20ethereum%20OR%20cryptocurrency%20OR%20defi%20OR%20blockchain" +
                "&language=en" +
                "&sortBy=publishedAt" +
                "&pageSize=20" +
                "&apiKey=" +
                encodeURIComponent(apiKey);


            // --------------------------------------
            // REQUEST NEWS
            // --------------------------------------

            const response =
                await fetch(url);


            const data =
                await response.json();


            // --------------------------------------
            // NEWS API ERROR
            // --------------------------------------

            if (
                data.status !== "ok"
            ) {

                console.error(
                    "NewsAPI error:",
                    data
                );


                return res.status(400).json({

                    success: false,

                    message:
                        data.message ||
                        "News API error"

                });

            }


            // --------------------------------------
            // FILTER NEWS
            // --------------------------------------

            const articles =
                (data.articles || [])

                    .filter(article => {

                        // Image required
                        if (
                            !article.urlToImage
                        ) {

                            return false;

                        }


                        const text =
                            (
                                article.title ||
                                ""
                            ) +
                            " " +
                            (
                                article.description ||
                                ""
                            );


                        const lowerText =
                            text.toLowerCase();


                        return (

                            lowerText.includes(
                                "bitcoin"
                            ) ||

                            lowerText.includes(
                                "ethereum"
                            ) ||

                            lowerText.includes(
                                "crypto"
                            ) ||

                            lowerText.includes(
                                "cryptocurrency"
                            ) ||

                            lowerText.includes(
                                "blockchain"
                            ) ||

                            lowerText.includes(
                                "defi"
                            ) ||

                            lowerText.includes(
                                "solana"
                            ) ||

                            lowerText.includes(
                                "xrp"
                            )

                        );

                    })


                    .slice(0, 4)


                    .map(article => {


                        // ----------------------------------
                        // CALCULATE SENTIMENT SCORE ONCE
                        // ----------------------------------

                        const score =
                            getSentimentScore(
                                article.title,
                                article.description
                            );


                        // ----------------------------------
                        // RETURN ARTICLE
                        // ----------------------------------

                        return {

                            title:
                                article.title,

                            description:
                                article.description,

                            url:
                                article.url,

                            image:
                                article.urlToImage,

                            source:
                                article.source?.name,

                            publishedAt:
                                article.publishedAt,


                            // FIXED
                            sentiment:
                                getSentiment(
                                    score
                                ),


                            sentimentScore:
                                score,


                            confidence:
                                getConfidence(
                                    score
                                )

                        };

                    });


            // --------------------------------------
            // SEND RESPONSE
            // --------------------------------------

            res.json({

                success: true,

                articles:
                    articles

            });


        } catch (error) {

            console.error(
                "News API Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to load crypto news"

            });

        }

    }
);

// ================================
// ECONOMIC EVENTS API
// ================================

app.get("/api/economic-events", async (req, res) => {

    try {

        // Demo economic calendar data
        // बाद में इसे live economic calendar API से connect कर सकते हैं.

        const events = [

            {
                id: 1,
                title: "Federal Reserve Interest Rate Decision",
                description:
                    "FOMC interest-rate decision and monetary-policy announcement.",
                country: "USA",
                flag: "🇺🇸",
                impact: "HIGH",
                date: "2026-09-16",
                time: "02:00 PM ET",
                cryptoImpact:
                    "High volatility expected"
            },

            {
                id: 2,
                title: "US CPI Inflation Data",
                description:
                    "Consumer Price Index inflation report.",
                country: "USA",
                flag: "🇺🇸",
                impact: "HIGH",
                date: "2026-09-11",
                time: "08:30 AM ET",
                cryptoImpact:
                    "High volatility possible"
            },

            {
                id: 3,
                title: "US Economic Data",
                description:
                    "Important economic indicators and market data releases.",
                country: "USA",
                flag: "🇺🇸",
                impact: "MEDIUM",
                date: "2026-09-18",
                time: "Scheduled",
                cryptoImpact:
                    "Moderate"
            }

        ];

        res.json({
            success: true,
            events: events
        });

    } catch (error) {

        console.error(
            "Economic Events API Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load economic events"
        });

    }

});


// ================================
// ECONOMIC EVENTS API
// ================================

app.get("/api/economic-events", (req, res) => {

    try {

        const events = [

            {
                id: 1,
                title: "Federal Reserve Interest Rate Decision",
                description:
                    "FOMC interest-rate decision and monetary-policy announcement.",
                country: "USA",
                flag: "🇺🇸",
                impact: "HIGH",
                date: "2026-09-16",
                time: "02:00 PM ET",
                cryptoImpact: "High volatility expected"
            },

            {
                id: 2,
                title: "US CPI Inflation Data",
                description:
                    "Consumer Price Index inflation report.",
                country: "USA",
                flag: "🇺🇸",
                impact: "HIGH",
                date: "2026-09-11",
                time: "08:30 AM ET",
                cryptoImpact: "High volatility possible"
            },

            {
                id: 3,
                title: "US Economic Data",
                description:
                    "Important economic indicators and market data releases.",
                country: "USA",
                flag: "🇺🇸",
                impact: "MEDIUM",
                date: "2026-09-18",
                time: "Scheduled",
                cryptoImpact: "Moderate"
            }

        ];

        res.json({
            success: true,
            events: events
        });

    } catch (error) {

        console.error(
            "Economic Events API Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load economic events"
        });

    }

});

// ==================================================
// RAZORPAY CREATE ORDER
// ==================================================

app.post("/api/create-order", async (req, res) => {

    try {

        const amount = Number(req.body.amount);

        if (!amount || amount < 100) {

            return res.status(400).json({
                success: false,
                message: "Minimum amount is 100 paise"
            });

        }

        const options = {
            amount: Math.round(amount),
            currency: "INR",
            receipt: "alphamind_" + Date.now()
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {

        console.error(
            "Razorpay Create Order Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create Razorpay order"
        });

    }

});

// ==================================================
// RAZORPAY VERIFY PAYMENT
// ==================================================

app.post("/api/verify-payment", async (req, res) => {

    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan,
            uid
        } = req.body;


        console.log("================================");
        console.log("RAZORPAY PAYMENT VERIFY");
        console.log("Plan:", plan);
        console.log("UID:", uid);
        console.log("Payment ID:", razorpay_payment_id);
        console.log("================================");


        // ------------------------------------------
        // CHECK REQUIRED DATA
        // ------------------------------------------

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Missing Razorpay payment details"

            });

        }


        if (!plan) {

            return res.status(400).json({

                success: false,

                message:
                    "Plan is missing"

            });

        }


        if (!uid) {

            return res.status(400).json({

                success: false,

                message:
                    "Firebase UID is missing. Please login before purchasing."

            });

        }


        // ------------------------------------------
        // VERIFY RAZORPAY SIGNATURE
        // ------------------------------------------

        const generatedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(
                    razorpay_order_id +
                    "|" +
                    razorpay_payment_id
                )
                .digest("hex");


        if (
            generatedSignature !==
            razorpay_signature
        ) {

            console.error(
                "Razorpay signature verification failed"
            );


            return res.status(400).json({

                success: false,

                message:
                    "Payment signature verification failed"

            });

        }


        // ------------------------------------------
        // CHECK FIREBASE USER
        // ------------------------------------------

        const userRecord =
            await adminAuth.getUser(uid);


        console.log(
            "Firebase user found:",
            userRecord.email
        );


        // ------------------------------------------
        // FIRESTORE
        // ------------------------------------------

        const {
            getFirestore
        } =
            require("firebase-admin/firestore");


        const adminDb =
            getFirestore();


        // ------------------------------------------
        // UPDATE USER PLAN
        // ------------------------------------------

        await adminDb
            .collection("users")
            .doc(uid)
            .set(

                {

                    plan:
                        plan,

                    status:
                        "Active",

                    paymentId:
                        razorpay_payment_id,

                    paymentDate:
                        new Date().toISOString()

                },

                {

                    merge:
                        true

                }

            );


        console.log(
            "PLAN UPDATED SUCCESSFULLY:",
            plan
        );


        // ------------------------------------------
        // SUCCESS
        // ------------------------------------------

        return res.json({

            success: true,

            message:
                "Payment verified and plan updated successfully",

            plan:
                plan

        });


    } catch (error) {

        console.error(
            "Razorpay Verify Payment Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Payment verification failed"

        });

    }

});

// ==================================================
// AUTOMATIC MARKET DATA SCANNER
// ==================================================

const autoScanSymbols = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "XRPUSDT",
    "BNBUSDT",
    "DOGEUSDT"
];

async function fetchMarketData(symbol) {

    const krakenSymbols = {
        BTCUSDT: "XBTUSD",
        ETHUSDT: "ETHUSD",
        SOLUSDT: "SOLUSD",
        XRPUSDT: "XRPUSD",
        BNBUSDT: "BNBUSD",
        DOGEUSDT: "DOGEUSD"
    };

    const pair = krakenSymbols[symbol];

    if (!pair) {
        throw new Error(
            `Kraken pair not found for ${symbol}`
        );
    }

    const url =
        `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=15`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Kraken API error for ${symbol}: ${response.status}`
        );
    }

    const data = await response.json();

    if (
        data.error &&
        data.error.length > 0
    ) {
        throw new Error(
            `Kraken data error for ${symbol}: ${data.error.join(", ")}`
        );
    }

    const resultKey =
        Object.keys(data.result)
            .find(key => key !== "last");

    return data.result[resultKey];
}

function calculateEMA(values, period) {

    if (values.length < period) {
        return null;
    }

    const multiplier = 2 / (period + 1);

    let ema =
        values
            .slice(0, period)
            .reduce((sum, value) => sum + value, 0) / period;

    for (let i = period; i < values.length; i++) {
        ema =
            (values[i] - ema) * multiplier + ema;
    }

    return ema;
}

function calculateRSI(values, period = 14) {

    if (values.length <= period) {
        return null;
    }

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {

        const change =
            values[i] - values[i - 1];

        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    for (let i = period + 1; i < values.length; i++) {

        const change =
            values[i] - values[i - 1];

        const gain =
            change > 0 ? change : 0;

        const loss =
            change < 0 ? Math.abs(change) : 0;

        averageGain =
            ((averageGain * (period - 1)) + gain) /
            period;

        averageLoss =
            ((averageLoss * (period - 1)) + loss) /
            period;
    }

    if (averageLoss === 0) {
        return 100;
    }

    const relativeStrength =
        averageGain / averageLoss;

    return 100 -
        (100 / (1 + relativeStrength));
}

function calculateATR(klines, period = 14) {

    if (klines.length <= period) {
        return null;
    }

    const trueRanges = [];

    for (let i = 1; i < klines.length; i++) {

        const high = Number(klines[i][2]);
        const low = Number(klines[i][3]);
        const previousClose = Number(klines[i - 1][4]);

        const trueRange = Math.max(
            high - low,
            Math.abs(high - previousClose),
            Math.abs(low - previousClose)
        );

        trueRanges.push(trueRange);
    }

    const recentRanges =
        trueRanges.slice(-period);

    return recentRanges.reduce(
        (sum, value) => sum + value,
        0
    ) / recentRanges.length;
}

function calculateMACD(values) {

    if (values.length < 35) {
        return null;
    }

    const ema12 = calculateEMA(values, 12);
    const ema26 = calculateEMA(values, 26);

    if (ema12 === null || ema26 === null) {
        return null;
    }

    const macdLine = ema12 - ema26;

    return {
        macdLine: macdLine
    };

  }

function calculateADX(klines, period = 14) {

    if (klines.length <= period) {
        return null;
    }

    let trueRanges = [];
    let plusDM = [];
    let minusDM = [];

    for (let i = 1; i < klines.length; i++) {

        const high = Number(klines[i][2]);
        const low = Number(klines[i][3]);

        const previousHigh = Number(klines[i - 1][2]);
        const previousLow = Number(klines[i - 1][3]);
        const previousClose = Number(klines[i - 1][4]);

        const trueRange = Math.max(
            high - low,
            Math.abs(high - previousClose),
            Math.abs(low - previousClose)
        );

        const upwardMove = high - previousHigh;
        const downwardMove = previousLow - low;

        trueRanges.push(trueRange);

        plusDM.push(
            upwardMove > downwardMove && upwardMove > 0
                ? upwardMove
                : 0
        );

        minusDM.push(
            downwardMove > upwardMove && downwardMove > 0
                ? downwardMove
                : 0
        );
    }

    const recentTR = trueRanges.slice(-period);
    const recentPlusDM = plusDM.slice(-period);
    const recentMinusDM = minusDM.slice(-period);

    const atr =
        recentTR.reduce((sum, value) => sum + value, 0) /
        recentTR.length;

    if (atr === 0) {
        return 0;
    }

    const plusDI =
        (
            recentPlusDM.reduce((sum, value) => sum + value, 0) /
            recentPlusDM.length
        ) / atr * 100;

    const minusDI =
        (
            recentMinusDM.reduce((sum, value) => sum + value, 0) /
            recentMinusDM.length
        ) / atr * 100;

    const diSum = plusDI + minusDI;

    if (diSum === 0) {
        return 0;
    }

    return Math.abs(plusDI - minusDI) / diSum * 100;
}

function calculateVolumeConfirmation(klines) {

    if (klines.length < 20) {
        return "Normal 🟡";
    }

    const volumes = klines
        .slice(-21, -1)
        .map(candle => Number(candle[6]));

    const latestVolume =
        Number(klines[klines.length - 1][6]);

    const averageVolume =
        volumes.reduce(
            (sum, value) => sum + value,
            0
        ) / volumes.length;

    if (latestVolume >= averageVolume * 1.5) {
        return "Strong 🟢";
    }
    else if (latestVolume >= averageVolume * 1.2) {
        return "Above Normal 🟢";
    }
    else if (latestVolume >= averageVolume * 0.8) {
        return "Normal 🟡";
    }
    else if (latestVolume >= averageVolume * 0.7) {
        return "Below Normal ⚠️";
    }
    else {
        return "Weak 🔴";
    }
}

function calculateSupportResistance(klines) {

    if (klines.length < 20) {
        return {
            support: null,
            resistance: null
        };
    }

    const recentCandles = klines.slice(-20);

    const lows = recentCandles.map(
        candle => Number(candle[3])
    );

    const highs = recentCandles.map(
        candle => Number(candle[2])
    );

    return {
        support: Math.min(...lows),
        resistance: Math.max(...highs)
    };
}

function calculateVolatility(klines, atr) {

    if (!atr || klines.length < 20) {
        return "Normal 🟡";
    }

    const closes = klines
        .slice(-20)
        .map(candle => Number(candle[4]));

    const highest = Math.max(...closes);
    const lowest = Math.min(...closes);

    const currentPrice =
        closes[closes.length - 1];

    const range = highest - lowest;

    if (currentPrice === 0) {
        return "Normal 🟡";
    }

    const volatilityPercent =
        (range / currentPrice) * 100;

    if (volatilityPercent >= 5) {
        return "High 🔴";
    }
    else if (volatilityPercent <= 1.5) {
        return "Low 🔵";
    }
    else {
        return "Normal 🟡";
    }
}
function calculateTrend(klines) {

    if (klines.length < 20) {
        return "Sideways 🟡";
    }

    const closes = klines.map(
        candle => Number(candle[4])
    );

    const ema9 = calculateEMA(closes, 9);
    const ema20 = calculateEMA(closes, 20);

    if (ema9 === null || ema20 === null) {
        return "Sideways 🟡";
    }

    if (ema9 > ema20) {
        return "Bullish 🟢";
    }

    if (ema9 < ema20) {
        return "Bearish 🔴";
    }

    return "Sideways 🟡";
}

function calculateBasicSignal(klines) {

    if (klines.length < 35) {
        return {
            signal: "NO SIGNAL 🟡",
            buyScore: 0,
            sellScore: 0
        };
    }

    const closes = klines.map(
        candle => Number(candle[4])
    );

    const ema9 = calculateEMA(closes, 9);
    const ema20 = calculateEMA(closes, 20);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const adx = calculateADX(klines, 14);
    const atr = calculateATR(klines, 14);
    const supportResistance =
    calculateSupportResistance(klines);

const volatilityStatus =
    calculateVolatility(
        klines,
        atr
    );
    const currentPrice =
    Number(klines[klines.length - 1][4]);

const support =
    supportResistance.support;

const resistance =
    supportResistance.resistance;

const nearSupport =
    support !== null &&
    currentPrice - support <= atr;

const nearResistance =
    resistance !== null &&
    resistance - currentPrice <= atr;
   const volumeConfirmation =
    calculateVolumeConfirmation(klines);

let marketIsSideways = false;

if (
    adx < 20 &&
    Math.abs(ema9 - ema20) < atr * 0.25
) {
    marketIsSideways = true;
}

let buyScore = 0;
    let sellScore = 0;

    if (ema9 > ema20) buyScore += 25;
    if (rsi > 55) buyScore += 15;
    if (adx > 20 && ema9 > ema20) buyScore += 15;

    if (
        macd &&
        macd.macdLine > 0
    ) {
        buyScore += 15;
    }

    if (volumeConfirmation === "Strong 🟢") {
        buyScore += 10;
    }
    else if (volumeConfirmation === "Above Normal 🟢") {
        buyScore += 5;
    }

    if (ema9 < ema20) sellScore += 25;
    if (rsi < 45) sellScore += 15;
    if (adx > 20 && ema9 < ema20) sellScore += 15;

    if (
        macd &&
        macd.macdLine < 0
    ) {
        sellScore += 15;
    }

    if (volumeConfirmation === "Strong 🟢") {
        sellScore += 10;
    }
    else if (volumeConfirmation === "Above Normal 🟢") {
        sellScore += 5;
    }

    let signal = "NO SIGNAL 🟡";

   if (
    !marketIsSideways &&
    buyScore >= 60 &&
    buyScore > sellScore
    ) {
        signal = "BUY 🟢";
    }
   else if (
    !marketIsSideways &&
    sellScore >= 60 &&
    sellScore > buyScore
    ) {
        signal = "SELL 🔴";
    }

    if (
    signal === "BUY 🟢" &&
    nearResistance &&
    volumeConfirmation === "Weak 🔴"
) {
    signal = "NO SIGNAL 🟡";
}

if (
    signal === "SELL 🔴" &&
    nearSupport &&
    volumeConfirmation === "Weak 🔴"
) {
    signal = "NO SIGNAL 🟡";
}

    return {
        signal,
        buyScore,
        sellScore
    };
}

async function automaticMarketScan() {

    for (const symbol of autoScanSymbols) {

        try {

            const klines =
                await fetchMarketData(symbol);

            const signalResult =
    calculateBasicSignal(klines);

console.log(
    "AUTO SIGNAL:",
    symbol,
    signalResult.signal,
    "BUY:",
    signalResult.buyScore,
    "SELL:",
    signalResult.sellScore
);

        } catch (error) {

            console.error(
                "AUTO SCAN ERROR:",
                symbol,
                error.message
            );

        }

    }

}
setInterval(automaticMarketScan, 60000);
automaticMarketScan();

// ==================================================
// START SERVER
// ==================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `AlphaMind AI backend running on http://localhost:${PORT}`
    );

});
