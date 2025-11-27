// ═══════════════════════════════════════════════════════════
// 🎯 SUPERPARTY BACKEND - Call Center + WhatsApp
// ═══════════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize services
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// Google Sheets Auth
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const CREIER_AI_ID = '1aq9E-4k8bWtSt3bYqDToU42GpXOJ2QHG6ar1MnKAcIY';
const SUPERPARTY_V2_ID = '1A5cradULQmuoVgfXpYY7VbfH1OluqWqSq4sdP9ACPMM';

// ═══════════════════════════════════════════════════════════
// 📞 TWILIO VOICE ENDPOINTS
// ═══════════════════════════════════════════════════════════

app.post('/voice/incoming', async (req, res) => {
  const { From, To, CallSid } = req.body;
  console.log('📞 Apel de la:', From);
  
  const twiml = new twilio.twiml.VoiceResponse();
  
  // IVR Menu
  const gather = twiml.gather({
    input: 'dtmf',
    numDigits: 1,
    action: '/voice/menu',
    method: 'POST'
  });
  
  gather.say({ voice: 'Polly.Cristiano', language: 'ro-RO' }, 
    'Bună ziua! SuperParty. Apăsați 1 pentru rezervări. Apăsați 2 pentru informații. Apăsați 3 pentru agent.');
  
  // Log to sheets
  await logCallToSheets(From, To, CallSid, 'incoming');
  
  res.type('text/xml').send(twiml.toString());
});

app.post('/voice/menu', async (req, res) => {
  const { Digits, From, CallSid } = req.body;
  const twiml = new twilio.twiml.VoiceResponse();
  
  const options = {
    '1': { msg: 'Vă conectez cu rezervări.', phone: process.env.REZERVARI_PHONE },
    '2': { msg: 'Vă conectez cu informații.', phone: process.env.INFO_PHONE },
    '3': { msg: 'Vă conectez cu un agent.', phone: process.env.AGENT_PHONE }
  };
  
  const choice = options[Digits] || options['3'];
  twiml.say({ voice: 'Polly.Cristiano', language: 'ro-RO' }, choice.msg);
  twiml.dial(choice.phone);
  
  await updateCallStatus(CallSid, `Menu ${Digits}`);
  
  res.type('text/xml').send(twiml.toString());
});

app.post('/voice/status', async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  console.log(`📊 Call ${CallSid}: ${CallStatus}, Duration: ${CallDuration}s`);
  
  await updateCallStatus(CallSid, CallStatus, CallDuration);
  res.sendStatus(200);
});

// ═══════════════════════════════════════════════════════════
// 💬 WHATSAPP ENDPOINTS
// ═══════════════════════════════════════════════════════════

app.post('/whatsapp/incoming', async (req, res) => {
  const { From, Body, MessageSid, ProfileName } = req.body;
  console.log('💬 WhatsApp de la:', From, '-', Body);
  
  try {
    // Save message to MESSAGES sheet
    await saveMessageToSheets(From, Body, MessageSid, 'incoming', ProfileName);
    
    // Get or create conversation
    const conversationId = await getOrCreateConversation(From, ProfileName);
    
    // AI Intent Detection
    const aiResponse = await detectIntent(Body, From);
    
    // Save AI response
    await saveAIResponse(MessageSid, aiResponse);
    
    // Send response back
    const response = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: From,
      body: aiResponse.message
    });
    
    // Save sent message
    await saveMessageToSheets(From, aiResponse.message, response.sid, 'outgoing');
    
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ WhatsApp error:', error);
    res.sendStatus(500);
  }
});

app.post('/whatsapp/status', async (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  console.log(`📊 Message ${MessageSid}: ${MessageStatus}`);
  
  await updateMessageStatus(MessageSid, MessageStatus);
  res.sendStatus(200);
});

// ═══════════════════════════════════════════════════════════
// 🤖 AI INTENT DETECTION
// ═══════════════════════════════════════════════════════════

async function detectIntent(message, phoneNumber) {
  try {
    // Get client history
    const history = await getClientHistory(phoneNumber);
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Ești asistentul SuperParty pentru evenimente copii.

Context client:
${history}

Mesaj nou: "${message}"

Detectează intent-ul și răspunde profesional în română.
Intents posibile: rezervare_noua, intrebare_pret, modificare_rezervare, anulare, info_general.

Răspunde direct, prietenos, și oferă următorii pași.`
      }]
    });
    
    const aiMessage = response.content[0].text;
    const intent = extractIntent(aiMessage);
    const confidence = 0.85;
    
    return {
      message: aiMessage,
      intent: intent,
      confidence: confidence
    };
  } catch (error) {
    console.error('❌ AI Error:', error);
    return {
      message: 'Mulțumesc pentru mesaj! Un coleg vă va răspunde în curând.',
      intent: 'fallback',
      confidence: 0
    };
  }
}

function extractIntent(message) {
  const intents = {
    'rezervare': /rezerv|vreau|programare|petrecere|eveniment/i,
    'pret': /pret|cost|tarif|cat costa/i,
    'modificare': /modific|schimb|mut|reprogramare/i,
    'anulare': /anul|renunt|sterg/i
  };
  
  for (const [intent, regex] of Object.entries(intents)) {
    if (regex.test(message)) return intent;
  }
  
  return 'info_general';
}

// ═══════════════════════════════════════════════════════════
// 📊 GOOGLE SHEETS OPERATIONS
// ═══════════════════════════════════════════════════════════

async function logCallToSheets(from, to, callSid, direction) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: CREIER_AI_ID,
      range: 'CALL_LOGS!A:J',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          generateId(),
          new Date().toISOString(),
          'incoming_call',
          'twilio',
          JSON.stringify({ from, to, callSid }),
          'TRUE',
          '',
          '',
          '',
          ''
        ]]
      }
    });
  } catch (error) {
    console.error('❌ Sheets error:', error);
  }
}

async function updateCallStatus(callSid, status, duration = '') {
  // Implementation for updating call status
  console.log(`✅ Call ${callSid} updated: ${status}`);
}

async function saveMessageToSheets(from, body, messageSid, direction, profileName = '') {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: CREIER_AI_ID,
      range: 'MESSAGES!A:J',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          messageSid,
          '', // conversation ID - set later
          new Date().toISOString(),
          direction,
          'text',
          body,
          '',
          '',
          '',
          ''
        ]]
      }
    });
  } catch (error) {
    console.error('❌ Sheets error:', error);
  }
}

async function getOrCreateConversation(phoneNumber, name) {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: CREIER_AI_ID,
      range: 'CONVERSATII!A:K'
    });
    
    const rows = result.data.values || [];
    const existing = rows.find(row => row[1] === phoneNumber && row[3] === 'active');
    
    if (existing) {
      return existing[0]; // ID_CONVERSATIE
    }
    
    // Create new conversation
    const newId = generateId();
    await sheets.spreadsheets.values.append({
      spreadsheetId: CREIER_AI_ID,
      range: 'CONVERSATII!A:K',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          newId,
          phoneNumber,
          name,
          'active',
          new Date().toISOString(),
          '',
          new Date().toISOString(),
          '',
          '1',
          '',
          ''
        ]]
      }
    });
    
    return newId;
  } catch (error) {
    console.error('❌ Conversation error:', error);
    return generateId();
  }
}

async function saveAIResponse(messageSid, aiResponse) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: CREIER_AI_ID,
      range: 'AI_RESPONSES!A:J',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          generateId(),
          messageSid,
          aiResponse.intent,
          aiResponse.confidence,
          aiResponse.message,
          '',
          new Date().toISOString(),
          'claude-sonnet-4',
          '',
          'TRUE'
        ]]
      }
    });
  } catch (error) {
    console.error('❌ AI Response save error:', error);
  }
}

async function updateMessageStatus(messageSid, status) {
  console.log(`✅ Message ${messageSid}: ${status}`);
}

async function getClientHistory(phoneNumber) {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: CREIER_AI_ID,
      range: 'CLIENTS!A:K'
    });
    
    const rows = result.data.values || [];
    const client = rows.find(row => row[0] === phoneNumber);
    
    if (client) {
      return `Client cunoscut: ${client[1]}, ${client[5]} rezervări anterioare.`;
    }
    
    return 'Client nou.';
  } catch (error) {
    return 'Client nou.';
  }
}

// ═══════════════════════════════════════════════════════════
// 🛠️ UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function generateId() {
  return `ID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════
// 🚀 START SERVER
// ═══════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`🚀 SuperParty Backend running on port ${PORT}`);
  console.log(`📞 Voice webhook: http://localhost:${PORT}/voice/incoming`);
  console.log(`💬 WhatsApp webhook: http://localhost:${PORT}/whatsapp/incoming`);
});
