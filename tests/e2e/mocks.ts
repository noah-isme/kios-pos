// @ts-nocheck
import type { Page, Request, Route } from "@playwright/test";
import superjson, { type SuperJSONValue } from "superjson";

type TrpcHandler = (params: {
  input: unknown;
  request: Request;
  route: Route;
}) => unknown | Promise<unknown>;

const parseTrpcInput = (request: Request) => {
  let raw: unknown;

  if (request.method() === "GET") {
    const url = new URL(request.url());
    const inputParam = url.searchParams.get("input");
    if (inputParam) {
      raw = JSON.parse(inputParam);
    }
  } else {
    const body = request.postData();
    if (body) {
      raw = JSON.parse(body);
    }
  }

  if (!raw) {
    return undefined;
  }

  let container: unknown = raw;

  if (Array.isArray(container)) {
    container = container[0];
  } else if (typeof container === "object" && container !== null) {
    if (Object.prototype.hasOwnProperty.call(container, "0")) {
      container = (container as Record<string, unknown>)["0"];
    }
  }

  if (container && typeof container === "object" && "json" in container) {
    return superjson.deserialize(container as SuperJSONValue);
  }

  return container;
};

const serializeTrpcData = (data: unknown) => {
  const serialized = superjson.serialize(data ?? null);
  return { result: { data: serialized } };
};

export const setupTrpcMock = async (
  page: Page,
  handlers: Record<string, TrpcHandler>,
) => {
  await page.route("**/api/trpc/**", async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/?api\/?trpc\/?/, "");
    const procedures = path.split(",");

    // Read raw input payload (supports GET query param or POST body)
    let raw: unknown;
    if (request.method() === "GET") {
      const inputParam = url.searchParams.get("input");
      if (inputParam) raw = JSON.parse(inputParam);
    } else {
      const body = request.postData();
      if (body) raw = JSON.parse(body);
    }

    // Normalize raw into an array of containers for batched procedures
    let containers: unknown[] = [];
    if (raw === undefined || raw === null) {
      containers = [];
    } else if (Array.isArray(raw)) {
      containers = raw;
    } else if (typeof raw === "object") {
      // tRPC sometimes encodes batch inputs as an object with numeric keys
      const obj = raw as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(obj, "0")) {
        // collect numeric keys in order
        const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
        containers = keys.map((k) => obj[k]);
      } else {
        containers = [raw];
      }
    } else {
      containers = [raw];
    }

    const results = await Promise.all(
      procedures.map(async (proc, idx) => {
        const handler = handlers[proc];
        if (!handler) {
          return { error: `Unhandled procedure: ${proc}` };
        }

        // extract and deserialize input for this procedure
        const container = containers[idx];
        let input: unknown;
        if (container && typeof container === "object" && "json" in (container as Record<string, unknown>)) {
          try {
            input = superjson.deserialize(container as SuperJSONValue);
          } catch (e) {
            input = undefined;
          }
        } else {
          input = container;
        }

        const data = await handler({ input, request, route });
        return serializeTrpcData(data);
      }),
    );

    const body = procedures.length > 1 ? JSON.stringify(results) : JSON.stringify(results[0]);
    await route.fulfill({ status: 200, contentType: "application/json", body });
  });
};

export const mockAuthSession = async (page: Page) => {
  await page.route("**/api/auth/session**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "e2e-user",
          name: "Kasir Uji",
          email: "kasir@example.com",
          role: "ADMIN",
        },
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    });
  });
};
