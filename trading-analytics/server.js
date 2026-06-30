const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API to register users and save directly to credentials.json on disk
app.post('/api/register', (req, res) => {
    const newCredentials = req.body;
    const credPath = path.join(__dirname, 'credentials.json');

    fs.readFile(credPath, 'utf8', (err, data) => {
        let credDb = { default_accounts: [], registered_users: [] };
        if (!err && data) {
            try {
                credDb = JSON.parse(data);
            } catch (e) {
                console.error("Error parsing credentials.json database:", e);
            }
        }

        // Ensure array structures
        if (!credDb.registered_users) credDb.registered_users = [];
        if (!credDb.default_accounts) credDb.default_accounts = [];

        // Check if user already exists
        const exists = credDb.registered_users.some(u => u.identifier === newCredentials.username) || 
                       credDb.default_accounts.some(u => u.identifier === newCredentials.username);
        
        if (exists) {
            return res.status(400).json({ success: false, error: "Username already registered." });
        }

        // Append new account
        credDb.registered_users.push({
            identifier: newCredentials.username,
            password: newCredentials.password,
            name: newCredentials.name,
            timestamp: newCredentials.timestamp
        });

        // Write database back to file
        fs.writeFile(credPath, JSON.stringify(credDb, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error("Failed to write to credentials.json:", writeErr);
                return res.status(500).json({ success: false, error: "Disk write error." });
            }
            console.log(`Successfully registered user: ${newCredentials.username} directly to disk.`);
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Yogesh Analytics server running locally on http://localhost:${PORT}`);
});
