"""Client module — versión adaptada para Sandra (sin Selenium ni brotli)"""

from os import path as ospath
from re import sub, search
from typing import Optional
from dataclasses import dataclass
from ipaddress import IPv4Address
from json import dumps, loads
from uuid import uuid4
from mimetypes import guess_type
from zlib import decompress as zlib_decompress
from zlib import MAX_WBITS

# Usamos solo requests estándar (evitamos curl_cffi y brotli)
from tzlocal import get_localzone
from requests import post as requests_post, get as requests_get, delete as requests_delete
from .session import SessionData
from .errors import ClaudeAPIError, MessageRateLimitError, OverloadError

@dataclass(frozen=True)
class SendMessageResponse:
    answer: str
    status_code: int
    raw_answer: bytes

@dataclass
class HTTPProxy:
    proxy_ip: str
    proxy_port: int
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    use_ssl: bool = False

    def __post_init__(self):
        port = int(self.proxy_port)
        if not 0 <= port <= 65535:
            raise ValueError(f"Invalid proxy port: {port}")
        self.proxy_port = port
        IPv4Address(self.proxy_ip)

class ClaudeAPIClient:
    __BASE_URL = "https://claude.ai"

    def __init__(
        self,
        session: SessionData,
        model_name: str = None,
        proxy: HTTPProxy = None,
        timeout: float = 240,
    ) -> None:
        self.model_name = model_name
        self.timeout = timeout
        self.proxy = proxy
        self.__session = session
        if not self.__session.cookie or not self.__session.user_agent:
            raise ValueError("Invalid SessionData: cookie and user_agent required")

        if self.__session.organization_id is None:
            self.__session.organization_id = self.__get_organization_id()
        self.timezone = get_localzone().key

    def __get_proxies(self):
        if not self.proxy:
            return None
        auth = ""
        if self.proxy.proxy_username and self.proxy.proxy_password:
            auth = f"{self.proxy.proxy_username}:{self.proxy.proxy_password}@"
        scheme = "https" if self.proxy.use_ssl else "http"
        proxy_url = f"{scheme}://{auth}{self.proxy.proxy_ip}:{self.proxy.proxy_port}"
        return {"http": proxy_url, "https": proxy_url}

    def __get_organization_id(self) -> str:
        url = f"{self.__BASE_URL}/api/organizations"
        headers = {
            "Cookie": self.__session.cookie,
            "User-Agent": self.__session.user_agent,
            "Accept": "application/json",
        }
        response = requests_get(url, headers=headers, proxies=self.__get_proxies(), timeout=self.timeout)
        if response.status_code == 200:
            j = response.json()
            if j and isinstance(j, list) and len(j) > 0 and "uuid" in j[0]:
                return j[0]["uuid"]
        raise RuntimeError(f"Cannot retrieve Organization ID (status {response.status_code})")

    def __prepare_text_file_attachment(self, file_path: str) -> dict:
        file_name = ospath.basename(file_path)
        file_size = ospath.getsize(file_path)
        with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
            file_content = file.read()
        return {
            "extracted_content": file_content,
            "file_name": file_name,
            "file_size": f"{file_size}",
            "file_type": "text/plain",
        }

    def __get_content_type(self, fpath: str):
        mime_type, _ = guess_type(fpath)
        return mime_type or "application/octet-stream"

    def create_chat(self) -> str:
        url = f"{self.__BASE_URL}/api/organizations/{self.__session.organization_id}/chat_conversations"
        new_uuid = str(uuid4())
        payload = dumps({"name": "", "uuid": new_uuid})
        headers = {
            "Cookie": self.__session.cookie,
            "User-Agent": self.__session.user_agent,
            "Content-Type": "application/json",
        }
        response = requests_post(url, headers=headers, data=payload, proxies=self.__get_proxies(), timeout=self.timeout)
        if response.status_code == 201:
            j = response.json()
            return j.get("uuid")
        raise ClaudeAPIError(f"Create chat failed: {response.status_code}")

    def send_message(self, chat_id: str, prompt: str, attachment_paths: list[str] = None) -> SendMessageResponse:
        attachments = []
        if attachment_paths:
            for path in attachment_paths:
                if path.endswith(".txt"):
                    attachments.append(self.__prepare_text_file_attachment(path))
                else:
                    # Soporte básico de archivos binarios omitido por simplicidad (puedo añadirlo luego)
                    pass

        url = f"{self.__BASE_URL}/api/organizations/{self.__session.organization_id}/chat_conversations/{chat_id}/completion"
        payload = {
            "prompt": prompt,
            "timezone": self.timezone,
            "attachments": attachments,
            "files": [],
        }
        if self.model_name:
            payload["model"] = self.model_name

        headers = {
            "Cookie": self.__session.cookie,
            "User-Agent": self.__session.user_agent,
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }

        response = requests_post(url, headers=headers, data=dumps(payload), proxies=self.__get_proxies(), timeout=self.timeout, stream=True)

        full_text = ""
        try:
            for line in response.iter_lines():
                if line:
                    decoded = line.decode("utf-8")
                    if decoded.startswith("data: "):
                        json_str = decoded[6:].strip()
                        if json_str == "[DONE]":
                            break
                        try:
                            data = loads(json_str)
                            if "completion" in data:
                                full_text += data["completion"]
                            elif "error" in data:
                                error = data["error"]
                                if "resets_at" in error:
                                    raise MessageRateLimitError(int(error["resets_at"]))
                                elif error.get("type") == "overloaded_error":
                                    raise OverloadError(error.get("message", "Overloaded"))
                                else:
                                    raise ClaudeAPIError(f"API error: {error}")
                        except Exception:
                            pass
        except Exception as e:
            return SendMessageResponse(None, response.status_code, str(e).encode())

        return SendMessageResponse(full_text.strip(), response.status_code, b"")

    def delete_chat(self, chat_id: str) -> bool:
        url = f"{self.__BASE_URL}/api/organizations/{self.__session.organization_id}/chat_conversations/{chat_id}"
        headers = {
            "Cookie": self.__session.cookie,
            "User-Agent": self.__session.user_agent,
            "Content-Type": "application/json",
        }
        response = requests_delete(url, headers=headers, data=f'"{chat_id}"', proxies=self.__get_proxies(), timeout=self.timeout)
        return response.status_code == 204