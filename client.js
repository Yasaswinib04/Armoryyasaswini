// The URL of your deployed Apps Script Web App:
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrme-BQB1Bjhqkl1V8jzv0hQ_LZWmU5wdE-qazdpv3x9JNbkzGCp6yV--0h--kbtHJ/exec";

// We'll store timeouts for each input so we can debounce
let bookNameTimer = null;
let authorTimer   = null;
let isbnTimer     = null;

let searchResults = [];

function initPage() {
  // Load categories
  fetch(`${SCRIPT_URL}?method=getCategories`)
    .then(response => response.json())
    .then(json => {
      if (json.success) {
        populateCategoryDropdown(json.categories);
      } else {
        console.error("Error fetching categories:", json.error);
      }
    })
    .catch(err => console.error("Error:", err));

  // Attach custom auto-complete listeners:
  const bookNameInput = document.getElementById("bookName");
  const authorInput   = document.getElementById("author");
  const isbnInput     = document.getElementById("isbn");

  // When user types in Book Name -> debounced logic
  bookNameInput.addEventListener("input", e => {
    // Clear any existing timer
    clearTimeout(bookNameTimer);
    // Wait 300ms before actually fetching suggestions
    bookNameTimer = setTimeout(() => {
      onBookNameInput(e);
    }, 300);
  });

  // When user types in Author -> debounced logic
  authorInput.addEventListener("input", e => {
    clearTimeout(authorTimer);
    authorTimer = setTimeout(() => {
      onAuthorInput(e);
    }, 300);
  });

  // When user types in ISBN -> debounced logic
  isbnInput.addEventListener("input", e => {
    clearTimeout(isbnTimer);
    isbnTimer = setTimeout(() => {
      onISBNInput(e);
    }, 300);
  });

  // Hide suggestion boxes if user clicks outside
  document.addEventListener("click", e => {
    if (!e.target.closest(".form-group")) {
      hideAllSuggestionBoxes();
    }
  });
}

function populateCategoryDropdown(categories) {
  const sel = document.getElementById("category");
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

/**
 * Book Name auto-complete logic:
 * 1) Only fetch if typed characters >= 3
 * 2) We pass category if selected
 */
function onBookNameInput(e) {
  const value = e.target.value.trim();
  if (value.length < 3) {
    // If fewer than 3 chars, clear suggestions
    showSuggestions("bookNameSuggestions", "bookName", []);
    return;
  }
  const categoryVal = document.getElementById("category").value;
  const url = `${SCRIPT_URL}?method=getSuggestions&value=${encodeURIComponent(value)}&colIndex=5&category=${encodeURIComponent(categoryVal)}`;

  fetch(url)
    .then(r => r.json())
    .then(json => {
      if (json.success) {
        showSuggestions("bookNameSuggestions", "bookName", json.suggestions);
      }
    })
    .catch(err => console.error(err));
}

function onAuthorInput(e) {
  const value = e.target.value.trim();
  if (value.length < 3) {
    showSuggestions("authorSuggestions", "author", []);
    return;
  }
  const categoryVal = document.getElementById("category").value;
  const url = `${SCRIPT_URL}?method=getSuggestions&value=${encodeURIComponent(value)}&colIndex=10&category=${encodeURIComponent(categoryVal)}`;

  fetch(url)
    .then(r => r.json())
    .then(json => {
      if (json.success) {
        showSuggestions("authorSuggestions", "author", json.suggestions);
      }
    })
    .catch(err => console.error(err));
}

function onISBNInput(e) {
  const value = e.target.value.trim();
  if (value.length < 3) {
    showSuggestions("isbnSuggestions", "isbn", []);
    return;
  }
  const categoryVal = document.getElementById("category").value;
  const url = `${SCRIPT_URL}?method=getSuggestions&value=${encodeURIComponent(value)}&colIndex=11&category=${encodeURIComponent(categoryVal)}`;

  fetch(url)
    .then(r => r.json())
    .then(json => {
      if (json.success) {
        showSuggestions("isbnSuggestions", "isbn", json.suggestions);
      }
    })
    .catch(err => console.error(err));
}

/* Utility to populate & show the custom suggestion box */
function showSuggestions(suggestionBoxId, inputId, suggestions) {
  const box = document.getElementById(suggestionBoxId);
  const list = box.querySelector("ul");
  const input = document.getElementById(inputId);

  // Clear old suggestions
  list.innerHTML = "";

  if (!suggestions || suggestions.length === 0) {
    box.style.display = "none";
    return;
  }

  // Create an <li> for each suggestion
  suggestions.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;
    li.addEventListener("click", () => {
      // User clicked on a suggestion:
      input.value = s;  // fill the input
      box.style.display = "none"; // hide suggestions
    });
    list.appendChild(li);
  });

  // Show the box
  box.style.display = "block";
}

/* Hide all suggestion boxes */
function hideAllSuggestionBoxes() {
  const boxes = document.querySelectorAll(".suggestion-box");
  boxes.forEach(b => b.style.display = "none");
}

/* Perform main search */
function performSearch() {
  const category = encodeURIComponent(document.getElementById("category").value);
  const bookName = encodeURIComponent(document.getElementById("bookName").value);
  const author   = encodeURIComponent(document.getElementById("author").value);
  const isbn     = encodeURIComponent(document.getElementById("isbn").value);
  const keywords = encodeURIComponent(document.getElementById("keywords").value);

  const url = `${SCRIPT_URL}?method=searchSheet&category=${category}&bookName=${bookName}&author=${author}&isbn=${isbn}&keywords=${keywords}`;

  fetch(url)
    .then(r => r.json())
    .then(json => {
      if (json.success) {
        displayResults(json.data);
      } else {
        document.getElementById("resultsDiv").innerHTML = `<p>Error: ${json.error}</p>`;
      }
    })
    .catch(err => {
      document.getElementById("resultsDiv").innerHTML = `<p style="color:red;">${err.message}</p>`;
    });
}

/* Display final search results in a table */
function displayResults(data) {
  const { headers, rows } = data;
  searchResults = rows;

  if (!rows || rows.length === 0) {
    document.getElementById("resultsDiv").innerHTML = "<p>No matching rows found.</p>";
    return;
  }

  let html = `<table><thead><tr>`;
  headers.forEach(h => {
    html += `<th>${h}</th>`;
  });
  html += "<th>Action</th></tr></thead><tbody>";

  rows.forEach((row, i) => {
    // row => [Category, Book Name, Author, ISBN, MoreInfo]
    html += "<tr>";
    html += `<td>${row[0]}</td>`; // Category
    html += `<td>${row[1]}</td>`; // Book Name
    html += `<td>${row[2]}</td>`; // Author
    html += `<td>${row[3]}</td>`; // ISBN
    html += `<td><button onclick="showMore(${i})">More</button></td>`;
    html += "</tr>";
  });

  html += "</tbody></table>";
  document.getElementById("resultsDiv").innerHTML = html;
}

/* "More" => open new tab with same styling (unchanged) */
function showMore(i) {
  const row = searchResults[i];
  const category    = row[0];
  const bookName    = row[1];
  const author      = row[2];
  const description = row[4];

  const newTab = window.open("", "_blank");
  newTab.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Broseph's Armory</title>
        <link 
          rel="icon"
          href="https://suvanbanerjee.github.io/sba-faq/_next/static/media/logo.c983c34b.png"
          type="image/png"
        >
        <style>
          /* Reuse the color palette & layout for the new tab */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background-color: #FFFFFF;
            color: #605C4E;
          }
          header {
            background-color: #F39117; 
            padding: 20px;
            display: flex;
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
          }
          .site-logo {
            height: 50px;
            margin-bottom: 10px;
          }
          header h1 {
            color: #363020;
            font-size: 1.5rem;
            text-align: center;
          }
          main {
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }
          footer {
            background-color: #28306F;
            padding: 10px 20px;
            text-align: center;
            margin-top: 40px;
          }
          footer p {
            color: #FFFFFF;
          }
          .book-details {
            margin-top: 20px;
          }
          .book-cover {
            max-width: 200px;
            display: block;
            margin-bottom: 20px;
          }
          h2 {
            margin-bottom: 10px;
          }
          p {
            margin: 6px 0;
          }
        </style>
      </head>
      <body>
        <header>
          <img 
            class="site-logo"
            src="https://suvanbanerjee.github.io/sba-faq/_next/static/media/logo.c983c34b.png"
            alt="Site Logo"
          >
          <h1>Armory</h1>
        </header>

        <main>
          <div class="book-details">
            <img class="book-cover" src="https://via.placeholder.com/200" alt="Book Cover Placeholder">
            <h2>${bookName}</h2>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Author:</strong> ${author}</p>
            <p><strong>Description:</strong> ${description}</p>
          </div>
        </main>

        <footer>
          <p>&copy; 2024 Broseph Foundation</p>
        </footer>
      </body>
    </html>
  `);
  newTab.document.close();
}
