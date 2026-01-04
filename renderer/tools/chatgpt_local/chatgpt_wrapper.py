#!/usr/bin/env python3
"""
Wrapper ligero para ChatGPT — sin Selenium, solo requests
Requiere cookie de chat.openai.com
"""

import sys
import json
import os
import requests

def get_secrets():
    secrets_path = os.path.join(os.path.dirname(__file__), 'secrets', 'chatgpt_cookies.json')
    if not os.path.exists(secrets_path):
        return None
    with open(secrets_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def send_to_chatgpt(prompt):
    secrets = get_secrets()
    if not secrets:
        return {"error": "Falta chatgpt_cookies.json"}

    headers = {
        "Authorization": f"Bearer {secrets['session_token']}",
        "Content-Type": "application/json",
        "User-Agent": secrets.get("user_agent", "Mozilla/5.0"),
    }

    # Endpoint público (no oficial)
    url = "https://chatgpt.com/backend-api/conversation"
    
    payload = {
        "action": "next",
        "messages": [{
            "id": "123",
            "role": "user",
            "content": {"content_type": "text", "parts": [prompt]}
        }],
        "model": "text-davinci-002-render-sha",
        "parent_message_id": "000"
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        if response.status_code == 200:
            # Parsear stream de eventos
            text = ""
            for line in response.text.splitlines():
                if line.startswith("data: ") and "message" in line:
                    try:
                        data = json.loads(line[6:])
                        if "message" in data and "content" in data["message"]:
                            parts = data["message"]["content"]["parts"]
                            if parts:
                                text = parts[0]
                    except:
                        pass
            return {"success": True, "answer": text, "source": "chatgpt"}
        else:
            return {"error": f"HTTP {response.status_code}: {response.text[:200]}"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: send_message <prompt>"}))
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "send_message":
        prompt = sys.argv[2]
        result = send_to_chatgpt(prompt)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": f"Comando desconocido: {cmd}"}))