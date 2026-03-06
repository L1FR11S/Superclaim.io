'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap, Mail, MessageSquare, GitBranch, Clock, AlertTriangle, Flag } from 'lucide-react';

// ─── Shared styles ──────────────────────────────────

const handleStyle = {
    width: 10,
    height: 10,
    background: '#0a1a18',
    border: '2px solid #00e5cc',
}

const baseNodeClass = `
    rounded-2xl border backdrop-blur-xl shadow-lg
    min-w-[220px] transition-all duration-200
    hover:shadow-[0_0_24px_rgba(0,229,204,0.15)]
`

// ─── Trigger Node ───────────────────────────────────

export const TriggerNode = memo(({ data }: NodeProps) => (
    <div className={`${baseNodeClass} border-emerald-500/30 bg-emerald-950/80`}>
        <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-medium">Trigger</p>
                <p className="text-sm font-medium text-emerald-100 truncate">{(data as any).label || 'Nytt ärende'}</p>
            </div>
        </div>
        <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
));
TriggerNode.displayName = 'TriggerNode';

// ─── Email Node ─────────────────────────────────────

export const EmailNode = memo(({ data, selected }: NodeProps) => (
    <div className={`${baseNodeClass} ${selected ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(0,229,204,0.2)]' : 'border-cyan-500/20'} bg-[#0a1a18]/90`}>
        <Handle type="target" position={Position.Left} style={handleStyle} />
        <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-cyan-400/70 font-medium">E-post</p>
                <p className="text-sm font-medium truncate">{(data as any).label || 'Skicka kravbrev'}</p>
            </div>
        </div>
        {(data as any).tone && (
            <div className="px-4 pb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/15">
                    {(data as any).tone === 'professional' ? '🏢 Professionell' : (data as any).tone === 'friendly' ? '😊 Vänlig' : '⚡ Direkt'}
                </span>
            </div>
        )}
        <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
));
EmailNode.displayName = 'EmailNode';

// ─── SMS Node ───────────────────────────────────────

export const SmsNode = memo(({ data, selected }: NodeProps) => (
    <div className={`${baseNodeClass} ${selected ? 'border-violet-400/60 shadow-[0_0_20px_rgba(139,92,246,0.2)]' : 'border-violet-500/20'} bg-[#0a1a18]/90`}>
        <Handle type="target" position={Position.Left} style={handleStyle} />
        <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-violet-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-violet-400/70 font-medium">SMS</p>
                <p className="text-sm font-medium truncate">{(data as any).label || 'SMS-påminnelse'}</p>
            </div>
        </div>
        <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
));
SmsNode.displayName = 'SmsNode';

// ─── Delay Node ─────────────────────────────────────

export const DelayNode = memo(({ data, selected }: NodeProps) => (
    <div className={`${baseNodeClass} ${selected ? 'border-amber-400/60' : 'border-amber-500/20'} bg-[#0a1a18]/90 min-w-[180px]`}>
        <Handle type="target" position={Position.Left} style={handleStyle} />
        <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-medium">Fördröjning</p>
                <p className="text-sm font-medium truncate">{(data as any).days || 7} dagar</p>
            </div>
        </div>
        <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
));
DelayNode.displayName = 'DelayNode';

// ─── Condition Node ─────────────────────────────────

export const ConditionNode = memo(({ data, selected }: NodeProps) => (
    <div className={`${baseNodeClass} ${selected ? 'border-orange-400/60' : 'border-orange-500/20'} bg-[#0a1a18]/90`}>
        <Handle type="target" position={Position.Left} style={handleStyle} />
        <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                <GitBranch className="h-4 w-4 text-orange-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-orange-400/70 font-medium">Villkor</p>
                <p className="text-sm font-medium truncate">{(data as any).label || 'Gäldenär svarar?'}</p>
            </div>
        </div>
        <div className="flex flex-col gap-0.5 px-4 pb-3 text-[10px]">
            <span className="text-green-400">✓ Ja ↑</span>
            <span className="text-red-400">✗ Nej ↓</span>
        </div>
        <Handle type="source" position={Position.Right} id="yes" style={{ ...handleStyle, top: '30%' }} />
        <Handle type="source" position={Position.Right} id="no" style={{ ...handleStyle, top: '70%' }} />
    </div>
));
ConditionNode.displayName = 'ConditionNode';

// ─── Escalate Node ──────────────────────────────────

export const EscalateNode = memo(({ data }: NodeProps) => (
    <div className={`${baseNodeClass} border-red-500/30 bg-red-950/60`}>
        <Handle type="target" position={Position.Left} style={handleStyle} />
        <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-red-400/70 font-medium">Eskalera</p>
                <p className="text-sm font-medium text-red-100 truncate">{(data as any).label || 'Till inkasso'}</p>
            </div>
        </div>
    </div>
));
EscalateNode.displayName = 'EscalateNode';

// ─── End/Paid Node ──────────────────────────────────

export const EndNode = memo(({ data }: NodeProps) => (
    <div className={`${baseNodeClass} border-green-500/30 bg-green-950/60`}>
        <Handle type="target" position={Position.Left} style={handleStyle} />
        <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                <Flag className="h-4 w-4 text-green-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-green-400/70 font-medium">Avslut</p>
                <p className="text-sm font-medium text-green-100 truncate">{(data as any).label || 'Betald — stäng ärende'}</p>
            </div>
        </div>
    </div>
));
EndNode.displayName = 'EndNode';

// ─── Node type registry ─────────────────────────────

export const nodeTypes = {
    trigger: TriggerNode,
    email: EmailNode,
    sms: SmsNode,
    delay: DelayNode,
    condition: ConditionNode,
    escalate: EscalateNode,
    end: EndNode,
}
