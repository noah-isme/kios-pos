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
    const procedure = procedures[0];
    const handler = handlers[procedure];

    if (!handler) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: `Unhandled procedure: ${procedure}` }),
      });
      return;
    }

    const input = parseTrpcInput(request);
    const data = await handler({ input, request, route });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(serializeTrpcData(data)),
    });
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
