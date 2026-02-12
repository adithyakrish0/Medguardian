"use client";

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphEdge, getSeverityColor } from '@/lib/api/interactions';

interface InteractionGraphProps {
    data: GraphData;
}

interface SimulationNode extends GraphNode, d3.SimulationNodeDatum {
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface SimulationEdge extends d3.SimulationLinkDatum<SimulationNode> {
    severity: string;
    description: string;
}

export default function InteractionGraph({ data }: InteractionGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        content: string;
        severity?: string;
    }>({ visible: false, x: 0, y: 0, content: '' });

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || !data.nodes.length) return;

        // Clear previous render
        d3.select(svgRef.current).selectAll("*").remove();

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height]);

        // Create container group for zoom
        const g = svg.append('g');

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Prepare data for simulation
        const nodes: SimulationNode[] = data.nodes.map(n => ({ ...n }));
        const links: SimulationEdge[] = data.edges.map(e => ({
            source: e.source,
            target: e.target,
            severity: e.severity,
            description: e.description
        }));

        // Create force simulation
        const simulation = d3.forceSimulation<SimulationNode>(nodes)
            .force('link', d3.forceLink<SimulationNode, SimulationEdge>(links)
                .id(d => d.id)
                .distance(150)
                .strength(0.5))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(60));

        // Create arrow markers for edges
        const defs = svg.append('defs');

        ['critical', 'major', 'moderate', 'minor'].forEach(severity => {
            defs.append('marker')
                .attr('id', `arrow-${severity}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('fill', getSeverityColor(severity as any))
                .attr('d', 'M0,-5L10,0L0,5');
        });

        // Draw edges
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', d => getSeverityColor(d.severity as any))
            .attr('stroke-width', d => {
                switch (d.severity) {
                    case 'critical': return 4;
                    case 'major': return 3;
                    case 'moderate': return 2;
                    default: return 1.5;
                }
            })
            .attr('stroke-opacity', 0.8)
            .attr('marker-end', d => `url(#arrow-${d.severity})`)
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => {
                const rect = container.getBoundingClientRect();
                setTooltip({
                    visible: true,
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                    content: d.description,
                    severity: d.severity
                });
            })
            .on('mouseleave', () => {
                setTooltip(prev => ({ ...prev, visible: false }));
            });

        // Draw nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .style('cursor', 'grab')
            .call(d3.drag<SVGGElement, SimulationNode>()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }) as any);

        // Node circles
        node.append('circle')
            .attr('r', 28)
            .attr('fill', d => d.hasInteraction ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)')
            .attr('stroke', d => d.hasInteraction ? '#ef4444' : '#22c55e')
            .attr('stroke-width', 3);

        // Node inner circle (pill representation)
        node.append('circle')
            .attr('r', 18)
            .attr('fill', d => d.hasInteraction ? '#fecaca' : '#bbf7d0')
            .attr('stroke', d => d.hasInteraction ? '#f87171' : '#4ade80')
            .attr('stroke-width', 2);

        // Node labels
        node.append('text')
            .text(d => {
                // Truncate long names
                const name = d.label;
                return name.length > 12 ? name.substring(0, 10) + '...' : name;
            })
            .attr('text-anchor', 'middle')
            .attr('dy', 50)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', 'currentColor')
            .attr('class', 'select-none');

        // Pulse animation for nodes with interactions
        node.filter(d => d.hasInteraction)
            .append('circle')
            .attr('r', 28)
            .attr('fill', 'none')
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .style('animation', 'pulse 2s infinite');

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { r: 28; opacity: 0.8; }
                100% { r: 45; opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        // Node hover effect
        node.on('mouseenter', function (event, d) {
            d3.select(this).select('circle').transition().attr('r', 32);
            const rect = container.getBoundingClientRect();
            setTooltip({
                visible: true,
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                content: `${d.label}${d.dosage ? ` - ${d.dosage}` : ''}`,
                severity: d.hasInteraction ? 'critical' : undefined
            });
        })
            .on('mouseleave', function () {
                d3.select(this).select('circle').transition().attr('r', 28);
                setTooltip(prev => ({ ...prev, visible: false }));
            });

        // Update positions on tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as SimulationNode).x!)
                .attr('y1', d => (d.source as SimulationNode).y!)
                .attr('x2', d => (d.target as SimulationNode).x!)
                .attr('y2', d => (d.target as SimulationNode).y!);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Center the graph initially
        svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.9));

        // Cleanup
        return () => {
            simulation.stop();
            style.remove();
        };
    }, [data]);

    if (!data.nodes.length) {
        return (
            <div className="w-full h-full flex items-center justify-center text-center opacity-50">
                <div>
                    <p className="text-lg font-bold">No medications to display</p>
                    <p className="text-sm">Add medications to see the interaction graph</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full relative">
            <svg ref={svgRef} className="w-full h-full" />

            {/* Tooltip */}
            {tooltip.visible && (
                <div
                    className={`absolute pointer-events-none z-50 px-3 py-2 rounded-lg text-sm font-bold max-w-xs shadow-xl ${tooltip.severity === 'critical' ? 'bg-red-500 text-white' :
                            tooltip.severity === 'major' ? 'bg-orange-500 text-white' :
                                tooltip.severity === 'moderate' ? 'bg-yellow-500 text-black' :
                                    'bg-gray-800 text-white'
                        }`}
                    style={{
                        left: tooltip.x + 10,
                        top: tooltip.y - 30,
                        transform: 'translateX(-50%)'
                    }}
                >
                    {tooltip.content}
                </div>
            )}

            {/* Instructions */}
            <div className="absolute bottom-2 left-2 text-xs opacity-50 font-medium">
                Drag nodes • Scroll to zoom • Hover for details
            </div>
        </div>
    );
}
