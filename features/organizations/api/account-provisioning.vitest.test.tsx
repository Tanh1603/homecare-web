import { describe, expect, it, vi } from "vitest";
import {
  AccountProvisioningError,
  provisionSupabaseAccount,
} from "./account-provisioning.server";

describe("provisionSupabaseAccount", () => {
  it("creates verified account via Supabase Admin API", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: "user-123", email: "tech@homecare.vn" }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provisionSupabaseAccount(
      { email: "tech@homecare.vn", fullName: "Nguyễn Văn A", password: "secret123" },
      { supabaseUrl: "https://demo.supabase.co", secretKey: "sb_secret" },
      mockFetch as unknown as typeof fetch
    );

    expect(result).toEqual({
      userId: "user-123",
      email: "tech@homecare.vn",
      fullName: "Nguyễn Văn A",
    });
    const body = JSON.parse(String(mockFetch.mock.calls[0]?.[1]?.body));
    expect(body.email_confirm).toBe(true);
    expect(body.user_metadata).toEqual({ full_name: "Nguyễn Văn A" });
  });

  it("maps duplicate email (422) to 409 AccountProvisioningError", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error_code: "email_exists",
          msg: "A user with this email address has already been registered",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(
      provisionSupabaseAccount(
        { email: "dup@homecare.vn", fullName: "B", password: "secret123" },
        { supabaseUrl: "https://demo.supabase.co", secretKey: "sb_secret" },
        mockFetch as unknown as typeof fetch
      )
    ).rejects.toMatchObject<Partial<AccountProvisioningError>>({
      status: 409,
    });
  });
});
