const express = require('express');
const twilio = require('twilio');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'SuperParty Backend Running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /',
      voice: 'POST /voice',
      sms: 'POST /sms'
    }
  });
});

// Voice endpoint for incoming calls
app.post('/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  twiml.say({
    voice: 'Polly.Bianca',
    language: 'ro-RO'
  }, 'Bună! Ați sunat la SuperParty. Vă rugăm să lăsați un mesaj după semnal.');
  
  twiml.record({
    maxLength: 120,
    transcribe: true
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// SMS endpoint for incoming messages
app.post('/sms', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  
  twiml.message('Mulțumim pentru mesaj! Echipa SuperParty vă va răspunde în curând.');
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// WhatsApp endpoint
app.post('/whatsapp', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  
  twiml.message('Salut! SuperParty AI la raport! Cum te putem ajuta?');
  
  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SuperParty Backend running on port ${PORT}`);
  console.log(`✅ Twilio configured`);
  console.log(`📞 Ready to receive calls and messages!`);
});
