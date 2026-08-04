import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const encoder = new TextEncoder();
const iterations = 210000;
const sessionDurationMs = 8 * 60 * 60 * 1000;

class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function reply(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function derivePin(pin: string, saltHex: string, rounds: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: rounds }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

function randomHex(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function validPin(pin: unknown) {
  return typeof pin === "string" && /^\d{6,12}$/.test(pin);
}

async function createAdminSession(admin: ReturnType<typeof createClient>, ownerId: string) {
  const token = randomToken();
  const hash = await tokenHash(token);
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
  await admin.from("form_maker_admin_sessions").delete().eq("owner_id", ownerId).lt("expires_at", new Date().toISOString());
  const { error } = await admin.from("form_maker_admin_sessions").insert({ token_hash: hash, owner_id: ownerId, expires_at: expiresAt });
  if (error) throw error;
  return { token, expiresAt };
}

async function hasAdminSession(admin: ReturnType<typeof createClient>, ownerId: string, token: unknown) {
  if (typeof token !== "string" || token.length < 32) return false;
  const hash = await tokenHash(token);
  const { data, error } = await admin
    .from("form_maker_admin_sessions")
    .select("expires_at")
    .eq("token_hash", hash)
    .eq("owner_id", ownerId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (request.method !== "POST") throw new HttpError("지원하지 않는 요청입니다.", 405);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) throw new HttpError("로그인이 필요합니다.", 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new HttpError("로그인이 필요합니다.", 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "status");
    const { data: security, error: securityError } = await admin
      .from("form_maker_admin_security")
      .select("owner_id,pin_hash,pin_salt,iterations,failed_attempts,locked_until")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (securityError) throw securityError;

    if (action === "status") {
      const unlocked = security ? await hasAdminSession(admin, user.id, body?.token) : false;
      return reply({ configured: Boolean(security), unlocked });
    }

    if (action === "setup") {
      if (security) throw new HttpError("관리자 PIN이 이미 설정되어 있습니다.", 409);
      if (!validPin(body?.pin)) throw new HttpError("관리자 PIN은 숫자 6~12자리로 입력해 주세요.");
      const salt = randomHex(16);
      const hash = await derivePin(body.pin, salt, iterations);
      const { error } = await admin.from("form_maker_admin_security").insert({ owner_id: user.id, pin_hash: hash, pin_salt: salt, iterations });
      if (error?.code === "23505") throw new HttpError("관리자 PIN이 이미 설정되어 있습니다.", 409);
      if (error) throw error;
      return reply({ configured: true, unlocked: true, ...(await createAdminSession(admin, user.id)) }, 201);
    }

    if (action === "unlock") {
      if (!security) throw new HttpError("먼저 관리자 PIN을 설정해 주세요.", 409);
      if (!validPin(body?.pin)) throw new HttpError("관리자 PIN은 숫자 6~12자리입니다.");
      if (security.locked_until && new Date(security.locked_until).getTime() > Date.now()) {
        throw new HttpError("입력 횟수를 초과했습니다. 15분 뒤 다시 시도해 주세요.", 429);
      }
      const candidateHash = await derivePin(body.pin, security.pin_salt, security.iterations);
      if (!secureEqual(candidateHash, security.pin_hash)) {
        const nextAttempts = Number(security.failed_attempts || 0) + 1;
        const shouldLock = nextAttempts >= 5;
        await admin.from("form_maker_admin_security").update({
          failed_attempts: shouldLock ? 0 : nextAttempts,
          locked_until: shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("owner_id", user.id);
        throw new HttpError(shouldLock ? "입력 횟수를 초과했습니다. 15분 뒤 다시 시도해 주세요." : "관리자 PIN이 맞지 않습니다.", shouldLock ? 429 : 403);
      }
      await admin.from("form_maker_admin_security").update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }).eq("owner_id", user.id);
      return reply({ configured: true, unlocked: true, ...(await createAdminSession(admin, user.id)) });
    }

    if (action === "lock") {
      if (typeof body?.token === "string" && body.token.length >= 32) {
        await admin.from("form_maker_admin_sessions").delete().eq("token_hash", await tokenHash(body.token)).eq("owner_id", user.id);
      }
      return reply({ ok: true });
    }

    if (action === "submissions") {
      if (!await hasAdminSession(admin, user.id, body?.token)) throw new HttpError("응답 관리자 로그인이 필요합니다.", 403);
      const projectId = typeof body?.projectId === "string" ? body.projectId : "";
      let projectQuery = admin.from("form_maker_projects").select("id").eq("owner_id", user.id);
      if (projectId) projectQuery = projectQuery.eq("id", projectId);
      const { data: projects, error: projectError } = await projectQuery;
      if (projectError) throw projectError;
      const projectIds = (projects || []).map((project) => project.id);
      if (projectId && projectIds.length === 0) throw new HttpError("폼을 찾을 수 없습니다.", 404);
      if (projectIds.length === 0) return reply({ submissions: [], hasMore: false });

      const offset = Math.max(0, Number.parseInt(String(body?.offset || 0), 10) || 0);
      const limit = Math.min(1000, Math.max(1, Number.parseInt(String(body?.limit || 1000), 10) || 1000));
      const { data: submissions, error: submissionError } = await admin
        .from("form_maker_submissions")
        .select("id,project_id,answers,sheet_sync_status,sheet_sync_error,quality_status,quality_reasons,quality_source,duplicate_of,quality_reviewed_at,submitted_at")
        .in("project_id", projectIds)
        .order("submitted_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (submissionError) throw submissionError;
      return reply({ submissions: submissions || [], hasMore: (submissions || []).length === limit });
    }

    if (action === "quality") {
      if (!await hasAdminSession(admin, user.id, body?.token)) throw new HttpError("응답 관리자 로그인이 필요합니다.", 403);
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const projectId = String(body?.projectId || "");
      const submissionId = String(body?.submissionId || "");
      const status = String(body?.status || "");
      if (!uuid.test(projectId) || !uuid.test(submissionId) || !["normal", "duplicate", "invalid"].includes(status)) {
        throw new HttpError("판정 변경 요청을 확인해 주세요.", 400);
      }
      const { data: project, error: projectError } = await admin
        .from("form_maker_projects")
        .select("id")
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (projectError) throw projectError;
      if (!project) throw new HttpError("폼을 찾을 수 없습니다.", 404);
      const reasons = status === "normal"
        ? []
        : [status === "duplicate" ? "관리자가 중복 DB로 표시" : "관리자가 불량 DB로 표시"];
      const { data: submission, error: updateError } = await admin
        .from("form_maker_submissions")
        .update({
          quality_status: status,
          quality_reasons: reasons,
          quality_source: "manual",
          quality_reviewed_at: new Date().toISOString(),
          duplicate_of: null,
        })
        .eq("id", submissionId)
        .eq("project_id", projectId)
        .select("id,project_id,answers,sheet_sync_status,sheet_sync_error,quality_status,quality_reasons,quality_source,duplicate_of,quality_reviewed_at,submitted_at")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!submission) throw new HttpError("응답을 찾을 수 없습니다.", 404);
      return reply({ submission });
    }

    throw new HttpError("지원하지 않는 관리자 요청입니다.", 400);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : "관리자 요청을 처리하지 못했습니다.";
    console.error(error);
    return reply({ error: message }, status);
  }
});
