import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class ApiError extends Error {
  public status: number;
  public details: Record<string, unknown>;

  constructor(status: number, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
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

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = "";
    let details: Record<string, unknown> = {};
    
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          if (json.message) {
            errorMessage = json.message;
          }
          details = json;
        } catch {
          if (text && !text.startsWith('<')) {
            errorMessage = text;
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
    
    throw new ApiError(res.status, errorMessage, details);
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

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
