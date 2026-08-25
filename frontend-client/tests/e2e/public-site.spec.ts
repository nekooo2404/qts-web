import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/nang-luc", "/giai-phap", "/du-an", "/pricing", "/lien-he", "/quyen-rieng-tu"];

for (const route of routes) {
  test(`${route} is responsive and meets automated WCAG AA`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    const width = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(width.document).toBeLessThanOrEqual(width.viewport);
    const violations = (await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()).violations;
    expect(violations).toEqual([]);
  });
}

test("preview fixture state is visible and honest", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Đang hiển thị nội dung tham chiếu vì CMS chưa khả dụng.")).toBeVisible();
  await expect(page.getByText("Reference system state")).toBeVisible();
  await expect(page.getByText("Live system status")).toHaveCount(0);
});

test("security headers and SEO endpoints are published", async ({ page, request }) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-powered-by"]).toBeUndefined();
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /localhost:3100/);
  expect((await request.get("/robots.txt")).ok()).toBe(true);
  expect((await request.get("/sitemap.xml")).ok()).toBe(true);
});

test("contact BFF rejects missing consent and fails safely when upstream is unavailable", async ({ request }) => {
  const payload = {
    customerName: "Nguyễn An",
    email: "an@example.com",
    phone: "0912345678",
    message: "Cần đánh giá kiến trúc hệ thống hiện tại.",
    privacyNoticeVersion: "2026-08-25",
  };
  expect((await request.post("/api/contact", { data: { ...payload, privacyConsent: false } })).status()).toBe(422);
  expect((await request.post("/api/contact", { data: { ...payload, privacyConsent: true } })).status()).toBe(503);
});

test("contact consent is required and sent through the same-origin BFF", async ({ page }) => {
  let submittedBody: unknown;
  await page.route("**/api/contact", async (route) => {
    submittedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: { id: "lead-id", status: "NEW", createdAt: new Date().toISOString() } }),
    });
  });
  await page.goto("/lien-he");
  await page.locator('label[for="problemType-cybersecurity"]').click({ force: true });
  await page.locator('label[for="systemScale-under-100"]').click({ force: true });
  await page.getByLabel("Họ và tên").fill("Nguyễn An");
  await page.getByLabel("Email").fill("an@example.com");
  await page.getByLabel("Số điện thoại").fill("0912345678");
  await page.getByLabel("Hiện trạng, mục tiêu hoặc điểm nghẽn").fill("Cần đánh giá kiến trúc hệ thống hiện tại.");
  await page.getByRole("button", { name: "Gửi yêu cầu tư vấn đến QTS" }).click();
  await expect(page.getByText("Vui lòng xác nhận bạn đã đọc thông báo quyền riêng tư.", { exact: true })).toBeVisible();
  await page.getByLabel(/Tôi đã đọc/).check();
  await page.getByRole("button", { name: "Gửi yêu cầu tư vấn đến QTS" }).click();
  await expect(page.getByText(/Yêu cầu đã được hệ thống tiếp nhận/)).toBeVisible();
  expect(submittedBody).toMatchObject({ privacyConsent: true, privacyNoticeVersion: "2026-08-25" });
});

test("reduced motion disables infinite animation", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const hydrationWarnings: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("hydrated but some attributes")) hydrationWarnings.push(message.text());
  });
  await page.goto("/");
  await page.waitForTimeout(500);
  const infiniteAnimations = await page.evaluate(() =>
    document.getAnimations().filter((animation) => {
      const timing = animation.effect && "getTiming" in animation.effect ? animation.effect.getTiming() : null;
      return animation.playState === "running" && timing?.iterations === Infinity;
    }).length,
  );
  expect(infiniteAnimations).toBe(0);
  expect(hydrationWarnings).toEqual([]);
  await context.close();
});
