from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")
links = """  <meta name="theme-color" content="#1e3a8a" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Flussdiagramm" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <link rel="icon" href="./app-icon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="./app-icon.svg" />
"""
registration = """
  <script>
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
    }
  </script>
"""
if 'rel="manifest"' not in text:
    text = text.replace("</head>", links + "</head>", 1)
if "navigator.serviceWorker.register" not in text:
    text = text.replace("</body>", registration + "</body>", 1)
path.write_text(text, encoding="utf-8")
