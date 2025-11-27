# 🎯 SuperParty Backend - Setup Guide

## 📦 Ce Include:

✅ **Twilio Voice** - Apeluri inbound/outbound + IVR
✅ **WhatsApp Business** - Mesaje interactive cu AI
✅ **Claude AI** - Intent detection automat
✅ **Google Sheets** - Sync cu CREIER AI + SUPERPARTY V2

---

## 🚀 SETUP RAPID (30 min)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Twilio (10 min)

**A) Creează cont:**
- Mergi pe [twilio.com](https://www.twilio.com)
- Sign up → Verify email + phone
- Get trial credits ($15 free)

**B) Cumpără număr românesc:**
- Phone Numbers → Buy a Number
- Country: Romania (+40)
- Capabilities: ✅ Voice, ✅ SMS, ✅ WhatsApp
- Cost: ~$1/lună

**C) Găsește credentials:**
- Dashboard → Account Info
- Copiază: `Account SID` și `Auth Token`

**D) Configure Webhooks:**
```
Voice & Fax:
- Incoming Call: https://your-domain.com/voice/incoming
- Status Callback: https://your-domain.com/voice/status

Messaging:
- WhatsApp Incoming: https://your-domain.com/whatsapp/incoming
- Status Callback: https://your-domain.com/whatsapp/status
```

---

### 3. Setup WhatsApp Business (15 min)

**A) Enable WhatsApp Sandbox (pentru testing):**
- Twilio Console → Messaging → Try it out → Send a WhatsApp message
- Trimite SMS de la telefonul tău cu codul dat
- Status: ✅ Connected

**B) Production (după testing):**
- Request WhatsApp Business Profile
- Meta Business Verification (2-5 zile)
- Submit Message Templates

---

### 4. Setup Claude AI (2 min)

**A) Get API Key:**
- Mergi pe [console.anthropic.com](https://console.anthropic.com)
- Sign up / Login
- Settings → API Keys → Create Key
- Copiază key-ul: `sk-ant-xxx...`

**B) Add credits:**
- Billing → Add credits
- Minim: $5 (ajunge pentru ~500 conversații)

---

### 5. Setup Google Service Account (5 min)

**A) Creează Service Account:**
1. [console.cloud.google.com](https://console.cloud.google.com)
2. Select project (sau creează unul nou)
3. IAM & Admin → Service Accounts → Create Service Account
4. Name: `superparty-backend`
5. Role: `Editor`
6. Create Key → JSON → Download

**B) Enable Google Sheets API:**
1. APIs & Services → Enable APIs
2. Caută: "Google Sheets API"
3. Enable

**C) Share Spreadsheets:**
1. Deschide CREIER AI spreadsheet
2. Share → Add email-ul service account-ului
3. Role: Editor
4. Repeat pentru SUPERPARTY V2

---

### 6. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Completează toate variabilele:

```env
PORT=3000

TWILIO_ACCOUNT_SID=ACxxxxx         # Din Twilio Dashboard
TWILIO_AUTH_TOKEN=xxxxx             # Din Twilio Dashboard
TWILIO_PHONE_NUMBER=+40xxxxxxxxx    # Numărul cumpărat
TWILIO_WHATSAPP_NUMBER=+40xxxxxxxxx # Același număr

REZERVARI_PHONE=+40xxxxxxxxx        # Număr trainer rezervări
INFO_PHONE=+40xxxxxxxxx             # Număr trainer info
AGENT_PHONE=+40xxxxxxxxx            # Număr agent principal

CLAUDE_API_KEY=sk-ant-xxxxx         # Din Anthropic Console

GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}  # Conținut JSON
```

---

### 7. Start Server

```bash
npm start
```

Ar trebui să vezi:
```
🚀 SuperParty Backend running on port 3000
📞 Voice webhook: http://localhost:3000/voice/incoming
💬 WhatsApp webhook: http://localhost:3000/whatsapp/incoming
```

---

## 🧪 TESTING LOCAL

### Test Voice:

1. Instalează [ngrok](https://ngrok.com):
```bash
ngrok http 3000
```

2. Copiază URL-ul public (ex: `https://abc123.ngrok.io`)

3. Twilio Console → Phone Numbers → Your Number → Configure:
```
Voice: https://abc123.ngrok.io/voice/incoming
```

4. Sună numărul Twilio → Ar trebui să auzi IVR-ul!

### Test WhatsApp:

1. Trimite mesaj pe WhatsApp către numărul Twilio
2. Check terminal logs:
```
💬 WhatsApp de la: whatsapp:+40xxx - Bună! Vreau să rezerv
```
3. Ar trebui să primești răspuns automat de la AI!

---

## 🚀 DEPLOY PRODUCTION

### Opțiune A: Vercel (Recomandat - GRATIS)

```bash
npm install -g vercel
vercel login
vercel
```

Setează env variables în Vercel Dashboard.

### Opțiune B: Railway

```bash
npm install -g railway
railway login
railway init
railway up
```

### Opțiune C: Render

1. [render.com](https://render.com) → New Web Service
2. Connect GitHub repo
3. Build: `npm install`
4. Start: `npm start`
5. Add environment variables

---

## 📊 MONITORING

### Check Logs:

**Twilio:**
- Console → Monitor → Logs → Calls
- Console → Monitor → Logs → Messages

**Google Sheets:**
- CREIER AI → CALL_LOGS (toate apelurile)
- CREIER AI → MESSAGES (toate mesajele)
- CREIER AI → AI_RESPONSES (răspunsuri AI)

### Real-time:

```bash
tail -f logs/server.log
```

---

## 🆘 TROUBLESHOOTING

### Eroare: "Twilio credentials invalid"
- Verifică `TWILIO_ACCOUNT_SID` și `TWILIO_AUTH_TOKEN`
- Sunt în format corect? (SID începe cu `AC...`)

### Eroare: "Google Sheets permission denied"
- Ai share-uit spreadsheet-ul cu service account email?
- Service account are rol "Editor"?

### Eroare: "Claude API rate limit"
- Check billing pe console.anthropic.com
- Add credits

### WhatsApp nu primește mesaje:
- Sandbox activat? (trimis SMS de join)
- Webhook configurat corect?
- Check Twilio logs pentru errori

---

## 📞 SUPPORT

Probleme? Contactează-mă:
- Telegram: @your_telegram
- Email: support@superparty.ro

**Happy coding! 🚀**
