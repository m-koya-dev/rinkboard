// src/share.ts
// JSON -> base64url（安全にURLに載せられる文字だけ）
// ※長くなるので、将来は圧縮（lz-string等）に差し替え可

export function encodeStateToParam(obj: unknown): string {
  const json = JSON.stringify(obj);

  // UTF-8 bytes -> base64
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);

  const b64 = btoa(bin);

  // base64url化（+ / = をURL安全に）
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeStateFromParam(param: string): unknown {
  // base64url -> base64
  let b64 = param.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);

  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}
