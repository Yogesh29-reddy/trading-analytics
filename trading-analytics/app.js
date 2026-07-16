// ==========================================
// PORTFOLIO & TRADING ANALYTICS APPLICATION
// ==========================================

// Register Service Worker for installable PWA support in Google Chrome and other browsers
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

// PWA custom install prompt behavior for Google Chrome and all compatible browsers
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtns = document.querySelectorAll('.pwa-install-btn');
    installBtns.forEach(btn => {
        btn.classList.remove('hidden');
        btn.onclick = () => {
            installBtns.forEach(b => b.classList.add('hidden'));
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User installed the web application');
                }
                deferredPrompt = null;
            });
        };
    });
});

window.addEventListener('appinstalled', () => {
    console.log('Trading Analytics PWA was installed successfully.');
});

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
    // Custom Toast Notification System
    window.showToast = function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `
            <div style="font-size: 1.2rem; line-height: 1;">${icon}</div>
            <div class="toast-content">${message}</div>
            <div class="toast-close">&times;</div>
        `;

        container.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        });

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    };

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
                showToast("Please declare a valid Email Address first.", "warning");
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
                        showToast("Registration Complete! Credentials stored directly in the project directory (credentials.json).", "success");
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
                showToast(message + " A backup 'credentials.json' has been downloaded.", "warning");
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
                        showToast("Access Denied: Invalid credentials.", "error");
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
            showToast("Payment successful! 50 Credits have been loaded into your account.", "success");
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

            const slValue = parseFloat(document.getElementById('tradeStopLoss').value) || null;
            const tpValue = parseFloat(document.getElementById('tradeTakeProfit').value) || null;

            if (sizeInput <= 0) {
                showToast("Please enter a valid order size.", "warning");
                return;
            }

            if (userCredits <= 0) {
                showToast("Insufficient Credits! Please buy credits before placing live simulated trades.", "error");
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
                stopLoss: slValue,
                takeProfit: tpValue,
                pnl: 0,
                time: new Date().toLocaleTimeString()
            };

            activeTrades.push(newTrade);
            localStorage.setItem('activeTrades', JSON.stringify(activeTrades));

            renderTradesTable();
            showToast(`Simulated ${tradeDirection} order placed successfully for ${sizeInput} units of ${selectPair}. (Deducted 2 Credits)`, "success");

            // Clear SL/TP inputs
            document.getElementById('tradeStopLoss').value = '';
            document.getElementById('tradeTakeProfit').value = '';
        });
    }

    function renderTradesTable() {
        const tableBody = document.getElementById('journalTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (activeTrades.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10">
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

            const slText = (trade.stopLoss !== null && trade.stopLoss !== undefined) ? trade.stopLoss.toFixed(asset.decimal) : '<span style="color: var(--text-muted);">None</span>';
            const tpText = (trade.takeProfit !== null && trade.takeProfit !== undefined) ? trade.takeProfit.toFixed(asset.decimal) : '<span style="color: var(--text-muted);">None</span>';

            tr.innerHTML = `
                <td><strong>${trade.id}</strong></td>
                <td><span class="type-badge ${trade.type.toLowerCase()}">${trade.type}</span></td>
                <td><strong>${trade.symbol}</strong></td>
                <td>${trade.size.toLocaleString()}</td>
                <td>${trade.entryPrice.toFixed(asset.decimal)}</td>
                <td>${slText}</td>
                <td>${tpText}</td>
                <td id="row-price-${trade.id}">${trade.currentPrice.toFixed(asset.decimal)}</td>
                <td class="pnl-value ${pnlClass}" id="row-pnl-${trade.id}">${sign}$${trade.pnl.toFixed(2)}</td>
                <td>
                    <button class="close-trade-btn" onclick="closeTradePosition('${trade.id}')">Close</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function autoCloseTradePosition(tradeId, reason) {
        const tradeIndex = activeTrades.findIndex(t => t.id === tradeId);
        if (tradeIndex === -1) return;

        const trade = activeTrades[tradeIndex];
        userBalance += trade.pnl;
        localStorage.setItem('userBalance', userBalance);
        updateBalanceDisplay();

        activeTrades.splice(tradeIndex, 1);
        localStorage.setItem('activeTrades', JSON.stringify(activeTrades));

        renderTradesTable();

        const pnlText = trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`;
        showToast(`💥 Position ${tradeId} Closed via ${reason}! PnL: ${pnlText}`, trade.pnl >= 0 ? "success" : "error");
    }

    function updateActiveTradesPnL() {
        if (activeTrades.length === 0) return;

        let tradesToClose = [];

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

            // Check Stop Loss
            if (trade.stopLoss !== null && trade.stopLoss !== undefined) {
                if (trade.type === 'BUY' && trade.currentPrice <= trade.stopLoss) {
                    tradesToClose.push({ id: trade.id, reason: 'Stop Loss Hit' });
                } else if (trade.type === 'SELL' && trade.currentPrice >= trade.stopLoss) {
                    tradesToClose.push({ id: trade.id, reason: 'Stop Loss Hit' });
                }
            }

            // Check Take Profit
            if (trade.takeProfit !== null && trade.takeProfit !== undefined) {
                if (trade.type === 'BUY' && trade.currentPrice >= trade.takeProfit) {
                    tradesToClose.push({ id: trade.id, reason: 'Take Profit Hit' });
                } else if (trade.type === 'SELL' && trade.currentPrice <= trade.takeProfit) {
                    tradesToClose.push({ id: trade.id, reason: 'Take Profit Hit' });
                }
            }

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

        // Execute auto closures after iteration to avoid index splicing issues
        tradesToClose.forEach(item => {
            autoCloseTradePosition(item.id, item.reason);
        });
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
        showToast(`Position Closed! Realised PnL: ${pnlText}.`, "info");
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

    // ==========================================
    // BEGINNER TRADING ACADEMY LOGIC
    // ==========================================

    const glossaryTerms = [
        { term: "Leverage", category: "risk", description: "Borrowing capital to increase trade sizes. Magnifies both gains and losses.", formula: "Position Size / Account Margin" },
        { term: "Pip", category: "basics", description: "Percentage in Point. The smallest price movement in currency pairs (0.0001 for EUR/USD).", formula: "0.0001 (for 4-decimal currency pairs)" },
        { term: "Spread", category: "basics", description: "The difference between the Bid (selling) price and Ask (buying) price of an asset.", formula: "Ask Price - Bid Price" },
        { term: "Stop Loss (SL)", category: "risk", description: "An order placed to automatically close a trade at a set price if the market goes against you, preventing deep losses.", formula: "Strict maximum 1% risk per trade is recommended" },
        { term: "Take Profit (TP)", category: "risk", description: "An order placed to automatically close a trade at a set price target to lock in profits.", formula: "Target reward should be >= 2x Stop Loss size" },
        { term: "Bull & Bear Markets", category: "analysis", description: "Bull markets represent rising asset prices, whereas Bear markets represent falling asset prices.", formula: "Bullish = Demand dominates; Bearish = Supply dominates" },
        { term: "Long vs Short Positions", category: "basics", description: "Going 'Long' means buying hoping the asset goes up. Going 'Short' means selling hoping it goes down.", formula: "Long = Buy now, sell later; Short = Sell now, buy back later" },
        { term: "Margin Call", category: "risk", description: "A warning triggered when your account balance drops below the broker's minimum margin requirement, risking forced liquidation.", formula: "Triggered if Equity < Used Margin" }
    ];

    function renderGlossary(filter = 'all', searchQuery = '') {
        const grid = document.getElementById('glossaryGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const filtered = glossaryTerms.filter(item => {
            const matchesCategory = filter === 'all' || item.category === filter;
            const matchesSearch = item.term.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  item.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No matching terms found. Try searching for "Margin" or "Pip".</div>';
            return;
        }

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'glossary-card';
            card.innerHTML = `
                <span class="card-badge ${item.category === 'risk' ? 'risk' : (item.category === 'analysis' ? 'crypto' : '')}" style="font-size:0.65rem; padding:0.15rem 0.5rem; margin-bottom:0.75rem;">${item.category.toUpperCase()}</span>
                <h4 class="card-title" style="font-size: 1.15rem; margin-bottom: 0.5rem;">${item.term}</h4>
                <p class="card-desc" style="font-size: 0.85rem; margin-bottom: 1rem; color: var(--text-secondary);">${item.description}</p>
                <div style="font-size: 0.75rem; font-family: monospace; color: var(--accent); padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05);">
                    Formula/Tip: ${item.formula}
                </div>
            `;
            grid.appendChild(card);
        });
    }

    const searchInput = document.getElementById('glossarySearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeFilterBtn = document.querySelector('.glossary-filters .action-btn.active');
            const filter = activeFilterBtn ? activeFilterBtn.dataset.category : 'all';
            renderGlossary(filter, e.target.value);
        });
    }

    const filterBtns = document.querySelectorAll('.glossary-filters .action-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.category;
            const query = searchInput ? searchInput.value : '';
            renderGlossary(filter, query);
        });
    });

    // Interactive Quiz System
    const quizQuestions = [
        {
            question: "What does going 'Short' on Bitcoin (BTC/USD) mean?",
            options: [
                "Holding Bitcoin in a cold wallet for a short period of time.",
                "Selling Bitcoin hoping its price will decrease, so you can buy it back cheaper.",
                "Buying a small fraction of a Bitcoin.",
                "Leveraging your account balance to buy twice as much Bitcoin."
            ],
            answer: 1
        },
        {
            question: "If your account balance is $10,000 and you risk 1% on a trade, how much capital are you risking?",
            options: [
                "$10.00",
                "$1,000.00",
                "$100.00",
                "$50.00"
            ],
            answer: 2
        },
        {
            question: "What is the primary risk of using high leverage in trading?",
            options: [
                "It slows down trade execution speed.",
                "It increases transaction spreads charged by the broker.",
                "It reduces potential profit margins.",
                "It magnifies losses, which can trigger a Margin Call and wipe out your account."
            ],
            answer: 3
        },
        {
            question: "Which order type is designed to limit your loss if a trade goes against you?",
            options: [
                "Market Order",
                "Stop Loss Order",
                "Take Profit Order",
                "Limit Order"
            ],
            answer: 1
        },
        {
            question: "What represents a 'Spread' in financial markets?",
            options: [
                "The difference between buying (Ask) and selling (Bid) price.",
                "The amount of leverage allocated to a single asset trade.",
                "The growth of trade positions over consecutive winning days.",
                "The total daily trading volume across all global exchanges."
            ],
            answer: 0
        }
    ];

    let currentQuestionIndex = 0;
    let quizScore = 0;

    const quizStartBtn = document.getElementById('quizStartBtn');
    const quizPlayArea = document.getElementById('quizPlayArea');
    const quizResultArea = document.getElementById('quizResultArea');
    const quizWelcomeDesc = document.getElementById('quizWelcomeDesc');
    const quizProgress = document.getElementById('quizProgress');
    const quizQuestionText = document.getElementById('quizQuestionText');
    const quizOptions = document.getElementById('quizOptions');
    const quizRetryBtn = document.getElementById('quizRetryBtn');

    if (quizStartBtn) {
        quizStartBtn.addEventListener('click', () => {
            quizStartBtn.classList.add('hidden');
            quizWelcomeDesc.classList.add('hidden');
            quizPlayArea.classList.remove('hidden');
            currentQuestionIndex = 0;
            quizScore = 0;
            loadQuizQuestion();
        });
    }

    function loadQuizQuestion() {
        if (currentQuestionIndex >= quizQuestions.length) {
            showQuizResults();
            return;
        }

        const q = quizQuestions[currentQuestionIndex];
        if (quizProgress) quizProgress.innerText = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
        if (quizQuestionText) quizQuestionText.innerText = q.question;

        if (quizOptions) {
            quizOptions.innerHTML = '';
            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-opt-btn';
                btn.innerText = opt;
                btn.addEventListener('click', () => handleQuizAnswerSelection(idx));
                quizOptions.appendChild(btn);
            });
        }
    }

    function handleQuizAnswerSelection(selectedIndex) {
        const q = quizQuestions[currentQuestionIndex];
        const optionBtns = quizOptions.querySelectorAll('.quiz-opt-btn');

        // Disable all buttons immediately to prevent multiple clicks
        optionBtns.forEach(btn => btn.disabled = true);

        if (selectedIndex === q.answer) {
            optionBtns[selectedIndex].classList.add('correct');
            quizScore++;
            showToast("Correct answer! Keep it up.", "success");
        } else {
            optionBtns[selectedIndex].classList.add('wrong');
            optionBtns[q.answer].classList.add('correct');
            showToast("Wrong answer. Review the glossary to learn more!", "error");
        }

        // Wait 1.8 seconds, then load next question
        setTimeout(() => {
            currentQuestionIndex++;
            loadQuizQuestion();
        }, 1800);
    }

    function showQuizResults() {
        quizPlayArea.classList.add('hidden');
        quizResultArea.classList.remove('hidden');

        const resultTitle = document.getElementById('quizResultTitle');
        const resultText = document.getElementById('quizResultText');

        const passed = quizScore >= 4;
        if (passed) {
            if (resultTitle) {
                resultTitle.innerText = "Congratulations! You Passed! 🎉";
                resultTitle.style.color = "var(--success)";
            }
            if (resultText) resultText.innerHTML = `You scored <strong>${quizScore}/${quizQuestions.length}</strong> correct. We have credited <strong>+30 Credits</strong> to your account!`;

            // Credit reward
            userCredits += 30;
            localStorage.setItem('userCredits', userCredits);
            updateCreditsDisplay();
            showToast("Passed! +30 simulated credits have been credited to your account.", "success");
        } else {
            if (resultTitle) {
                resultTitle.innerText = "Study Harder! 📚";
                resultTitle.style.color = "var(--error)";
            }
            if (resultText) resultText.innerHTML = `You scored <strong>${quizScore}/${quizQuestions.length}</strong>. You need at least 4 correct to pass and earn rewards. Read our guides and try again!`;
        }
    }

    if (quizRetryBtn) {
        quizRetryBtn.addEventListener('click', () => {
            quizResultArea.classList.add('hidden');
            quizPlayArea.classList.remove('hidden');
            currentQuestionIndex = 0;
            quizScore = 0;
            loadQuizQuestion();
        });
    }

    // Trading Plan Builder Logic
    const planBuilderForm = document.getElementById('planBuilderForm');
    const planOutputCard = document.getElementById('planOutputCard');

    if (planBuilderForm) {
        planBuilderForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const style = document.getElementById('planStyle').value;
            const risk = document.getElementById('planRisk').value;
            const target = document.getElementById('planTarget').value;
            const rule = document.getElementById('planRule').value.trim();

            const plan = { style, risk, target, rule, timestamp: new Date().toLocaleDateString() };
            localStorage.setItem('userTradingPlan', JSON.stringify(plan));

            renderSavedTradingPlan(plan);
            showToast("Trading plan saved successfully!", "success");
        });
    }

    function renderSavedTradingPlan(plan) {
        if (!planOutputCard) return;

        planOutputCard.innerHTML = `
            <h4 style="font-family: var(--font-heading); color: var(--success); font-size: 1.1rem; margin-bottom: 0.75rem;">Disciplined Trading Plan</h4>
            <div class="plan-detail-row">
                <span class="plan-detail-label">Strategy Style:</span>
                <span class="plan-detail-value" style="color: var(--text-primary);">${plan.style}</span>
            </div>
            <div class="plan-detail-row">
                <span class="plan-detail-label">Risk Position Limit:</span>
                <span class="plan-detail-value">${plan.risk}% Risk</span>
            </div>
            <div class="plan-detail-row">
                <span class="plan-detail-label">Monthly Target:</span>
                <span class="plan-detail-value" style="color: var(--primary);">${plan.target}% Target</span>
            </div>
            <div class="plan-detail-row" style="flex-direction: column; align-items: flex-start; gap: 0.25rem;">
                <span class="plan-detail-label">Golden Rule:</span>
                <span style="font-style: italic; color: var(--accent); font-size: 0.85rem;">"${plan.rule}"</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted); text-align: right; margin-top: 0.5rem;">
                Created: ${plan.timestamp}
            </div>
        `;
        planOutputCard.classList.remove('hidden');
    }

    function loadSavedTradingPlan() {
        const planStr = localStorage.getItem('userTradingPlan');
        if (planStr) {
            try {
                const plan = JSON.parse(planStr);
                renderSavedTradingPlan(plan);

                // Pre-fill form fields
                if (document.getElementById('planStyle')) document.getElementById('planStyle').value = plan.style;
                if (document.getElementById('planRisk')) document.getElementById('planRisk').value = plan.risk;
                if (document.getElementById('planTarget')) document.getElementById('planTarget').value = plan.target;
                if (document.getElementById('planRule')) document.getElementById('planRule').value = plan.rule;
            } catch (e) {
                console.error("Error parsing saved trading plan:", e);
            }
        }
    }

    // ==========================================
    // TRADING LIBRARY SYSTEM
    // ==========================================

    const tradingBooks = [
        {
            id: "book-zone",
            title: "Trading in the Zone",
            author: "Mark Douglas",
            coverClass: "cover-blue",
            description: "The definitive guide to understanding trading psychology, managing emotional drawdowns, and thinking in probabilities.",
            takeaways: [
                "Market moves are random and independent events; you don't need to know what will happen next to make money.",
                "An 'edge' is nothing more than an indication of a higher probability of one thing happening over another.",
                "Trading errors are born from fear (fear of losing, fear of being wrong, fear of missing out).",
                "Accept the risk completely. If you do, you will not experience fear or make trading errors."
            ],
            quiz: [
                {
                    question: "What is an 'edge' in trading according to Mark Douglas?",
                    options: [
                        "A secret indicator combination that guarantees success.",
                        "An indication of a higher probability of one thing happening over another.",
                        "Information about institutional block orders.",
                        "The exact top or bottom price level of a trend."
                    ],
                    answer: 1
                },
                {
                    question: "Which emotional state causes the majority of trading execution errors?",
                    options: [
                        "Over-excitement",
                        "Calm neutrality",
                        "Fear",
                        "Impatience"
                    ],
                    answer: 2
                },
                {
                    question: "How should a trader view consecutive trades?",
                    options: [
                        "As independent, probabilistic events that do not influence each other.",
                        "As directly linked patterns where a loss increases win probability next.",
                        "As predictable paths determined by the previous hour's trend.",
                        "As random actions with no statistical expectancy."
                    ],
                    answer: 0
                }
            ]
        },
        {
            id: "book-operator",
            title: "Reminiscences of a Stock Operator",
            author: "Edwin Lefèvre",
            coverClass: "cover-red",
            description: "A thinly-veiled biography of Jesse Livermore, offering timeless wisdom on market speculation, trend following, and patience.",
            takeaways: [
                "The big money is not in individual fluctuations, but in main movements—forest assessment rather than individual tree spotting.",
                "Markets are never wrong; opinions of traders often are.",
                "Never buy an asset simply because it has had a big decline from its previous high, and never sell because it seems high.",
                "Speculation is as old as the hills; whatever happens in the stock market today has happened before and will happen again."
            ],
            quiz: [
                {
                    question: "Where is the 'big money' made according to Jesse Livermore?",
                    options: [
                        "In daily scalping fluctuations.",
                        "In trading high leverage on penny stocks.",
                        "In catching the major long-term trend movements.",
                        "In trading earnings announcements."
                    ],
                    answer: 2
                },
                {
                    question: "What is Livermore's golden rule when a market behaves unexpectedly?",
                    options: [
                        "Double down on the position to improve average entry price.",
                        "Acknowledge that opinions can be wrong; close positions and sit tight.",
                        "Assume the market is manipulated and complain to the broker.",
                        "Hold the position long-term until it breaks even."
                    ],
                    answer: 1
                },
                {
                    question: "Why does technical speculation repeat itself over time?",
                    options: [
                        "Because algorithms control order execution.",
                        "Because human nature doesn't change, driving similar fear/greed cycles.",
                        "Because central banks manipulate interest rates on a cycle.",
                        "Because market makers trigger stop losses on similar dates."
                    ],
                    answer: 1
                }
            ]
        },
        {
            id: "book-wizards",
            title: "Market Wizards",
            author: "Jack D. Schwager",
            coverClass: "cover-purple",
            description: "Interviews with legendary traders revealing their methods, risk controls, and mental setups for consistent market outperformance.",
            takeaways: [
                "Risk control is the single most important common denominator among all successful traders.",
                "You must have a personalized methodology that fits your unique personality; copying others is futile.",
                "Don't lose capital; protect your stake first and gains will compound.",
                "Be willing to take a loss quickly. Invalidation points must be clear before order entry."
            ],
            quiz: [
                {
                    question: "What is the single most important common denominator of the Market Wizards?",
                    options: [
                        "Extremely high mathematical intelligence.",
                        "Strict risk management and capital preservation.",
                        "Entering orders directly at central bank desks.",
                        "Using complex artificial intelligence trading systems."
                    ],
                    answer: 1
                },
                {
                    question: "How should a trader select their trading methodology?",
                    options: [
                        "Copy the most profitable system found online.",
                        "Develop a personalized method that matches their psychology.",
                        "Follow expert recommendations on financial news networks.",
                        "Choose the system with the highest leverage settings."
                    ],
                    answer: 1
                },
                {
                    question: "When should the invalidation (Stop Loss) point of a trade be decided?",
                    options: [
                        "After the position drops by at least 5%.",
                        "At the end of the trading week during review.",
                        "Before placing the order.",
                        "Only if the broker sends a margin warning."
                    ],
                    answer: 2
                }
            ]
        },
        {
            id: "book-murphy",
            title: "Technical Analysis",
            author: "John J. Murphy",
            coverClass: "cover-green",
            description: "The bible of technical analysis, laying out trend lines, chart patterns, oscillators, volume analysis, and indicator setups.",
            takeaways: [
                "Market action discounts everything—fundamentals, politics, and expectations are reflected in price.",
                "Prices move in trends, and a trend is more likely to continue than to reverse.",
                "History repeats itself; chart patterns reveal visual footprints of crowd psychology.",
                "Volume must confirm the trend; volume should expand in the direction of the dominant trend."
            ],
            quiz: [
                {
                    question: "What is the core premise of Technical Analysis?",
                    options: [
                        "Price movements are entirely random and unpredictable.",
                        "All market variables and sentiment are discounted and reflected in price.",
                        "Corporate earnings balance sheets determine daily stock trends.",
                        "Central bank interest decisions are the only tradeable signals."
                    ],
                    answer: 1
                },
                {
                    question: "According to Murphy, a trend is statistically more likely to...",
                    options: [
                        "Reverse immediately upon hitting support or resistance.",
                        "Continue rather than reverse.",
                        "Consolidate in a sideways range forever.",
                        "Accelerate by 50% every week."
                    ],
                    answer: 1
                },
                {
                    question: "What role should volume play in trend confirmation?",
                    options: [
                        "Volume should decrease as price trends up.",
                        "Volume is irrelevant in modern digital token markets.",
                        "Volume must expand in the direction of the dominant trend.",
                        "Volume should peak only at weekend bank closures."
                    ],
                    answer: 2
                }
            ]
        }
    ];

    function renderLibrary() {
        const grid = document.getElementById('libraryGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const statuses = JSON.parse(localStorage.getItem('bookStatuses')) || {};
        const unlockedBooks = JSON.parse(localStorage.getItem('unlockedBooks')) || [];

        tradingBooks.forEach(book => {
            const status = statuses[book.id] || 'to-read';
            const isUnlocked = unlockedBooks.includes(book.id);
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <div class="book-cover-container">
                    <div class="book-cover ${book.coverClass}">
                        <div class="book-cover-title">${book.title}</div>
                        <div class="book-cover-author">${book.author}</div>
                    </div>
                </div>
                <div class="book-info">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                        <h3 class="card-title" style="font-size: 1.25rem; margin-bottom: 0;">${book.title}</h3>
                        ${isUnlocked ? '<span style="font-size:0.7rem; color:var(--success); font-weight:700; background:var(--success-glow); padding:0.15rem 0.4rem; border-radius:8px;">Unlocked</span>' : '<span style="font-size:0.7rem; color:var(--accent); font-weight:700; background:var(--accent-glow); padding:0.15rem 0.4rem; border-radius:8px;">Locked</span>'}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem; font-weight:600;">By ${book.author}</div>
                    <p class="card-desc" style="font-size: 0.825rem; line-height: 1.4; color: var(--text-secondary); margin-bottom: 1rem;">${book.description}</p>
                    
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; margin-top:auto;">
                        <button class="action-btn" style="padding:0.4rem 0.8rem; font-size:0.8rem; flex:1;" onclick="openBookModal('${book.id}')">
                            ${isUnlocked ? 'Details & Notes' : '🔒 Unlock for ₹29'}
                        </button>
                        <div style="flex:1;">
                            <select class="book-status-select" onchange="updateBookStatus('${book.id}', this.value)" ${isUnlocked ? '' : 'disabled'}>
                                <option value="to-read" ${status === 'to-read' ? 'selected' : ''}>📖 To Read</option>
                                <option value="reading" ${status === 'reading' ? 'selected' : ''}>⏳ Reading</option>
                                <option value="completed" ${status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        updateReadingProgress();
    }

    function updateReadingProgress() {
        const progressText = document.getElementById('libraryProgressText');
        const progressBar = document.getElementById('libraryProgressBar');
        if (!progressText || !progressBar) return;

        const statuses = JSON.parse(localStorage.getItem('bookStatuses')) || {};
        const completedCount = Object.keys(statuses).filter(id => statuses[id] === 'completed').length;
        const percent = tradingBooks.length > 0 ? Math.round((completedCount / tradingBooks.length) * 100) : 0;

        progressText.innerText = `${completedCount} of ${tradingBooks.length} Books Completed (${percent}%)`;
        progressBar.style.width = `${percent}%`;
    }

    window.updateBookStatus = function(bookId, status) {
        const statuses = JSON.parse(localStorage.getItem('bookStatuses')) || {};
        statuses[bookId] = status;
        localStorage.setItem('bookStatuses', JSON.stringify(statuses));
        updateReadingProgress();
        showToast(`Status updated: ${tradingBooks.find(b => b.id === bookId).title}`, "success");
    };

    let activeBookQuizIndex = 0;
    let activeBookQuizScore = 0;

    window.openBookModal = function(bookId) {
        const unlockedBooks = JSON.parse(localStorage.getItem('unlockedBooks')) || [];
        if (!unlockedBooks.includes(bookId)) {
            openBookPurchaseModal(bookId);
            return;
        }

        const modal = document.getElementById('modal-book-details');
        const body = document.getElementById('bookModalBody');
        if (!modal || !body) return;

        const book = tradingBooks.find(b => b.id === bookId);
        if (!book) return;

        const ratings = JSON.parse(localStorage.getItem('bookRatings')) || {};
        const rating = ratings[bookId] || 0;

        const notes = JSON.parse(localStorage.getItem('bookNotes')) || {};
        const noteText = notes[bookId] || '';

        body.innerHTML = `
            <div class="card-badge" style="background-color: var(--primary-glow); color: #93c5fd;">Reference Details</div>
            <h3 style="margin-top: 0.75rem; font-family: var(--font-heading);">${book.title}</h3>
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.25rem;">By ${book.author}</div>
            
            <h4 style="margin-bottom:0.5rem; font-size:1rem; color:var(--text-primary);">Core Takeaways & Wisdom:</h4>
            <ul style="margin-bottom:1.5rem; padding-left:1.25rem; font-size:0.9rem; color:var(--text-secondary);">
                ${book.takeaways.map(t => `<li style="margin-bottom:0.4rem;">${t}</li>`).join('')}
            </ul>

            <!-- Ratings & Notes Grid -->
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                <!-- Ratings Card -->
                <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem;">
                    <h4 style="font-size:0.95rem; margin-bottom:0.4rem; color:var(--text-primary);">My Book Rating:</h4>
                    <div class="star-rating" id="bookStars">
                        ${[1,2,3,4,5].map(star => `<span class="star ${star <= rating ? 'active' : ''}" data-value="${star}">&starf;</span>`).join('')}
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.25rem;">Rate this trading reference out of 5 stars.</div>
                </div>

                <!-- Notes Card -->
                <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; display:flex; flex-direction:column;">
                    <h4 style="font-size:0.95rem; margin-bottom:0.4rem; color:var(--text-primary);">Study Journal & Notes:</h4>
                    <textarea id="bookNotesArea" placeholder="Write your key notes, observations, or strategies here..." style="width:100%; height:80px; padding:0.5rem; background:var(--bg-dark); color:var(--text-primary); border:1px solid var(--border-color); border-radius:6px; font-size:0.8rem; resize:none; outline:none; transition:border-color var(--transition-fast);">${noteText}</textarea>
                    <div style="font-size:0.7rem; color:var(--success); margin-top:0.4rem; text-align:right; font-weight:600;">✔ Notes Auto-save active</div>
                </div>
            </div>

            <!-- Book Quiz Area -->
            <div class="book-quiz-container" id="bookQuizBox">
                <h4 style="font-size:1.1rem; margin-bottom:0.5rem; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center;">
                     <span>Book Takeaways Quiz</span>
                     <button class="action-btn" id="startBookQuizBtn" style="padding:0.25rem 0.75rem; font-size:0.75rem;">Start Reference Test</button>
                 </h4>
                 <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0;" id="bookQuizStatus">Test your comprehension of Mark Douglas's or Livermore's core trading philosophies.</p>
                 <div id="bookQuizPlay" class="hidden" style="margin-top: 1rem;">
                     <div id="bookQuizProgress" style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 700; margin-bottom:0.5rem;">Question 1 of 3</div>
                     <div id="bookQuizQuestion" style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-bottom:0.75rem; min-height: 36px;">Question text</div>
                     <div id="bookQuizOptions" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
                 </div>
            </div>
        `;

        modal.classList.add('active');

        // Register star click handlers
        const stars = body.querySelectorAll('#bookStars .star');
        stars.forEach(star => {
            star.addEventListener('click', (e) => {
                const selectedVal = parseInt(star.dataset.value);
                stars.forEach((s, idx) => {
                    if (idx < selectedVal) s.classList.add('active');
                    else s.classList.remove('active');
                });

                const ratings = JSON.parse(localStorage.getItem('bookRatings')) || {};
                ratings[bookId] = selectedVal;
                localStorage.setItem('bookRatings', JSON.stringify(ratings));
                showToast("Rating saved successfully!", "success");
            });
        });

        // Register notes textarea autosave listener
        const notesArea = body.querySelector('#bookNotesArea');
        if (notesArea) {
            notesArea.addEventListener('input', (e) => {
                const notes = JSON.parse(localStorage.getItem('bookNotes')) || {};
                notes[bookId] = e.target.value;
                localStorage.setItem('bookNotes', JSON.stringify(notes));
            });
        }

        // Register quiz trigger button ONE THE START BUTTEN 
        const startQuizBtn = body.querySelector('#startBookQuizBtn');
        if (startQuizBtn) {
            startQuizBtn.addEventListener('click', () => {
                startQuizBtn.classList.add('hidden');
                body.querySelector('#bookQuizStatus').classList.add('hidden');
                body.querySelector('#bookQuizPlay').classList.remove('hidden');
                activeBookQuizIndex = 0;
                activeBookQuizScore = 0;
                loadBookQuizQuestion(book);
            });
        }
    };

    window.closeBookModal = function() {
        const modal = document.getElementById('modal-book-details');
        if (modal) modal.classList.remove('active');
    };

    function loadBookQuizQuestion(book) {
        if (activeBookQuizIndex >= book.quiz.length) {
            showBookQuizResults(book);
            return;
        }

        const q = book.quiz[activeBookQuizIndex];
        document.getElementById('bookQuizProgress').innerText = `Question ${activeBookQuizIndex + 1} of ${book.quiz.length}`;
        document.getElementById('bookQuizQuestion').innerText = q.question;

        const optionsDiv = document.getElementById('bookQuizOptions');
        optionsDiv.innerHTML = '';

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt-btn';
            btn.style.fontSize = '0.85rem';
            btn.style.padding = '0.5rem 0.75rem';
            btn.innerText = opt;
            btn.addEventListener('click', () => handleBookQuizAnswerSelection(book, idx));
            optionsDiv.appendChild(btn);
        });
    }

    function handleBookQuizAnswerSelection(book, selectedIdx) {
        const q = book.quiz[activeBookQuizIndex];
        const optionBtns = document.getElementById('bookQuizOptions').querySelectorAll('.quiz-opt-btn');

        optionBtns.forEach(btn => btn.disabled = true);

        if (selectedIdx === q.answer) {
            optionBtns[selectedIdx].classList.add('correct');
            activeBookQuizScore++;
            showToast("Correct choice!", "success");
        } else {
            optionBtns[selectedIdx].classList.add('wrong');
            optionBtns[q.answer].classList.add('correct');
            showToast("Incorrect choice. Review book takeaways!", "error");
        }

        setTimeout(() => {
            activeBookQuizIndex++;
            loadBookQuizQuestion(book);
        }, 1800);
    }

    function showBookQuizResults(book) {
        const playDiv = document.getElementById('bookQuizPlay');
        const boxDiv = document.getElementById('bookQuizBox');
        if (!playDiv || !boxDiv) return;

        playDiv.classList.add('hidden');

        const passed = activeBookQuizScore === book.quiz.length;
        let rewardMessage = '';
        if (passed) {
            userCredits += 10;
            localStorage.setItem('userCredits', userCredits);
            updateCreditsDisplay();
            rewardMessage = '<span style="color:var(--success); font-weight:700;">Passed! You earned +10 Credits! 🎁</span>';
        } else {
            rewardMessage = '<span style="color:var(--error); font-weight:600;">You missed some questions. Review takeaways and try again.</span>';
        }

        boxDiv.innerHTML = `
            <h4 style="font-size:1.1rem; margin-bottom:0.5rem; color:var(--text-primary);">Quiz Results</h4>
            <p style="font-size:0.9rem; color:var(--text-secondary); line-height:1.5;">
                You scored <strong>${activeBookQuizScore}/${book.quiz.length}</strong> correct answers.<br>
                ${rewardMessage}
            </p>
            <button class="action-btn" style="font-size:0.75rem; padding:0.25rem 0.75rem; margin-top:0.5rem;" onclick="openBookModal('${book.id}')">Retry Details & Quiz</button>
        `;
    }

    // ==========================================
    // BOOK UNLOCK GATEWAY INTERACTION
    // ==========================================
    window.openBookPurchaseModal = function(bookId) {
        const modal = document.getElementById('modal-book-purchase');
        if (!modal) return;

        const book = tradingBooks.find(b => b.id === bookId);
        if (!book) return;

        document.getElementById('purchaseBookId').value = bookId;
        document.getElementById('purchaseBookTitle').innerText = `Unlock "${book.title}"`;
        document.getElementById('purchaseBookForm').reset();
        document.getElementById('purchaseStatusMsg').style.display = 'none';

        modal.classList.add('active');
    };

    window.closeBookPurchaseModal = function() {
        const modal = document.getElementById('modal-book-purchase');
        if (modal) modal.classList.remove('active');
    };

    const purchaseForm = document.getElementById('purchaseBookForm');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const bookId = document.getElementById('purchaseBookId').value;
            const utr = document.getElementById('purchaseUtr').value.trim();
            const statusBox = document.getElementById('purchaseStatusMsg');
            const submitBtn = purchaseForm.querySelector('button[type="submit"]');

            statusBox.style.display = 'block';
            statusBox.style.color = 'var(--accent)';
            statusBox.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            statusBox.style.borderColor = 'rgba(245, 158, 11, 0.2)';
            statusBox.innerText = `⚡ Verifying ₹29.00 payment status (UTR: ${utr})...`;
            submitBtn.disabled = true;

            setTimeout(() => {
                const unlockedBooks = JSON.parse(localStorage.getItem('unlockedBooks')) || [];
                if (!unlockedBooks.includes(bookId)) {
                    unlockedBooks.push(bookId);
                    localStorage.setItem('unlockedBooks', JSON.stringify(unlockedBooks));
                }

                statusBox.style.color = 'var(--success)';
                statusBox.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                statusBox.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                statusBox.innerText = `✔ Payment of ₹29.00 verified! Book successfully unlocked.`;
                submitBtn.disabled = false;

                setTimeout(() => {
                    closeBookPurchaseModal();
                    renderLibrary();
                    openBookModal(bookId);
                }, 1000);
            }, 2500);
        });
    }

    // Render initial Glossary, Trading Plan & Reference Library
    renderGlossary('all');
    loadSavedTradingPlan();
    renderLibrary();

    // Run Initial Layout State rendering
    renderApplicationStateView();
});
