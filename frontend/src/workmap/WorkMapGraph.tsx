/**
 * Work Map as an interactive graph (React Flow, lazy chunk).
 *
 * Layout is computed directly from the WorkMap (no auto-layout library):
 *   wide  — steps run left → right; each step's guardrails (red stop plates)
 *           and exceptions hang below it.
 *   narrow — steps run top → bottom; guardrails/exceptions sit to the right.
 * Visual language matches the landing scene: glass step nodes, signal edges,
 * red guardrail nodes.
 */
import { memo, useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  getNodesBounds,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Image as ImageIcon, OctagonAlert, Split } from "lucide-react";
import type { WorkMap, WorkMapStep } from "@/types";

type StepData = { step: WorkMapStep; selected: boolean; vertical: boolean };
type RuleData = { text: string; kind: "guardrail" | "exception"; vertical: boolean; stepId: string };
type StepNode = Node<StepData, "step">;
type RuleNode = Node<RuleData, "rule">;

const STEP_W = 248;
/** Below this zoom, node text (11–12px) becomes unreadable. */
const MIN_READABLE_ZOOM = 0.72;
const RULE_W = 220;

const hidden = "!size-1.5 !min-w-0 !border-0 !bg-transparent";

const StepCard = memo(function StepCard({ data }: NodeProps<StepNode>) {
  const { step, selected, vertical } = data;
  return (
    <div
      className={`group w-[248px] rounded-xl border p-3.5 text-left backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-300 ${
        selected
          ? "border-signal/60 bg-[#141a0b]/90 shadow-[0_0_0_1px_rgba(200,246,90,0.25),0_0_40px_-6px_rgba(200,246,90,0.35)]"
          : "border-line-strong bg-surface/90 hover:border-fg-faint"
      }`}
    >
      <Handle type="target" position={vertical ? Position.Top : Position.Left} className={hidden} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-mono text-[10.5px] font-medium tracking-wider ${selected ? "text-signal" : "text-fg-faint"}`}>
          STEP {String(step.stepNumber).padStart(2, "0")}
        </span>
        <span className="flex items-center gap-1.5">
          {step.screenshotRef && <ImageIcon className="size-3 text-fg-faint" aria-label="Has screen evidence" />}
          {step.ticketId && (
            <span className="rounded bg-signal/10 px-1.5 py-0.5 font-mono text-[10.5px] text-signal ring-1 ring-signal/20">{step.ticketId}</span>
          )}
        </span>
      </div>
      <div className="line-clamp-2 text-[12.5px] font-medium leading-snug text-fg">{step.observedAction}</div>
      <div className="mt-2.5 truncate rounded-md border border-line bg-ink/60 px-2 py-1 font-mono text-[10.5px] text-fg-muted" title={step.decision}>
        {step.decision}
      </div>
      <Handle type="source" position={vertical ? Position.Bottom : Position.Right} className={hidden} />
      <Handle id="rules" type="source" position={vertical ? Position.Right : Position.Bottom} className={hidden} />
    </div>
  );
});

const RuleCard = memo(function RuleCard({ data }: NodeProps<RuleNode>) {
  const guard = data.kind === "guardrail";
  const Icon = guard ? OctagonAlert : Split;
  return (
    <div
      className={`w-[220px] rounded-lg border px-3 py-2.5 text-[11.5px] leading-snug ${
        guard ? "border-stop/45 bg-[#1d0d0c]/90 text-[#ffd2cc]" : "border-dashed border-amber/40 bg-[#1b150a]/90 text-[#f3dcae]"
      }`}
    >
      <Handle type="target" position={data.vertical ? Position.Left : Position.Top} className={hidden} />
      <div className={`mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${guard ? "text-stop" : "text-amber"}`}>
        <Icon className="size-3" aria-hidden />
        {guard ? "Guardrail" : "Exception"}
      </div>
      {data.text}
    </div>
  );
});

const nodeTypes = { step: StepCard, rule: RuleCard };

function buildGraph(map: WorkMap, selectedId: string | null, vertical: boolean) {
  const nodes: Array<StepNode | RuleNode> = [];
  const edges: Edge[] = [];
  const gapMain = vertical ? 200 : STEP_W + 90;

  map.steps.forEach((step, i) => {
    const pos = vertical ? { x: 0, y: i * gapMain } : { x: i * gapMain, y: 0 };
    nodes.push({ id: step.id, type: "step", position: pos, data: { step, selected: step.id === selectedId, vertical } });

    if (i > 0) {
      const prev = map.steps[i - 1].id;
      edges.push({
        id: `${prev}->${step.id}`,
        source: prev,
        target: step.id,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#c8f65a", strokeWidth: 1.5, opacity: 0.75 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#c8f65a", width: 16, height: 16 },
      });
    }

    const rules: Array<{ text: string; kind: RuleData["kind"] }> = [
      ...step.guardrails.map((text) => ({ text, kind: "guardrail" as const })),
      ...step.exceptions.map((text) => ({ text, kind: "exception" as const })),
    ];
    rules.forEach((r, k) => {
      const id = `${step.id}-r${k}`;
      const rp = vertical
        ? { x: STEP_W + 70, y: pos.y + k * 96 }
        : { x: pos.x + (STEP_W - RULE_W) / 2, y: 175 + k * 104 };
      nodes.push({ id, type: "rule", position: rp, data: { ...r, vertical, stepId: step.id }, selectable: true });
      const guard = r.kind === "guardrail";
      edges.push({
        id: `${step.id}=>${id}`,
        source: step.id,
        sourceHandle: "rules",
        target: id,
        type: "smoothstep",
        style: { stroke: guard ? "#ff5d52" : "#f5b544", strokeWidth: 1.25, strokeDasharray: "4 4", opacity: 0.7 },
      });
    });
  });

  return { nodes, edges };
}

function GraphInner({
  map,
  selectedId,
  onSelect,
  vertical,
}: {
  map: WorkMap;
  selectedId: string | null;
  onSelect: (id: string) => void;
  vertical: boolean;
}) {
  const { nodes, edges } = useMemo(() => buildGraph(map, selectedId, vertical), [map, selectedId, vertical]);
  const flow = useReactFlow();

  // Fit after the screen's enter transition (~320 ms), when the orientation
  // flips, and whenever the container is resized.
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Narrow screens: fit the width (step + rule column) and start at the top;
    // the user pans down through the steps. Wide screens: fit everything.
    const fit = (duration: number) => {
      const w = host.current?.clientWidth ?? 0;
      if (vertical && w) {
        const pad = 20;
        const zoom = Math.min(1, (w - pad * 2) / (STEP_W + 70 + RULE_W));
        flow.setViewport({ x: pad, y: pad, zoom }, { duration });
      } else if (w) {
        // Fit everything if it stays readable; otherwise start at the first
        // step at a readable zoom and let the user pan.
        const h = host.current?.clientHeight ?? 0;
        const b = getNodesBounds(flow.getNodes());
        const pad = 56;
        const fitZoom = Math.min((w - pad * 2) / b.width, (h - pad * 2) / b.height, 1.1);
        if (fitZoom >= MIN_READABLE_ZOOM) {
          flow.fitView({ padding: `${pad}px`, duration });
        } else {
          const zoom = MIN_READABLE_ZOOM;
          flow.setViewport({ x: pad - b.x * zoom, y: (h - b.height * zoom) / 2 - b.y * zoom, zoom }, { duration });
        }
      }
    };
    let t = setTimeout(() => fit(400), 380);
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => fit(300), 120);
    });
    if (host.current) ro.observe(host.current);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [vertical, flow]);

  return (
    <div ref={host} className="absolute inset-0">
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      forceColorMode="dark"
      fitView
      fitViewOptions={{ padding: "56px" }}
      minZoom={0.3}
      maxZoom={1.6}
      panOnScroll
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      onNodeClick={(_, n) => onSelect(n.type === "rule" ? (n.data as RuleData).stepId : n.id)}
      ariaLabelConfig={{ "node.a11yDescription.default": "Press Enter to open this step's details." }}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement;
        const id = target.closest<HTMLElement>("[data-id]")?.dataset.id;
        if ((e.key === "Enter" || e.key === " ") && id) {
          const node = nodes.find((n) => n.id === id);
          if (node) onSelect(node.type === "rule" ? (node.data as RuleData).stepId : node.id);
        }
      }}
      proOptions={{ hideAttribution: false }}
      style={{ background: "transparent" }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.09)" />
      <Controls showInteractive={false} position="bottom-right" className="wm-controls max-md:!hidden" />
    </ReactFlow>
    </div>
  );
}

export default function WorkMapGraph(props: {
  map: WorkMap;
  selectedId: string | null;
  onSelect: (id: string) => void;
  vertical: boolean;
}) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
