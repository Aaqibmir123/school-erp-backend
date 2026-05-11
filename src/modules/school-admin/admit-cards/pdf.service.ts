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

const schoolLogoSvg = `data:image/svg+xml;base64,${Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="28" fill="#eaf2ff"/>
  <circle cx="90" cy="76" r="34" fill="#2563eb"/>
  <path d="M46 130c11-20 28-30 44-30s33 10 44 30" fill="none" stroke="#1d4ed8" stroke-width="10" stroke-linecap="round"/>
  <path d="M90 44l10 18 20 4-14 14 3 20-19-10-19 10 3-20-14-14 20-4z" fill="#ffffff"/>
</svg>`).toString("base64")}`;

const sealSvg = `data:image/svg+xml;base64,${Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <circle cx="90" cy="90" r="76" fill="#fff7e6" stroke="#f59e0b" stroke-width="6"/>
  <circle cx="90" cy="90" r="54" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="8 6"/>
  <path d="M90 38l10 18 20 4-14 14 3 20-19-10-19 10 3-20-14-14 20-4z" fill="#f59e0b"/>
  <text x="90" y="112" text-anchor="middle" font-size="18" font-family="Arial" fill="#92400e" font-weight="700">SEAL</text>
</svg>`).toString("base64")}`;

const signatureSvg = `data:image/svg+xml;base64,${Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="120" viewBox="0 0 360 120">
  <rect width="360" height="120" rx="18" fill="#f8fafc"/>
  <path d="M40 80c18-24 34-28 44-9 7 14 16 16 30 5 18-14 28-35 44-36 13 0 15 18 4 36-8 13-11 23-3 25 14 4 28-14 38-31 9-15 15-27 27-27 12 1 15 15 10 32-4 14-2 23 10 25 14 3 26-11 34-26" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="210" y1="88" x2="330" y2="88" stroke="#cbd5e1" stroke-width="3"/>
</svg>`).toString("base64")}`;

const studentPlaceholderSvg = `data:image/svg+xml;base64,${Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="260" viewBox="0 0 220 260">
  <rect width="220" height="260" rx="20" fill="#eff6ff"/>
  <circle cx="110" cy="95" r="42" fill="#bfdbfe"/>
  <path d="M46 214c12-34 37-54 64-54s52 20 64 54" fill="#dbeafe"/>
  <circle cx="110" cy="95" r="28" fill="#ffffff"/>
</svg>`).toString("base64")}`;

const normalizeText = (value?: string | null) => escapeHtml(value || "N/A");

const formatTime12h = (value?: string | null) => {
  if (!value) return "N/A";

  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return escapeHtml(value);

  const hours = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours) || hours < 0 || hours > 23) return escapeHtml(value);

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${minutes} ${suffix}`;
};

const resolveAssetUrl = (value?: string | null, baseUrl = "") => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("data:")) return value;
  const trimmedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return trimmedBase ? `${trimmedBase}${normalizedPath}` : normalizedPath;
};

const buildAdmitCardHtml = (data: any) => {
  const templatePath = path.join(
    process.cwd(),
    "src/modules/school-admin/admit-cards/templates/admit-card.hbs",
  );

  const htmlTemplate = fs.readFileSync(templatePath, "utf-8");
  const compiled = handlebars.compile(htmlTemplate);

  return compiled({
    ...data,
    schoolLogo: schoolLogoSvg,
    sealImage: sealSvg,
    signatureImage: signatureSvg,
    studentPhoto: resolveAssetUrl(data.studentPhoto, data.serverUrl) || studentPlaceholderSvg,
    schoolName: normalizeText(data.schoolName),
    schoolAddress: normalizeText(data.schoolAddress),
    schoolPhone: normalizeText(data.schoolPhone),
    schoolEmail: normalizeText(data.schoolEmail),
    principalName: normalizeText(data.principalName),
    studentName: normalizeText(data.studentName),
    fatherName: normalizeText(data.fatherName),
    address: normalizeText(data.address),
    parentPhone: normalizeText(data.parentPhone),
    className: normalizeText(data.className),
    sectionName: normalizeText(data.sectionName),
    admissionNo: normalizeText(data.admissionNo),
    rollNumber: normalizeText(data.rollNumber),
    examName: normalizeText(data.examName),
    examType: normalizeText(data.examType),
    session: normalizeText(data.session),
    examDateRange: normalizeText(data.examDateRange),
    examCode: normalizeText(data.examCode),
    releaseNote: normalizeText(data.releaseNote),
    instructions: Array.isArray(data.instructions)
      ? data.instructions.map((item: string) => normalizeText(item))
      : [],
    subjects: Array.isArray(data.subjects)
      ? data.subjects.map((item: any) => ({
          ...item,
          className: normalizeText(item.className),
          date: normalizeText(item.date),
          day: normalizeText(item.day),
          endTime: formatTime12h(item.endTime),
          sectionName: normalizeText(item.sectionName),
          startTime: formatTime12h(item.startTime),
          subjectName: normalizeText(item.subjectName),
        }))
      : [],
  });
};

export const generateAdmitCardPDF = async (data: any) => {
  const finalHtml = buildAdmitCardHtml(data);

  const dir = path.join(process.cwd(), "public/admit-cards");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileName = `${data.fileName}.pdf`;
  const filePath = path.join(dir, fileName);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(finalHtml, { waitUntil: "load" });
  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
    },
  });

  await browser.close();

  return `/api/files/admit-cards/${fileName}`;
};

export const generateAdmitCardPreviewImage = async (data: any) => {
  const finalHtml = buildAdmitCardHtml(data);

  const dir = path.join(process.cwd(), "public/admit-cards/previews");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileName = `${data.fileName}.png`;
  const filePath = path.join(dir, fileName);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
  await page.setContent(finalHtml, { waitUntil: "load" });
  await page.screenshot({
    path: filePath,
    fullPage: true,
    type: "png",
  });

  await browser.close();

  return `/api/files/admit-cards/previews/${fileName}`;
};
