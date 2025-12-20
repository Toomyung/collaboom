import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";

// Session expiry event for global handling
export const SESSION_EXPIRED_EVENT = 'session-expired';

// Track if user was authenticated (set by auth hook when login succeeds)
let wasAuthenticated = false;

export function setWasAuthenticated(value: boolean) {
  wasAuthenticated = value;
  if (value) {
    sessionStorage.setItem('wasAuthenticated', 'true');
  } else {
    sessionStorage.removeItem('wasAuthenticated');
  }
}

export function getWasAuthenticated(): boolean {
  return wasAuthenticated || sessionStorage.getItem('wasAuthenticated') === 'true';
}

function dispatchSessionExpired() {
  // Only dispatch if user was previously authenticated
  if (!getWasAuthenticated()) {
    return;
  }
  
  // Only dispatch once per minute to avoid spamming
  const lastDispatch = sessionStorage.getItem('lastSessionExpiry');
  const now = Date.now();
  if (lastDispatch && now - parseInt(lastDispatch) < 60000) {
    return;
  }
  sessionStorage.setItem('lastSessionExpiry', now.toString());
  setWasAuthenticated(false);
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export class ApiError extends Error {
  public status: number;
  public details: Record<string, unknown>;
  public rawResponse: string;

  constructor(status: number, message: string, details: Record<string, unknown> = {}, rawResponse: string = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.rawResponse = rawResponse;
  }
}

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    const message = error.message;
    
    if (message.includes('{"message":')) {
      try {
        const jsonStart = message.indexOf('{');
        const jsonPart = message.slice(jsonStart);
        const parsed = JSON.parse(jsonPart);
        if (parsed.message) {
          return parsed.message;
        }
      } catch {
        // Fall through
      }
    }
    
    if (/^\d{3}:/.test(message)) {
      const textAfterCode = message.replace(/^\d{3}:\s*/, '');
      if (textAfterCode && !textAfterCode.startsWith('{')) {
        return textAfterCode;
      }
      return "Something went wrong. Please try again.";
    }
    
    return message;
  }
  
  return "An unexpected error occurred. Please try again.";
}

export function logApiError(error: unknown, context?: string): void {
  const prefix = context ? `[API Error - ${context}]` : "[API Error]";
  
  if (error instanceof ApiError) {
    console.error(prefix, {
      status: error.status,
      message: error.message,
      details: error.details,
      rawResponse: error.rawResponse,
    });
  } else if (error instanceof Error) {
    console.error(prefix, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(prefix, error);
  }
}

async function throwIfResNotOk(res: Response, url?: string) {
  if (!res.ok) {
    let errorMessage = "";
    let details: Record<string, unknown> = {};
    let rawResponse = "";
    
    try {
      rawResponse = await res.text();
      if (rawResponse) {
        try {
          const json = JSON.parse(rawResponse);
          if (json.message) {
            errorMessage = json.message;
          }
          details = json;
        } catch {
          if (rawResponse && !rawResponse.startsWith('<')) {
            errorMessage = rawResponse;
          }
        }
      }
    } catch {
      // Use default message
    }
    
    if (!errorMessage) {
      if (res.status === 401) {
        errorMessage = "Please log in to continue.";
      } else if (res.status === 403) {
        errorMessage = "You don't have permission to do this.";
      } else if (res.status === 404) {
        errorMessage = "The requested item was not found.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else {
        errorMessage = "Something went wrong. Please try again.";
      }
    }
    
    const apiError = new ApiError(res.status, errorMessage, details, rawResponse);
    
    console.error("[API Error]", {
      url: url || res.url,
      status: res.status,
      statusText: res.statusText,
      userMessage: errorMessage,
      details,
      rawResponse,
    });
    
    throw apiError;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res, url);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res, url);
    return await res.json();
  };

// Helper to detect network errors across different browsers/runtimes
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    // Cover common fetch failure messages across browsers
    return msg.includes("failed to fetch") ||
           msg.includes("network") ||
           msg.includes("fetch failed") ||
           msg.includes("load failed") ||
           msg.includes("connection");
  }
  return false;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Detect session expiry on protected endpoints (not /api/auth/me)
      if (error instanceof ApiError && error.status === 401) {
        dispatchSessionExpired();
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Detect session expiry on mutations
      if (error instanceof ApiError && error.status === 401) {
        dispatchSessionExpired();
      }
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Retry network errors up to 2 times with exponential backoff
        if (isNetworkError(error)) {
          return failureCount < 2;
        }
        // Retry 5xx server errors once
        if (error instanceof ApiError && error.status >= 500) {
          return failureCount < 1;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry network errors for mutations, not API errors
        if (isNetworkError(error)) {
          return failureCount < 1;
        }
        return false;
      },
    },
  },
});
