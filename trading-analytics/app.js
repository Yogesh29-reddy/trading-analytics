// ==========================================
// PORTFOLIO & TRADING ANALYTICS APPLICATION
// ==========================================

// Global state variables
let generatedOtpCode = null;
let currentSymbol = 'BTC/USD';
let userCredits = parseInt(localStorage.getItem('userCredits')) || 70;
let userBalance = parseFloat(localStorage.getItem('userBalance')) || 10000.00;
let activeTrades = JSON.parse(localStorage.getItem('activeTrades')) || [];

// Initial base prices and tick bounds for calculations and tickers
const marketAssets = {
    'BTC/USD': { price: 64250.0, decimal: 1, volatility: 45.0, change: 1.2 },
    'ETH/USD': { price: 3480.0, decimal: 2, volatility: 3.5, change: -0.4 },
    'SOL/USD': { price: 145.2, decimal: 2, volatility: 0.25, change: 3.1 },
    'EUR/USD': { price: 1.08520, decimal: 5, volatility: 0.00015, change: 0.05 },
    'GBP/USD': { price: 1.27210, decimal: 5, volatility: 0.00018, change: -0.12 },
    'XAU/USD': { price: 2330.50, decimal: 2, volatility: 1.8, change: 0.45 }
};

// Fallback default accounts list (overridden by credentials.json if fetchable)
let defaultAccounts = [
    { role: "Administrator", identifier: "admin", password: "1234", name: "Admin" }
];

// DOM Elements cache
document.addEventListener('DOMContentLoaded', () => {
    // Auth screens elements
    const authGatePage = document.getElementById('authGatePage');
    const protectedHomePage = document.getElementById('protectedHomePage');
    const loginFormSection = document.getElementById('loginFormSection');
    const registerFormSection = document.getElementById('registerFormSection');
    const forgotFormSection = document.getElementById('forgotFormSection');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    // Auth Input elements
    const otpTrigger = document.getElementById('otpTrigger');
    const regName = document.getElementById('regName');
    const regContact = document.getElementById('regContact');
    const regOtpVerify = document.getElementById('regOtpVerify');
    const regPasswordSet = document.getElementById('regPasswordSet');
    const registerSubmitBtn = document.getElementById('registerSubmitBtn');
    const otpAlertBox = document.getElementById('otpAlertBox');

    // UI header/sub-header elements
    const userWelcomeSpan = document.getElementById('userWelcomeSpan');
    const creditBadge = document.getElementById('creditBadge');
    const userBalanceSpan = document.getElementById('userBalanceSpan');
    const buyCreditsBtn = document.getElementById('buyCreditsBtn');

    // Navigation and Logout
    const logoutTrigger = document.getElementById('logoutTrigger');

    // Tab switcher login / register / forgot
    window.switchAuthTab = function (targetTab) {
        const loginErrorBox = document.getElementById('loginErrorBox');
        if (loginErrorBox) loginErrorBox.style.display = 'none';
        const forgotAlertBox = document.getElementById('forgotAlertBox');
        if (forgotAlertBox) forgotAlertBox.style.display = 'none';

        // Hide all forms first
        loginFormSection.classList.add('hidden');
        registerFormSection.classList.add('hidden');
        if (forgotFormSection) forgotFormSection.classList.add('hidden');

        // Remove active tabs styles
        tabLogin.classList.remove('active');
        tabRegister.classList.remove('active');

        if (targetTab === 'login') {
            tabLogin.classList.add('active');
            loginFormSection.classList.remove('hidden');
        } else if (targetTab === 'register') {
            tabRegister.classList.add('active');
            registerFormSection.classList.remove('hidden');
        } else if (targetTab === 'forgot') {
            if (forgotFormSection) forgotFormSection.classList.remove('hidden');
        }
    };

    // Simulated email OTP triggers
    if (otpTrigger) {
        otpTrigger.addEventListener('click', () => {
            const userEmail = regContact.value.trim();
            const userName = regName.value.trim() || "Valued User";

            if (!userEmail || !regContact.checkValidity()) {
                alert("Please declare a valid Email Address first.");
                regContact.focus();
                return;
            }

            generatedOtpCode = Math.floor(1000 + Math.random() * 9000).toString();

            otpAlertBox.innerText = "⚡ Dispatching your real OTP verification code...";
            otpAlertBox.style.color = "var(--accent)";
            otpAlertBox.style.display = "block";
            otpTrigger.disabled = true;

            // Trigger mock server ping in background
            fetch("https://formsubmit.co/ajax/your-placeholder-email@domain.com", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                    "Target User Name": userName,
                    "Destination User Email ID": userEmail,
                    "Live Dynamic Verification OTP Code": generatedOtpCode
                })
            }).catch(() => { });

            // Instantly activate code field for zero latency (adblocker/offline safety)
            enableOtpVerificationStep();
        });
    }

    function enableOtpVerificationStep() {
        otpAlertBox.innerText = `✔ Verification code compiled. Enter code: ${generatedOtpCode}`;
        otpAlertBox.style.color = "var(--success)";
        regOtpVerify.disabled = false;
        regOtpVerify.focus();
        otpTrigger.disabled = false;
    }

    if (regOtpVerify) {
        regOtpVerify.addEventListener('input', () => {
            if (regOtpVerify.value === generatedOtpCode) {
                regPasswordSet.disabled = false;
                registerSubmitBtn.disabled = false;
                otpAlertBox.innerText = "✔ Verification match successful! Please set your password below.";
                otpAlertBox.style.color = "var(--success)";
            } else {
                regPasswordSet.disabled = true;
                registerSubmitBtn.disabled = true;
            }
        });
    }

    // Auth Actions: Complete Signup
    const mainRegisterForm = document.getElementById('mainRegisterForm');
    if (mainRegisterForm) {
        mainRegisterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const credentialID = regContact.value.trim();
            const securityPassword = regPasswordSet.value;
            const uName = regName.value.trim();

            localStorage.setItem('storedUser', credentialID);
            localStorage.setItem('storedPassword', securityPassword);
            localStorage.setItem('storedUserName', uName);

            const credentialData = {
                username: credentialID,
                password: securityPassword,
                name: uName,
                timestamp: new Date().toISOString()
            };

            // Attempt to write directly to project server database API
            fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentialData)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert("Registration Complete! Credentials stored directly in the project directory (credentials.json).");
                    } else {
                        triggerFallbackDownload(credentialData, "Server error writing credentials database.");
                    }
                    proceedToLogin();
                })
                .catch(() => {
                    // local file:// fallback mode
                    triggerFallbackDownload(credentialData, "Local Express backend offline. Saved credentials profile in browser local storage.");
                    proceedToLogin();
                });

            function triggerFallbackDownload(data, message) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", "credentials.json");
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                alert(message + "\n\nA backup 'credentials.json' has been downloaded to your system.");
            }

            function proceedToLogin() {
                switchAuthTab('login');
                document.getElementById('loginIdentifier').value = credentialID;
            }
        });
    }

    // Auth Actions: Secure Login
    const mainLoginForm = document.getElementById('mainLoginForm');
    if (mainLoginForm) {
        mainLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputID = document.getElementById('loginIdentifier').value.trim();
            const inputPassword = document.getElementById('loginKey').value;

            // Fetch the updated credentials database from server
            fetch('credentials.json')
                .then(res => res.json())
                .then(data => {
                    let db = defaultAccounts;
                    if (data) {
                        db = [
                            ...(data.default_accounts || []),
                            ...(data.registered_users || [])
                        ];
                    }
                    validateCredentials(db);
                })
                .catch(() => {
                    // Offline fallback
                    validateCredentials(defaultAccounts);
                });

            function validateCredentials(db) {
                const targetUser = localStorage.getItem('storedUser');
                const targetPassword = localStorage.getItem('storedPassword');
                const loginErrorBox = document.getElementById('loginErrorBox');

                let isValid = false;
                let loggedInUserName = "";

                // Check matches local storage signups
                if (inputID === targetUser && inputPassword === targetPassword && targetUser) {
                    isValid = true;
                    loggedInUserName = localStorage.getItem('storedUserName') || "Trader";
                } else {
                    // Check matches fetched credentials database
                    const matched = db.find(acc => acc.identifier === inputID && acc.password === inputPassword);
                    if (matched) {
                        isValid = true;
                        loggedInUserName = matched.name;
                    }
                }

                if (isValid) {
                    localStorage.setItem('isUserLoggedIn', 'true');
                    localStorage.setItem('storedUserName', loggedInUserName);
                    if (loginErrorBox) loginErrorBox.style.display = 'none';
                    renderApplicationStateView();
                } else {
                    if (loginErrorBox) {
                        loginErrorBox.innerText = "❌ Access Denied: Wrong password or invalid credentials.";
                        loginErrorBox.style.display = "block";
                    } else {
                        alert("Access Denied: Invalid credentials.");
                    }
                }
            }
        });
    }

    // Auth Actions: Forgot Password Recovery
    const mainForgotForm = document.getElementById('mainForgotForm');
    if (mainForgotForm) {
        mainForgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputID = document.getElementById('forgotIdentifier').value.trim();

            fetch('credentials.json')
                .then(res => res.json())
                .then(data => {
                    let db = defaultAccounts;
                    if (data) {
                        db = [
                            ...(data.default_accounts || []),
                            ...(data.registered_users || [])
                        ];
                    }
                    findPassword(db);
                })
                .catch(() => {
                    findPassword(defaultAccounts);
                });

            function findPassword(db) {
                const targetUser = localStorage.getItem('storedUser');
                const targetPassword = localStorage.getItem('storedPassword');
                const forgotAlertBox = document.getElementById('forgotAlertBox');

                let foundPassword = null;
                let accountName = "";

                if (inputID === targetUser && targetUser) {
                    foundPassword = targetPassword;
                    accountName = localStorage.getItem('storedUserName') || "Trader";
                } else {
                    const matched = db.find(acc => acc.identifier === inputID);
                    if (matched) {
                        foundPassword = matched.password;
                        accountName = matched.name;
                    }
                }

                if (forgotAlertBox) {
                    forgotAlertBox.style.display = "block";
                    if (foundPassword) {
                        forgotAlertBox.innerText = `✔ Account found! Password for ${accountName} is: ${foundPassword}`;
                        forgotAlertBox.style.color = "var(--success)";
                        forgotAlertBox.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
                        forgotAlertBox.style.borderColor = "rgba(16, 185, 129, 0.2)";
                    } else {
                        forgotAlertBox.innerText = "❌ Access Denied: Identifier details not found.";
                        forgotAlertBox.style.color = "var(--error)";
                        forgotAlertBox.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                        forgotAlertBox.style.borderColor = "rgba(239, 68, 68, 0.2)";
                    }
                }
            }
        });
    }

    // Logout
    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', () => {
            localStorage.removeItem('isUserLoggedIn');
            renderApplicationStateView();
        });
    }

    // Buy Credits Simulation
    if (buyCreditsBtn) {
        buyCreditsBtn.addEventListener('click', () => {
            userCredits += 50;
            localStorage.setItem('userCredits', userCredits);
            updateCreditsDisplay();
            alert("Payment successful! 50 Credits have been loaded into your account.");
        });
    }

    // Also bind click directly to badge for convenience
    if (creditBadge) {
        creditBadge.addEventListener('click', () => {
            buyCreditsBtn.click();
        });
    }

    function updateCreditsDisplay() {
        if (creditBadge) creditBadge.innerText = `${userCredits} Credits`;
    }

    function updateBalanceDisplay() {
        if (userBalanceSpan) userBalanceSpan.innerText = `$${userBalance.toFixed(2)}`;
    }

    // Render visibility and start dashboard utilities
    function renderApplicationStateView() {
        const loginToken = localStorage.getItem('isUserLoggedIn');
        if (loginToken === 'true') {
            authGatePage.style.display = 'none';
            protectedHomePage.style.display = 'block';

            // Set welcome user name
            const uName = localStorage.getItem('storedUserName') || "Trader";
            if (userWelcomeSpan) userWelcomeSpan.innerText = uName;

            updateCreditsDisplay();
            updateBalanceDisplay();

            // Initialize high-fidelity TradingView chart widget
            initTradingViewWidget(currentSymbol);

            // Start price feeds simulation
            startMarketPriceSimulation();

            // Draw initial trades table
            renderTradesTable();

            // Initial Calculator Setup
            updateCalculatorFormFields();
        } else {
            authGatePage.style.display = 'flex';
            protectedHomePage.style.display = 'none';
        }
    }

    // --- MARKET tickers & charts ---
    const tickerContainer = document.getElementById('tickerWrap');

    function createTickerItems() {
        if (!tickerContainer) return;
        tickerContainer.innerHTML = '';

        // Double them up to support smooth marquee looping
        const assets = Object.keys(marketAssets);
        const doubleAssets = [...assets, ...assets];

        doubleAssets.forEach((symbol, index) => {
            const data = marketAssets[symbol];
            const tickerItem = document.createElement('div');
            tickerItem.className = 'ticker-item';
            tickerItem.id = `ticker-${symbol.replace('/', '-')}-${index}`;

            const stateClass = data.change >= 0 ? 'up' : 'down';
            const stateSymbol = data.change >= 0 ? '▲' : '▼';

            tickerItem.innerHTML = `
                <span class="symbol">${symbol}</span>
                <span class="price" id="t-price-${symbol.replace('/', '-')}-${index}">${data.price.toFixed(data.decimal)}</span>
                <span class="change ${stateClass}" id="t-change-${symbol.replace('/', '-')}-${index}">${stateSymbol} ${Math.abs(data.change).toFixed(2)}%</span>
            `;
            tickerContainer.appendChild(tickerItem);
        });
    }

    function updateTickerUI(symbol, data) {
        const stateClass = data.change >= 0 ? 'up' : 'down';
        const stateSymbol = data.change >= 0 ? '▲' : '▼';

        const idBase = symbol.replace('/', '-');
        const elements = document.querySelectorAll(`[id^="t-price-${idBase}"]`);
        elements.forEach(el => {
            el.innerText = data.price.toFixed(data.decimal);
        });

        const changeElements = document.querySelectorAll(`[id^="t-change-${idBase}"]`);
        changeElements.forEach(el => {
            el.innerText = `${stateSymbol} ${Math.abs(data.change).toFixed(2)}%`;
            el.className = `change ${stateClass}`;
        });
    }

    // --- TradingView Widget Chart Integration ---
    let tvWidgetInstance = null;

    function initTradingViewWidget(symbol) {
        // Map asset symbols to TradingView feeds
        let tvSymbol = "COINBASE:BTCUSD";
        if (symbol === 'ETH/USD') tvSymbol = "COINBASE:ETHUSD";
        else if (symbol === 'SOL/USD') tvSymbol = "COINBASE:SOLUSD";
        else if (symbol === 'BNB/USD') tvSymbol = "BINANCE:BNBUSD";
        else if (symbol === 'XRP/USD') tvSymbol = "BINANCE:XRPUSD";
        else if (symbol === 'ADA/USD') tvSymbol = "BINANCE:ADAUSD";
        else if (symbol === 'DOGE/USD') tvSymbol = "BINANCE:DOGEUSD";
        else if (symbol === 'DOT/USD') tvSymbol = "BINANCE:DOTUSD";
        else if (symbol === 'LINK/USD') tvSymbol = "BINANCE:LINKUSD";
        else if (symbol === 'MATIC/USD') tvSymbol = "BINANCE:MATICUSD";
        else if (symbol === 'SHIB/USD') tvSymbol = "BINANCE:SHIBUSD";
        else if (symbol === 'LTC/USD') tvSymbol = "BINANCE:LTCUSD";
        else if (symbol === 'EUR/USD') tvSymbol = "FX:EURUSD";
        else if (symbol === 'GBP/USD') tvSymbol = "FX:GBPUSD";
        else if (symbol === 'USD/JPY') tvSymbol = "FX:USDJPY";
        else if (symbol === 'AUD/USD') tvSymbol = "FX:AUDUSD";
        else if (symbol === 'USD/CAD') tvSymbol = "FX:USDCAD";
        else if (symbol === 'USD/CHF') tvSymbol = "FX:USDCHF";
        else if (symbol === 'EUR/GBP') tvSymbol = "FX:EURGBP";
        else if (symbol === 'GBP/JPY') tvSymbol = "FX:GBPJPY";
        else if (symbol === 'EUR/JPY') tvSymbol = "FX:EURJPY";
        else if (symbol === 'AUD/JPY') tvSymbol = "FX:AUDJPY";
        else if (symbol === 'NZD/USD') tvSymbol = "FX:NZDUSD";
        else if (symbol === 'USD/SGD') tvSymbol = "FX:USDSGD";
        else if (symbol === 'USD/ZAR') tvSymbol = "FX:USDZAR";
        else if (symbol === 'USD/INR') tvSymbol = "FX:USDINR";
        else if (symbol === 'EUR/CHF') tvSymbol = "FX:EURCHF";
        else if (symbol === 'GBP/CHF') tvSymbol = "FX:GBPCHF";
        else if (symbol === 'XAU/USD') tvSymbol = "OANDA:XAUUSD";
        else if (symbol === 'XAG/USD') tvSymbol = "OANDA:XAGUSD";
        else if (symbol === 'UKOIL') tvSymbol = "TVC:UKOIL";
        else if (symbol === 'USOIL') tvSymbol = "TVC:USOIL";
        else if (symbol === 'NGAS') tvSymbol = "TVC:NGAS";
        else if (symbol === 'SPX500') tvSymbol = "FOREXCOM:SPX500";
        else if (symbol === 'US30') tvSymbol = "FOREXCOM:DJI";
        else if (symbol === 'NAS100') tvSymbol = "FOREXCOM:NAS100";
        else if (symbol === 'GER40') tvSymbol = "FOREXCOM:GER30";
        else if (symbol === 'JPN225') tvSymbol = "FOREXCOM:JPN225";

        const container = document.getElementById('tradingview_chart');
        if (container) {
            container.innerHTML = `
                <iframe 
                    src="https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=5&theme=dark&style=1&timezone=Etc%2FUTC&locale=en&enablepublishing=false&hideideas=true&hidesidetoolbar=false&symboledit=true&saveimage=true&toolbarbg=0d1222" 
                    style="width: 100%; height: 100%; border: none;" 
                    allowtransparency="true" 
                    scrolling="no" 
                    allowfullscreen>
                </iframe>
            `;
        }
    }

    // Switch Symbol
    window.selectSymbol = function (symbol) {
        currentSymbol = symbol;

        // Dynamically initialize simulation statistics for newly loaded workspace assets
        if (!marketAssets[symbol]) {
            let basePrice = 100.0;
            let decimal = 2;
            let volatility = 0.5;

            if (symbol.includes('JPY')) {
                basePrice = 161.20;
                decimal = 3;
                volatility = 0.15;
            } else if (symbol === 'USD/INR') {
                basePrice = 83.50;
                decimal = 4;
                volatility = 0.05;
            } else if (symbol === 'USD/ZAR') {
                basePrice = 18.20;
                decimal = 4;
                volatility = 0.08;
            } else if (symbol === 'USD/SGD') {
                basePrice = 1.35;
                decimal = 5;
                volatility = 0.00015;
            } else if (symbol.includes('USD') && !symbol.startsWith('USD/')) {
                basePrice = 1.15;
                decimal = 5;
                volatility = 0.00015;
            } else if (symbol.startsWith('USD/')) {
                basePrice = 1.25;
                decimal = 5;
                volatility = 0.00015;
            } else if (symbol.includes('EUR/GBP') || symbol.includes('EUR/CHF') || symbol.includes('GBP/CHF')) {
                basePrice = symbol.includes('EUR/GBP') ? 0.8450 : (symbol.includes('EUR/CHF') ? 0.9620 : 1.1410);
                decimal = 5;
                volatility = 0.0001;
            } else if (symbol.includes('XAU')) {
                basePrice = 2335.00;
                decimal = 2;
                volatility = 1.8;
            } else if (symbol.includes('XAG')) {
                basePrice = 29.50;
                decimal = 2;
                volatility = 0.05;
            } else if (symbol === 'UKOIL' || symbol === 'USOIL') {
                basePrice = symbol === 'UKOIL' ? 85.20 : 80.40;
                decimal = 2;
                volatility = 0.15;
            } else if (symbol === 'NGAS') {
                basePrice = 2.80;
                decimal = 3;
                volatility = 0.015;
            } else if (symbol.includes('SPX')) {
                basePrice = 5480.00;
                decimal = 1;
                volatility = 4.0;
            } else if (symbol.includes('US30')) {
                basePrice = 39150.00;
                decimal = 1;
                volatility = 30.0;
            } else if (symbol === 'NAS100') {
                basePrice = 19700.00;
                decimal = 1;
                volatility = 15.0;
            } else if (symbol === 'GER40') {
                basePrice = 18200.00;
                decimal = 1;
                volatility = 12.0;
            } else if (symbol === 'JPN225') {
                basePrice = 39100.00;
                decimal = 0;
                volatility = 50.0;
            } else if (symbol.includes('SOL/USD')) {
                basePrice = 145.20;
                decimal = 2;
                volatility = 0.25;
            } else if (symbol.includes('BNB/USD')) {
                basePrice = 575.50;
                decimal = 2;
                volatility = 1.2;
            } else if (symbol.includes('XRP/USD')) {
                basePrice = 0.475;
                decimal = 4;
                volatility = 0.002;
            } else if (symbol.includes('ADA/USD')) {
                basePrice = 0.385;
                decimal = 4;
                volatility = 0.0015;
            } else if (symbol.includes('DOGE/USD')) {
                basePrice = 0.125;
                decimal = 5;
                volatility = 0.002;
            } else if (symbol.includes('SHIB/USD')) {
                basePrice = 0.00001750;
                decimal = 8;
                volatility = 0.0000003;
            } else {
                basePrice = symbol.includes('LTC') ? 78.50 : (symbol.includes('LINK') ? 14.20 : (symbol.includes('DOT') ? 6.10 : 0.58));
                decimal = 2;
                volatility = 0.05;
            }

            marketAssets[symbol] = {
                price: basePrice,
                decimal: decimal,
                volatility: volatility,
                change: (Math.random() - 0.5) * 2.0
            };

            // Re-generate ticker items dynamically to append the new symbol
            createTickerItems();
        }

        // Sync Asset Dropdown Selector component
        const selector = document.getElementById('chartSymbolSelector');
        if (selector) {
            selector.value = symbol;
        }

        // Update trade details input selection field
        const pairTradeSelect = document.getElementById('tradePairSelect');
        if (pairTradeSelect) {
            let optionExists = false;
            for (let i = 0; i < pairTradeSelect.options.length; i++) {
                if (pairTradeSelect.options[i].value === symbol) {
                    optionExists = true;
                    break;
                }
            }
            if (!optionExists) {
                const newOpt = document.createElement('option');
                newOpt.value = symbol;
                newOpt.text = symbol;
                pairTradeSelect.add(newOpt);
            }
            pairTradeSelect.value = symbol;
            updateCalculatorFormFields();
        }

        // Reload TradingView widget
        initTradingViewWidget(symbol);
    };

    // Simulated Market Price Generation Engine
    let priceSimulationInterval = null;

    function startMarketPriceSimulation() {
        createTickerItems();

        if (priceSimulationInterval) clearInterval(priceSimulationInterval);

        priceSimulationInterval = setInterval(() => {
            Object.keys(marketAssets).forEach(symbol => {
                const asset = marketAssets[symbol];
                const isPositive = Math.random() > 0.49;
                const changeAmt = (Math.random() * asset.volatility * (isPositive ? 1.0 : -0.98));

                asset.price += changeAmt;
                if (asset.price <= 0) asset.price = 0.01;

                const percentageShift = (Math.random() - 0.5) * 0.15;
                asset.change += percentageShift;
                if (asset.change > 10) asset.change = 8.5;
                if (asset.change < -10) asset.change = -7.2;

                // Propagate tick to scrolling marquee
                updateTickerUI(symbol, asset);

                // Recalculate P&L of active simulated positions
                updateActiveTradesPnL();
            });
        }, 1500);
    }


    // --- POSITION CALCULATOR LOGIC ---
    const calcBalance = document.getElementById('calcBalance');
    const calcRiskPercent = document.getElementById('calcRiskPercent');
    const calcEntry = document.getElementById('calcEntry');
    const calcStopLoss = document.getElementById('calcStopLoss');

    const outRiskAmount = document.getElementById('outRiskAmount');
    const outPipDiff = document.getElementById('outPipDiff');
    const outPositionSize = document.getElementById('outPositionSize');

    // Auto synchronize symbol to input fields
    const tradePairSelect = document.getElementById('tradePairSelect');
    if (tradePairSelect) {
        tradePairSelect.addEventListener('change', (e) => {
            selectSymbol(e.target.value);
        });
    }

    function updateCalculatorFormFields() {
        const asset = marketAssets[currentSymbol];
        if (calcEntry) {
            calcEntry.value = asset.price.toFixed(asset.decimal);
            const slOffset = asset.volatility * 3;
            calcStopLoss.value = (asset.price - slOffset).toFixed(asset.decimal);
            runCalculatorMath();
        }
    }

    function runCalculatorMath() {
        if (!calcBalance || !calcRiskPercent || !calcEntry || !calcStopLoss) return;

        const balance = parseFloat(calcBalance.value) || 0;
        const riskPercent = parseFloat(calcRiskPercent.value) || 0;
        const entry = parseFloat(calcEntry.value) || 0;
        const sl = parseFloat(calcStopLoss.value) || 0;

        const riskAmount = balance * (riskPercent / 100);
        if (outRiskAmount) outRiskAmount.innerText = `$${riskAmount.toFixed(2)}`;

        const diff = Math.abs(entry - sl);
        let pips = 0;
        const asset = marketAssets[currentSymbol];
        if (asset.decimal === 5) {
            pips = diff * 10000;
            if (outPipDiff) outPipDiff.innerText = `${pips.toFixed(1)} Pips`;
        } else {
            pips = diff;
            if (outPipDiff) outPipDiff.innerText = `${pips.toFixed(asset.decimal)} Points`;
        }

        let units = 0;
        if (diff > 0) {
            units = riskAmount / diff;
        }

        if (outPositionSize) {
            if (asset.decimal === 5) {
                const lots = units / 100000;
                outPositionSize.innerText = `${lots.toFixed(2)} Standard Lots (${units.toLocaleString(undefined, { maximumFractionDigits: 0 })} Units)`;
            } else {
                outPositionSize.innerText = `${units.toFixed(3)} Units`;
            }
        }
    }

    [calcBalance, calcRiskPercent, calcEntry, calcStopLoss].forEach(item => {
        if (item) {
            item.addEventListener('input', runCalculatorMath);
        }
    });

    // --- SIMULATED TRADING FLOW ---
    let tradeDirection = 'BUY';
    const tabBuy = document.getElementById('tabBuy');
    const tabSell = document.getElementById('tabSell');
    const tradeSubmitBtn = document.getElementById('tradeSubmitBtn');

    window.setTradeDirection = function (dir) {
        tradeDirection = dir;
        if (dir === 'BUY') {
            tabBuy.classList.add('active');
            tabSell.classList.remove('active');
            if (tradeSubmitBtn) {
                tradeSubmitBtn.innerText = 'Place Buy Market Order';
                tradeSubmitBtn.className = 'trade-action-btn';
            }
        } else {
            tabSell.classList.add('active');
            tabBuy.classList.remove('active');
            if (tradeSubmitBtn) {
                tradeSubmitBtn.innerText = 'Place Sell Market Order';
                tradeSubmitBtn.className = 'trade-action-btn sell-mode';
            }
        }
    };

    const quickTradeForm = document.getElementById('quickTradeForm');
    if (quickTradeForm) {
        quickTradeForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const selectPair = document.getElementById('tradePairSelect').value;
            const sizeInput = parseFloat(document.getElementById('tradeSize').value) || 0;
            const entryPrice = parseFloat(marketAssets[selectPair].price);

            if (sizeInput <= 0) {
                alert("Please enter a valid order size.");
                return;
            }

            if (userCredits <= 0) {
                alert("Insufficient Credits! Please buy credits before placing live simulated trades.");
                return;
            }

            userCredits -= 2;
            localStorage.setItem('userCredits', userCredits);
            updateCreditsDisplay();

            const newTrade = {
                id: 'T-' + Math.floor(100000 + Math.random() * 900000),
                symbol: selectPair,
                type: tradeDirection,
                size: sizeInput,
                entryPrice: entryPrice,
                currentPrice: entryPrice,
                pnl: 0,
                time: new Date().toLocaleTimeString()
            };

            activeTrades.push(newTrade);
            localStorage.setItem('activeTrades', JSON.stringify(activeTrades));

            renderTradesTable();
            alert(`Simulated order placed successfully! Placed ${tradeDirection} for ${sizeInput} units of ${selectPair}. (Deducted 2 Credits)`);
        });
    }

    function renderTradesTable() {
        const tableBody = document.getElementById('journalTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (activeTrades.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">No active simulated trades. Place an order on the left panel!</div>
                    </td>
                </tr>
            `;
            return;
        }

        activeTrades.forEach(trade => {
            const tr = document.createElement('tr');
            tr.id = `row-${trade.id}`;

            const asset = marketAssets[trade.symbol];
            const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
            const sign = trade.pnl >= 0 ? '+' : '';

            tr.innerHTML = `
                <td><strong>${trade.id}</strong></td>
                <td><span class="type-badge ${trade.type.toLowerCase()}">${trade.type}</span></td>
                <td><strong>${trade.symbol}</strong></td>
                <td>${trade.size.toLocaleString()}</td>
                <td>${trade.entryPrice.toFixed(asset.decimal)}</td>
                <td id="row-price-${trade.id}">${trade.currentPrice.toFixed(asset.decimal)}</td>
                <td class="pnl-value ${pnlClass}" id="row-pnl-${trade.id}">${sign}$${trade.pnl.toFixed(2)}</td>
                <td>
                    <button class="close-trade-btn" onclick="closeTradePosition('${trade.id}')">Close</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function updateActiveTradesPnL() {
        if (activeTrades.length === 0) return;

        activeTrades.forEach(trade => {
            const asset = marketAssets[trade.symbol];
            trade.currentPrice = asset.price;

            let pnl = 0;
            if (trade.type === 'BUY') {
                pnl = (trade.currentPrice - trade.entryPrice) * trade.size;
            } else {
                pnl = (trade.entryPrice - trade.currentPrice) * trade.size;
            }

            trade.pnl = pnl;

            const rowPrice = document.getElementById(`row-price-${trade.id}`);
            const rowPnl = document.getElementById(`row-pnl-${trade.id}`);

            if (rowPrice) rowPrice.innerText = trade.currentPrice.toFixed(asset.decimal);
            if (rowPnl) {
                const sign = trade.pnl >= 0 ? '+' : '';
                rowPnl.innerText = `${sign}$${trade.pnl.toFixed(2)}`;
                rowPnl.className = `pnl-value ${trade.pnl >= 0 ? 'positive' : 'negative'}`;
            }
        });

        localStorage.setItem('activeTrades', JSON.stringify(activeTrades));
    }

    window.closeTradePosition = function (tradeId) {
        const tradeIndex = activeTrades.findIndex(t => t.id === tradeId);
        if (tradeIndex === -1) return;

        const trade = activeTrades[tradeIndex];

        userBalance += trade.pnl;
        localStorage.setItem('userBalance', userBalance);
        updateBalanceDisplay();

        activeTrades.splice(tradeIndex, 1);
        localStorage.setItem('activeTrades', JSON.stringify(activeTrades));

        renderTradesTable();

        const pnlText = trade.pnl >= 0 ? `Profit of $${trade.pnl.toFixed(2)}` : `Loss of $${Math.abs(trade.pnl).toFixed(2)}`;
        alert(`Position Closed! Realised PnL: ${pnlText}. Current Balance: $${userBalance.toFixed(2)}`);
    };

    // --- MARKET KNOWLEDGE MODALS ---
    window.openKnowledgeModal = function (moduleId) {
        const modal = document.getElementById(`modal-${moduleId}`);
        if (modal) {
            modal.classList.add('active');
        }
    };

    window.closeKnowledgeModal = function (moduleId) {
        const modal = document.getElementById(`modal-${moduleId}`);
        if (modal) {
            modal.classList.remove('active');
        }
    };

    const modalOverlays = document.querySelectorAll('.modal-overlay');
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // --- FUNDING PORTAL MODALS CONTROLLERS ---
    window.openFundingModal = function (tab) {
        const modal = document.getElementById('modal-funding');
        if (modal) {
            modal.classList.add('active');
            switchFundingTab(tab);
        }
    };

    window.closeFundingModal = function () {
        const modal = document.getElementById('modal-funding');
        if (modal) {
            modal.classList.remove('active');
        }
    };

    window.switchFundingTab = function (tab) {
        const btnDeposit = document.getElementById('btnFundingDeposit');
        const btnWithdraw = document.getElementById('btnFundingWithdraw');
        const depositSection = document.getElementById('fundingDepositSection');
        const withdrawSection = document.getElementById('fundingWithdrawSection');
        const titleBadge = document.getElementById('fundingModalTitle');

        // Reset forms and status text
        document.getElementById('depositFundsForm').reset();
        document.getElementById('withdrawFundsForm').reset();
        document.getElementById('depositUSDConversion').innerText = "Will Credit: $0.00 USD";
        document.getElementById('withdrawINRConversion').innerText = "Will Receive: ₹0.00 INR";
        document.getElementById('depositStatusMsg').style.display = "none";
        document.getElementById('withdrawStatusMsg').style.display = "none";

        if (tab === 'deposit') {
            btnDeposit.classList.add('active');
            btnWithdraw.classList.remove('active');
            depositSection.classList.remove('hidden');
            withdrawSection.classList.add('hidden');
            if (titleBadge) {
                titleBadge.innerText = 'Deposit Capital';
                titleBadge.style.backgroundColor = 'var(--success-glow)';
                titleBadge.style.color = 'var(--success)';
            }
        } else {
            btnWithdraw.classList.add('active');
            btnDeposit.classList.remove('active');
            withdrawSection.classList.remove('hidden');
            depositSection.classList.add('hidden');
            if (titleBadge) {
                titleBadge.innerText = 'Withdraw Funds';
                titleBadge.style.backgroundColor = 'var(--accent-glow)';
                titleBadge.style.color = 'var(--accent)';
            }
        }
    };

    // Live conversion metrics
    const depositAmountINR = document.getElementById('depositAmountINR');
    const depositUSDConversion = document.getElementById('depositUSDConversion');
    if (depositAmountINR && depositUSDConversion) {
        depositAmountINR.addEventListener('input', () => {
            const inr = parseFloat(depositAmountINR.value) || 0;
            const usd = inr / 83.50;
            depositUSDConversion.innerText = `Will Credit: $${usd.toFixed(2)} USD`;
        });
    }

    const withdrawAmountUSD = document.getElementById('withdrawAmountUSD');
    const withdrawINRConversion = document.getElementById('withdrawINRConversion');
    if (withdrawAmountUSD && withdrawINRConversion) {
        withdrawAmountUSD.addEventListener('input', () => {
            const usd = parseFloat(withdrawAmountUSD.value) || 0;
            const inr = usd * 83.50;
            withdrawINRConversion.innerText = `Will Receive: ₹${inr.toFixed(2)} INR`;
        });
    }

    // Deposit UPI Verification Simulation
    const depositFundsForm = document.getElementById('depositFundsForm');
    if (depositFundsForm) {
        depositFundsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inrAmount = parseFloat(document.getElementById('depositAmountINR').value) || 0;
            const utr = document.getElementById('depositUtr').value.trim();
            const statusBox = document.getElementById('depositStatusMsg');
            const submitBtn = depositFundsForm.querySelector('button[type="submit"]');

            if (inrAmount <= 0) {
                alert("Please enter a valid deposit amount.");
                return;
            }

            statusBox.style.display = "block";
            statusBox.style.color = "var(--accent)";
            statusBox.style.backgroundColor = "rgba(245, 158, 11, 0.1)";
            statusBox.style.borderColor = "rgba(245, 158, 11, 0.2)";
            statusBox.innerText = `⚡ Verifying payment status on UPI network (UTR: ${utr})...`;
            submitBtn.disabled = true;

            setTimeout(() => {
                const usdAmount = inrAmount / 83.50;
                userBalance += usdAmount;
                localStorage.setItem('userBalance', userBalance);
                updateBalanceDisplay();

                statusBox.style.color = "var(--success)";
                statusBox.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
                statusBox.style.borderColor = "rgba(16, 185, 129, 0.2)";
                statusBox.innerText = `✔ UPI Deposit of ₹${inrAmount.toFixed(2)} ($${usdAmount.toFixed(2)} USD) successfully verified and credited!`;
                submitBtn.disabled = false;

                // Clear fields
                document.getElementById('depositAmountINR').value = '';
                document.getElementById('depositUtr').value = '';
                document.getElementById('depositUSDConversion').innerText = "Will Credit: $0.00 USD";
            }, 2500);
        });
    }

    // Payout UPI Request Simulation
    const withdrawFundsForm = document.getElementById('withdrawFundsForm');
    if (withdrawFundsForm) {
        withdrawFundsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usdAmount = parseFloat(document.getElementById('withdrawAmountUSD').value) || 0;
            const upiId = document.getElementById('withdrawUpiId').value.trim();
            const statusBox = document.getElementById('withdrawStatusMsg');
            const submitBtn = withdrawFundsForm.querySelector('button[type="submit"]');

            if (usdAmount <= 0) {
                alert("Please enter a valid withdrawal amount.");
                return;
            }

            if (usdAmount > userBalance) {
                statusBox.style.display = "block";
                statusBox.style.color = "var(--error)";
                statusBox.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                statusBox.style.borderColor = "rgba(239, 68, 68, 0.2)";
                statusBox.innerText = `❌ Error: Insufficient USD balance to execute withdrawal.`;
                return;
            }

            statusBox.style.display = "block";
            statusBox.style.color = "var(--accent)";
            statusBox.style.backgroundColor = "rgba(245, 158, 11, 0.1)";
            statusBox.style.borderColor = "rgba(245, 158, 11, 0.2)";
            statusBox.innerText = `⚡ Processing UPI withdrawal request of $${usdAmount.toFixed(2)} to ${upiId}...`;
            submitBtn.disabled = true;

            setTimeout(() => {
                userBalance -= usdAmount;
                localStorage.setItem('userBalance', userBalance);
                updateBalanceDisplay();

                const inrAmount = usdAmount * 83.50;
                statusBox.style.color = "var(--success)";
                statusBox.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
                statusBox.style.borderColor = "rgba(16, 185, 129, 0.2)";
                statusBox.innerText = `✔ Payout of ₹${inrAmount.toFixed(2)} ($${usdAmount.toFixed(2)} USD) successfully initiated to UPI: ${upiId}!`;
                submitBtn.disabled = false;

                // Clear fields
                document.getElementById('withdrawAmountUSD').value = '';
                document.getElementById('withdrawUpiId').value = '';
                document.getElementById('withdrawINRConversion').innerText = "Will Receive: ₹0.00 INR";
            }, 2500);
        });
    }

    // Run Initial Layout State rendering
    renderApplicationStateView();
});
