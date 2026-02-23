import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

interface Registration {
    id: string;
    name?: string;
    email?: string;
    company?: string;
    status?: 'approved' | 'pending' | 'rejected';
    createdAt?: string;
}

interface StatsResponse {
    registrations?: Registration[];
}

const STATUS_LABEL: Record<string, string> = {
    approved: 'Approved',
    pending: 'Waitlist',
    rejected: 'Rejected'
};

async function getEventStats(): Promise<Registration[]> {
    const baseUrl = process.env.EVENTS_API_BASE_URL || 'https://the-shift.dev';
    const adminPassword = process.env.EVENTS_ADMIN_PASSWORD;

    if (!adminPassword) {
        return [];
    }

    const res = await fetch(`${baseUrl}/api/stats`, {
        headers: {
            authorization: `Bearer ${adminPassword}`
        },
        cache: 'no-store'
    });

    if (!res.ok) {
        return [];
    }

    const data = (await res.json()) as StatsResponse;
    return data.registrations || [];
}

export default async function CrmPipelinePage() {
    const regs = await getEventStats();

    const byStatus = regs.reduce(
        (acc, r) => {
            const s = r.status || 'pending';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        },
        { approved: 0, pending: 0, rejected: 0 } as Record<string, number>
    );

    const host = (await headers()).get('host');

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl font-bold">CRM Contacts Pipeline</h1>
                    <p className="text-zinc-400 mt-2">Source: events website registrations ({regs.length} contacts)</p>
                    <p className="text-zinc-500 text-sm mt-1">Host: {host}</p>
                </header>

                <section className="grid md:grid-cols-3 gap-4">
                    <PipelineCard title="Approved" count={byStatus.approved} color="border-emerald-500" />
                    <PipelineCard title="Waitlist" count={byStatus.pending} color="border-amber-500" />
                    <PipelineCard title="Rejected" count={byStatus.rejected} color="border-rose-500" />
                </section>

                <section className="grid md:grid-cols-3 gap-4">
                    <StatusColumn title="Approved" rows={regs.filter((r) => (r.status || 'pending') === 'approved')} />
                    <StatusColumn title="Waitlist" rows={regs.filter((r) => (r.status || 'pending') === 'pending')} />
                    <StatusColumn title="Rejected" rows={regs.filter((r) => (r.status || 'pending') === 'rejected')} />
                </section>
            </div>
        </main>
    );
}

function PipelineCard({ title, count, color }: { title: string; count: number; color: string }) {
    return (
        <div className={`rounded-xl border ${color} bg-zinc-900 p-5`}>
            <div className="text-zinc-400 text-sm">{title}</div>
            <div className="text-4xl font-semibold mt-2">{count}</div>
        </div>
    );
}

function StatusColumn({ title, rows }: { title: string; rows: Registration[] }) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="font-semibold mb-3">
                {title} ({rows.length})
            </h2>
            <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                {rows.slice(0, 120).map((r) => (
                    <div key={r.id} className="rounded-md border border-zinc-800 p-3 text-sm">
                        <div className="font-medium">{r.name || 'Unknown'}</div>
                        <div className="text-zinc-400">{r.email || '—'}</div>
                        <div className="text-zinc-500 text-xs mt-1">
                            {r.company || 'No company'} • {STATUS_LABEL[r.status || 'pending']}
                        </div>
                    </div>
                ))}
                {rows.length > 120 && <div className="text-xs text-zinc-500">Showing first 120 contacts.</div>}
            </div>
        </div>
    );
}
