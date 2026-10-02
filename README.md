# PDFCraft – Privacy-First Online PDF Tools

PDFCraft is a high-performance, client-side PDF utility platform built with React, TypeScript, Tailwind CSS, and WebAssembly/JS libraries (`pdf-lib`, `pdfjs-dist`, `tesseract.js`, `jsPDF`).

---

## 🚀 Local & Mobile Network Development Setup

To test the application on your mobile phone (Android/iOS) while running locally on your Windows PC:

### 1. Ensure Same Wi-Fi Network
Make sure both your Windows PC and your phone are connected to the **SAME Wi-Fi network**.

### 2. Start Development Server
Run the standard development command:
```bash
npm run dev
```
The server will automatically bind to `0.0.0.0` and output both your **Local** and **Network** URLs:

- **LOCAL PC**:
  [http://localhost:5173](http://localhost:5173)

- **PHONE (Same Wi-Fi Network)**:
  `http://<PC_LOCAL_IP>:5173`

*(Example: `http://10.179.115.79:5173`)*

---

## 🛡️ Windows Firewall Configuration (Private Network Only)

If your phone cannot load the page, Windows Firewall may be blocking inbound connections on port `5173`. 

Run the following command in **PowerShell (Run as Administrator)** to allow access exclusively on your local Private network:

```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server (Port 5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Private
```

---

## ⚡ Features & Architecture
- **100% Client-Side Engine**: All PDF operations (Merge, Split, Compress, Rotate, E-Sign, OCR, Watermark, Convert) execute entirely in browser memory.
- **Dynamic HMR**: Real-time hot module replacement over local Wi-Fi.
- **Zero Third-Party Tunnels**: No ngrok or public tunnel reliance for local network testing.
