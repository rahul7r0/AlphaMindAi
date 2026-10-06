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

const app = express();

app.use(cors());
app.use(express.json());


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
// START SERVER
// ==================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `AlphaMind AI backend running on http://localhost:${PORT}`
    );

});
