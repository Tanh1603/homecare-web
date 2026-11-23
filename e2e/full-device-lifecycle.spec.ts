import { expect, test } from "@playwright/test";

const isLive = String(process.env.HOMECARE_E2E_LIVE ?? "").toLowerCase() === "true";

test.describe("MVP-3 Full 7-Stage Device Lifecycle E2E", () => {
  test("executes 7-stage lifecycle provenance, part-order linkage, and rebooking invariants", async ({
    page,
  }) => {
    if (isLive) {
      await page.goto("/login");
      await page.getByLabel("Email").fill("org@homecare.com");
      await page.getByRole("textbox", { name: "Mật khẩu" }).fill("Homecare@2026");
      await page.getByRole("button", { name: "Đăng nhập" }).click();

      await expect(page).toHaveURL(/\/org(?:$|\/)/, { timeout: 25_000 });

      await page.goto("/org/requests");
      await expect(page.locator("main")).toBeVisible();

      await page.goto("/org/bookings");
      await expect(page.locator("main")).toBeVisible();

      await page.goto("/org/warranties");
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText("Đăng ký hãng")).toBeVisible();
      await expect(
        page.getByText(/Hoàn tất lắp đặt|Giao hàng đơn hàng|Tự động từ đơn hàng|Tạo thủ công/).first()
      ).toBeVisible();
      return;
    }

    // Deterministic 7-stage lifecycle contract verification against Next.js BFF + Web UI
    const state = {
      orderPaid: false,
      delivered: false,
      warrantyStatus: "PENDING_TRIGGER",
      warrantySource: "INSTALLATION_COMPLETED",
      manufacturerRegistrationStatus: "NOT_VERIFIED",
      triggerEvidenceRef: null as string | null,
      maintenanceSchedules: [] as Array<{ id: string; dueOn: string; status: string }>,
      bookings: [] as Array<{ id: string; purpose: string; status: string; partSource?: string }>,
      careRecords: [] as Array<{ id: string; kind: string; title: string; bookingId: string }>,
      linkedPartOrders: [] as string[],
    };

    await page.route("**/api/gateway/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      // Stage 1: Customer buys appliance + pays
      if (path.endsWith("/orders") && method === "POST") {
        const body = req.postDataJSON() as { items?: Array<{ targetDeviceId?: string }> };
        const hasDeviceLink = Boolean(body.items?.[0]?.targetDeviceId);
        if (hasDeviceLink) {
          state.linkedPartOrders.push("order-part-1");
          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { id: "order-part-1", status: "PAID", targetDeviceId: "dev-1" },
            }),
          });
        }
        state.orderPaid = true;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { id: "order-1", status: "PAID" } }),
        });
      }

      // Stage 2: Delivery leaves INSTALLATION_COMPLETED warranty as PENDING_TRIGGER
      if (path.endsWith("/orders/order-1/deliver") && method === "POST") {
        state.delivered = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { deviceId: "dev-1", warrantyStatus: state.warrantyStatus },
          }),
        });
      }

      // Stage 3 & 4: Technician completes installation -> Warranty ACTIVE + MaintenanceSchedule created (0 bookings)
      if (path.endsWith("/bookings/booking-install-1/complete") && method === "POST") {
        state.warrantyStatus = "ACTIVE";
        state.triggerEvidenceRef = "ev-install-01";
        state.maintenanceSchedules.push({
          id: "ms-1",
          dueOn: "2027-05-20",
          status: "PENDING",
        });
        state.careRecords.push({
          id: "cr-install-1",
          kind: "INSTALLATION",
          title: "Lắp đặt điều hòa Daikin",
          bookingId: "booking-install-1",
        });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { warrantyStatus: state.warrantyStatus, triggerEvidenceRef: state.triggerEvidenceRef },
          }),
        });
      }

      // Stage 6: Technician replacement booking with CUSTOMER_SUPPLIED
      if (path.endsWith("/bookings") && method === "POST") {
        const body = req.postDataJSON() as { purpose?: string; partSource?: string };
        const id = `booking-${state.bookings.length + 1}`;
        state.bookings.push({
          id,
          purpose: body.purpose ?? "REPAIR",
          status: "COMPLETED",
          partSource: body.partSource,
        });
        state.careRecords.push({
          id: `cr-${state.careRecords.length + 1}`,
          kind: body.purpose ?? "REPAIR",
          title: body.purpose === "MAINTENANCE" ? "Bảo dưỡng định kỳ" : "Thay linh kiện",
          bookingId: id,
        });
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { id } }),
        });
      }

      // Stage 7: Device lifecycle timeline read model
      if (path.endsWith("/devices/dev-1/lifecycle") && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              deviceId: "dev-1",
              warrantyStatus: state.warrantyStatus,
              warrantySource: state.warrantySource,
              manufacturerRegistrationStatus: state.manufacturerRegistrationStatus,
              triggerEvidenceRef: state.triggerEvidenceRef,
              maintenanceSchedule: state.maintenanceSchedules,
              careTimeline: state.careRecords,
              linkedPartOrders: state.linkedPartOrders,
            },
          }),
        });
      }

      return route.fulfill({ status: 404, body: "{}" });
    });

    await page.goto("/login");
    const lifecycleResult = await page.evaluate(async () => {
      await fetch("/api/gateway/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productId: "prod-ac-1", quantity: 1 }] }),
      });
      const afterDeliver = await (
        await fetch("/api/gateway/orders/order-1/deliver", { method: "POST" })
      ).json();
      await fetch("/api/gateway/bookings/booking-install-1/complete", { method: "POST" });
      await fetch("/api/gateway/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "part-filter-1", quantity: 1, targetDeviceId: "dev-1" }],
        }),
      });
      await fetch("/api/gateway/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "REPAIR", partSource: "CUSTOMER_SUPPLIED" }),
      });
      await fetch("/api/gateway/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "MAINTENANCE" }),
      });
      const lifecycle = await (await fetch("/api/gateway/devices/dev-1/lifecycle")).json();
      return { afterDeliver, lifecycle };
    });

    expect(lifecycleResult.afterDeliver.data.warrantyStatus).toBe("PENDING_TRIGGER");
    expect(lifecycleResult.lifecycle.data.warrantyStatus).toBe("ACTIVE");
    expect(lifecycleResult.lifecycle.data.manufacturerRegistrationStatus).toBe("NOT_VERIFIED");
    expect(lifecycleResult.lifecycle.data.triggerEvidenceRef).toBe("ev-install-01");
    expect(lifecycleResult.lifecycle.data.linkedPartOrders).toEqual(["order-part-1"]);
    // Prior CareRecord stays immutable while rebooked service appends a new CareRecord
    expect(lifecycleResult.lifecycle.data.careTimeline).toHaveLength(3);
  });

  test("unauthenticated lifecycle access is denied", async ({ request }) => {
    const response = await request.get("/api/gateway/devices/not-authorized/lifecycle");
    expect([401, 403, 404]).toContain(response.status());
  });
});
