#!/usr/bin/env python3
"""
JINNI Agent — GenLayer Contract Deployment & Verification Tool
Validates contracts/JinniAgentGuard.py against GenLayer Studio RPC and provides
guided deployment steps for Studionet / Testnet.
"""

import os
import sys
import json
import base64
import requests

DEFAULT_RPC = os.getenv("GENLAYER_RPC", "https://studio.genlayer.com/api")
DEFAULT_NETWORK = os.getenv("GENLAYER_NETWORK", "studionet")
DEFAULT_CHAIN_ID = os.getenv("GENLAYER_CHAIN_ID", "61999")

def verify_and_guide_deployment(rpc_url: str, contract_path: str):
    print("=" * 70)
    print("JINNI AGENT — GENLAYER INTELLIGENT CONTRACT DEPLOYER")
    print("=" * 70)
    print(f"Contract Source: {contract_path}")
    print(f"Target RPC:      {rpc_url}")
    print(f"Network:         {DEFAULT_NETWORK} (Chain ID: {DEFAULT_CHAIN_ID})")
    print("-" * 70)

    if not os.path.exists(contract_path):
        print(f"[Error] Contract file not found: {contract_path}")
        sys.exit(1)

    with open(contract_path, "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Local Python syntax check
    try:
        compile(code, contract_path, 'exec')
        print("[Pass] Contract Python syntax compiles cleanly.")
    except Exception as e:
        print(f"[Fail] Python syntax error in contract: {e}")
        sys.exit(1)

    # 2. Test GenLayer RPC reachability
    try:
        res = requests.post(
            rpc_url,
            json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
            timeout=5
        )
        if res.status_code == 200 and "result" in res.json():
            current_block = res.json()["result"]
            print(f"[Pass] GenLayer RPC reachable. Latest block: {current_block}")
        else:
            print(f"[Warn] RPC responded with unexpected format: {res.text}")
    except Exception as e:
        print(f"[Warn] Could not reach RPC at {rpc_url}: {e}")

    # 3. Test Contract Schema Validation on Live Studio RPC
    try:
        schema_res = requests.post(
            rpc_url,
            json={"jsonrpc": "2.0", "method": "gen_getContractSchemaForCode", "params": [code], "id": 1},
            timeout=25
        )
        schema_data = schema_res.json()
        if "result" in schema_data and "methods" in schema_data["result"]:
            methods = list(schema_data["result"]["methods"].keys())
            print(f"[Pass] Contract schema validated by GenVM. Public methods: {methods}")
        else:
            print(f"[Fail] Schema validation failed: {schema_data.get('error')}")
    except Exception as e:
        print(f"[Warn] Schema check query failed: {e}")

    # 4. Deployment Instructions
    print("\n" + "=" * 70)
    print("DEPLOYMENT PROCEDURE (GENLAYER STUDIONET / BRADBURY)")
    print("=" * 70)
    print("In GenLayer, deployment transactions require cryptographic signing from a")
    print("funded account. Follow the standard, zero-setup procedure below:\n")
    print("METHOD 1: GENLAYER STUDIO (Fastest, zero local setup)")
    print("  1. Open https://studio.genlayer.com in your browser.")
    print("  2. Create a new contract file named 'JinniAgentGuard.py'.")
    print(f"  3. Copy and paste the contents of:\n     {os.path.abspath(contract_path)}")
    print("  4. Ensure network is set to 'Studionet' (or Localnet).")
    print("  5. Click 'Deploy Contract' and authorize with the built-in Studio account.")
    print("  6. Copy the deployed contract address (e.g. 0x...).\n")
    print("METHOD 2: GENLAYER CLI")
    print("  1. Install GenLayer CLI: npm install -g @genlayer/cli")
    print(f"  2. Run: genlayer deploy --contract {contract_path} --rpc {rpc_url}\n")
    print("-" * 70)
    print("POST-DEPLOYMENT CONFIGURATION:")
    print("Add the deployed contract address to your environment files:")
    print("  backend/.env:")
    print("    JINNI_AGENT_CONTRACT_ADDRESS=0x<your_deployed_contract_address>")
    print("  .env:")
    print("    JINNI_AGENT_CONTRACT_ADDRESS=0x<your_deployed_contract_address>")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    contract_file = os.path.join(os.path.dirname(__file__), "JinniAgentGuard.py")
    verify_and_guide_deployment(DEFAULT_RPC, contract_file)
