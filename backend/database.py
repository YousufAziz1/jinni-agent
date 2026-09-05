from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
from config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Original JINNI Models (Preserved 100%)
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    agent = Column(String)  # Wallet, Research, Execution, Monitoring, Guard, GenLayer
    action = Column(String)
    details = Column(String)
    tx_hash = Column(String, nullable=True)

class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    user_address = Column(String, index=True)
    token_symbol = Column(String)
    token_address = Column(String)
    amount = Column(Float)
    buy_price = Column(Float)
    take_profit = Column(Float)
    stop_loss = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String)  # ACTIVE, CLOSED
    exit_price = Column(Float, nullable=True)
    exit_tx_hash = Column(String, nullable=True)

class Delegation(Base):
    __tablename__ = "delegations"

    id = Column(Integer, primary_key=True, index=True)
    user_address = Column(String, unique=True, index=True)
    max_spend_trade = Column(Float)
    max_spend_week = Column(Float)
    expiry = Column(Integer)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# New JINNI Agent Core Models
class ProposalModel(Base):
    __tablename__ = "agent_proposals"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(String)
    source = Column(String, default="agent")
    actor_type = Column(String, default="agent")  # human | agent
    origin_agent_id = Column(String, nullable=True)
    destination_agent_id = Column(String, nullable=True)
    action_type = Column(String)  # BUY | SELL | SWAP | PAY | SERVICE_PAYMENT | CONTRACT_INTERACTION
    asset = Column(String, nullable=True)
    chain = Column(String, default="Sepolia")
    chain_id = Column(Integer, default=11155111)
    amount = Column(String, nullable=True)
    amount_usd = Column(String, nullable=True)
    slippage = Column(String, default="0.5%")
    route = Column(String, nullable=True)
    policy_id = Column(String, default="default-policy")
    policy_version = Column(String, default="1.0.0")
    policy_result = Column(String, default="UNKNOWN")  # PASS | FAIL | UNKNOWN
    policy_failure_reason = Column(String, nullable=True)
    agent_rationale = Column(Text, default="")
    evidence_json = Column(Text, default="[]")
    genlayer_json = Column(Text, nullable=True)
    execution_json = Column(Text, default="{}")
    state = Column(String, default="DRAFT")
    is_demo = Column(Boolean, default=False)

class PolicyModel(Base):
    __tablename__ = "agent_policies"

    id = Column(String, primary_key=True, index=True)
    version = Column(String, default="1.0.0")
    name = Column(String, default="Standard JINNI Safety Guard")
    max_transaction_value = Column(Float, default=500.0)
    max_daily_spend = Column(Float, default=1000.0)
    max_slippage = Column(Float, default=1.0)
    allowed_chains_json = Column(Text, default="[11155111, 1, 61999]")
    allowed_tokens_json = Column(Text, default='["USDC", "LINK", "UNI", "WETH"]')
    blocked_tokens_json = Column(Text, default="[]")
    min_liquidity_usd = Column(Float, nullable=True, default=10000.0)
    require_verified_contract = Column(Boolean, default=True)
    require_genlayer_approval = Column(Boolean, default=True)
    automatic_execution = Column(Boolean, default=False)
    human_confirmation_threshold = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class DecisionProofModel(Base):
    __tablename__ = "decision_proofs"

    proposal_id = Column(String, primary_key=True, index=True)
    action = Column(String)
    asset = Column(String, nullable=True)
    chain = Column(String, nullable=True)
    amount_usd = Column(String, nullable=True)
    policy_version = Column(String, nullable=True)
    policy_result = Column(String)
    evidence_summary_json = Column(Text, default="{}")
    genlayer_contract = Column(String, nullable=True)
    genlayer_tx_hash = Column(String, nullable=True)
    tx_status = Column(String, nullable=True)
    final_decision = Column(String)
    decision_timestamp = Column(String, nullable=True)
    decision_reasoning = Column(Text, nullable=True)
    execution_status = Column(String)
    execution_tx_hash = Column(String, nullable=True)
    executed_at = Column(String, nullable=True)
    audit_trail_json = Column(Text, default="[]")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
