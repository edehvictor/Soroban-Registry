"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";
import type { GraphNode, GraphEdge } from "@/lib/api";
import { useDependencyGraph } from "./graph/DependencyGraph/useDependencyGraph";
import { GraphSVG } from "./graph/DependencyGraph/GraphSVG";

export interface DependencyGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  focusOnNode: (id: string) => void;
  exportSVG: () => void;
  exportPNG: () => void;
  panUp: () => void;
  panDown: () => void;
  panLeft: () => void;
  panRight: () => void;
}

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  searchQuery?: string;
  dependentCounts?: Map<string, number>;
  onNodeClick?: (node: GraphNode | null) => void;
  selectedNode?: GraphNode | null;
}

const DependencyGraph = forwardRef<DependencyGraphHandle, DependencyGraphProps>(
  function DependencyGraph(
    {
      nodes,
      edges,
      dependentCounts = new Map(),
      onNodeClick,
      selectedNode,
    },
    ref,
  ) {
    const {
      svgRef,
      zoomRef,
      gRef,
      tooltip,
      setTooltip,
      setEdgeTooltip,
      pinnedRef,
      resolvedTheme,
    } = useDependencyGraph(
      nodes,
      edges,
      dependentCounts,
      selectedNode ?? null,
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const isLargeGraph = nodes.length > 200;
    const isVeryLargeGraph = nodes.length > 500;
    const handleGraphReady = useCallback(
      (
        graph: d3.Selection<SVGGElement, unknown, null, undefined> | null,
      ) => {
        gRef.current = graph;
      },
      [gRef],
    );
    const handleZoomReady = useCallback(
      (zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null) => {
        zoomRef.current = zoom;
      },
      [zoomRef],
    );

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .call(zoomRef.current.scaleBy, 1.3);
        }
      },
      zoomOut: () => {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .call(zoomRef.current.scaleBy, 1 / 1.3);
        }
      },
      resetZoom: () => {
        if (svgRef.current && zoomRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          d3.select(svgRef.current)
            .transition()
            .call(
              zoomRef.current.transform,
              d3.zoomIdentity
                .translate(rect.width / 2, rect.height / 2)
                .scale(1),
            );
        }
      },
      focusOnNode: (id: string) => {
        if (!svgRef.current || !zoomRef.current || !gRef.current) return;
        const node = gRef.current
          .selectAll<SVGGElement, d3.SimulationNodeDatum & { id: string }>(
            "g.node",
          )
          .filter((d) => d.id === id)
          .datum();
        if (!node || node.x == null || node.y == null) return;

        const rect = svgRef.current.getBoundingClientRect();
        d3.select(svgRef.current)
          .transition()
          .call(
            zoomRef.current.transform,
            d3.zoomIdentity
              .translate(rect.width / 2 - node.x, rect.height / 2 - node.y)
              .scale(1.4),
          );
      },
      exportSVG: () => {
        if (!svgRef.current) return;
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgRef.current);
        const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "dependency-graph.svg";
        link.click();
        URL.revokeObjectURL(url);
      },
      exportPNG: () => {
        if (!svgRef.current) return;
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgRef.current);
        const svgBlob = new Blob([source], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        const image = new Image();
        const rect = svgRef.current.getBoundingClientRect();

        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.ceil(rect.width));
          canvas.height = Math.max(1, Math.ceil(rect.height));
          const context = canvas.getContext("2d");
          if (!context) return;
          context.drawImage(image, 0, 0);
          URL.revokeObjectURL(url);
          const pngUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = "dependency-graph.png";
          link.click();
        };

        image.src = url;
      },
      panUp: () => {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .call(zoomRef.current.translateBy, 0, 80);
        }
      },
      panDown: () => {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .call(zoomRef.current.translateBy, 0, -80);
        }
      },
      panLeft: () => {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .call(zoomRef.current.translateBy, 80, 0);
        }
      },
      panRight: () => {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .call(zoomRef.current.translateBy, -80, 0);
        }
      },
    }));

    if (nodes.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/30">
          <p className="text-muted-foreground text-sm">No nodes to display.</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full relative" ref={containerRef}>
        <GraphSVG
          nodes={nodes}
          edges={edges}
          dependentCounts={dependentCounts}
          resolvedTheme={resolvedTheme}
          svgRef={svgRef}
          onGraphReady={handleGraphReady}
          onZoomReady={handleZoomReady}
          setTooltip={setTooltip}
          setEdgeTooltip={setEdgeTooltip}
          selectedNode={selectedNode ?? null}
          onNodeClick={onNodeClick}
          pinnedRef={pinnedRef}
          isLargeGraph={isLargeGraph}
          isVeryLargeGraph={isVeryLargeGraph}
        />

        {isVeryLargeGraph && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className="bg-amber-900/80 backdrop-blur border border-amber-700/50 rounded-lg px-3 py-1.5 text-xs text-amber-200">
              Large graph — labels hidden for performance
            </div>
          </div>
        )}

        {tooltip && (
          <div
            className="pointer-events-none absolute z-40 bg-background/95 backdrop-blur-xl border border-border rounded-xl px-3 py-2.5 shadow-2xl text-xs"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
          >
            <p className="font-semibold text-foreground mb-1">
              {tooltip.node.name}
            </p>
            <div className="space-y-0.5 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <span>Network</span>
                <span className="text-foreground capitalize">
                  {tooltip.node.network}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Dependents</span>
                <span className="text-foreground">{tooltip.dependents}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default DependencyGraph;
