import fs from "fs";
import handlebars from "handlebars";
import path from "path";
import puppeteer from "puppeteer";

export const generateReceiptPDF = async (data: any) => {
  try {
    /* 🔥 TEMPLATE PATH */
    const templatePath = path.join(
      process.cwd(),
      "src/modules/school-admin/receipt/templates/receipt.hbs",
    );

    const htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    const compiled = handlebars.compile(htmlTemplate);
    const finalHtml = compiled(data);

    /* 🔥 ENSURE FOLDER EXISTS */
    const dir = path.join(process.cwd(), "public/receipts");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = `${data.receiptNumber}.pdf`;
    const filePath = path.join(dir, fileName);

    console.log("PDF will be saved at:", filePath);

    /* 🔥 LAUNCH BROWSER (SAFE CONFIG) */
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // 🔥 fix for errors
    });

    const page = await browser.newPage();

    await page.setContent(finalHtml, { waitUntil: "load" });

    /* 🔥 GENERATE PDF */
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    console.log("PDF generated successfully");

    return `/receipts/${fileName}`;
  } catch (error) {
    console.error("PDF GENERATION ERROR:", error);
    throw error;
  }
};
