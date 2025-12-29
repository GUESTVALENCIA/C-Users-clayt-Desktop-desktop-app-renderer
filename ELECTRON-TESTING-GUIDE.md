# Sandra IA 8.0 Pro - Electron Testing Guide

## ✅ Status: Chat Service Integration COMPLETE

The chat service has been integrated with Electron via IPC. The app is now ready for full testing.

---

## 🧪 Test Cases

### TEST 1: Sandra IA - Chat with Anthropic (Claude)
**Status**: Ready to test

1. App window opens with Sandra IA tab active ✓
2. Click on a role (e.g., "🎯 Business Strategist")
3. Type message: "¿Cuál es tu nombre?"
4. Click "Enviar" button
5. **Expected Result**: Message appears in chat + Claude response from Anthropic API

**What should happen**:
- User message shows on right (blue background)
- Bot response shows on left (dark background with blue border)
- Response text should be actual Claude response (not placeholder)
- Response time: ~5-10 seconds

---

### TEST 2: Switch Roles in Sandra IA
**Status**: Ready to test

1. Select "💻 Tech Lead" role
2. Type: "Dame 3 tips para optimizar código"
3. Click Enviar
4. **Expected Result**: Response from Claude as Tech Lead

---

### TEST 3: External Platforms (QWEN, Claude, GPT)
**Status**: Partially Ready

- QWEN Tab: (deshabilitado; sin acceso a URL externa)
- Claude Tab: Button opens https://claude.ai/ in browser ✓
- GPT Tab: Button opens https://chatgpt.com/ in browser ✓

**Note**: User mentioned QWEN requires Opera browser for best compatibility

---

## 📊 API Key Status

| Provider | Status | Notes |
|----------|--------|-------|
| Anthropic (Claude) | ✅ WORKING | Confirmed in testing - responds perfectly |
| Groq | ⚠️ INVALID | API key needs to be updated in `.env.pro` |
| OpenAI | ⚠️ INVALID | API key needs to be updated or may be expired |
| QWEN | ❌ NOT SET | Requires OAuth through Opera browser |

---

## 🔧 Testing Checklist

### Basic Functionality
- [ ] App starts without errors
- [ ] Sandra IA tab loads with role selector sidebar
- [ ] All 18 roles are visible and clickable
- [ ] Chat input field accepts text
- [ ] Send button triggers message sending
- [ ] Messages appear in chat area

### Chat Integration
- [ ] User message appears on right side (blue)
- [ ] Bot response appears on left side (dark with blue border)
- [ ] Response text is actual API response (not placeholder)
- [ ] No errors in Developer Console (F12)

### Role Selection
- [ ] Selected role shows active state (blue background)
- [ ] Message indicates which role was selected
- [ ] Different roles can be selected sequentially

### Error Handling
- [ ] If API fails, error message appears in chat
- [ ] Console shows descriptive error messages
- [ ] App doesn't crash on API errors

### Tab Navigation
- [ ] QWEN tab shows platform card with buttons
- [ ] Claude tab shows platform card with buttons
- [ ] GPT tab shows platform card with buttons
- [ ] Clicking buttons opens URLs in external browser

---

## 🚀 Manual Testing Steps

1. **Start the app**:
   ```bash
   cd C:\Users\clayt\Desktop\desktop-app
   npm start
   ```

2. **Open Developer Tools** (F12) to see logs

3. **Test Sandra IA Chat**:
   - Select a role
   - Type a message
   - Send it
   - Watch the response arrive

4. **Check logs** in Developer Tools Console:
   - Should see IPC invoke: `chatSend('groq', msg, role)`
   - Should see response data
   - No red errors (only warnings are OK)

5. **Test External Platforms**:
   - Click buttons in QWEN/Claude/GPT tabs
   - Verify URLs open in browser

---

## 📝 Known Issues & Fixes

### Issue 1: Groq API Key Invalid
**Solution**: Update `GROQ_API_KEY` in `.env.pro`

### Issue 2: OpenAI API Key Invalid
**Solution**: Update `OPENAI_API_KEY` in `.env.pro` (obtain from https://platform.openai.com/api-keys)

### Issue 3: QWEN OAuth
**Solution**: User must authenticate through Opera browser in the app

### Issue 4: No Chat Response
**Solution**:
1. Check F12 Console for errors
2. Verify API keys are set in `.env.pro`
3. Verify network connectivity
4. Check that `chat-service.js` is loaded correctly

---

## 🎯 Success Criteria

✅ **COMPLETE SUCCESS**:
- Sandra IA chat works with all 18 roles
- Claude/Anthropic responds to all messages
- No errors in console
- External platform buttons work

✅ **PARTIAL SUCCESS**:
- Chat works with at least 1 role
- Responses appear in chat area
- External platforms accessible

❌ **FAILURE**:
- No chat responses
- Errors prevent usage
- Buttons don't work

---

## 📞 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              ELECTRON WINDOW                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  UI Layer (index.html)                          │
│  └─ sendMessage() → IPC invoke 'chat:send'     │
│                                                  │
│  ↓ IPC Bridge (preload.js)                      │
│  └─ window.sandraAPI.chatSend()                │
│                                                  │
│  ↓ Main Process (main.js)                       │
│  └─ ipcMain.handle('chat:send')                │
│     └─ chatService.sendMessage()               │
│                                                  │
│  ↓ Chat Service (chat-service.js)              │
│  ├─ callGroq() → Groq API                      │
│  ├─ callAnthropic() → Anthropic API ✅         │
│  ├─ callOpenAI() → OpenAI API                  │
│  └─ callQWEN() → QWEN API                      │
│                                                  │
│  ↓ Response back to UI                         │
│  └─ Display in chat area                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Security Notes

- API Keys are stored in `.env.pro` locally (NOT in code)
- API calls are made from the main process (secure)
- Renderer process communicates via IPC (sandboxed)
- No API keys are exposed to the frontend

---

**Last Updated**: 2025-12-25
**Version**: 8.0.0
**Status**: 🟢 READY FOR TESTING
