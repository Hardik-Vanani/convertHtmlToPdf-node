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

    // Launch Puppeteer and create new page
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
    console.log(`Content Size (px): Width: ${contentSize.width}, Height: ${contentSize.height}`);

    await page.evaluate((contentSize) => {
        const body = document.body;
        const maxHeight = 1100;

        if (contentSize.height < maxHeight) {
            body.style.height = ` ${maxHeight}px`;
        } else if (contentSize.height > maxHeight) {
            const finalHeight = Math.ceil(contentSize.height / maxHeight) * 1100;

            body.style.height = ` ${finalHeight}px`;
        }
    }, contentSize);

    const result = await page.evaluate(() => {
        const body = document.body;
        const width = body.scrollWidth;
        const height = body.scrollHeight;
        return { width, height };
    });
    console.log(`Content Size (px): Width: ${result.width}, Height: ${result.height}`);

    // Generate PDF and close browser
    const pdf = await page.pdf({
        format: "A4",
    });
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
