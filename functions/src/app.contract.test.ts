import {after, before, describe, it} from "node:test";
import assert from "node:assert/strict";
import type {Server} from "node:http";

import app from "./app";

let server: Server;
let baseUrl = "";

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address === "object");
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

describe("public API contract", () => {
  it("reports that the API is running", async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
  });

  it("validates login before calling Firebase", async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
  });

  it("validates signup fields before calling Firebase", async () => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name: "Test", email: "invalid", password: "123"}),
    });

    assert.equal(response.status, 400);
  });

  it("validates password-reset email before calling Firebase", async () => {
    const response = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({email: "invalid"}),
    });

    assert.equal(response.status, 400);
  });

  it("validates refresh requests before calling Firebase", async () => {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
  });

  it("returns JSON for unknown API routes", async () => {
    const response = await fetch(`${baseUrl}/route-that-does-not-exist`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.match(body.message, /API route not found/);
  });
});

describe("protected API contract", () => {
  it("rejects cart requests without a bearer token", async () => {
    const response = await fetch(`${baseUrl}/cart`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });

  it("rejects checkout requests without a bearer token", async () => {
    const response = await fetch(`${baseUrl}/checkout`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
  });

  it("rejects user role changes without an admin bearer token", async () => {
    const response = await fetch(`${baseUrl}/admin/users/user-id/role`, {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({role: "admin"}),
    });

    assert.equal(response.status, 401);
  });

  const protectedRequests = [
    {name: "profile", path: "/auth/profile", method: "GET"},
    {name: "wishlist", path: "/wishlist", method: "GET"},
    {name: "orders", path: "/orders", method: "GET"},
    {name: "notifications", path: "/notifications", method: "GET"},
    {name: "payment verification", path: "/payments/verify/reference", method: "GET"},
    {name: "review creation", path: "/reviews", method: "POST"},
  ];

  for (const request of protectedRequests) {
    it(`rejects ${request.name} without a bearer token`, async () => {
      const response = await fetch(`${baseUrl}${request.path}`, {
        method: request.method,
        headers: {"Content-Type": "application/json"},
        ...(request.method === "POST" ? {body: JSON.stringify({})} : {}),
      });
      const body = await response.json();

      assert.equal(response.status, 401);
      assert.equal(body.success, false);
    });
  }
});
