import fs from "fs";
import handlebars from "handlebars";
import path from "path";
import puppeteer from "puppeteer";

const escapeHtml = (value: any) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeNumber = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-GB");
};

const makeLogoFallback = (schoolName?: string) => {
  const label =
    (schoolName || "School")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S";

  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <rect width="180" height="180" rx="28" fill="#eaf2ff"/>
      <circle cx="90" cy="76" r="34" fill="#2563eb"/>
      <path d="M46 130c11-20 28-30 44-30s33 10 44 30" fill="none" stroke="#1d4ed8" stroke-width="10" stroke-linecap="round"/>
      <text x="90" y="112" text-anchor="middle" font-size="42" font-family="Arial" font-weight="700" fill="#ffffff">${label}</text>
    </svg>
  `).toString("base64")}`;
};

const makeSealFallback = () =>
  `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r="76" fill="#fff7e6" stroke="#f59e0b" stroke-width="6"/>
      <circle cx="90" cy="90" r="54" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="8 6"/>
      <text x="90" y="100" text-anchor="middle" font-size="18" font-family="Arial" fill="#92400e" font-weight="700">SEAL</text>
    </svg>
  `).toString("base64")}`;

const makeSignatureFallback = () =>
  `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="120" viewBox="0 0 360 120">
      <path d="M40 80c18-24 34-28 44-9 7 14 16 16 30 5 18-14 28-35 44-36 13 0 15 18 4 36-8 13-11 23-3 25 14 4 28-14 38-31 9-15 15-27 27-27 12 1 15 15 10 32-4 14-2 23 10 25 14 3 26-11 34-26" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="210" y1="88" x2="330" y2="88" stroke="#cbd5e1" stroke-width="3"/>
    </svg>
  `).toString("base64")}`;

const makeStudentPlaceholder = () =>
  `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="260" viewBox="0 0 220 260">
      <rect width="220" height="260" rx="20" fill="#eff6ff"/>
      <circle cx="110" cy="95" r="42" fill="#bfdbfe"/>
      <path d="M46 214c12-34 37-54 64-54s52 20 64 54" fill="#dbeafe"/>
      <circle cx="110" cy="95" r="28" fill="#ffffff"/>
    </svg>
  `).toString("base64")}`;

const resolveAssetUrl = (value?: string | null, baseUrl = "") => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("data:")) return value;
  const trimmedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return trimmedBase ? `${trimmedBase}${normalizedPath}` : normalizedPath;
};

const buildMarksCardHtml = (data: any) => {
  const templatePath = path.join(
    process.cwd(),
    "src/modules/result/templates/marks-card.hbs",
  );

  const htmlTemplate = fs.readFileSync(templatePath, "utf-8");
  const compiled = handlebars.compile(htmlTemplate);

  return compiled({
    ...data,
    approvalLabel: data.exam?.marksCardStatus === "approved" ? "APPROVED" : "DRAFT",
    schoolLogo: resolveAssetUrl(data.school?.logo, data.serverUrl) || makeLogoFallback(data.school?.name),
    sealImage: resolveAssetUrl(data.school?.seal, data.serverUrl) || makeSealFallback(),
    signatureImage: resolveAssetUrl(data.school?.signature, data.serverUrl) || makeSignatureFallback(),
    studentPhoto: resolveAssetUrl(data.student?.photo, data.serverUrl) || makeStudentPlaceholder(),
    schoolName: escapeHtml(data.school?.name || "School"),
    schoolAddress: escapeHtml(data.school?.address || "Address not available"),
    studentName: escapeHtml(data.student?.name || "Student"),
    fatherName: escapeHtml(data.student?.fatherName || "N/A"),
    className: escapeHtml(data.student?.className || "N/A"),
    sectionName: escapeHtml(data.student?.sectionName || "All"),
    rollNumber: escapeHtml(data.student?.rollNumber ?? "N/A"),
    examName: escapeHtml(data.exam?.name || "Exam"),
    examType: escapeHtml(data.exam?.examType || "Mid Term"),
    summary: {
      ...data.summary,
      grade: escapeHtml(data.summary?.grade || "N/A"),
      remarks: escapeHtml(data.summary?.remarks || "Result ready"),
    },
    subjects: Array.isArray(data.subjects)
      ? data.subjects.map((subject: any) => ({
          grade: escapeHtml(subject.grade || "N/A"),
          max: normalizeNumber(subject.max),
          obtained: normalizeNumber(subject.obtained),
          name: escapeHtml(subject.name || "Subject"),
        }))
      : [],
  });
};

const renderMarksCardToPdf = async (html: string, filePath: string) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await browser.close();
};

const renderMarksCardPreview = async (html: string, filePath: string) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  const sheet = await page.$(".sheet");

  if (sheet) {
    await sheet.screenshot({
      path: filePath,
      type: "png",
    });
  } else {
    await page.screenshot({
      path: filePath,
      fullPage: true,
      type: "png",
    });
  }
  await browser.close();
};

export const generateMarksCardPDF = async (data: any) => {
  const finalHtml = buildMarksCardHtml(data);
  const dir = path.join(process.cwd(), "public/marks-cards");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileName = `${data.fileName}.pdf`;
  const filePath = path.join(dir, fileName);

  await renderMarksCardToPdf(finalHtml, filePath);

  return `/api/files/marks-cards/${fileName}`;
};

export const generateMarksCardPreviewImage = async (data: any) => {
  const finalHtml = buildMarksCardHtml(data);
  const dir = path.join(process.cwd(), "public/marks-cards/previews");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileName = `${data.fileName}.png`;
  const filePath = path.join(dir, fileName);

  await renderMarksCardPreview(finalHtml, filePath);

  return `/api/files/marks-cards/previews/${fileName}`;
};
