import json
import requests
from typing import Dict, Any
from web3 import Web3
from config import settings
from database import ActivityLog, Position

import os

# Supported tokens on Sepolia
TOKEN_ADDRESSES = {
    "WETH": os.getenv("WETH_ADDRESS", "0xfff9976782d46CC05630D1f6eBAb18b2324d6B14"),
    "USDC": os.getenv("USDC_ADDRESS", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"),
    "LINK": os.getenv("LINK_ADDRESS", "0x779877A7B0D9E8603169DdbD7836e478b4624789"),
    "UNI": os.getenv("UNI_ADDRESS", "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984")
}

TOKEN_DECIMALS = {
    "WETH": 18,
    "USDC": 6,
    "LINK": 18,
    "UNI": 18
}

def get_w3():
    return Web3(Web3.HTTPProvider(settings.SEPOLIA_RPC_URL))

from ai_provider import ai_provider

def get_token_price(symbol: str) -> float:
    """Gets real-time price of token in USD using CryptoCompare free API"""
    try:
        sym = symbol.upper()
        if sym == "WETH":
            sym = "ETH"
        url = f"https://min-api.cryptocompare.com/data/price?fsym={sym}&tsyms=USD"
        res = requests.get(url, timeout=5).json()
        return float(res.get("USD", 1.0))
    except Exception as e:
        print(f"Error fetching price for {symbol}: {e}")
        fallbacks = {"ETH": 3500.0, "WETH": 3500.0, "USDC": 1.0, "LINK": 15.0, "UNI": 7.0}
        return fallbacks.get(symbol.upper(), 1.0)

def get_token_metrics(symbol: str) -> Dict[str, Any]:
    """Gets full market metrics for a token"""
    try:
        sym = symbol.upper()
        if sym == "WETH":
            sym = "ETH"
        url = f"https://min-api.cryptocompare.com/data/pricemultifull?fsyms={sym}&tsyms=USD"
        res = requests.get(url, timeout=5).json()
        data = res.get("RAW", {}).get(sym, {}).get("USD", {})
        return {
            "price": data.get("PRICE", get_token_price(symbol)),
            "volume_24h": data.get("VOLUME24HOURTO", 1000000.0),
            "change_24h_pct": data.get("CHANGEPCT24HOUR", 0.0),
            "high_24h": data.get("HIGH24HOUR", 0.0),
            "low_24h": data.get("LOW24HOUR", 0.0)
        }
    except Exception as e:
        print(f"Error fetching metrics: {e}")
        price = get_token_price(symbol)
        return {
            "price": price,
            "volume_24h": 5000000.0,
            "change_24h_pct": 2.5,
            "high_24h": price * 1.02,
            "low_24h": price * 0.98
        }

# Agent 1: Wallet Analysis Agent
class WalletAnalysisAgent:
    @staticmethod
    def analyze(user_address: str, db_session) -> Dict[str, Any]:
        w3 = get_w3()
        balance_wei = w3.eth.get_balance(Web3.to_checksum_address(user_address))
        balance_eth = float(Web3.from_wei(balance_wei, 'ether'))
        tx_count = w3.eth.get_transaction_count(Web3.to_checksum_address(user_address))

        policy = ai_provider.analyze_wallet(user_address, balance_eth, tx_count)

        log = ActivityLog(
            agent="Wallet Analysis",
            action="Analyze Wallet",
            details=f"Analyzed wallet {user_address}. Suggested budget: ${policy.get('max_spend_week')}/week, Max Trade: ${policy.get('max_spend_trade')}"
        )
        db_session.add(log)
        db_session.commit()

        return policy

# Agent 2: Research Agent
class ResearchAgent:
    @staticmethod
    def score_token(symbol: str, db_session) -> Dict[str, Any]:
        metrics = get_token_metrics(symbol)
        analysis = ai_provider.score_token(symbol, metrics)

        log = ActivityLog(
            agent="Research",
            action="Score Token",
            details=f"Scored {symbol.upper()}: Score: {analysis.get('score')}, Verdict: {analysis.get('verdict')}. Reason: {analysis.get('reasoning', '')[:100]}..."
        )
        db_session.add(log)
        db_session.commit()

        return {
            "symbol": symbol.upper(),
            "metrics": metrics,
            "decision": analysis
        }

# Agent 3: Monitoring Agent (price check only — no on-chain execution)
class MonitoringAgent:
    @staticmethod
    def monitor_positions(db_session) -> list:
        """Checks all active positions against take profit and stop loss levels.
        Returns exit signals for the frontend to execute via MetaMask."""
        active_positions = db_session.query(Position).filter(Position.status == "ACTIVE").all()
        results = []

        for pos in active_positions:
            current_price = get_token_price(pos.token_symbol)
            profit_loss_pct = ((current_price - pos.buy_price) / pos.buy_price) * 100

            trigger_action = "HOLD"
            reason = "Inside safety margins."

            # Check Stop Loss
            if current_price <= pos.stop_loss:
                trigger_action = "EXIT"
                reason = f"Stop Loss hit at ${current_price:.2f} (Target: ${pos.stop_loss:.2f})"
            # Check Take Profit
            elif current_price >= pos.take_profit:
                trigger_action = "EXIT"
                reason = f"Take Profit hit at ${current_price:.2f} (Target: ${pos.take_profit:.2f})"

            if trigger_action == "EXIT":
                log = ActivityLog(
                    agent="Monitoring",
                    action="Exit Signal",
                    details=f"EXIT signal for {pos.token_symbol} position #{pos.id}. {reason}"
                )
                db_session.add(log)
                db_session.commit()

            results.append({
                "id": pos.id,
                "symbol": pos.token_symbol,
                "token_address": pos.token_address,
                "amount": pos.amount,
                "action": trigger_action,
                "current_price": current_price,
                "buy_price": pos.buy_price,
                "pnl_pct": round(profit_loss_pct, 2),
                "details": reason
            })

        return results
