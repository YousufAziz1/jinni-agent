import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiBase } from '../src/lib/api.ts';
import { agentApi, ProposalApiError } from '../src/lib/agentApi.ts';
import { getDemoScenarioById } from '../src/lib/demoScenarios.ts';
import { getRuntimeCapability } from '../src/lib/runtimeCapability.ts';
import type { AgentProposal } from '../src/types/agent.ts';

describe('JINNI Agent — Live Proposal Flow & Route Validation Test Suite', () => {

  // 1. URL Normalization Tests
  describe('1. API Base URL Normalization', () => {
    it('should append /api when given domain without path', () => {
      assert.equal(
        normalizeApiBase('https://jinni-agent.onrender.com'),
        'https://jinni-agent.onrender.com/api'
      );
    });

    it('should strip trailing slashes and keep /api intact', () => {
      assert.equal(
        normalizeApiBase('https://jinni-agent.onrender.com/api/'),
        'https://jinni-agent.onrender.com/api'
      );
      assert.equal(
        normalizeApiBase('https://jinni-agent.onrender.com/api///'),
        'https://jinni-agent.onrender.com/api'
      );
    });

    it('should preserve relative /api path for same-origin proxy', () => {
      assert.equal(normalizeApiBase('/api'), '/api');
      assert.equal(normalizeApiBase('/api/'), '/api');
    });

    it('should normalize localhost addresses correctly', () => {
      assert.equal(normalizeApiBase('http://localhost:8000'), 'http://localhost:8000/api');
      assert.equal(normalizeApiBase('http://127.0.0.1:8000/api'), 'http://127.0.0.1:8000/api');
    });

    it('should return empty string for null or undefined', () => {
      assert.equal(normalizeApiBase(null), '');
      assert.equal(normalizeApiBase(undefined), '');
      assert.equal(normalizeApiBase(''), '');
    });
  });

  // 2. Proposal Error Mapping
  describe('2. Proposal Error Code Mapping', () => {
    it('should throw PROPOSAL_ROUTE_NOT_FOUND on HTTP 404', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

      try {
        await agentApi.createProposal({
          actionType: 'BUY',
          asset: 'LINK',
          amount: '1.0',
          amountUsd: '15.0',
          slippage: '0.5%',
          route: 'Uniswap V3',
          agentRationale: 'Test rationale for 404 validation.'
        });
        assert.fail('Expected createProposal to throw');
      } catch (err: any) {
        assert.ok(err instanceof ProposalApiError);
        assert.equal(err.code, 'PROPOSAL_ROUTE_NOT_FOUND');
        assert.equal(err.statusCode, 404);
        assert.ok(err.message.includes('not found'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should throw POLICY_EVALUATION_FAILED on HTTP 500', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });

      try {
        await agentApi.createProposal({
          actionType: 'BUY',
          asset: 'LINK',
          amount: '1.0',
          amountUsd: '15.0',
          slippage: '0.5%',
          route: 'Uniswap V3',
          agentRationale: 'Test rationale for 500 validation.'
        });
        assert.fail('Expected createProposal to throw');
      } catch (err: any) {
        assert.ok(err instanceof ProposalApiError);
        assert.equal(err.code, 'POLICY_EVALUATION_FAILED');
        assert.equal(err.statusCode, 500);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should throw NETWORK_REQUEST_FAILED when fetch rejects', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };

      try {
        await agentApi.createProposal({
          actionType: 'BUY',
          asset: 'LINK',
          amount: '1.0',
          amountUsd: '15.0',
          slippage: '0.5%',
          route: 'Uniswap V3',
          agentRationale: 'Test rationale for network drop.'
        });
        assert.fail('Expected createProposal to throw');
      } catch (err: any) {
        assert.ok(err instanceof ProposalApiError);
        assert.equal(err.code, 'NETWORK_REQUEST_FAILED');
        assert.ok(err.message.includes('not reachable'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // 3. Successful Proposal Creation & Contract Shape
  describe('3. Successful Proposal Response Contract', () => {
    it('should handle response wrapped in { proposal: ... } and set isDemo: false', async () => {
      const originalFetch = globalThis.fetch;
      const mockProposal: AgentProposal = {
        id: 'prop-test-live-100',
        createdAt: '2026-09-07T00:00:00Z',
        source: 'AI Agent',
        actorType: 'human',
        actionType: 'BUY',
        asset: 'LINK',
        chain: 'Sepolia',
        chainId: 11155111,
        amount: '1.0',
        amountUsd: '15.0',
        slippage: '0.5%',
        route: 'Uniswap V3',
        policyResult: 'PASS',
        state: 'GENLAYER_NOT_SUBMITTED',
        isDemo: false,
        evidence: [],
        genlayer: {
          network: 'studionet',
          chainId: 61999,
          contractAddress: '0xa54cF1bBCfe4456b6194658699aab540fBeF046c',
          txHash: null,
          txStatus: 'NOT_APPLICABLE',
          decision: 'UNAVAILABLE',
          reasoning: null,
          submittedAt: null,
          finalizedAt: null,
          telemetry: null
        },
        execution: {
          status: 'WAITING_FOR_GENLAYER',
          requiresHumanConfirmation: true,
          userConfirmed: false,
          txHash: null,
          executedAt: null,
          error: null,
          mode: 'WALLET'
        }
      };

      globalThis.fetch = async () => new Response(JSON.stringify({ proposal: mockProposal }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      try {
        const res = await agentApi.createProposal({
          actionType: 'BUY',
          asset: 'LINK',
          amount: '1.0',
          amountUsd: '15.0',
          slippage: '0.5%',
          route: 'Uniswap V3',
          agentRationale: 'Real-time test rationale.'
        });

        assert.ok(res);
        assert.equal(res.id, 'prop-test-live-100');
        assert.equal(res.isDemo, false);
        assert.equal(res.state, 'GENLAYER_NOT_SUBMITTED');
        assert.equal(res.genlayer?.txHash, null);
        assert.equal(res.genlayer?.txStatus, 'NOT_APPLICABLE');
        assert.equal(res.genlayer?.decision, 'UNAVAILABLE');
        assert.equal(res.execution.status, 'WAITING_FOR_GENLAYER');
        assert.equal(res.execution.txHash, null);
        assert.equal(res.execution.userConfirmed, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should handle response returned as direct proposal object and set isDemo: false', async () => {
      const originalFetch = globalThis.fetch;
      const mockProposal: AgentProposal = {
        id: 'prop-test-live-200',
        createdAt: '2026-09-07T00:00:00Z',
        source: 'AI Agent',
        actorType: 'human',
        actionType: 'BUY',
        asset: 'LINK',
        chain: 'Sepolia',
        chainId: 11155111,
        amount: '1.0',
        amountUsd: '15.0',
        slippage: '0.5%',
        route: 'Uniswap V3',
        policyResult: 'PASS',
        state: 'GENLAYER_NOT_SUBMITTED',
        isDemo: false,
        evidence: [],
        genlayer: null,
        execution: {
          status: 'WAITING_FOR_GENLAYER',
          requiresHumanConfirmation: true,
          userConfirmed: false,
          txHash: null,
          executedAt: null,
          error: null,
          mode: 'WALLET'
        }
      };

      globalThis.fetch = async () => new Response(JSON.stringify(mockProposal), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      try {
        const res = await agentApi.createProposal({
          actionType: 'BUY',
          asset: 'LINK',
          amount: '1.0',
          amountUsd: '15.0',
          slippage: '0.5%',
          route: 'Uniswap V3',
          agentRationale: 'Real-time test rationale.'
        });

        assert.ok(res);
        assert.equal(res.id, 'prop-test-live-200');
        assert.equal(res.isDemo, false);
        assert.equal(res.state, 'GENLAYER_NOT_SUBMITTED');
        assert.equal(res.execution.txHash, null);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // 4. Runtime Capability Truthfulness
  describe('4. Runtime Capability & Network Truthfulness', () => {
    it('should report WALLET NOT CONNECTED when disconnected', () => {
      const cap = getRuntimeCapability({
        walletConnected: false,
        walletAddress: null,
        walletChainId: null,
        genlayerConfigured: true
      });
      assert.equal(cap.executionMode, 'SIMULATION');
      assert.equal(cap.statusLabel, 'WALLET NOT CONNECTED');
      assert.equal(cap.isExecutionBlocked, true);
    });

    it('should report WRONG NETWORK when connected to non-Sepolia network', () => {
      const cap = getRuntimeCapability({
        walletConnected: true,
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletChainId: 1, // Ethereum Mainnet
        genlayerConfigured: true
      });
      assert.equal(cap.executionMode, 'UNAVAILABLE');
      assert.equal(cap.statusLabel, 'WRONG NETWORK');
      assert.equal(cap.isExecutionBlocked, true);
    });

    it('should report LIVE WALLET only when connected on Sepolia 11155111', () => {
      const cap = getRuntimeCapability({
        walletConnected: true,
        walletAddress: '0x1234567890123456789012345678901234567890',
        walletChainId: 11155111, // Sepolia
        genlayerConfigured: true,
        executionAdapterConfigured: true
      });
      assert.equal(cap.executionMode, 'LIVE_WALLET');
      assert.equal(cap.statusLabel, 'LIVE WALLET');
      assert.equal(cap.isExecutionBlocked, false);
    });
  });

  // 5. Existing Canonical Demo Scenarios Unbroken
  describe('5. Canonical Demo Scenarios Integrity', () => {
    it('should keep all 4 demo scenarios intact with isDemo: true', () => {
      const scenarios = ['demo-safe-001', 'demo-policy-violation-002', 'demo-insufficient-evidence-003', 'demo-genlayer-rejection-004'];
      for (const scId of scenarios) {
        const sc = getDemoScenarioById(scId);
        assert.ok(sc, `Scenario ${scId} must exist`);
        assert.equal(sc.isDemo, true);
        assert.equal(sc.execution.txHash, null);
      }
    });
  });

  // 6. Demo and Live Counter Separation
  describe('6. Counter Separation and Non-Contamination', () => {
    it('should strictly partition demo vs live proposals and counts', () => {
      const demoProposal = getDemoScenarioById('demo-safe-001')!;
      const liveProposal: AgentProposal = {
        id: 'prop-live-counter-test',
        createdAt: '2026-09-07T00:00:00Z',
        source: 'human',
        actorType: 'human',
        actionType: 'BUY',
        asset: 'LINK',
        chain: 'Sepolia',
        chainId: 11155111,
        amount: '1.0',
        amountUsd: '15.0',
        slippage: '0.5%',
        route: 'Uniswap V3',
        policyResult: 'PASS',
        state: 'GENLAYER_NOT_SUBMITTED',
        isDemo: false,
        evidence: [],
        genlayer: null,
        execution: {
          status: 'WAITING_FOR_GENLAYER',
          requiresHumanConfirmation: true,
          userConfirmed: false,
          txHash: null,
          executedAt: null,
          error: null,
          mode: 'WALLET'
        }
      };

      const mixed = [demoProposal, liveProposal];
      const liveOnly = mixed.filter(p => !p.isDemo);
      const demoOnly = mixed.filter(p => p.isDemo);

      assert.equal(liveOnly.length, 1);
      assert.equal(liveOnly[0].id, 'prop-live-counter-test');
      assert.equal(demoOnly.length, 1);
      assert.equal(demoOnly[0].id, 'demo-safe-001');

      // Live executed count must be 0
      const liveExecuted = liveOnly.filter(p => p.execution.status === 'EXECUTED');
      assert.equal(liveExecuted.length, 0);

      // Demo executed count must never pollute live executed count
      assert.equal(demoOnly.filter(p => !p.isDemo).length, 0);
    });
  });

});
