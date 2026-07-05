"use client";

type GenericEnvelope = {
    ok?: boolean;
    data?: unknown;
    summary?: Record<string, unknown>;
    meta?: Record<string, unknown>;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyCell(value: unknown): string {
    if (value === null || value === undefined) return "-";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(value);
}

export function ReportResultView({ result }: Readonly<{ result: unknown }>) {
    const payload = (result || {}) as GenericEnvelope;

    const rows = Array.isArray(payload.data) ? payload.data : [];
    const summary = isObject(payload.summary) ? payload.summary : null;

    if (rows.length > 0 && isObject(rows[0])) {
        const columns = Object.keys(rows[0]);
        return (
            <div className="stack-block">
                {summary ? (
                    <div className="kpi-grid">
                        {Object.entries(summary).map(([key, value]) => (
                            <div className="kpi-card" key={key}>
                                <p className="kpi-label">{key}</p>
                                <p className="kpi-value">{stringifyCell(value)}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                {columns.map((column) => (
                                    <th key={column}>{column}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const record = row as Record<string, unknown>;
                                const rowKey = JSON.stringify(record);
                                return (
                                    <tr key={rowKey}>
                                        {columns.map((column) => (
                                            <td key={`${rowKey}-${column}`}>{stringifyCell(record[column])}</td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (summary) {
        return (
            <div className="kpi-grid">
                {Object.entries(summary).map(([key, value]) => (
                    <div className="kpi-card" key={key}>
                        <p className="kpi-label">{key}</p>
                        <p className="kpi-value">{stringifyCell(value)}</p>
                    </div>
                ))}
            </div>
        );
    }

    if (isObject(payload.data)) {
        const dataObj = payload.data;
        return (
            <div className="table-wrap">
                <table>
                    <tbody>
                        {Object.entries(dataObj).map(([key, value]) => (
                            <tr key={key}>
                                <th>{key}</th>
                                <td>{stringifyCell(value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
