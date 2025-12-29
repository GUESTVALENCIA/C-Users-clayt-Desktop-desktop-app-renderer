#!/usr/bin/env python3
"""
Test script to verify Python installation and psycopg2
"""
import sys
import os

print("Python version:", sys.version)
print("Python executable:", sys.executable)
print("Python path:", sys.path)

# Test basic imports
try:
    import json
    print("✅ json importado correctamente")
except ImportError as e:
    print("❌ Error importando json:", e)

try:
    import os
    print("✅ os importado correctamente")
except ImportError as e:
    print("❌ Error importando os:", e)

try:
    from http.server import HTTPServer, BaseHTTPRequestHandler
    print("✅ http.server importado correctamente")
except ImportError as e:
    print("❌ Error importando http.server:", e)

# Test psycopg2
try:
    import psycopg2
    print("✅ psycopg2 importado correctamente")
    print("Versión de psycopg2:", psycopg2.__version__)
except ImportError as e:
    print("❌ Error importando psycopg2:", e)
    print("Para instalar psycopg2, ejecuta:")
    print("pip install psycopg2-binary")

print("\nTest completado")