import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormDrawer, FormField, FormSection } from "./form-drawer";

afterEach(() => {
  cleanup();
});

describe("FormDrawer", () => {
  it("closes immediately when isDirty is false", () => {
    const onClose = vi.fn();
    render(
      <FormDrawer
        open={true}
        onClose={onClose}
        title="Thêm dịch vụ"
        isDirty={false}
        onSubmit={(e) => e.preventDefault()}
      >
        <FormSection title="Thông tin">
          <FormField label="Tên" htmlFor="name" required>
            <input id="name" />
          </FormField>
        </FormSection>
      </FormDrawer>
    );

    fireEvent.click(screen.getByText("Hủy"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("prompts before discarding when isDirty is true", () => {
    const onClose = vi.fn();
    render(
      <FormDrawer
        open={true}
        onClose={onClose}
        title="Cập nhật dịch vụ"
        isDirty={true}
        onSubmit={(e) => e.preventDefault()}
      >
        <FormField label="Tên" htmlFor="name" error="Thiếu tên">
          <input id="name" />
        </FormField>
      </FormDrawer>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Thiếu tên");
    fireEvent.click(screen.getByText("Hủy"));
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Bạn có thay đổi chưa lưu/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Bỏ thay đổi"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("toggles collapsible FormSection and disables submit button when saving", () => {
    render(
      <FormDrawer
        open={true}
        onClose={vi.fn()}
        title="Thêm sản phẩm"
        saving={true}
        onSubmit={(e) => e.preventDefault()}
      >
        <FormSection title="Mô tả kỹ thuật" collapsible defaultOpen={false}>
          <p>Nội dung mô tả</p>
        </FormSection>
      </FormDrawer>
    );

    expect(screen.queryByText("Nội dung mô tả")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Mô tả kỹ thuật/i }));
    expect(screen.getByText("Nội dung mô tả")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đang lưu..." })).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });
});
