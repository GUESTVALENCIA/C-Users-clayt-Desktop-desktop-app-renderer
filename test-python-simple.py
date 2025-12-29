#!/usr/bin/env python3
"""
Test script to verify Python installation and psycopg2 (simple version)
"""
import sys
import os

print("Python version:", sys.version)
print("Python executable:", sys.executable)

# Test basic imports
try:
    import json
    print("[OK] json importado correctamente")
except ImportError as e:
    print("[ERROR] Error importando json:", e)

try:
    import os
    print("[OK] os importado correctamente")
except ImportError as e:
    print("[ERROR] Error importando os:", e)

try:
    from http.server import HTTPServer, BaseHTTPRequestHandler
    print("[OK] http.server importado correctamente")
except ImportError as e:
    print("[ERROR] Error importando http.server:", e)

# Test psycopg2
try:
    import psycopg2
    print("[OK] psycopg2 importado correctamente")
    print("Version de psycopg2:", psycopg2.__version__)
except ImportError as e:
    print("[ERROR] Error importando psycopg2:", e)
    print("Para instalar psycopg2, ejecuta:")
    print("pip install psycopg2-binary")

print("")
print("Test completado")