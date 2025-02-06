import express from "express";
import cors from "cors";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as cheerio from "cheerio";
import fs from "fs";

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;
const username = "im.osterx.in";
const password = "imposter@15#12";
const cookiesFilePath = "./instagram_cookies.json";

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

const scrapeInstagram = async (profileUrl) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1280, height: 800 });

  if (fs.existsSync(cookiesFilePath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, "utf8"));
    await page.setCookie(...cookies);
  }

  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "networkidle2",
  });

  if (page.url() !== "https://www.instagram.com/") {
    await page.waitForSelector('input[name="username"]', { visible: true });
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    const cookies = await page.cookies();
    fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies, null, 2));
  }

  await page.goto(profileUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector("body");

  const htmlContent = await page.content();
  const $ = cheerio.load(htmlContent);
  
  let followers = $("a[href$='/followers/'] > span").text().trim();
  let following = $("a[href$='/following/'] > span").text().trim();

  await browser.close();
  return { followers: followers || "Not Found", following: following || "Not Found" };
};

app.get('/scrape' , async(req,res) =>{
  res.json({
    body:"Hello World"
  })
})

// POST endpoint to scrape Instagram profile
app.post("/scrape", async (req, res) => {
  const { profile } = req.body; // Accept profile URL from request body
  if (!profile) {
    return res.status(400).json({ error: "Profile URL is required" });
  }

  try {
    const data = await scrapeInstagram(profile);
    res.json(data);
  } catch (error) {
    res.status(402).json({ error: "Failed to scrape profile", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
