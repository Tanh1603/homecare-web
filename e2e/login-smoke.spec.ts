import { expect, test } from "@playwright/test";

test("portal login form is reachable and validates required credentials", async ({ page }) => {
  await page.goto("/login?next=%2Forg%2Fbookings");

  await expect(page.getByText("Đăng nhập HomeCare Portal")).toBeVisible();
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText("Email không hợp lệ")).toBeVisible();
  await expect(page.getByText("Mật khẩu tối thiểu 6 ký tự")).toBeVisible();
});
