'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NewClaimModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function NewClaimModal({ open, onClose, onCreated }: NewClaimModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        debtor_name: '',
        debtor_email: '',
        debtor_phone: '',
        invoice_number: '',
        amount: '',
        currency: 'SEK',
        due_date: '',
    });

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) setFile(dropped);
    }, []);

    const handleSubmit = async () => {
        if (!form.debtor_name || !form.debtor_email || !form.amount || !form.due_date) {
            toast.error('Fyll i alla obligatoriska fält');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, val]) => {
                if (val) formData.append(key, val);
            });
            if (file) formData.append('attachment', file);

            const res = await fetch('/api/claims', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed');

            setSuccess(true);
            toast.success('Ärende skapat!', {
                description: `${form.debtor_name} — ${parseFloat(form.amount).toLocaleString('sv-SE')} ${form.currency}`,
            });

            setTimeout(() => {
                setSuccess(false);
                setForm({ debtor_name: '', debtor_email: '', debtor_phone: '', invoice_number: '', amount: '', currency: 'SEK', due_date: '' });
                setFile(null);
                onCreated();
                onClose();
            }, 1200);
        } catch (err: any) {
            toast.error(err.message || 'Något gick fel');
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="rounded-2xl border border-[#ffffff10] bg-[#0a1a18]/95 backdrop-blur-xl shadow-[0_0_60px_rgba(0,229,204,0.06)] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 pb-0">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">Nytt ärende</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Skapa ett nytt indrivningsärende</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-[#ffffff08] transition-all"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {success ? (
                        <div className="p-12 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_24px_rgba(0,229,204,0.3)]">
                                <CheckCircle className="h-10 w-10 text-primary" />
                            </div>
                            <p className="text-lg font-medium">Ärende skapat!</p>
                        </div>
                    ) : (
                        <div className="p-6 space-y-5">
                            {/* Row 1: Name + Email */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                        Gäldenär <span className="text-primary">*</span>
                                    </Label>
                                    <Input
                                        value={form.debtor_name}
                                        onChange={(e) => updateField('debtor_name', e.target.value)}
                                        placeholder="Acme Corp AB"
                                        className="bg-[#122220] border-[#ffffff10] focus:border-primary/40"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                        E-post <span className="text-primary">*</span>
                                    </Label>
                                    <Input
                                        type="email"
                                        value={form.debtor_email}
                                        onChange={(e) => updateField('debtor_email', e.target.value)}
                                        placeholder="ekonomi@acme.se"
                                        className="bg-[#122220] border-[#ffffff10] focus:border-primary/40"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Phone + Invoice */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Telefon</Label>
                                    <Input
                                        value={form.debtor_phone}
                                        onChange={(e) => updateField('debtor_phone', e.target.value)}
                                        placeholder="+46701234567"
                                        className="bg-[#122220] border-[#ffffff10] focus:border-primary/40"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Fakturanummer</Label>
                                    <Input
                                        value={form.invoice_number}
                                        onChange={(e) => updateField('invoice_number', e.target.value)}
                                        placeholder="INV-2026-001"
                                        className="bg-[#122220] border-[#ffffff10] focus:border-primary/40"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Amount + Currency + Due date */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                        Belopp <span className="text-primary">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => updateField('amount', e.target.value)}
                                        placeholder="15 000"
                                        className="bg-[#122220] border-[#ffffff10] focus:border-primary/40"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Valuta</Label>
                                    <select
                                        value={form.currency}
                                        onChange={(e) => updateField('currency', e.target.value)}
                                        className="w-full h-10 rounded-md bg-[#122220] border border-[#ffffff10] text-sm px-3 focus:border-primary/40 outline-none text-foreground"
                                    >
                                        <option value="SEK">SEK</option>
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                        Förfallodatum <span className="text-primary">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.due_date}
                                        onChange={(e) => updateField('due_date', e.target.value)}
                                        className="bg-[#122220] border-[#ffffff10] focus:border-primary/40"
                                    />
                                </div>
                            </div>

                            {/* Drag & Drop Attachment */}
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Bifogad faktura</Label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${dragOver
                                            ? 'border-primary bg-primary/5 shadow-[0_0_16px_rgba(0,229,204,0.1)]'
                                            : file
                                                ? 'border-primary/30 bg-primary/5'
                                                : 'border-[#ffffff10] bg-[#122220]/50 hover:border-[#ffffff20] hover:bg-[#122220]'
                                        }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        className="hidden"
                                        onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                                    />
                                    {file ? (
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-primary" />
                                            <div>
                                                <p className="text-sm font-medium">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                                className="p-1 rounded-lg hover:bg-[#ffffff10] text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-6 w-6 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">
                                                Dra & släpp faktura eller <span className="text-primary underline underline-offset-2">bläddra</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground/50">PDF, PNG, JPG, DOC — max 10 MB</p>
                                        </>
                                    )}
                                </div>
                                {file && (
                                    <p className="text-xs text-primary/60 mt-2 animate-in fade-in duration-200">
                                        📎 Fakturan bifogas som länk i e-post och SMS till gäldenären
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full h-12 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.2)] hover:shadow-[0_0_32px_rgba(0,229,204,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Skapar ärende...
                                    </div>
                                ) : (
                                    'Skapa ärende'
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
