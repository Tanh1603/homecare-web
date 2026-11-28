import { expect, test } from "@playwright/test";

const isLive = String(process.env.HOMECARE_E2E_LIVE ?? "").toLowerCase() === "true";

test.describe("MVP-0 /register/org Browser E2E", () => {
  test("renders capability (type) and legalEntityType selectors and enforces client validation", async ({
    page,
  }) => {
    await page.goto("/register/org");
    await expect(page.getByRole("heading", { name: /Đăng ký đối tác Organization/i })).toBeVisible();

    const typeSelect = page.locator("#type");
    const legalSelect = page.locator("#legalEntityType");
    await expect(typeSelect).toBeVisible();
    await expect(legalSelect).toBeVisible();

    await expect(typeSelect.locator('option[value="SERVICE"]')).toHaveCount(1);
    await expect(typeSelect.locator('option[value="SERVICE"]')).not.toBeDisabled();
    await expect(typeSelect.locator('option[value="COMMERCE"]')).toHaveCount(1);
    await expect(typeSelect.locator('option[value="COMMERCE"]')).toBeDisabled();
    await expect(typeSelect.locator('option[value="BOTH"]')).toHaveCount(1);
    await expect(typeSelect.locator('option[value="BOTH"]')).toBeDisabled();

    await expect(legalSelect.locator('option[value="COMPANY"]')).toHaveCount(1);
    await expect(legalSelect.locator('option[value="HOUSEHOLD_BUSINESS"]')).toHaveCount(1);
    await expect(legalSelect.locator('option[value="INDIVIDUAL"]')).toHaveCount(1);

    await page.getByRole("button", { name: /Nộp hồ sơ đăng ký/i }).click();
    await expect(page.getByText(/Tên tổ chức tối thiểu 2 ký tự/i)).toBeVisible();
  });

  test("submits capability + legalEntityType payload or surfaces 401 login prompt cleanly", async ({
    page,
  }) => {
    if (!isLive) {
      await page.route("**/api/gateway/organizations", async (route) => {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        expect(body.type).toBe("SERVICE");
        expect(body.legalEntityType).toBe("HOUSEHOLD_BUSINESS");
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            code: 401,
            errorCode: "UNAUTHENTICATED",
            message: "Unauthorized",
            data: null,
          }),
        });
      });
    }

    await page.goto("/register/org");
    await page.locator("#name").fill("Điện Lạnh MVP0 Browser E2E");
    await page.locator("#type").selectOption("SERVICE");
    await page.locator("#legalEntityType").selectOption("HOUSEHOLD_BUSINESS");
    await page.locator("#taxCode").fill("001090012345");
    await page.locator("#phone").fill("0901234567");
    await page.locator("#city").fill("TP. Hồ Chí Minh");
    await page.locator("#address").fill("123 Nguyễn Văn Linh, Quận 7");

    await page.getByRole("button", { name: /Nộp hồ sơ đăng ký/i }).click();

    if (isLive) {
      await expect(page).toHaveURL(/\/(org\/status|register\/org)/);
    } else {
      await expect(page.locator('a[href="/login?next=/register/org"]')).toBeVisible();
    }
  });
});
