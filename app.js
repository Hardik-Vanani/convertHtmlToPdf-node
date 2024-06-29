const express = require("express");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 3000;

app.get("/pdf", async (req, res) => {
    // Load invoice data
    const invoiceData = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "invoice.json"), "utf-8"));

    // Render EJS template
    const html = await ejs.renderFile(path.join(__dirname, "views", "invoice.ejs"), { invoice: invoiceData });

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const contentSize = await page.evaluate(() => {
        const body = document.body;
        const width = body.scrollWidth;
        const height = body.scrollHeight;
        return { width, height };
    });

    if (contentSize.height < 1100) {
        await page.evaluate(() => {
            const body = document.body;
            const fullHeight = 1100;
            body.style.height = `${fullHeight}px`;
        });
    }

    const result = await page.evaluate(() => {
        const body = document.body;
        const width = body.scrollWidth;
        const height = body.scrollHeight;
        return { width, height };
    });
    console.log(`Content Size (px): Width: ${result.width}, Height: ${result.height}}`);

    // // Convert pixels to millimeters (1 inch = 25.4 mm, 1 inch = 96 pixels)
    // const pixelToMm = 25.4 / 96;
    // const contentWidthMm = contentSize.width * pixelToMm;
    // const contentHeightMm = contentSize.height * pixelToMm;

    // // Log content size in millimeters
    // console.log(`Content Size (mm): Width: ${contentWidthMm.toFixed(2)}, Height: ${contentHeightMm.toFixed(2)}`);

    // if (contentHeightMm.toFixed(2) < 297) {
    //     const fullHeight = contentHeightMm.toFixed(2) + (297 - contentHeightMm.toFixed(2));

    // }
    // Generate PDF and close browser
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // Set response headers
    res.contentType("application/pdf");
    res.send(pdf);

    //! For download the PDF
    // res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf")
    // res.setHeader('Content-Type', 'application/pdf');
    // res.send(pdf)
});

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});
