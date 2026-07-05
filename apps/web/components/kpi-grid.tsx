"use client";

type KpiItem = {
    label: string;
    value: string | number;
};

export function KpiGrid({ items }: { items: KpiItem[] }) {
    return (
        <div className="kpi-grid">
            {items.map((item) => (
                <div className="kpi-card" key={item.label}>
                    <p className="kpi-label">{item.label}</p>
                    <p className="kpi-value">{item.value}</p>
                </div>
            ))}
        </div>
    );
}
