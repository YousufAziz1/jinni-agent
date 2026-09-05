#!/usr/bin/env python3
"""
Deployment helper script for JinniAgentGuard on GenLayer Studionet / Localnet.
Usage:
    python deploy_genlayer.py [--network studionet]
"""

import os
import sys
import json
import argparse
import requests

DEFAULT_RPC = os.getenv("GENLAYER_RPC", "https://studio.genlayer.com/api")
DEFAULT_NETWORK = os.getenv("GENLAYER_NETWORK", "studionet")

def deploy_contract(rpc_url: str, contract_path: str):
    print(f"[GenLayer Deployer] Deploying {contract_path} to {rpc_url}...")
    if not os.path.exists(contract_path):
        print(f"Error: Contract file not found: {contract_path}")
        sys.exit(1)

    with open(contract_path, "r", encoding="utf-8") as f:
        contract_code = f.read()

    payload = {
        "jsonrpc": "2.0",
        "method": "gen_deployContract",
        "params": {
            "code": contract_code,
            "args": []
        },
        "id": 1
    }

    try:
        res = requests.post(rpc_url, json=payload, timeout=30)
        data = res.json()
        if "error" in data:
            print(f"[Deploy Error] {data['error']}")
            sys.exit(1)
        
        contract_address = data.get("result", {}).get("contractAddress")
        tx_hash = data.get("result", {}).get("txHash")
        print(f"[Success] Contract deployed at address: {contract_address}")
        print(f"[Tx Hash] {tx_hash}")
        print("\nPlease update your environment variables:")
        print(f"JINNI_AGENT_CONTRACT_ADDRESS={contract_address}")
        return contract_address
    except Exception as e:
        print(f"[Connection Error] Could not connect to GenLayer RPC at {rpc_url}: {e}")
        print("Ensure GenLayer Studionet or local simulator is running and reachable.")
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deploy JinniAgentGuard to GenLayer")
    parser.add_argument("--rpc", default=DEFAULT_RPC, help="GenLayer RPC URL")
    parser.add_argument("--file", default="JinniAgentGuard.py", help="Contract file name")
    args = parser.parse_args()

    contract_file = os.path.join(os.path.dirname(__file__), args.file)
    deploy_contract(args.rpc, contract_file)
