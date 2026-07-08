# DiskSense AI — Backend Setup Guide

## Quick Start

```bash
# 1. Install dependencies (already done if you ran pip install)
pip install flask authlib flask-login flask-sqlalchemy python-dotenv

# 2. Set up your OAuth credentials (see below)
# Edit .env with your actual keys

# 3. Run the Flask backend
python server.py

# 4. Open the app
# http://localhost:5000
```

---

## Step 1 — Google OAuth (5 minutes)

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a Project** → **New Project** → name it "DiskSense AI" → **Create**
3. In the left menu go to **APIs & Services → Credentials**
4. Click **+ CREATE CREDENTIALS → OAuth 2.0 Client IDs**
5. If prompted, configure the **OAuth consent screen** first:
   - User Type: **External**
   - App name: `DiskSense AI`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through all steps
6. Back in Credentials → **+ CREATE CREDENTIALS → OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Name: `DiskSense AI Local`
   - Authorized redirect URIs → **Add URI**:
     ```
     http://localhost:5000/auth/google/callback
     ```
   - Click **Create**
7. Copy the **Client ID** and **Client Secret** into `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   ```

---

## Step 2 — GitHub OAuth (2 minutes)

1. Go to [https://github.com/settings/developers](https://github.com/settings/developers)
2. Click **OAuth Apps → New OAuth App**
3. Fill in:
   - **Application name**: `DiskSense AI`
   - **Homepage URL**: `http://localhost:5000`
   - **Authorization callback URL**: `http://localhost:5000/auth/github/callback`
4. Click **Register application**
5. On the next page, click **Generate a new client secret**
6. Copy both values into `.env`:
   ```
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

---

## Step 3 — Generate a Secret Key

Run this in Python to generate a secure secret key:
```python
import secrets
print(secrets.token_hex(32))
```
Paste the output as `SECRET_KEY` in `.env`.

---

## Your .env file should look like:

```env
SECRET_KEY=abc123def456...
GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GITHUB_CLIENT_ID=Iv1.abcdef...
GITHUB_CLIENT_SECRET=abcdef123...
FLASK_ENV=development
DATABASE_URL=sqlite:///disksense.db
```

---

## Running the App

```bash
python server.py
```

Expected output:
```
══════════════════════════════════════════════════════════
  🚀  DiskSense AI — Backend Server
  📡  http://localhost:5000
  🔐  Google + GitHub OAuth enabled
  🗄️   SQLite database: disksense.db
══════════════════════════════════════════════════════════
```

Open **http://localhost:5000** in your browser. You'll be redirected to the login page.

---

## API Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /` | ✅ Required | Main app |
| `GET /login` | ❌ Public | Login page |
| `GET /auth/google` | ❌ Public | Start Google OAuth |
| `GET /auth/github` | ❌ Public | Start GitHub OAuth |
| `GET /auth/logout` | ❌ Public | Clear session |
| `GET /api/me` | ✅ Required | Current user JSON |
| `GET /api/users` | ✅ Required | All users JSON |
| `GET /api/stats` | ✅ Required | App statistics |
| `GET /api/users/<id>/events` | ✅ Required | Login history |

---

## Database

The SQLite database `disksense.db` is auto-created on first run.

To inspect it:
```bash
# Using sqlite3 CLI
sqlite3 disksense.db ".headers on" ".mode column" "SELECT * FROM users;"
```

Or use a GUI tool like [DB Browser for SQLite](https://sqlitebrowser.org/).

---

## Troubleshooting

**"redirect_uri_mismatch" (Google)**
→ Make sure your redirect URI in Google Console is **exactly**:
`http://localhost:5000/auth/google/callback`

**"Bad credentials" (GitHub)**
→ Regenerate the client secret on GitHub and update `.env`

**"Session cookie missing"**
→ Ensure `SECRET_KEY` is set in `.env` and is consistent across restarts

**App shows blank after login**
→ Check the browser console for JS errors; ensure `app_v2.js` loads correctly
