"""
JINNI Agent Off-Chain AI Provider Adapter
Supports free-tier cloud LLM providers (Groq, Google Gemini via OpenAI-compat, OpenRouter)
and local Ollama model fallback.

Safety Rule:
Off-chain AI is strictly a proposal & reasoning generator.
It NEVER authorizes or settles on-chain execution.
Every proposal must pass the deterministic Policy Engine,
Evidence Layer, and GenLayer Intelligent Contract adjudication.
"""

import os
import json
import requests
from typing import Dict, Any, Optional, Tuple
from openai import OpenAI

class AIProviderAdapter:
    def __init__(
        self,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        ollama_url: Optional[str] = None,
        ollama_model: Optional[str] = None
    ):
        from config import settings
        self.provider = provider or getattr(settings, "AI_PROVIDER", "groq")
        self.api_key = api_key if api_key is not None else getattr(settings, "AI_API_KEY", "")
        self.model = model or getattr(settings, "AI_MODEL", "llama-3.3-70b-versatile")
        self.base_url = base_url or getattr(settings, "AI_BASE_URL", "https://api.groq.com/openai/v1")
        self.ollama_url = ollama_url or getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434/v1")
        self.ollama_model = ollama_model or getattr(settings, "OLLAMA_MODEL", "llama3.2")

    def _is_ollama_reachable(self) -> bool:
        """Quick check if local Ollama daemon is active."""
        try:
            # Ollama base is typically http://localhost:11434/v1, check root or /api/tags
            root_url = self.ollama_url.replace("/v1", "")
            res = requests.get(f"{root_url}/api/tags", timeout=1.5)
            return res.status_code == 200
        except Exception:
            return False

    def get_active_client(self) -> Tuple[Optional[OpenAI], str, str]:
        """
        Determines the active AI client.
        Priority:
        1. Cloud Provider (if api_key configured)
        2. Ollama Local Model (if reachable)
        3. None (AI_UNAVAILABLE)
        Returns (client, model_name, source_type)
        """
        if self.api_key and self.api_key.strip():
            client = OpenAI(
                api_key=self.api_key.strip(),
                base_url=self.base_url.strip()
            )
            return client, self.model, f"CLOUD_{self.provider.upper()}"

        if self._is_ollama_reachable():
            client = OpenAI(
                api_key="ollama",
                base_url=self.ollama_url.strip()
            )
            return client, self.ollama_model, "LOCAL_OLLAMA"

        return None, "", "AI_UNAVAILABLE"

    def health_check(self) -> Dict[str, Any]:
        """Returns truthful, comprehensive status of off-chain AI capabilities."""
        has_key = bool(self.api_key and self.api_key.strip())
        ollama_active = self._is_ollama_reachable()

        if has_key:
            status = "CONNECTED"
            active_model = self.model
            message = f"Connected to {self.provider.capitalize()} free-tier cloud endpoint."
        elif ollama_active:
            status = "OLLAMA_LOCAL"
            active_model = self.ollama_model
            message = f"Active via local Ollama instance ({self.ollama_model}). No external API key required."
        else:
            status = "AI_UNAVAILABLE"
            active_model = "None"
            message = "No AI provider configured. Provide a free Groq/Gemini API key or start local Ollama."

        return {
            "provider": self.provider if has_key else ("ollama" if ollama_active else "none"),
            "model": active_model,
            "status": status,
            "baseUrl": self.base_url if has_key else (self.ollama_url if ollama_active else None),
            "apiKeyConfigured": has_key,
            "ollamaAvailable": ollama_active,
            "message": message
        }

    def generate_agent_proposal(
        self,
        market_telemetry: Dict[str, Any],
        user_intent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Uses AI to construct a proposed trade and rationale based on market data.
        Returns AI_UNAVAILABLE if no provider is reachable (no fake hallucination).
        """
        client, active_model, source = self.get_active_client()
        if not client:
            return {
                "status": "AI_UNAVAILABLE",
                "error": "Cannot generate AI proposal: No AI provider is configured or reachable. Configure a free API key or start local Ollama."
            }

        prompt = f"""
        Given the following real-time Web3 market telemetry:
        {json.dumps(market_telemetry, indent=2)}

        User Intent / Objective:
        {user_intent or "Autonomous portfolio balance within safe risk parameters."}

        Construct a single DeFi trade proposal for Ethereum Sepolia testnet.
        Safety boundaries:
        - Must be one of allowed tokens: LINK, UNI, WETH, USDC.
        - Action type must be BUY, SELL, or SWAP.
        - Propose safe trade value (e.g. <= $25 USD).
        - Slippage <= 0.01 (1.0%).

        Return ONLY a JSON object with this exact structure:
        {{
            "actionType": "BUY" | "SELL" | "SWAP",
            "asset": "LINK" | "UNI" | "WETH",
            "amount": "string or number",
            "amountUsd": "string or number",
            "slippage": "0.5%",
            "route": "Uniswap V3 (USDC -> TOKEN)",
            "agentRationale": "string explaining technical and risk rationale"
        }}
        """

        system_prompt = (
            "You are the JINNI Agent Autonomous Proposer. "
            "You propose economically meaningful transactions based on telemetry. "
            "You know that you DO NOT have approval power — all proposals will be rigorously "
            "evaluated by a deterministic Policy Engine and the GenLayer Intelligent Contract."
        )

        try:
            response = client.chat.completions.create(
                model=active_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            raw_content = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_content)
            parsed["status"] = "SUCCESS"
            parsed["aiSource"] = source
            parsed["aiModel"] = active_model
            return parsed
        except Exception as e:
            return {
                "status": "AI_UNAVAILABLE",
                "error": f"AI proposal generation failed: {str(e)}"
            }

    def generate_reason(self, proposal_data: Dict[str, Any]) -> str:
        """Generates a concise agent rationale for an existing proposal."""
        client, active_model, _ = self.get_active_client()
        if not client:
            return "Autonomous proposal based on market telemetry and safety parameters (AI provider offline)."

        prompt = f"""
        Summarize the economic rationale for this proposed action in 2 sentences:
        {json.dumps(proposal_data, indent=2)}
        """

        try:
            response = client.chat.completions.create(
                model=active_model,
                messages=[
                    {"role": "system", "content": "You are JINNI Agent. Be concise, technical, and objective."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=100
            )
            return response.choices[0].message.content.strip()
        except Exception:
            return f"Autonomous {proposal_data.get('actionType', 'ACTION')} proposal for {proposal_data.get('asset', 'ASSET')} based on real-time market data."

    def analyze_wallet(self, user_address: str, balance_eth: float, tx_count: int) -> Dict[str, Any]:
        """
        Wallet risk evaluation for EIP-712 delegation.
        """
        client, active_model, _ = self.get_active_client()
        if not client:
            # Deterministic, safe offline boundaries
            return {
                "status": "AI_UNAVAILABLE",
                "max_spend_trade": 5.0,
                "max_spend_week": 20.0,
                "duration_days": 7,
                "reasoning": "AI Provider offline. Applied conservative fallback risk boundaries ($5/trade, $20/week) based on Sepolia transaction profile."
            }

        prompt = f"""
        Analyze this wallet risk profile on Ethereum Sepolia:
        - Wallet Address: {user_address}
        - Sepolia ETH Balance: {balance_eth} ETH
        - Transaction Count: {tx_count}

        Suggest a safe spending policy containing:
        1. max_spend_trade (maximum value in USD allowed per single trade, recommended 5-25)
        2. max_spend_week (maximum total USD value allowed per week, recommended 20-100)
        3. duration_days (duration of the delegation, 1-14)
        4. reasoning (brief text explaining recommendation based on wallet balance and stats)

        Return ONLY a JSON object:
        {{
            "max_spend_trade": float,
            "max_spend_week": float,
            "duration_days": int,
            "reasoning": "string"
        }}
        """

        try:
            response = client.chat.completions.create(
                model=active_model,
                messages=[
                    {"role": "system", "content": "You are the JINNI Agent Wallet Risk Evaluator. Recommend conservative spending boundaries."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content or "{}")
        except Exception as e:
            return {
                "status": "AI_UNAVAILABLE",
                "max_spend_trade": 5.0,
                "max_spend_week": 20.0,
                "duration_days": 7,
                "reasoning": f"AI provider request error ({str(e)}). Applied conservative default limits."
            }

    def score_token(self, symbol: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Token momentum and market scoring.
        """
        client, active_model, _ = self.get_active_client()
        if not client:
            return {
                "status": "AI_UNAVAILABLE",
                "score": 50,
                "verdict": "HOLD",
                "confidence": "LOW",
                "reasoning": "AI Provider unavailable. No external cloud or local Ollama model reachable to score momentum."
            }

        prompt = f"""
        Research and score the token {symbol} based on real-time market metrics:
        - Current Price: ${metrics.get('price', 0)}
        - 24h Volume: ${metrics.get('volume_24h', 0):,}
        - 24h Price Change: {metrics.get('change_24h_pct', 0)}%
        - 24h High/Low: ${metrics.get('high_24h', 0)} / ${metrics.get('low_24h', 0)}

        Decide if the agent should BUY, SELL, or HOLD. Provide a numeric rating from 0 to 100, confidence (LOW, MEDIUM, HIGH), and reasoning.

        Return ONLY a JSON object:
        {{
            "score": int,
            "verdict": "BUY" | "SELL" | "HOLD",
            "confidence": "LOW" | "MEDIUM" | "HIGH",
            "reasoning": "string"
        }}
        """

        try:
            response = client.chat.completions.create(
                model=active_model,
                messages=[
                    {"role": "system", "content": "You are the JINNI Agent Research Agent. Analyze technical indicators and metrics."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content or "{}")
        except Exception as e:
            return {
                "status": "AI_UNAVAILABLE",
                "score": 50,
                "verdict": "HOLD",
                "confidence": "LOW",
                "reasoning": f"AI scoring error: {str(e)}"
            }

# Global singleton instance
ai_provider = AIProviderAdapter()
