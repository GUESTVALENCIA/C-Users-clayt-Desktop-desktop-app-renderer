require('dotenv').config();
const { sendMessage } = require('./chat-service');

async function testConnections() {
    console.log('=== STARTING CONNECTION TEST ===');

    const apiKeys = {
        groq: process.env.GROQ_API_KEY,
        openai: process.env.OPENAI_API_KEY, // Assuming this is set in .env
        // Render API Key is not used by chat-service directly but user asked to add it.
    };

    if (!apiKeys.groq) console.warn('⚠️ GROQ_API_KEY missing in .env');
    if (!apiKeys.openai) console.warn('⚠️ OPENAI_API_KEY missing in .env');

    // Test Groq
    console.log('\n--- Testing Groq ---');
    const groqRes = await sendMessage('groq', 'Say "Groq is working" in Spanish', 'user', apiKeys);
    if (groqRes.success) {
        console.log('✅ GROQ SUCCESS:', groqRes.response);
    } else {
        console.error('❌ GROQ FAILED:', groqRes.error);
    }

    // Test OpenAI
    console.log('\n--- Testing OpenAI ---');
    const openaiRes = await sendMessage('openai', 'Say "OpenAI is working" in Spanish', 'user', apiKeys);
    if (openaiRes.success) {
        console.log('✅ OPENAI SUCCESS:', openaiRes.response);
    } else {
        console.error('❌ OPENAI FAILED:', openaiRes.error);
    }

    console.log('\n=== TEST COMPLETE ===');
}

testConnections();
