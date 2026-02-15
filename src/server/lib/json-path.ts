import type { JsonObject, JsonValue } from "@/types/config.js";

export function getAtPath(obj: JsonObject, path: string): JsonValue | undefined {
  const keys = path.split(".");
  let current: JsonValue | undefined = obj;
  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object" ||
      Array.isArray(current)
    ) {
      return undefined;
    }
    current = (current as JsonObject)[key];
  }
  return current;
}

export function setAtPath(obj: JsonObject, path: string, value: JsonValue): JsonObject {
  const keys = path.split(".");
  if (keys.length === 1) {
    return { ...obj, [keys[0]!]: value };
  }

  const [first, ...rest] = keys;
  const child = obj[first!];
  const childObj: JsonObject =
    child !== null && child !== undefined && typeof child === "object" && !Array.isArray(child)
      ? (child as JsonObject)
      : {};

  return { ...obj, [first!]: setAtPath(childObj, rest.join("."), value) };
}

export function deleteAtPath(obj: JsonObject, path: string): JsonObject {
  const keys = path.split(".");
  if (keys.length === 1) {
    const { [keys[0]!]: _, ...rest } = obj;
    return rest;
  }

  const [first, ...remaining] = keys;
  const child = obj[first!];
  if (child === null || child === undefined || typeof child !== "object" || Array.isArray(child)) {
    return { ...obj };
  }

  return { ...obj, [first!]: deleteAtPath(child as JsonObject, remaining.join(".")) };
}
