import { expect, test } from "@playwright/test";

test.describe("Deep Web Portal E2E Flows (Live Backend + Supabase)", () => {
  test("org owner creates service and product, persists across reload, and views live ops tables", async ({
    page,
  }) => {
    const tag = Date.now().toString().slice(-6);
    const serviceName = `E2E AC Service ${tag}`;
    const sku = `E2E-SKU-${tag}`;
    const productName = `E2E Filter ${tag}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill("org@homecare.com");
    await page.getByRole("textbox", { name: "Mật khẩu" }).fill("Homecare@2026");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/org$/, { timeout: 25_000 });

    // 1. Create Service Offering & verify persistence after reload
    await page.goto("/org/services");
    await page.getByRole("button", { name: "Thêm dịch vụ" }).click();
    await page.locator("#svc-name").fill(serviceName);
    await page.locator("#svc-cat").fill("AC");
    await page.locator("#svc-price").fill("320000");
    await page.locator("#svc-dur").fill("60");
    await page.getByRole("button", { name: "Tạo dịch vụ" }).click();

    await expect(page.getByText(serviceName)).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByText(serviceName)).toBeVisible({ timeout: 15_000 });

    // 2. Create Product (MAJOR_PART) & verify persistence after reload
    await page.goto("/org/orders?tab=products");
    await page.getByRole("button", { name: "Thêm sản phẩm" }).click();
    await page.locator("#prod-sku").fill(sku);
    await page.locator("#prod-name").fill(productName);
    await page.locator("#prod-cat").fill("AC");
    await page.locator("#prod-brand").fill("Daikin");
    await page.locator("#prod-type").selectOption("MAJOR_PART");
    await page.locator("#prod-price").fill("210000");
    await page.getByRole("button", { name: "Tạo sản phẩm" }).click();

    await expect(page.getByText(productName)).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByText(productName)).toBeVisible({ timeout: 15_000 });

    // 3. Verify live Bookings, Orders, Returns, Warranties pages render cleanly
    await page.goto("/org/bookings");
    await expect(page.getByRole("heading", { name: "Đặt lịch dịch vụ" })).toBeVisible();

    await page.goto("/org/orders");
    await expect(page.getByRole("heading", { name: "Đơn hàng & Kho linh kiện" })).toBeVisible();

    await page.goto("/org/returns");
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/org/warranties");
    await expect(page.locator("main")).toBeVisible();
  });

  test("admin verifies live organizations, users, and catalog", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@homecare.com");
    await page.getByRole("textbox", { name: "Mật khẩu" }).fill("Homecare@2026");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 25_000 });

    await page.goto("/admin/organizations");
    await expect(page.getByRole("heading", { name: "Quản lý Tổ chức đối tác" })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.getByText("admin@homecare.com")).toBeVisible({ timeout: 15_000 });

    await page.goto("/admin/catalog");
    await expect(page.locator("main")).toBeVisible();
  });
});
