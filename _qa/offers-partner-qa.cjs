// Phase 6 QA: partner portal — My Offers page + hotel booking detail rows.
// Usage: node _qa/offers-partner-qa.cjs   (partner dev on :3003, backend :8000)
const { chromium } = require("C:/Users/Asus/node_modules/playwright");
const fs = require("fs");

const BASE = process.env.QA_PP_BASE || "http://localhost:3001";
const OUT = __dirname + "/shots";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("9876543210 or partner@email.com").fill("9938987378");
  await page.locator('input[type="password"]').fill(process.env.QA_PP_PASSWORD || "Waytero@15");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => u.pathname.includes("dashboard"), { timeout: 20000 });
  await page.waitForTimeout(2500);

  // ── My Offers page ──
  await page.goto(BASE + "/dashboard/offers", { waitUntil: "domcontentloaded" });
  await page.getByText("My Offers", { exact: true }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000); // let offers query settle
  const offerCard = await page.getByText("Smoke Grand Imperial Deluxe").count();
  const couponChip = await page.getByText("Coupon STAYTEST10").count();
  const roomCb = page.getByRole("checkbox");
  const cbCount = await roomCb.count();
  console.log("offer card:", offerCard > 0, "| coupon chip:", couponChip > 0, "| checkboxes:", cbCount);
  await page.screenshot({ path: OUT + "/partner-my-offers.png", fullPage: true });

  // Uncheck the only room type → client guard must warn, no PUT fired, still checked.
  if (cbCount > 0) {
    await roomCb.first().click();
    await page.waitForTimeout(800);
    const warn = await page.getByText(/At least one room type/).count();
    console.log("last-room-type guard snackbar:", warn > 0);
    await page.screenshot({ path: OUT + "/partner-roomtype-guard.png" });
  }

  // ── Hotel booking detail rows (reservation 42, booked via offer) ──
  await page.goto(BASE + "/dashboard/bookings/hotel/42", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  const offerRow = await page.getByText("Offer", { exact: true }).count();
  const shareRow = await page.locator("text=Your Coupon Share").count();
  const offerTitle = await page.getByText("Smoke Grand Imperial Deluxe").count();
  console.log("detail Offer row:", offerRow > 0, "| offer title:", offerTitle > 0, "| share row (PLATFORM→expect 0):", shareRow);
  await page.screenshot({ path: OUT + "/partner-hotel-detail-offer.png", fullPage: true });

  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("QA FAILED:", e.message); process.exit(1); });
