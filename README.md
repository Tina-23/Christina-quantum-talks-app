# 📡 Quantum Pulse

Quantum Pulse is a premium web application that aggregates real-time news updates and announcements from the **IBM Quantum Blog** and the **PennyLane Blog**. The application includes a custom-built **X (Twitter) Composer** allowing researchers, developers, and quantum enthusiasts to share industry breakthroughs on social media with a single click.

Built using **Python Flask** and plain vanilla **HTML, CSS, and JavaScript**.

---

## ✨ Features

- **Chronological Feed**: Merged and chronologically sorted updates from IBM Quantum and PennyLane.
- **Dynamic Filter & Search**: Instantly filter updates by source (All, IBM, PennyLane) or search by keyword (title, description, tags, authors) client-side.
- **In-Memory Cache**: Stores articles in memory to ensure near-instantaneous page loads.
- **Offline / Failure Resiliency**: Gracefully switches to cached fallback/mock updates if the external blogs change layout or if the network is disconnected.
- **Tweet Composer**:
  - Automatically compiles a structured tweet with the article title, relevant handles (`@IBMQuantum` or `@PennyLaneAI`), and a link.
  - Interactive **Hashtag Chips** to append or remove common tags quickly.
  - Live character limit counter (280 characters) integrated with a responsive, color-coded **SVG circular progress ring**.
  - **Twitter Web Intent** integration to securely post your draft on X via a centered popup window.

---

## 🎨 Visual Aesthetics

Designed with a premium dark-themed layout:
- **Neon Source Accents**: Custom neon blue styles for IBM Quantum and neon teal for PennyLane.
- **Responsive Layout**: Adapts from a widescreen two-column grid (Feed on the left, Composer on the right) to a single-column layout on mobile.
- **Smooth Animations**: Pulse ring indicators, card lift translations on hover, fade-in transitions, and skeleton loader shimmers for a modern feel.

---

## 📁 Project Structure

```
agy-cli-projects/
├── app.py                  # Flask Application Server (Scraping, caching, APIs)
├── templates/
│   └── index.html          # Semantic HTML5 Layout
├── static/
│   ├── css/
│   │   └── style.css       # Core Design System, grid layout, animations
│   └── js/
│       └── main.js         # JavaScript Logic (filters, UI state, Tweet composer)
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have **Python 3.x** installed along with the required packages:

```bash
pip install flask requests beautifulsoup4
```

### ⚙️ Running the Application

1. Clone or navigate to the project directory:
   ```bash
   cd Christina-quantum-talks-app
   ```

2. Start the Flask server:
   ```bash
   python app.py
   ```

3. Open your browser and navigate to:
   **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 💻 Technical Breakdown

### Server-Side (`app.py`)
- Uses Python `requests` to fetch HTML from target blog URLs.
- Employs `BeautifulSoup` to scan the DOM and extract metadata.
- Normalizes diverse date formats (e.g. `June 22, 2026` vs `29 Jun 2026`) for precise sorting.
- Implements `/api/updates` which serves JSON payloads of combined feeds.

### Client-Side (`main.js` & `style.css`)
- Loads updates asynchronously using `fetch()` and displays loading skeletons during requests.
- Handles text input in the composer textarea and computes the progress stroke length of the SVG ring dynamically.
- Triggers Twitter web intents with safe, URL-encoded query parameters.
