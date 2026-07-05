export type ApiErrorDetail = {
    path: string;
    message: string;
};

export class ApiError extends Error {
    status: number;
    details?: ApiErrorDetail[];

    constructor(status: number, message: string, details?: ApiErrorDetail[]) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

function broadcastLogout(reason: "expired" | "unauthorized") {
    if (globalThis.window === undefined) return;
    globalThis.window.dispatchEvent(new CustomEvent("smarterp:logout", { detail: { reason } }));
}

function broadcastApiError(message: string) {
    if (globalThis.window === undefined) return;
    globalThis.window.dispatchEvent(new CustomEvent("smarterp:api-error", { detail: { message } }));
}

type RequestOptions = {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string;
    query?: Record<string, string | number | boolean | undefined | null>;
    body?: unknown;
};

type Envelope<T> = {
    ok?: boolean;
    error?: string;
    details?: ApiErrorDetail[];
    data?: T;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function buildUrl(path: string, query?: RequestOptions["query"]): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${API_BASE}${normalized}`);

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                url.searchParams.set(key, String(value));
            }
        });
    }

    return url.toString();
}

async function doRequest(path: string, options: RequestOptions = {}): Promise<Envelope<unknown>> {
    const headers: HeadersInit = {
        "Content-Type": "application/json"
    };

    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }

    let response: Response;
    try {
        response = await fetch(buildUrl(path, options.query), {
            method: options.method ?? "GET",
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            cache: "no-store"
        });
    } catch {
        broadcastApiError("Network error. Please check API server connectivity.");
        throw new ApiError(0, "Network error");
    }

    const payload = (await response.json().catch(() => null)) as Envelope<unknown> | null;

    if (!response.ok) {
        if (response.status === 401) {
            broadcastLogout("unauthorized");
        } else {
            broadcastApiError(payload?.error ?? `Request failed: HTTP ${response.status}`);
        }
        throw new ApiError(
            response.status,
            payload?.error ?? `HTTP ${response.status}`,
            payload?.details
        );
    }

    return payload ?? {};
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const payload = await doRequest(path, options);

    if (payload && "data" in payload) {
        return payload.data as T;
    }

    return payload as T;
}

export async function apiRequestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const payload = await doRequest(path, options);
    return payload as T;
}

export type PaginatedResponse<T> = {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};
