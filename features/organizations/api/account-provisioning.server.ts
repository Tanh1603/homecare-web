export interface ProvisionedAccount {
  userId: string;
  email: string;
  fullName: string;
}

export class AccountProvisioningError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AccountProvisioningError";
  }
}

export async function provisionSupabaseAccount(
  input: { email: string; fullName: string; password: string },
  config: { supabaseUrl?: string; secretKey?: string },
  fetchImpl: typeof fetch = fetch
): Promise<ProvisionedAccount> {
  const supabaseUrl = config.supabaseUrl?.trim().replace(/\/$/, "");
  const secretKey = config.secretKey?.trim();
  if (!supabaseUrl || !secretKey) {
    throw new AccountProvisioningError(
      "Thiếu cấu hình SUPABASE_SECRET_KEY trên server",
      500
    );
  }

  const res = await fetchImpl(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    }),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    id?: string;
    email?: string;
    error_code?: string;
    code?: string;
    msg?: string;
    message?: string;
  };

  if (!res.ok) {
    const msg = (payload.msg || payload.message || "").toLowerCase();
    const code = (payload.error_code || payload.code || "").toLowerCase();
    if (
      res.status === 422 ||
      code === "email_exists" ||
      msg.includes("already") ||
      msg.includes("exists")
    ) {
      throw new AccountProvisioningError(
        "Email đã có tài khoản trên hệ thống. Tính năng gửi lời mời tham gia tổ chức sẽ được hỗ trợ ở phiên bản sau.",
        409
      );
    }
    throw new AccountProvisioningError(
      payload.msg || payload.message || "Không thể tạo tài khoản Supabase",
      res.status >= 400 ? res.status : 500
    );
  }

  if (!payload.id) {
    throw new AccountProvisioningError(
      "Supabase không trả về ID tài khoản",
      502
    );
  }

  return {
    userId: payload.id,
    email: payload.email ?? input.email,
    fullName: input.fullName,
  };
}
