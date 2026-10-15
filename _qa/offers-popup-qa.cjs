// Phase 6 QA: accept/reject popup offer banner. Partner portal must be open
// on :3001; a hotel booking is created via the public API from inside the
// page so the WS event fires while the portal is connected. The QA booking
// is then rejected through the popup to clean up.
const { chromium } = require("C:/Users/Asus/node_modules/playwright");
const fs = require("fs");

const BASE = "http://localhost:3001";
const OUT = __dirname + "/shots";
fs.mkdirSync(OUT, { recursive: true });
const CTOK = process.env.WT_CUSTOMER_TOKEN || "";

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
  await page.waitForTimeout(4000); // let the WS channel connect

  // Fire a booking through the offer from inside the page (CORS allows :3001).
  const created = await page.evaluate(async ([tok]) => {
    const r = await fetch("http://localhost:8000/api/v1/public/hotel/create-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
      body: JSON.stringify({
        hotel_id: 1, room_category_id: 1,
        check_in_date: "2026-10-22", check_out_date: "2026-10-23",
        rooms_count: 1, adults_count: 2, children_count: 0, extra_beds: 0,
        primary_guest_name: "QA Popup Tester", primary_guest_mobile: "9000000002",
        coupon_code: "STAYTEST10", offer_slug: "smoke-grand-imperial-deluxe",
      }),
    });
    return r.json();
  }, [CTOK]);
  const reservation = created?.data?.reservation_number;
  console.log("booking created:", reservation ?? JSON.stringify(created).slice(0, 150));

  // The popup should appear on the WS event.
  await page.getByText("New Hotel Booking").waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500); // detail query for the banner
  const banner = await page.getByText("Offer: Smoke Grand Imperial Deluxe").count();
  const couponLine = await page.getByText(/Coupon STAYTEST10 · −₹100 · Funded by WayTero/).count();
  console.log("popup offer banner:", banner > 0, "| coupon line:", couponLine > 0);
  await page.screenshot({ path: OUT + "/partner-accept-popup-banner.png" });

  // Reject this QA booking through the popup (cleanup).
  await page.getByRole("button", { name: /^Reject$/ }).click();
  await page.getByPlaceholder(/Rooms not available/i).fill("QA cleanup — rejecting test booking");
  await page.getByRole("button", { name: /Reject Booking/i }).click();
  await page.waitForTimeout(4000);
  const popupGone = (await page.getByText("New Hotel Booking").count()) === 0;
  console.log("popup closed after reject:", popupGone);
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("QA FAILED:", e.message); process.exit(1); });
