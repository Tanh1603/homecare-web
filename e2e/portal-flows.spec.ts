import { expect, test } from "@playwright/test";

test.describe("HomeCare Web Portal Live E2E Flows", () => {
  test("admin logs in and navigates Admin Portal pages", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@homecare.com");
    await page.getByRole("textbox", { name: "Mật khẩu" }).fill("Homecare@2026");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/admin$/, { timeout: 25_000 });
    await expect(page.getByRole("heading", { name: "Tổng quan hệ thống" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/admin/organizations");
    await expect(page.getByRole("heading", { name: "Quản lý Tổ chức đối tác" })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/admin/technicians");
    await expect(page).toHaveURL(/\/admin\/technicians$/);
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/admin/catalog");
    await expect(page).toHaveURL(/\/admin\/catalog$/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("org owner logs in, is blocked from /admin, and navigates Org Portal live data", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("org@homecare.com");
    await page.getByRole("textbox", { name: "Mật khẩu" }).fill("Homecare@2026");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/org$/, { timeout: 25_000 });
    await expect(page.getByRole("heading", { name: /Xin chào,/ })).toBeVisible({ timeout: 15_000 });

    // RBAC: Org user cannot access /admin
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/(unauthorized|org)/);

    // Org operational pages backed by live Docker microservices
    await page.goto("/org/bookings");
    await expect(page.getByRole("heading", { name: "Đặt lịch dịch vụ" })).toBeVisible();

    await page.goto("/org/services");
    await expect(page).toHaveURL(/\/org\/services$/);
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/org/technicians");
    await expect(page).toHaveURL(/\/org\/technicians$/);
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/org/orders");
    await expect(page).toHaveURL(/\/org\/orders$/);
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/org/returns");
    await expect(page).toHaveURL(/\/org\/returns$/);
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/org/warranties");
    await expect(page).toHaveURL(/\/org\/warranties$/);
    await expect(page.locator("main")).toBeVisible();
  });
});
