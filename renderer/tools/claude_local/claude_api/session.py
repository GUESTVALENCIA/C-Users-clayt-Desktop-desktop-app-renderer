"""Session module"""
from typing import Optional
from dataclasses import dataclass
from json import loads as json_loads

# ⚠️ Reemplazamos selgym (requiere geckodriver) por un método manual seguro
# Este módulo original requiere Selenium + Firefox logueado.
# Para tu app, usaremos método manual (cookies + UA preguardados).
# Por ahora dejamos un stub funcional.

@dataclass
class SessionData:
    """
    This session class is made for `ClaudeAPIClient` constructor.
    """

    cookie: str
    """
    The entire Cookie header string value
    """
    user_agent: str
    """
    Browser User agent
    """

    organization_id: Optional[str] = None
    """
    Claude's account organization ID, will be auto retrieved if None
    """

def get_session_data(profile: str = "", quiet: bool = False, organization_index: int = -1) -> SessionData | None:
    """
    STUB: Original uses Selenium. 
    For Sandra, we will use manual cookie import.
    """
    raise NotImplementedError("Use SessionData(cookie, ua, org_id) manually instead.")