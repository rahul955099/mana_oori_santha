// Must be imported before anything that loads ../config/env, which reads
// these at import time. The real connection is made in startTestServer().
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://placeholder";
process.env.JWT_SECRET = "test-secret-not-for-production";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "../app";

let mongo: MongoMemoryServer;
let server: Server;
let baseUrl = "";

export async function startTestServer() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
}

export async function stopTestServer() {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  await mongo.stop();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {}
): Promise<{ status: number; body: { success: boolean; message: string; data: T; error?: string } }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: res.status, body: (await res.json()) as { success: boolean; message: string; data: T; error?: string } };
}

/** For non-JSON responses such as CSV downloads. */
export async function rawGet(path: string, token?: string) {
  const res = await fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, contentType: res.headers.get("content-type") ?? "", text: await res.text() };
}
