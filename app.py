from flask import Flask, render_template, jsonify, request
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import os

app = Flask(__name__)

# Fallback/mock data to ensure the app is always functional even without internet
MOCK_UPDATES = [
    {
        "id": "mock-ibm-1",
        "source": "IBM Quantum",
        "title": "A decade of quantum on the cloud",
        "link": "https://www.ibm.com/quantum/blog/decade-of-quantum",
        "date": "2026-05-04",
        "display_date": "4 May 2026",
        "authors": ["Robert Davis"],
        "tags": ["Community", "Network"],
        "description": "Ten years ago, IBM connected the first quantum computer to the cloud, launching an era of open-source quantum programming and community collaboration that spans the globe.",
        "is_mock": True
    },
    {
        "id": "mock-pl-1",
        "source": "PennyLane",
        "title": "Top quantum algorithms papers — Spring 2026 edition",
        "link": "https://pennylane.ai/blog/2026/06/top-quantum-algorithms-papers-spring-2026",
        "date": "2026-06-22",
        "display_date": "June 22, 2026",
        "authors": ["Juan Miguel Arrazola", "Danial Motlagh"],
        "tags": ["Algorithms"],
        "description": "We've selected our favourite papers from the second quarter of 2026. Read our takeaways from the top quantum algorithms papers that we admire and that have been influential to our research.",
        "is_mock": True
    },
    {
        "id": "mock-ibm-2",
        "source": "IBM Quantum",
        "title": "Apply to IBM Quantum Developer Conference 2026",
        "link": "https://www.ibm.com/quantum/blog/qdc-application-2026",
        "date": "2026-06-29",
        "display_date": "29 Jun 2026",
        "authors": ["Catherine Dundon"],
        "tags": ["Community", "Network"],
        "description": "Applications are now open for the annual IBM Quantum Developer Conference. Join developers and researchers from around the world to share projects, attend workshops, and shape the future of Qiskit.",
        "is_mock": True
    },
    {
        "id": "mock-pl-2",
        "source": "PennyLane",
        "title": "Your June PennyLane Roundup: v0.45 release, unitaryHACK, and a citation milestone!",
        "link": "https://pennylane.ai/blog/2026/06/your-june-pennyLane-roundup",
        "date": "2026-06-15",
        "display_date": "June 15, 2026",
        "authors": ["Josh Izaac", "David Ren", "Nathan Killoran"],
        "tags": ["Newsletter"],
        "description": "Whether you're actively building the next quantum algorithm or just keeping an eye on where the field is heading, we want to bring the very best of the PennyLane ecosystem directly to your inbox.",
        "is_mock": True
    },
    {
        "id": "mock-ibm-3",
        "source": "IBM Quantum",
        "title": "Qiskit Paulice: postselected quantum error correction for near-term hardware",
        "link": "https://www.ibm.com/quantum/blog/qiskit-paulice",
        "date": "2026-06-25",
        "display_date": "25 Jun 2026",
        "authors": ["Catherine Dundon"],
        "tags": ["Software", "Error Correction"],
        "description": "Introducing Qiskit Paulice, a new software tool designed to implement postselected quantum error correction. This toolkit helps developers optimize error mitigation strategies on near-term noisy quantum processors.",
        "is_mock": True
    },
    {
        "id": "mock-pl-3",
        "source": "PennyLane",
        "title": "Benchmarking Quantum Machine Learning with MatchCake",
        "link": "https://pennylane.ai/blog/2026/06/benchmarking-quantum-machine-learning-with-matchcake",
        "date": "2026-06-12",
        "display_date": "June 12, 2026",
        "authors": ["Jérémie Gince"],
        "tags": ["Plugins", "QML"],
        "description": "Before claiming quantum advantage in QML, you need to check whether a classically simulable free-fermionic model can already do the job. MatchCake makes that comparison easy and direct.",
        "is_mock": True
    }
]

# Simple in-memory cache
cache = {
    "updates": [],
    "last_fetched": None
}

def parse_date(date_str):
    # Strip whitespace
    ds = date_str.strip()
    
    # Strip IBM author suffix if present (e.g. "4 May 2026 — Robert Davis" or "4 May 2026 \u2014 Robert Davis")
    for sep in ['—', '–', '-', '•', '|']:
        if sep in ds:
            ds = ds.split(sep)[0].strip()
            break
            
    # Try formats
    formats = [
        '%B %d, %Y',  # June 22, 2026
        '%d %b %Y',   # 29 Jun 2026
        '%d %B %Y',   # 4 May 2026
        '%Y-%m-%d'    # Iso
    ]
    for fmt in formats:
        try:
            return datetime.strptime(ds, fmt)
        except ValueError:
            pass
    return None

def scrape_pennylane():
    updates = []
    url = "https://pennylane.ai/blog/"
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            cards = soup.select('.BlogPostCard')
            for card in cards:
                title_el = card.select_one('.BlogPostCard__title a')
                date_el = card.select_one('.ArticleDate')
                desc_el = card.select_one('.ArticleDescription')
                
                if not title_el:
                    continue
                    
                title = title_el.text.strip()
                link = "https://pennylane.ai" + title_el['href'] if title_el.get('href').startswith('/') else title_el['href']
                display_date = date_el.text.strip() if date_el else ""
                description = desc_el.text.strip() if desc_el else ""
                
                # Try to extract categories/tags
                tags = []
                cat_el = card.select_one('.ArticleCategory a')
                if cat_el:
                    tags.append(cat_el.text.strip())
                
                # Try to extract authors
                authors = []
                author_pills = card.select('.AuthorPill__name')
                for pill in author_pills:
                    authors.append(pill.text.strip())
                
                # Parse date for sorting
                p_date = parse_date(display_date)
                date_iso = p_date.strftime('%Y-%m-%d') if p_date else "2026-01-01"
                
                updates.append({
                    "id": f"pl-{hash(title) & 0xffffffff}",
                    "source": "PennyLane",
                    "title": title,
                    "link": link,
                    "date": date_iso,
                    "display_date": display_date,
                    "authors": authors,
                    "tags": tags,
                    "description": description,
                    "is_mock": False
                })
    except Exception as e:
        print(f"Error scraping PennyLane: {e}")
    return updates

def scrape_ibm():
    updates = []
    url = "https://www.ibm.com/quantum/blog"
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # Find all links matching '/quantum/blog/'
            links = soup.find_all('a', href=re.compile(r'/quantum/blog/'))
            for idx, link in enumerate(links):
                href = link.get('href')
                full_link = "https://www.ibm.com" + href if href.startswith('/') else href
                
                # Extract title from h2, h3, h5 etc. inside the anchor link
                title_el = link.find(['h2', 'h3', 'h4', 'h5'])
                title = title_el.text.strip() if title_el else ""
                
                if not title:
                    # Fallback to link text
                    # Often the full text contains "A decade of quantum... Robert Davis Community Network"
                    # If we don't have a clean heading, skip or clean it
                    continue
                
                # Extract date/author paragraph
                date_el = link.find('p', class_=re.compile(r'publish_info|date'))
                date_text = date_el.text.strip() if date_el else ""
                
                # Extract tags (cds--tag__label)
                tags = []
                tag_els = link.find_all('span', class_='cds--tag__label')
                for t_el in tag_els:
                    tags.append(t_el.text.strip())
                
                # Authors and display date splitting
                display_date = date_text
                authors = []
                if '—' in date_text:
                    parts = date_text.split('—')
                    display_date = parts[0].strip()
                    # Authors can be comma separated
                    author_list = parts[1].split(',')
                    authors = [a.strip() for a in author_list if a.strip()]
                elif '•' in date_text:
                    parts = date_text.split('•')
                    display_date = parts[0].strip()
                    author_list = parts[1].split(',')
                    authors = [a.strip() for a in author_list if a.strip()]
                    
                # Clean up display date if it has weird symbols
                display_date = display_date.replace('', '').strip()
                
                # Parse date
                p_date = parse_date(display_date)
                date_iso = p_date.strftime('%Y-%m-%d') if p_date else "2026-01-01"
                
                # IBM blogs don't have descriptions on the card, but we can generate a short one 
                # or leave it blank/create a placeholder based on tags
                description = f"Latest quantum computing update from IBM Quantum, covering {', '.join(tags) if tags else 'announcements'}."
                
                # Prevent duplicates (since the same link can appear multiple times e.g. for image and title)
                if not any(u['link'] == full_link for u in updates):
                    updates.append({
                        "id": f"ibm-{hash(full_link) & 0xffffffff}",
                        "source": "IBM Quantum",
                        "title": title,
                        "link": full_link,
                        "date": date_iso,
                        "display_date": display_date,
                        "authors": authors,
                        "tags": tags,
                        "description": description,
                        "is_mock": False
                    })
    except Exception as e:
        print(f"Error scraping IBM Quantum: {e}")
    return updates

def get_all_updates(force_refresh=False):
    global cache
    
    # Return cache if available and not forced
    if cache["updates"] and not force_refresh:
        return cache["updates"]
        
    print("Fetching live feeds...")
    pl_updates = scrape_pennylane()
    ibm_updates = scrape_ibm()
    
    all_updates = pl_updates + ibm_updates
    
    # Sort updates by date descending (newest first)
    if all_updates:
        # Use datetime parsing for precise sorting, fallback to date string
        def sort_key(x):
            try:
                return datetime.strptime(x["date"], "%Y-%m-%d")
            except Exception:
                return datetime.min
                
        all_updates.sort(key=sort_key, reverse=True)
        cache["updates"] = all_updates
        cache["last_fetched"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"Successfully loaded {len(all_updates)} updates live.")
    else:
        # If scraper returned absolutely nothing (offline/blocked), use mocks
        print("Using fallback mock updates due to fetch error or empty results.")
        all_updates = list(MOCK_UPDATES)
        # Sort mock updates just in case
        all_updates.sort(key=lambda x: x["date"], reverse=True)
        cache["updates"] = all_updates
        cache["last_fetched"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S") + " (Fallback)"
        
    return all_updates

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/updates')
def api_updates():
    force = request.args.get('refresh', 'false').lower() == 'true'
    updates = get_all_updates(force_refresh=force)
    return jsonify({
        "status": "success",
        "count": len(updates),
        "last_updated": cache["last_fetched"],
        "updates": updates
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
