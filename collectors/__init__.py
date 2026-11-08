"""
Collectors package for Cyber-Shield agentless ingestion.
"""
from .syslog_collector import main as syslog_main

__all__ = ["syslog_main"]