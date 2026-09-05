from typing import Dict, Any, List, Tuple, Optional
from agent_domain import AgentProposal, PolicyRuleConfig, PolicyResult

class PolicyEngine:
    """
    JINNI Agent Policy Engine
    Enforces strict risk management and policy boundaries before any proposal can reach GenLayer.
    Outcomes are strictly: PASS, FAIL, or UNKNOWN.
    Missing data is NEVER defaulted to safe.
    """

    @staticmethod
    def evaluate(proposal: AgentProposal, config: Optional[PolicyRuleConfig] = None) -> Tuple[PolicyResult, Optional[str], Dict[str, Any]]:
        if config is None:
            config = PolicyRuleConfig()

        checks: Dict[str, Dict[str, Any]] = {}
        failure_reasons: List[str] = []
        unknown_reasons: List[str] = []

        # 1. Evaluate Transaction Value Limit
        if proposal.amountUsd is None:
            checks["maxTransactionValue"] = {
                "status": "UNKNOWN",
                "message": "Transaction USD value is missing or unavailable"
            }
            unknown_reasons.append("Missing transaction USD value")
        else:
            try:
                amount_usd = float(proposal.amountUsd)
                if amount_usd > config.maxTransactionValue:
                    checks["maxTransactionValue"] = {
                        "status": "FAIL",
                        "current": amount_usd,
                        "limit": config.maxTransactionValue,
                        "message": f"Amount ${amount_usd:.2f} exceeds limit of ${config.maxTransactionValue:.2f}"
                    }
                    failure_reasons.append(f"Exceeds max transaction limit of ${config.maxTransactionValue:.2f}")
                else:
                    checks["maxTransactionValue"] = {
                        "status": "PASS",
                        "current": amount_usd,
                        "limit": config.maxTransactionValue,
                        "message": "Within max transaction limit"
                    }
            except (ValueError, TypeError):
                checks["maxTransactionValue"] = {
                    "status": "FAIL",
                    "message": "Invalid non-numeric transaction amount"
                }
                failure_reasons.append("Invalid transaction amount format")

        # 2. Evaluate Slippage Limit
        if proposal.slippage is None:
            checks["maxSlippage"] = {
                "status": "UNKNOWN",
                "message": "Slippage parameter is missing"
            }
            unknown_reasons.append("Missing slippage parameter")
        else:
            try:
                slippage_pct = float(str(proposal.slippage).replace("%", ""))
                if slippage_pct > config.maxSlippage:
                    checks["maxSlippage"] = {
                        "status": "FAIL",
                        "current": slippage_pct,
                        "limit": config.maxSlippage,
                        "message": f"Slippage {slippage_pct:.2f}% exceeds tolerance {config.maxSlippage:.2f}%"
                    }
                    failure_reasons.append(f"Exceeds max slippage of {config.maxSlippage:.2f}%")
                else:
                    checks["maxSlippage"] = {
                        "status": "PASS",
                        "current": slippage_pct,
                        "limit": config.maxSlippage,
                        "message": "Within slippage tolerance"
                    }
            except (ValueError, TypeError):
                checks["maxSlippage"] = {
                    "status": "FAIL",
                    "message": "Invalid non-numeric slippage parameter"
                }
                failure_reasons.append("Invalid slippage format")

        # 3. Evaluate Chain ID
        if proposal.chainId is None:
            checks["allowedChains"] = {
                "status": "UNKNOWN",
                "message": "Chain ID is unspecified"
            }
            unknown_reasons.append("Unspecified target chain")
        elif proposal.chainId not in config.allowedChains:
            checks["allowedChains"] = {
                "status": "FAIL",
                "current": proposal.chainId,
                "allowed": config.allowedChains,
                "message": f"Chain ID {proposal.chainId} is not in allowed chains list"
            }
            failure_reasons.append(f"Chain {proposal.chainId} not allowed by policy")
        else:
            checks["allowedChains"] = {
                "status": "PASS",
                "current": proposal.chainId,
                "message": f"Chain {proposal.chainId} is authorized"
            }

        # 4. Evaluate Asset / Token
        if not proposal.asset:
            checks["allowedTokens"] = {
                "status": "UNKNOWN",
                "message": "Target asset is unspecified"
            }
            unknown_reasons.append("Unspecified target asset")
        else:
            asset_norm = proposal.asset.upper()
            if asset_norm in [t.upper() for t in config.blockedTokens]:
                checks["allowedTokens"] = {
                    "status": "FAIL",
                    "current": proposal.asset,
                    "message": f"Asset {proposal.asset} is explicitly blocked by policy"
                }
                failure_reasons.append(f"Token {proposal.asset} is blocked")
            elif asset_norm not in [t.upper() for t in config.allowedTokens]:
                checks["allowedTokens"] = {
                    "status": "FAIL",
                    "current": proposal.asset,
                    "allowed": config.allowedTokens,
                    "message": f"Asset {proposal.asset} is not in allowed token list"
                }
                failure_reasons.append(f"Token {proposal.asset} not in allowed list")
            else:
                checks["allowedTokens"] = {
                    "status": "PASS",
                    "current": proposal.asset,
                    "message": f"Token {proposal.asset} is authorized"
                }

        # 5. Evaluate Contract Verification & Evidence
        evidence_dict = {e.type: e for e in proposal.evidence}
        if config.requireVerifiedContract:
            contract_ev = evidence_dict.get("CONTRACT_VERIFICATION")
            if not contract_ev or contract_ev.status != "VERIFIED":
                checks["verifiedContract"] = {
                    "status": "FAIL",
                    "message": "Verified smart contract requirement not satisfied or evidence missing"
                }
                failure_reasons.append("Target contract is not verified")
            else:
                checks["verifiedContract"] = {
                    "status": "PASS",
                    "message": "Contract verification confirmed via on-chain explorer"
                }

        # 6. Evaluate Liquidity if required
        if config.minLiquidityUsd is not None:
            liq_ev = evidence_dict.get("LIQUIDITY_CHECK")
            if not liq_ev or liq_ev.value is None or liq_ev.status == "UNAVAILABLE":
                checks["minLiquidity"] = {
                    "status": "UNKNOWN",
                    "message": "Liquidity data missing or unavailable — not assumed safe"
                }
                unknown_reasons.append("Missing liquidity evidence")
            else:
                try:
                    liq_val = float(liq_ev.value)
                    if liq_val < config.minLiquidityUsd:
                        checks["minLiquidity"] = {
                            "status": "FAIL",
                            "current": liq_val,
                            "minimum": config.minLiquidityUsd,
                            "message": f"Pool liquidity (${liq_val:,.0f}) is below minimum required (${config.minLiquidityUsd:,.0f})"
                        }
                        failure_reasons.append("Pool liquidity below minimum safe threshold")
                    else:
                        checks["minLiquidity"] = {
                            "status": "PASS",
                            "current": liq_val,
                            "message": "Sufficient pool liquidity verified"
                        }
                except (ValueError, TypeError):
                    checks["minLiquidity"] = {
                        "status": "UNKNOWN",
                        "message": "Invalid liquidity metric format"
                    }
                    unknown_reasons.append("Invalid liquidity metric format")

        # Compile overall result
        if len(failure_reasons) > 0:
            overall_result: PolicyResult = "FAIL"
            primary_reason = "; ".join(failure_reasons)
        elif len(unknown_reasons) > 0:
            overall_result: PolicyResult = "UNKNOWN"
            primary_reason = "Missing critical policy data: " + "; ".join(unknown_reasons)
        else:
            overall_result: PolicyResult = "PASS"
            primary_reason = "All mandatory policy criteria satisfied."

        breakdown = {
            "result": overall_result,
            "policyId": config.id,
            "policyVersion": config.version,
            "checks": checks,
            "failureReasons": failure_reasons,
            "unknownReasons": unknown_reasons
        }

        return overall_result, primary_reason, breakdown
