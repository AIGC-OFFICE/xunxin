// EdgeOne binds KV namespaces as top-level globals (not on context.env).
// We require the namespace to be bound with the variable name `XUNXIN_KV`.

export function getKV() {
  const kv = globalThis.XUNXIN_KV;
  if (!kv || typeof kv.get !== "function") {
    throw new Error("KV namespace XUNXIN_KV is not bound to this project");
  }
  return kv;
}

export function tryGetKV() {
  const kv = globalThis.XUNXIN_KV;
  return kv && typeof kv.get === "function" ? kv : null;
}
