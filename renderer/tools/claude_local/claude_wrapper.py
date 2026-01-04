#!/usr/bin/env python3
"""
Wrapper listo para usar desde tu app Electron (Node.js → Python)
"""

import sys
import json
import os
from claude_api import ClaudeAPIClient, SessionData

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python claude_wrapper.py <command> [...args]"}))
        return

    cmd = sys.argv[1]
    
    # Asumimos que secrets/claude_cookies.json existe (lo creas 1 vez)
    secrets_path = os.path.join(os.path.dirname(__file__), "secrets", "claude_cookies.json")
    
    if not os.path.exists(secrets_path):
        print(json.dumps({"error": f"Missing {secrets_path}. Create it with cookie + user_agent"}))
        return

    with open(secrets_path, "r", encoding="utf-8") as f:
        secrets = json.load(f)

    session = SessionData(
        cookie=secrets["cookie"],
        user_agent=secrets["user_agent"],
        organization_id=secrets.get("organization_id")
    )
    client = ClaudeAPIClient(session, timeout=120)

    try:
        if cmd == "create_chat":
            chat_id = client.create_chat()
            print(json.dumps({"chat_id": chat_id}))

        elif cmd == "send_message":
            if len(sys.argv) < 4:
                print(json.dumps({"error": "send_message <chat_id> <prompt>"}))
                return
            chat_id = sys.argv[2]
            prompt = sys.argv[3]
            res = client.send_message(chat_id, prompt)
            print(json.dumps({
                "answer": res.answer,
                "status_code": res.status_code,
                "error": None if res.answer else "Check status_code"
            }))

        elif cmd == "delete_chat":
            chat_id = sys.argv[2]
            ok = client.delete_chat(chat_id)
            print(json.dumps({"deleted": ok}))

        else:
            print(json.dumps({"error": f"Unknown command: {cmd}"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()