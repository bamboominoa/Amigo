import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const SPREADSHEET_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyrZMa_uzMRfdYSQDvayRf-SpRgU2uJYl2PeNUl1RYeGXP79RDXB6xXG0l7P6wOQFWh5w/exec";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes - Proxy to Google Apps Script
  app.get("/api", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { action, sheet } = req.query;
      console.log(`[API GET] action=${action} sheet=${sheet}`);
      
      if (!SPREADSHEET_URL || SPREADSHEET_URL.includes("SCRIPT_ID_HERE")) {
        console.error("[API GET] Missing SPREADSHEET_URL");
        return res.status(400).json({ 
          success: false, 
          error: "Vui lòng cấu hình GOOGLE_SCRIPT_URL trong Settings -> Secrets." 
        });
      }

      const url = new URL(SPREADSHEET_URL);
      if (action) url.searchParams.append("action", action as string);
      if (sheet) url.searchParams.append("sheet", sheet as string);

      console.log(`[API GET] Fetching from GAS: ${url.toString()}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cache-Control': 'no-cache'
        },
        redirect: 'follow'
      });

      console.log(`[API GET] Response Status: ${response.status} | Final URL: ${response.url}`);
      
      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch (e) {
        console.error("[API GET] Failed to parse JSON. Response start:", text.substring(0, 500));
        
        if (text.includes("Google Accounts") || text.includes("login") || text.includes("Sign in") || response.url.includes("accounts.google.com")) {
          return res.status(401).json({
            success: false,
            error: "Google Script yêu cầu quyền truy cập.",
            message: "QUAN TRỌNG: Bạn cần Deploy lại Web App.\n1. Chọn 'Deploy' -> 'New deployment'.\n2. Mục 'Who has access' PHẢI chọn 'Anyone'.\n3. Copy URL mới và cập nhật lại.",
            debug_url: response.url,
            is_auth_error: true
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          error: "Google Apps Script trả về HTML thay vì JSON.",
          preview: text.substring(0, 500)
        });
      }
    } catch (error) {
      console.error("[API GET] Proxy Error:", error);
      return res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post("/api", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const payload = req.body;
      console.log(`[API POST] Payload:`, payload);
      
      if (!SPREADSHEET_URL || SPREADSHEET_URL.includes("SCRIPT_ID_HERE")) {
        return res.status(400).json({ 
          success: false, 
          error: "Vui lòng cấu hình GOOGLE_SCRIPT_URL trong Settings -> Secrets." 
        });
      }

      const response = await fetch(SPREADSHEET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      console.log(`[API POST] GAS Status: ${response.status}`);
      const text = await response.text();

      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch (e) {
        console.error("[API POST] Failed to parse GAS response as JSON.");
        console.error("[API POST] Response snippet:", text.substring(0, 200));

        if (text.includes("Google Accounts") || text.includes("login") || text.includes("Sign in")) {
          return res.status(401).json({
            success: false,
            error: "Lỗi: Google Script yêu cầu đăng nhập.",
            message: "Hãy đảm bảo bạn đã chọn 'Anyone' khi Deploy Web App."
          });
        }

        return res.status(500).json({ 
          success: false, 
          error: "Google Apps Script trả về HTML thay vì JSON.",
          preview: text.substring(0, 500)
        });
      }
    } catch (error) {
      console.error("[API POST] Proxy Error:", error);
      return res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
