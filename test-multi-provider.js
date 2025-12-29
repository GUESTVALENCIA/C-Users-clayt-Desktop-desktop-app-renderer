#!/usr/bin/env node
/**
 * TEST-MULTI-PROVIDER.JS
 * Comprehensive testing for Sandra IA 8.0 Pro Multi-Provider System
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', 'IA-SANDRA', '.env.pro')
});

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  pass: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}\n`)
};

let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;

function test(name, condition, details = '') {
  testsTotal++;
  if (condition) {
    log.pass(name);
    if (details) console.log(`  → ${details}`);
    testsPassed++;
  } else {
    log.fail(name);
    if (details) console.log(`  → ${details}`);
    testsFailed++;
  }
}

// Load MCP Server
let mcpServer;
try {
  mcpServer = require('./mcp-server-unified.js');
  log.pass('MCP Server cargado exitosamente');
} catch (error) {
  log.fail(`Error cargando MCP Server: ${error.message}`);
  process.exit(1);
}

// Main async test runner
async function runAllTests() {
  // ============================================================================
  // TEST 1: API KEY VALIDATION
  // ============================================================================
  log.title('TEST 1: API KEY VALIDATION');

  const apiKeyStatus = {
    groq: process.env.GROQ_API_KEY ? 'DISPONIBLE' : 'FALTA',
    anthropic: process.env.ANTHROPIC_API_KEY ? 'DISPONIBLE' : 'FALTA',
    openai: process.env.OPENAI_API_KEY ? 'DISPONIBLE' : 'FALTA'
  };

  test('Groq API Key', process.env.GROQ_API_KEY, `Estado: ${apiKeyStatus.groq}`);
  test('Anthropic API Key', process.env.ANTHROPIC_API_KEY, `Estado: ${apiKeyStatus.anthropic}`);
  test('OpenAI API Key', process.env.OPENAI_API_KEY, `Estado: ${apiKeyStatus.openai}`);

  // ============================================================================
  // TEST 2: MCP SERVER STRUCTURE
  // ============================================================================
  log.title('TEST 2: MCP SERVER STRUCTURE');

  test('mcpServer exists', mcpServer, 'Object loaded from mcp-server-unified.js');
  test('mcpServer.tools exists', mcpServer.tools !== undefined, 'Tools object initialized');
  test('mcpServer.tools.get_state exists', typeof mcpServer.tools.get_state === 'function', 'get_state tool available');

  // ============================================================================
  // TEST 3: PROVIDER DEFINITIONS
  // ============================================================================
  log.title('TEST 3: PROVIDER DEFINITIONS');

  const requiredProviders = ['groq', 'qwen', 'anthropic', 'openai'];
  let state = null;

  try {
    const getStateResult = await mcpServer.tools.get_state();
    state = getStateResult && getStateResult.state ? getStateResult.state : getStateResult;

    test('State object loaded', state !== null && state !== undefined, 'State initialized');
    test('State has version', state && state.version, `Version: ${state?.version}`);
    test('State has currentProvider', state && state.currentProvider, `Current: ${state?.currentProvider}`);

    requiredProviders.forEach(provider => {
      test(
        `Provider '${provider}' defined`,
        state && state.providers && state.providers[provider],
        `Enabled: ${state?.providers?.[provider]?.enabled}`
      );
    });
  } catch (error) {
    test('STATE LOADING FAILED', false, error.message);
    log.fail('Cannot continue testing without state');
    return;
  }

  // ============================================================================
  // TEST 4: MODEL AVAILABILITY
  // ============================================================================
  log.title('TEST 4: MODEL AVAILABILITY');

  const modelSets = {
    groq: mcpServer.GROQ_MODELS,
    qwen: mcpServer.QWEN_MODELS,
    anthropic: mcpServer.ANTHROPIC_MODELS,
    openai: mcpServer.OPENAI_MODELS
  };

  const expectedModelCounts = {
    groq: 4,
    qwen: 33,
    anthropic: 6,
    openai: 5
  };

  Object.entries(expectedModelCounts).forEach(([provider, expectedCount]) => {
    const models = modelSets[provider];
    const actualCount = Object.keys(models).length;
    test(
      `${provider.toUpperCase()} models`,
      actualCount === expectedCount,
      `Expected: ${expectedCount}, Actual: ${actualCount}`
    );
  });

  // ============================================================================
  // TEST 5: MODEL PROPERTIES
  // ============================================================================
  log.title('TEST 5: MODEL PROPERTIES');

  const testModelPaths = [
    ['groq', 'llama-3.1-70b-versatile'],
    ['qwen', 'qwen-plus-latest'],
    ['anthropic', 'claude-sonnet-4'],
    ['openai', 'gpt-4o']
  ];

  testModelPaths.forEach(([provider, modelName]) => {
    const model = modelSets[provider][modelName];
    test(
      `${provider}/${modelName} tiene 'context'`,
      model && model.context > 0,
      `Context: ${model?.context}K tokens`
    );
    test(
      `${provider}/${modelName} tiene 'priority'`,
      model && model.priority !== undefined,
      `Priority: ${model?.priority}`
    );
  });

  // ============================================================================
  // TEST 6: PROVIDER STATE STRUCTURE
  // ============================================================================
  log.title('TEST 6: PROVIDER STATE STRUCTURE');

  requiredProviders.forEach(provider => {
    const providerState = state.providers[provider];
    test(
      `${provider} has currentModel`,
      providerState.currentModel && typeof providerState.currentModel === 'string',
      `Current: ${providerState.currentModel}`
    );
    test(
      `${provider} has tokensUsed`,
      typeof providerState.tokensUsed === 'number',
      `Tokens: ${providerState.tokensUsed}`
    );
    test(
      `${provider} has autoMode`,
      typeof providerState.autoMode === 'boolean',
      `AutoMode: ${providerState.autoMode}`
    );
    test(
      `${provider} has auth`,
      providerState.auth !== undefined,
      `Auth type: ${providerState.auth.type}`
    );
  });

  // ============================================================================
  // TEST 7: STATE PERSISTENCE
  // ============================================================================
  log.title('TEST 7: STATE PERSISTENCE');

  try {
    const testState = { ...state, test: true };
    const stateJson = JSON.stringify(testState, null, 2);
    test('State serializable to JSON', stateJson.length > 0, `JSON size: ${stateJson.length} bytes`);
    test('State JSON valid', JSON.parse(stateJson) !== null, 'Parsed successfully');
  } catch (error) {
    test('State serializable to JSON', false, error.message);
  }

  // ============================================================================
  // TEST 8: TOOLS FUNCTIONALITY - GET STATE
  // ============================================================================
  log.title('TEST 8: GET STATE TOOL');

  try {
    const stateResult = await mcpServer.tools.get_state();
    test('get_state() returns success', stateResult && stateResult.success === true, 'Success flag set');
    test('get_state() returns state', stateResult && stateResult.state !== undefined, 'State object returned');
  } catch (error) {
    test('get_state() works', false, error.message);
  }

  // ============================================================================
  // TEST 9: PRINT SUMMARY
  // ============================================================================
  log.title('TEST SUMMARY');

  const percentage = testsPassed > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;
  console.log(`${colors.bold}Total Tests: ${testsTotal}${colors.reset}`);
  console.log(`${colors.green}${colors.bold}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}${colors.bold}Failed: ${testsFailed}${colors.reset}`);
  console.log(`${colors.bold}Success Rate: ${percentage}%${colors.reset}\n`);

  if (testsFailed === 0) {
    log.pass('TODOS LOS TESTS PASARON ✨');
    process.exit(0);
  } else {
    log.fail(`${testsFailed} test(s) fallaron`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log.fail(`ERROR CRÍTICO: ${error.message}`);
  process.exit(1);
});
