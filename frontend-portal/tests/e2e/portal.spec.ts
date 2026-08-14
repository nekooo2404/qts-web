import { expect, test, type Page } from "@playwright/test";

const SCREENSHOT_DIR = "output/playwright";
let runtimeErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
});

test.afterEach(async () => {
  expect(runtimeErrors, "The portal should not emit browser runtime errors").toEqual([]);
});

async function chooseRole(page: Page, role: "Nhân viên" | "Quản trị viên") {
  await page.goto("/login");
  await page.getByText(role, { exact: true }).click();
  await Promise.all([
    page.waitForURL(role === "Nhân viên" ? "**/employee/leads" : "**/admin/contracts"),
    page.getByRole("button", { name: "Tiếp tục vào portal" }).click(),
  ]);
}

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
}

test("redirects unauthenticated users and enforces employee role routes", async ({ page }) => {
  await page.goto("/employee/contracts/new");
  await expect(page).toHaveURL(/\/login\?returnTo=/);

  await chooseRole(page, "Nhân viên");
  await page.goto("/admin/contracts");
  await expect(page).toHaveURL(/\/employee\/leads$/);
  await expect(page.getByRole("heading", { name: "Quản lý khách hàng" })).toBeVisible();
});

test("validates and exports a generated employee contract", async ({ page }) => {
  await chooseRole(page, "Nhân viên");
  await page.goto("/employee/contracts/new");

  await page.getByRole("button", { name: "Tải hợp đồng (.docx)" }).click();
  await expect(page.getByText(/trường cần kiểm tra/)).toBeVisible();
  await expect(page.locator("#contractNumber")).toHaveAttribute("aria-invalid", "true");

  const values: Record<string, string> = {
    contractNumber: "HD-2026-0201",
    signedDate: "2026-08-13",
    effectiveDate: "2026-08-14",
    expiryDate: "2027-08-14",
    clientName: "Công ty Minh họa QTS",
    taxCode: "0314567890",
    representative: "Nguyễn Minh Anh",
    representativeTitle: "Giám đốc",
    clientAddress: "12 Nguyễn Huệ, Thành phố Hồ Chí Minh",
    clientEmail: "minhanh@example.com",
    clientPhone: "0909123456",
    projectName: "Nền tảng quản trị hồ sơ",
    scope: "Phân tích, triển khai, kiểm thử và bàn giao nền tảng quản trị hồ sơ nội bộ.",
    contractValue: "250000000",
  };

  for (const [id, value] of Object.entries(values)) {
    await page.locator(`#${id}`).fill(value);
  }

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải hợp đồng (.docx)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("HD-2026-0201.docx");
  await expect(page.getByText("Hợp đồng .docx đã được tạo và tải xuống.")).toBeVisible();
});

test("filters admin contracts, opens a named dialog, and blocks employee pages", async ({ page }) => {
  await chooseRole(page, "Quản trị viên");
  await page.getByRole("searchbox", { name: "Tìm kiếm hợp đồng" }).fill("Minh Hải");
  await expect(page.getByRole("cell", { name: "Công ty Cổ phần Minh Hải" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Bệnh viện An Phúc" })).toHaveCount(0);

  await page.getByRole("button", { name: "Xem HD-2026-0184" }).click();
  const dialog = page.getByRole("dialog", { name: "Triển khai nền tảng dữ liệu vận hành" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/animate__zoomIn/);
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-contract-dialog-desktop.png` });
  await page.getByRole("button", { name: "Đóng chi tiết hợp đồng" }).click();

  await page.goto("/employee/projects");
  await expect(page).toHaveURL(/\/admin\/contracts$/);
});

for (const viewport of [
  { name: "mobile-320", width: 320, height: 720 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 1000 },
]) {
  test(`renders the admin workbench without page overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await chooseRole(page, "Quản trị viên");
    await expectNoPageOverflow(page);
    await page.screenshot({
      fullPage: true,
      path: `${SCREENSHOT_DIR}/admin-contracts-${viewport.name}.png`,
    });
  });
}

test("renders the employee contract builder at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await chooseRole(page, "Nhân viên");
  await page.goto("/employee/contracts/new");
  await expectNoPageOverflow(page);
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/employee-contract-builder-desktop.png` });
});

test("renders the employee contract builder at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await chooseRole(page, "Nhân viên");
  await page.goto("/employee/contracts/new");
  await expectNoPageOverflow(page);
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/employee-contract-builder-mobile-375.png` });
});

test("contains and restores focus for the mobile navigation drawer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await chooseRole(page, "Nhân viên");

  const menuButton = page.getByRole("button", { name: "Mở menu điều hướng" });
  await menuButton.focus();
  await menuButton.click();
  await expect(page.getByRole("button", { name: "Đóng menu", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});

test("manages employee leads and downloads a project resource placeholder", async ({ page }) => {
  await chooseRole(page, "Nhân viên");
  await page.getByRole("searchbox", { name: "Tìm khách hàng" }).fill("Minh Phú");
  await page.getByRole("button", { name: "Xem khách hàng Công ty Minh Phú" }).click();
  await expect(page.getByRole("dialog", { name: "Công ty Minh Phú" })).toBeVisible();
  await page.getByRole("button", { name: "Đóng chi tiết khách hàng" }).click();
  await page.getByRole("button", { name: "Xóa khách hàng Công ty Minh Phú" }).click();
  await expect(
    page.locator('[role="status"]').filter({ hasText: "Đã xóa Công ty Minh Phú" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(page.getByText("Đã khôi phục Công ty Minh Phú.")).toBeAttached();

  await page.goto("/employee/projects");
  const archiveDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải .zip" }).first().click();
  expect((await archiveDownload).suggestedFilename()).toBe("qts-internal-portal-demo.zip");
  await expect(page.getByText("Đã tạo tệp placeholder minh họa trên thiết bị của bạn.")).toBeVisible();
});

test("supports CMS draft, employee permissions, Kanban movement, and logout", async ({ page }) => {
  await chooseRole(page, "Quản trị viên");

  await page.goto("/admin/cms");
  await page.getByLabel("Tiêu đề chính").fill("Giải pháp vận hành an toàn cho QTS");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page.getByText(/Đã lưu bản nháp trong phiên/)).toBeVisible();

  await page.goto("/admin/employees");
  await page.getByRole("button", { name: "Thêm nhân viên" }).click();
  const employeeDialog = page.getByRole("dialog", { name: "Thêm nhân viên" });
  await expect(employeeDialog.locator(".animate__zoomIn")).toBeVisible();
  await page.getByLabel("Họ và tên").fill("Đỗ An Bình");
  await page.getByLabel("Email công việc").fill("an.binh@qts.com.vn");
  await page.getByRole("button", { name: "Thêm vào danh sách" }).click();
  await expect(page.getByText(/Đã thêm nhân sự ở trạng thái chờ/)).toBeVisible();
  const contractPermission = page.getByRole("checkbox", {
    name: "Cho phép Nguyễn Minh Anh truy cập Hợp đồng",
  });
  await contractPermission.click();
  await expect(contractPermission).not.toBeChecked();

  await page.goto("/admin/tasks");
  await page.getByRole("button", {
    name: "Chuyển Rà soát điều khoản bảo mật hợp đồng MSA sang cột sau",
  }).click();
  await expect(page.getByText(/Đã chuyển .* sang Đang thực hiện/)).toBeVisible();

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
