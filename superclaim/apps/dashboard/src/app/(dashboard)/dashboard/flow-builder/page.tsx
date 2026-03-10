'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    ReactFlow,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    BackgroundVariant,
    MiniMap,
    Panel,
    type Connection,
    type Edge,
    type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '@/components/flow/FlowNodes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Zap, Mail, MessageSquare, GitBranch, Clock, AlertTriangle, Flag,
    Save, Loader2, ArrowLeft, X, Trash2, LayoutTemplate, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

// ─── Default flow ───────────────────────────────────

const defaultNodes: Node[] = [
    { id: '1', type: 'trigger', position: { x: 0, y: 200 }, data: { label: 'Nytt ärende skapas' } },
    { id: '2', type: 'delay', position: { x: 280, y: 200 }, data: { days: 3 } },
    { id: '3', type: 'email', position: { x: 560, y: 200 }, data: { label: 'Vänlig påminnelse', tone: 'friendly' } },
    { id: '4', type: 'delay', position: { x: 840, y: 200 }, data: { days: 7 } },
    { id: '5', type: 'email', position: { x: 1120, y: 200 }, data: { label: 'Formell påminnelse', tone: 'professional' } },
    { id: '6', type: 'delay', position: { x: 1400, y: 200 }, data: { days: 7 } },
    { id: '7', type: 'condition', position: { x: 1680, y: 200 }, data: { label: 'Gäldenär svarar?' } },
    { id: '8', type: 'end', position: { x: 1960, y: 80 }, data: { label: 'Avsluta — manuell hantering' } },
    { id: '9', type: 'sms', position: { x: 1960, y: 340 }, data: { label: 'SMS-krav med fakturalänk' } },
    { id: '10', type: 'delay', position: { x: 2240, y: 340 }, data: { days: 8 } },
    { id: '11', type: 'email', position: { x: 2520, y: 340 }, data: { label: 'Sista varning', tone: 'direct' } },
    { id: '12', type: 'delay', position: { x: 2800, y: 340 }, data: { days: 5 } },
    { id: '13', type: 'escalate', position: { x: 3080, y: 340 }, data: { label: 'Överlämna till inkasso' } },
];
const defaultEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' },
    { id: 'e4-5', source: '4', target: '5' },
    { id: 'e5-6', source: '5', target: '6' },
    { id: 'e6-7', source: '6', target: '7' },
    { id: 'e7-8', source: '7', sourceHandle: 'yes', target: '8', label: 'Ja', style: { stroke: '#4ade80' } },
    { id: 'e7-9', source: '7', sourceHandle: 'no', target: '9', label: 'Nej', style: { stroke: '#f87171' } },
    { id: 'e9-10', source: '9', target: '10' },
    { id: 'e10-11', source: '10', target: '11' },
    { id: 'e11-12', source: '11', target: '12' },
    { id: 'e12-13', source: '12', target: '13' },
];

// ─── Templates ──────────────────────────────────────

const flowTemplates: { id: string; name: string; desc: string; nodes: Node[]; edges: Edge[] }[] = [
    {
        id: 'standard',
        name: 'Standard',
        desc: '4 steg — vänlig → formell → SMS → eskalering',
        nodes: defaultNodes,
        edges: defaultEdges,
    },
    {
        id: 'aggressive',
        name: 'Aggressiv',
        desc: '3 steg — kort tid, direkt ton, snabb eskalering',
        nodes: [
            { id: '1', type: 'trigger', position: { x: 0, y: 200 }, data: { label: 'Nytt ärende skapas' } },
            { id: '2', type: 'delay', position: { x: 280, y: 200 }, data: { days: 1 } },
            { id: '3', type: 'email', position: { x: 560, y: 200 }, data: { label: 'Kravbrev — betalning krävs omgående', tone: 'direct' } },
            { id: '4', type: 'delay', position: { x: 840, y: 200 }, data: { days: 3 } },
            { id: '5', type: 'sms', position: { x: 1120, y: 200 }, data: { label: 'SMS — sista chansen' } },
            { id: '6', type: 'delay', position: { x: 1400, y: 200 }, data: { days: 3 } },
            { id: '7', type: 'escalate', position: { x: 1680, y: 200 }, data: { label: 'Överlämna till inkasso' } },
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2', animated: true },
            { id: 'e2-3', source: '2', target: '3' },
            { id: 'e3-4', source: '3', target: '4' },
            { id: 'e4-5', source: '4', target: '5' },
            { id: 'e5-6', source: '5', target: '6' },
            { id: 'e6-7', source: '6', target: '7' },
        ],
    },
    {
        id: 'gentle',
        name: 'Mjuk',
        desc: '5 steg — lång tid, vänlig ton, ingen eskalering',
        nodes: [
            { id: '1', type: 'trigger', position: { x: 0, y: 200 }, data: { label: 'Nytt ärende skapas' } },
            { id: '2', type: 'delay', position: { x: 280, y: 200 }, data: { days: 5 } },
            { id: '3', type: 'email', position: { x: 560, y: 200 }, data: { label: 'Vänlig påminnelse', tone: 'friendly' } },
            { id: '4', type: 'delay', position: { x: 840, y: 200 }, data: { days: 10 } },
            { id: '5', type: 'email', position: { x: 1120, y: 200 }, data: { label: 'Uppföljande påminnelse', tone: 'friendly' } },
            { id: '6', type: 'delay', position: { x: 1400, y: 200 }, data: { days: 10 } },
            { id: '7', type: 'sms', position: { x: 1680, y: 200 }, data: { label: 'Vänlig SMS-påminnelse' } },
            { id: '8', type: 'delay', position: { x: 1960, y: 200 }, data: { days: 14 } },
            { id: '9', type: 'email', position: { x: 2240, y: 200 }, data: { label: 'Sista vänliga påminnelse', tone: 'professional' } },
            { id: '10', type: 'end', position: { x: 2520, y: 200 }, data: { label: 'Avsluta — manuell uppföljning' } },
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2', animated: true },
            { id: 'e2-3', source: '2', target: '3' },
            { id: 'e3-4', source: '3', target: '4' },
            { id: 'e4-5', source: '4', target: '5' },
            { id: 'e5-6', source: '5', target: '6' },
            { id: 'e6-7', source: '6', target: '7' },
            { id: 'e7-8', source: '7', target: '8' },
            { id: 'e8-9', source: '8', target: '9' },
            { id: 'e9-10', source: '9', target: '10' },
        ],
    },
];

// ─── Palette ────────────────────────────────────────

const palette = [
    { type: 'trigger', label: 'Trigger', icon: Zap, color: 'emerald' },
    { type: 'email', label: 'E-post', icon: Mail, color: 'cyan' },
    { type: 'sms', label: 'SMS', icon: MessageSquare, color: 'violet' },
    { type: 'delay', label: 'Fördröjning', icon: Clock, color: 'amber' },
    { type: 'condition', label: 'Villkor', icon: GitBranch, color: 'orange' },
    { type: 'escalate', label: 'Eskalera', icon: AlertTriangle, color: 'red' },
    { type: 'end', label: 'Avslut', icon: Flag, color: 'green' },
];
const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20',
};

const typeLabels: Record<string, string> = {
    trigger: 'Trigger', email: 'E-post', sms: 'SMS',
    delay: 'Fördröjning', condition: 'Villkor',
    escalate: 'Eskalera', end: 'Avslut',
};

// ─── Component ──────────────────────────────────────

export default function FlowBuilderPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const idCounter = useRef(100);

    const [pendingTemplate, setPendingTemplate] = useState<typeof flowTemplates[0] | null>(null);

    const applyTemplate = (template: typeof flowTemplates[0]) => {
        setPendingTemplate(template);
    };

    const confirmApplyTemplate = () => {
        if (!pendingTemplate) return;
        setNodes(pendingTemplate.nodes);
        setEdges(pendingTemplate.edges);
        setShowTemplates(false);
        toast.success(`Mall "${pendingTemplate.name}" laddad`, { description: pendingTemplate.desc });
        setPendingTemplate(null);
    };

    // Load saved flow from DB
    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                if (data.agent_flow?.nodes?.length > 0) {
                    setNodes(data.agent_flow.nodes);
                    setEdges(data.agent_flow.edges || []);
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            style: { stroke: '#00e5cc40', strokeWidth: 2 },
        }, eds)),
        [setEdges],
    );

    // Update node data when editing in properties panel
    const updateNodeData = useCallback((nodeId: string, key: string, value: any) => {
        setNodes((nds) =>
            nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n)
        );
        if (selectedNode?.id === nodeId) {
            setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
        }
    }, [setNodes, selectedNode]);

    // Delete selected node
    const deleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        setSelectedNode(null);
    }, [setNodes, setEdges]);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/reactflow');
        if (!type) return;
        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return;
        const position = { x: e.clientX - bounds.left - 110, y: e.clientY - bounds.top - 30 };
        const defaults: Record<string, any> = {
            trigger: { label: 'Ny trigger' }, email: { label: 'Nytt e-postmeddelande', tone: 'professional' },
            sms: { label: 'Nytt SMS' }, delay: { days: 7 }, condition: { label: 'Nytt villkor' },
            escalate: { label: 'Eskalera' }, end: { label: 'Avslut' },
        };
        const newNode: Node = { id: `node_${idCounter.current++}`, type, position, data: defaults[type] || {} };
        setNodes((nds) => [...nds, newNode]);
    }, [setNodes]);

    const onDragStart = (e: React.DragEvent, nodeType: string) => {
        e.dataTransfer.setData('application/reactflow', nodeType);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_flow: { nodes, edges } }),
            });
            if (res.ok) toast.success('Flödet sparat!', { description: 'Ditt agentflöde har sparats.' });
            else toast.error('Kunde inte spara');
        } catch { toast.error('Nätverksfel'); }
        finally { setSaving(false); }
    };

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/settings" className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-[#ffffff08] transition-all">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Agentflöde</h1>
                        <p className="text-xs text-muted-foreground">Designa agentens indrivningsprocess — klicka på noder för att redigera</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Button variant="outline" size="sm"
                            onClick={() => setShowTemplates(!showTemplates)}
                            className="border-[#ffffff10] bg-[#122220]/50 hover:bg-primary/10 hover:border-primary/20 hover:text-primary text-muted-foreground"
                        >
                            <LayoutTemplate className="h-4 w-4 mr-2" />
                            Mallar
                            <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                        </Button>
                        {showTemplates && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-[#0a1a18]/98 backdrop-blur-xl border border-[#ffffff10] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-2 border-b border-[#ffffff08]">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1">Välj en mall</p>
                                </div>
                                <div className="p-1.5 space-y-0.5">
                                    {flowTemplates.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => applyTemplate(t)}
                                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-all group"
                                        >
                                            <p className="text-sm font-medium group-hover:text-primary transition-colors">{t.name}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <Button onClick={handleSave} disabled={saving}
                        className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_16px_rgba(0,229,204,0.2)] hover:shadow-[0_0_24px_rgba(0,229,204,0.4)] transition-all">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Spara flöde
                    </Button>
                </div>
            </div>

            {/* Canvas + Properties Panel */}
            <div className="flex-1 flex gap-0 min-h-0">
                {/* Canvas */}
                <div ref={reactFlowWrapper} className="flex-1 rounded-l-2xl border border-[#ffffff08] overflow-hidden" style={{ minHeight: '600px' }}>
                    <ReactFlow
                        nodes={nodes} edges={edges}
                        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        onConnect={onConnect} onDrop={onDrop} onDragOver={onDragOver}
                        onNodeClick={onNodeClick} onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        defaultEdgeOptions={{ style: { stroke: '#00e5cc30', strokeWidth: 2 }, type: 'smoothstep' }}
                        fitView fitViewOptions={{ padding: 0.2 }}
                        deleteKeyCode="Backspace"
                        proOptions={{ hideAttribution: true }}
                        style={{ width: '100%', height: '100%', background: '#060e0d' }}
                    >
                        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ffffff08" />
                        <Controls className="!bg-[#0a1a18]/90 !border-[#ffffff10] !rounded-xl !shadow-lg [&>button]:!bg-[#0a1a18] [&>button]:!border-[#ffffff10] [&>button]:!text-muted-foreground [&>button:hover]:!bg-primary/10 [&>button:hover]:!text-primary [&>button]:!rounded-lg" />
                        <MiniMap className="!bg-[#0a1a18]/90 !border-[#ffffff10] !rounded-xl" maskColor="#060e0d90"
                            nodeColor={(node) => ({ trigger: '#10b981', email: '#06b6d4', sms: '#8b5cf6', delay: '#f59e0b', condition: '#f97316', escalate: '#ef4444', end: '#22c55e' }[node.type || ''] || '#00e5cc')} />

                        {/* Drag & Drop Palette */}
                        <Panel position="top-left" className="!m-3">
                            <div className="w-48 rounded-2xl bg-[#0a1a18]/95 backdrop-blur-xl border border-[#ffffff10] shadow-[0_0_32px_rgba(0,0,0,0.3)] p-3 space-y-1.5">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1 pb-1">Dra &amp; släpp noder</p>
                                {palette.map((item) => (
                                    <div key={item.type} draggable onDragStart={(e) => onDragStart(e, item.type)}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all text-sm ${colorMap[item.color]}`}>
                                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-xs font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* ─── Properties Panel ─────────────────── */}
                <div className={`shrink-0 transition-all duration-300 overflow-hidden ${selectedNode ? 'w-72' : 'w-0'}`}>
                    {selectedNode && (
                        <div className="w-72 h-full bg-[#0a1a18]/95 backdrop-blur-xl border-y border-r border-[#ffffff10] rounded-r-2xl p-5 space-y-5 animate-in slide-in-from-right-4 duration-200 overflow-y-auto">
                            {/* Panel Header */}
                            <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                    {typeLabels[selectedNode.type || ''] || 'Nod'}
                                </p>
                                <button onClick={() => setSelectedNode(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-[#ffffff08]">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Label */}
                            {selectedNode.type !== 'delay' && (
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Namn</Label>
                                    <Input
                                        value={(selectedNode.data as any).label || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'label', e.target.value)}
                                        className="bg-[#122220] border-[#ffffff10] text-sm"
                                    />
                                </div>
                            )}

                            {/* Delay — days */}
                            {selectedNode.type === 'delay' && (
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Antal dagar</Label>
                                    <Input
                                        type="number" min={1} max={90}
                                        value={(selectedNode.data as any).days || 7}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'days', parseInt(e.target.value) || 1)}
                                        className="bg-[#122220] border-[#ffffff10] text-sm"
                                    />
                                    <p className="text-[10px] text-muted-foreground/60 mt-1">Väntetid innan nästa steg</p>
                                </div>
                            )}

                            {/* Email — tone */}
                            {selectedNode.type === 'email' && (
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Tonalitet</Label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {(['friendly', 'professional', 'direct'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => updateNodeData(selectedNode.id, 'tone', t)}
                                                className={`text-[10px] px-2 py-1.5 rounded-lg border transition-all ${(selectedNode.data as any).tone === t
                                                    ? 'bg-primary/20 border-primary/30 text-primary'
                                                    : 'border-[#ffffff10] text-muted-foreground hover:border-[#ffffff20]'
                                                    }`}
                                            >
                                                {t === 'friendly' ? 'Vänlig' : t === 'professional' ? 'Formell' : 'Direkt'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Condition — description */}
                            {selectedNode.type === 'condition' && (
                                <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                                    <p className="text-xs text-orange-400/80">
                                        Villkorsnoden delar flödet i två vägar. Koppla <span className="text-green-400">Ja</span>-utgången till vänster och <span className="text-red-400">Nej</span>-utgången till höger.
                                    </p>
                                </div>
                            )}

                            {/* Delete Button */}
                            <div className="pt-2 border-t border-[#ffffff08]">
                                <button
                                    onClick={() => deleteNode(selectedNode.id)}
                                    className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all w-full"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Ta bort nod
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Template Confirm */}
            <ConfirmDialog
                open={!!pendingTemplate}
                onConfirm={confirmApplyTemplate}
                onCancel={() => setPendingTemplate(null)}
                title={`Byta till "${pendingTemplate?.name}"?`}
                description="Ditt nuvarande flöde ersätts med mallen."
                confirmLabel="Byt mall"
                variant="warning"
            />
        </div>
    );
}
