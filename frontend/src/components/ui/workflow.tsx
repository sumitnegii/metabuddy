import { motion, type PanInfo } from "framer-motion";
import type React from "react";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import {
  ArrowRight,
  Database,
  Mail,
  Plus,
  Settings,
  Webhook,
  Zap,
} from "lucide-react";

// Interfaces
interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition";
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  position: { x: number; y: number };
}

interface WorkflowConnection {
  from: string;
  to: string;
}

type WorkflowBlockProps = {
  title?: string;
  subtitle?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  mermaid?: string;
  editable?: boolean;
};

// Constants
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

const nodeTemplates: Omit<WorkflowNode, "id" | "position">[] = [
  {
    type: "trigger",
    title: "Webhook",
    description: "Receive data from external service",
    icon: Webhook,
    color: "emerald",
  },
  {
    type: "action",
    title: "Database Query",
    description: "Fetch user records",
    icon: Database,
    color: "blue",
  },
  {
    type: "condition",
    title: "Condition",
    description: "Check user status",
    icon: Settings,
    color: "amber",
  },
  {
    type: "action",
    title: "Send Email",
    description: "Notify user",
    icon: Mail,
    color: "purple",
  },
  {
    type: "action",
    title: "Log Event",
    description: "Record activity",
    icon: Zap,
    color: "indigo",
  },
];

const initialNodes: WorkflowNode[] = [
  {
    id: "node-1",
    type: "trigger",
    title: "Webhook",
    description: "Receive data from external service",
    icon: Webhook,
    color: "emerald",
    position: { x: 50, y: 100 },
  },
  {
    id: "node-2",
    type: "action",
    title: "Database Query",
    description: "Fetch user records",
    icon: Database,
    color: "blue",
    position: { x: 300, y: 100 },
  },
  {
    id: "node-3",
    type: "condition",
    title: "Condition",
    description: "Check user status",
    icon: Settings,
    color: "amber",
    position: { x: 550, y: 100 },
  },
];

const initialConnections: WorkflowConnection[] = [
  { from: "node-1", to: "node-2" },
  { from: "node-2", to: "node-3" },
];

const colorClasses: Record<string, string> = {
  emerald: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
  blue: "border-blue-400/40 bg-blue-400/10 text-blue-400",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-400",
  purple: "border-purple-400/40 bg-purple-400/10 text-purple-400",
  indigo: "border-indigo-400/40 bg-indigo-400/10 text-indigo-400",
  orange: "border-orange-400/40 bg-orange-400/10 text-orange-400",
  zinc: "border-zinc-400/40 bg-zinc-400/10 text-zinc-300",
};

// Connection Line Component
function WorkflowConnectionLine({
  from,
  to,
  nodes,
}: {
  from: string;
  to: string;
  nodes: WorkflowNode[];
}) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `workflow-flow-${rawId}`;
  const glowId = `workflow-glow-${rawId}`;
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  const startX = fromNode.position.x + NODE_WIDTH;
  const startY = fromNode.position.y + NODE_HEIGHT / 2;
  const endX = toNode.position.x;
  const endY = toNode.position.y + NODE_HEIGHT / 2;

  const cp1X = startX + (endX - startX) * 0.5;
  const cp2X = endX - (endX - startX) * 0.5;

  const path = `M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.1" />
          <stop offset="28%" stopColor="#facc15" stopOpacity="0.95" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="76%" stopColor="#38bdf8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0.1" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-1 0"
            to="1 0"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </linearGradient>
        <filter id={glowId} x="-25%" y="-80%" width="150%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="#18181b"
        strokeWidth={5}
        strokeDasharray="8,12"
        strokeLinecap="round"
        opacity={0.5}
      />
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.72}
        filter={`url(#${glowId})`}
      />
      <path
        d={path}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.2}
        strokeDasharray="2 18 8 24"
        strokeLinecap="round"
        opacity={0.95}
        filter={`url(#${glowId})`}
      >
        <animate attributeName="stroke-dashoffset" from="52" to="-52" dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;1;0.55;0.95;0.4" dur="1.35s" repeatCount="indefinite" />
      </path>
      <path
        d={path}
        fill="none"
        stroke="#f97316"
        strokeWidth={1.4}
        strokeDasharray="1 24 4 18"
        strokeLinecap="round"
        opacity={0.9}
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-96" dur="1.1s" repeatCount="indefinite" />
      </path>
    </g>
  );
}

function StatusBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${className}`}>
      {children}
    </span>
  );
}

// Main Component
export function N8nWorkflowBlock({
  title = "Workflow Builder",
  subtitle = "Drag nodes to inspect the execution map",
  nodes: providedNodes,
  connections: providedConnections,
  mermaid,
  editable = true,
}: WorkflowBlockProps = {}) {
  const startingNodes = providedNodes?.length ? providedNodes : initialNodes;
  const startingConnections = providedConnections?.length ? providedConnections : initialConnections;
  const [nodes, setNodes] = useState<WorkflowNode[]>(startingNodes);
  const [connections, setConnections] =
    useState<WorkflowConnection[]>(startingConnections);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [contentSize, setContentSize] = useState(() => {
    const maxX = Math.max(
      ...startingNodes.map((n) => n.position.x + NODE_WIDTH)
    );
    const maxY = Math.max(
      ...startingNodes.map((n) => n.position.y + NODE_HEIGHT)
    );
    return { width: maxX + 50, height: maxY + 50 };
  });

  // Drag Handlers
  const handleDragStart = (nodeId: string) => {
    setDraggingNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      dragStartPosition.current = { x: node.position.x, y: node.position.y };
    }
  };

  const handleDrag = (nodeId: string, { offset }: PanInfo) => {
    if (draggingNodeId !== nodeId || !dragStartPosition.current) return;

    const newX = dragStartPosition.current.x + offset.x;
    const newY = dragStartPosition.current.y + offset.y;

    const constrainedX = Math.max(0, newX);
    const constrainedY = Math.max(0, newY);

    flushSync(() => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? { ...node, position: { x: constrainedX, y: constrainedY } }
            : node
        )
      );
    });

    setContentSize((prev) => ({
      width: Math.max(prev.width, constrainedX + NODE_WIDTH + 50),
      height: Math.max(prev.height, constrainedY + NODE_HEIGHT + 50),
    }));
  };

  const handleDragEnd = () => {
    setDraggingNodeId(null);
    dragStartPosition.current = null;
  };

  // Add Node Handler
  const addNode = () => {
    const template =
      nodeTemplates[Math.floor(Math.random() * nodeTemplates.length)];
    const lastNode = nodes[nodes.length - 1];
    const newPosition = lastNode
      ? { x: lastNode.position.x + 250, y: lastNode.position.y }
      : { x: 50, y: 100 };

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      ...template,
      position: newPosition,
    };

    flushSync(() => {
      setNodes((prev) => [...prev, newNode]);
      if (lastNode) {
        setConnections((prev) => [
          ...prev,
          { from: lastNode.id, to: newNode.id },
        ]);
      }
    });

    setContentSize((prev) => ({
      width: Math.max(prev.width, newPosition.x + NODE_WIDTH + 50),
      height: Math.max(prev.height, newPosition.y + NODE_HEIGHT + 50),
    }));

    // Scroll to new node
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.scrollTo({
        left: newPosition.x + NODE_WIDTH - canvas.clientWidth + 100,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur-md sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-700">
            Active
          </StatusBadge>
          <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500 sm:text-sm">
            {title}
          </span>
        </div>
        {editable && (
        <button
          type="button"
          onClick={addNode}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-600 transition hover:border-black hover:text-black"
          aria-label="Add new node"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Add Node</span>
        </button>
        )}
      </div>
      <p className="mb-4 text-sm font-semibold text-zinc-500">{subtitle}</p>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative h-[400px] w-full overflow-auto rounded-xl border border-zinc-200 bg-zinc-950/95 sm:h-[500px] md:h-[560px]"
        style={{ minHeight: "400px" }}
        role="region"
        aria-label="Workflow canvas"
        tabIndex={0}
      >
        {/* Content Wrapper */}
        <div
          className="relative"
          style={{
            minWidth: contentSize.width,
            minHeight: contentSize.height,
          }}
        >
          {/* SVG Connections */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={contentSize.width}
            height={contentSize.height}
            style={{ overflow: "visible" }}
            aria-hidden="true"
          >
            {connections.map((c) => (
              <WorkflowConnectionLine
                key={`${c.from}-${c.to}`}
                from={c.from}
                to={c.to}
                nodes={nodes}
              />
            ))}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const Icon = node.icon;
            const isDragging = draggingNodeId === node.id;

            return (
              <motion.div
                key={node.id}
                drag
                dragMomentum={false}
                dragConstraints={{
                  left: 0,
                  top: 0,
                  right: 100000,
                  bottom: 100000,
                }}
                onDragStart={() => handleDragStart(node.id)}
                onDrag={(_, info) => handleDrag(node.id, info)}
                onDragEnd={handleDragEnd}
                style={{
                  x: node.position.x,
                  y: node.position.y,
                  width: NODE_WIDTH,
                  transformOrigin: "0 0",
                }}
                className="absolute cursor-grab"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileDrag={{ scale: 1.05, zIndex: 50, cursor: "grabbing" }}
                aria-grabbed={isDragging}
              >
                <div
                  className={`group/node relative w-full overflow-hidden rounded-xl border ${colorClasses[node.color]} bg-zinc-950/85 p-3 backdrop-blur transition-all hover:shadow-lg ${isDragging ? "shadow-xl ring-2 ring-white/40" : ""}`}
                  role="article"
                  aria-label={`${node.type} node: ${node.title}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/node:opacity-100" />

                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colorClasses[node.color]} bg-zinc-950/80 backdrop-blur`}
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <StatusBadge className="mb-0.5 border-white/10 bg-white/5 px-1.5 py-0 text-[9px] text-zinc-400">
                          {node.type}
                        </StatusBadge>
                        <h3 className="truncate text-xs font-semibold tracking-tight text-zinc-100">
                          {node.title}
                        </h3>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-400">
                      {node.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                      <span className="uppercase tracking-[0.1em]">
                        Connected
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer Stats */}
      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center gap-4 text-xs font-black text-zinc-500">
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            <span className="uppercase tracking-[0.15em]">
              {nodes.length} {nodes.length === 1 ? "Node" : "Nodes"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-1.5 rounded-full bg-zinc-900"
              aria-hidden="true"
            />
            <span className="uppercase tracking-[0.15em]">
              {connections.length}{" "}
              {connections.length === 1 ? "Connection" : "Connections"}
            </span>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
          Drag nodes to reposition
        </p>
      </div>
      {mermaid && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Actual Mermaid data</p>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-4 text-xs font-semibold leading-5 text-zinc-100">{mermaid}</pre>
        </div>
      )}
    </div>
  );
}
