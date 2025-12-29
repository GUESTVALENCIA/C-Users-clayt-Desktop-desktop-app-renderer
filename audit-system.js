// ============================================================================
// AUDIT SYSTEM - Logging de propuestas, reviews y decisiones
// ============================================================================
// Sistema de auditoría con autenticación de usuarios

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AuditSystem {
  constructor(options = {}) {
    this.auditDir = options.auditDir || path.join(__dirname, '.audit');
    this.maxLogSize = options.maxLogSize || 10485760; // 10MB
    this.currentUser = null;
    this.sessionToken = null;
    this.users = new Map();
    this.sessions = new Map();

    // Crear directorio de auditoría si no existe
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }

    this._loadUsers();
    console.log(`[Audit] ✅ Sistema inicializado en ${this.auditDir}`);
  }

  /**
   * Cargar usuarios desde archivo
   */
  _loadUsers() {
    const usersFile = path.join(this.auditDir, 'users.json');
    if (fs.existsSync(usersFile)) {
      try {
        const data = fs.readFileSync(usersFile, 'utf8');
        const users = JSON.parse(data);
        for (const user of users) {
          this.users.set(user.username, user);
        }
        console.log(`[Audit] 👥 Cargados ${users.length} usuarios`);
      } catch (error) {
        console.error('[Audit] Error cargando usuarios:', error.message);
      }
    }
  }

  /**
   * Registrar nuevo usuario
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña (será hasheada)
   * @param {string} role - Rol (admin, auditor, user)
   */
  registerUser(username, password, role = 'user') {
    if (this.users.has(username)) {
      return { success: false, error: 'Usuario ya existe' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Contraseña debe tener mínimo 8 caracteres' };
    }

    const passwordHash = this._hashPassword(password);
    const userId = crypto.randomUUID();

    const user = {
      userId,
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0
    };

    this.users.set(username, user);
    this._saveUsers();

    console.log(`[Audit] 👤 Usuario registrado: ${username} (${role})`);
    return { success: true, userId };
  }

  /**
   * Autenticar usuario
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   */
  login(username, password) {
    const user = this.users.get(username);

    if (!user) {
      console.warn(`[Audit] ❌ Intento fallido de login: usuario no existe (${username})`);
      return { success: false, error: 'Usuario o contraseña incorrecto' };
    }

    if (!this._verifyPassword(password, user.passwordHash)) {
      console.warn(`[Audit] ❌ Intento fallido de login: contraseña incorrecta (${username})`);
      return { success: false, error: 'Usuario o contraseña incorrecto' };
    }

    // Generar token de sesión
    const token = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      userId: user.userId,
      username,
      role: user.role,
      token,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 12 * 3600000).toISOString() // 12 horas
    };

    this.sessions.set(token, sessionData);
    this.currentUser = username;
    this.sessionToken = token;

    // Actualizar usuario
    user.lastLogin = new Date().toISOString();
    user.loginCount++;
    this._saveUsers();

    console.log(`[Audit] ✅ Login exitoso: ${username}`);
    return {
      success: true,
      token,
      user: { username, role: user.role, userId: user.userId }
    };
  }

  /**
   * Verificar sesión válida
   */
  verifySession(token) {
    const session = this.sessions.get(token);

    if (!session) {
      return { valid: false, error: 'Sesión no encontrada' };
    }

    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(token);
      return { valid: false, error: 'Sesión expirada' };
    }

    return { valid: true, session };
  }

  /**
   * Logout
   */
  logout(token) {
    if (this.sessions.has(token)) {
      const session = this.sessions.get(token);
      this.sessions.delete(token);
      console.log(`[Audit] 👋 Logout: ${session.username}`);
      this.currentUser = null;
      this.sessionToken = null;
      return { success: true };
    }
    return { success: false, error: 'Sesión no válida' };
  }

  /**
   * Registrar propuesta en auditoría
   */
  logProposal(token, proposal) {
    const session = this.verifySession(token);
    if (!session.valid) {
      return { success: false, error: 'No autorizado' };
    }

    const logEntry = {
      type: 'PROPOSAL',
      timestamp: new Date().toISOString(),
      user: session.session.username,
      userId: session.session.userId,
      proposal: {
        id: proposal.id || crypto.randomUUID(),
        title: proposal.title,
        description: proposal.description,
        project: proposal.project,
        models: proposal.models || []
      }
    };

    this._writeLog(logEntry);
    return { success: true, proposalId: logEntry.proposal.id };
  }

  /**
   * Registrar review en auditoría
   */
  logReview(token, review) {
    const session = this.verifySession(token);
    if (!session.valid) {
      return { success: false, error: 'No autorizado' };
    }

    const logEntry = {
      type: 'REVIEW',
      timestamp: new Date().toISOString(),
      user: session.session.username,
      userId: session.session.userId,
      review: {
        proposalId: review.proposalId,
        rating: review.rating,
        feedback: review.feedback,
        approved: review.approved
      }
    };

    this._writeLog(logEntry);
    return { success: true };
  }

  /**
   * Registrar decisión de implementación
   */
  logImplementation(token, implementation) {
    const session = this.verifySession(token);
    if (!session.valid) {
      return { success: false, error: 'No autorizado' };
    }

    const logEntry = {
      type: 'IMPLEMENTATION',
      timestamp: new Date().toISOString(),
      user: session.session.username,
      userId: session.session.userId,
      implementation: {
        proposalId: implementation.proposalId,
        status: implementation.status,
        changes: implementation.changes,
        duration: implementation.duration
      }
    };

    this._writeLog(logEntry);
    return { success: true };
  }

  /**
   * Obtener historial de auditoría
   */
  getAuditLog(token, options = {}) {
    const session = this.verifySession(token);
    if (!session.valid) {
      return { success: false, error: 'No autorizado' };
    }

    // Solo admins pueden ver logs completos
    if (session.session.role !== 'admin') {
      return {
        success: false,
        error: 'Solo administradores pueden acceder a auditoría completa'
      };
    }

    const logFile = path.join(this.auditDir, 'audit.log');
    if (!fs.existsSync(logFile)) {
      return { success: true, logs: [] };
    }

    try {
      const content = fs.readFileSync(logFile, 'utf8');
      let logs = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Filtrar por tipo si se especifica
      if (options.type) {
        logs = logs.filter(l => l.type === options.type);
      }

      // Filtrar por usuario si se especifica
      if (options.user) {
        logs = logs.filter(l => l.user === options.user);
      }

      // Límite de resultados
      if (options.limit) {
        logs = logs.slice(-options.limit);
      }

      return { success: true, logs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Escribir entrada en log de auditoría
   */
  _writeLog(entry) {
    const logFile = path.join(this.auditDir, 'audit.log');
    try {
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
      console.log(`[Audit] 📝 Registrado: ${entry.type} por ${entry.user}`);
    } catch (error) {
      console.error('[Audit] Error escribiendo log:', error.message);
    }
  }

  /**
   * Hash de contraseña (simple, en producción usar bcrypt)
   */
  _hashPassword(password) {
    return crypto
      .pbkdf2Sync(password, 'audit-salt', 1000, 64, 'sha512')
      .toString('hex');
  }

  /**
   * Verificar contraseña
   */
  _verifyPassword(password, hash) {
    return this._hashPassword(password) === hash;
  }

  /**
   * Guardar usuarios
   */
  _saveUsers() {
    const usersFile = path.join(this.auditDir, 'users.json');
    const users = Array.from(this.users.values());
    try {
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('[Audit] Error guardando usuarios:', error.message);
    }
  }
}

module.exports = { AuditSystem };
