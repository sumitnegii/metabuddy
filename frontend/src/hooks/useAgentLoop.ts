"use client";

import { useState, useEffect } from "react";
import { getMockInitialLogs, getRandomLiveLog, AgentAction } from "../lib/agent-simulation";

export function useAgentLoop(maxLogs = 6, intervalMs = 4500) {
  const [logs, setLogs] = useState<AgentAction[]>(getMockInitialLogs());

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => {
        const next = [...prev, getRandomLiveLog()];
        if (next.length > maxLogs) return next.slice(1);
        return next;
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [maxLogs, intervalMs]);

  return logs;
}
