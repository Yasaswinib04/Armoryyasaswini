function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  // Minimal CORS approach: no custom headers in pure TextOutput,
  // or you can do the HTML approach if you need advanced CORS.
  
  function finish(obj) {
    output.setContent(JSON.stringify(obj));
    return output;
  }

  var method = e.parameter.method || "";
  
  if (method === "getCategories") {
    var result = getCategories();
    return finish({ success: true, categories: result });
  }
  else if (method === "getSuggestions") {
    var value    = e.parameter.value    || "";
    var colIndex = parseInt(e.parameter.colIndex || "0", 10);
    var category = e.parameter.category || "";
    var suggestions = getSuggestions(value, colIndex, category);
    return finish({ success: true, suggestions: suggestions });
  }
  else if (method === "searchSheet") {
    var bookName = e.parameter.bookName || "";
    var author   = e.parameter.author   || "";
    var isbn     = e.parameter.isbn     || "";
    var cat      = e.parameter.category || "";
    var keywords = e.parameter.keywords || "";
    var data = searchSheet(bookName, author, isbn, cat, keywords);
    return finish({ success: true, data: data });
  }
  else {
    return finish({ success: false, error: "Unknown method" });
  }
}

/**
 * getCategories(): same as before
 */
function getCategories() {
  try {
    var ss = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1jW5nrLSSzXf3mtaFgo2gy3wo598bX7QnvPW6_wisXn0/edit?gid=773565545#gid=773565545');
    var catSheet = ss.getSheetByName('Cat Guide');
    var values = catSheet.getDataRange().getValues();
    var body = values.slice(1); // skip header
    var categoriesSet = new Set();
    body.forEach(function(row){
      var cat = (row[0] || "").toString().trim();
      if (cat) categoriesSet.add(cat);
    });
    return Array.from(categoriesSet);
  } catch(err) {
    return [];
  }
}

/**
 * getSuggestions(value, colIndex, category):
 * - If category != "", only return suggestions for rows that match that category (row[0]).
 * - Then partial-match the 'value' in row[colIndex].
 */
function getSuggestions(value, colIndex, category) {
  value = value.trim().toLowerCase();
  category = category.trim().toLowerCase();
  if (!value && !category) return [];

  try {
    var ss = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1jW5nrLSSzXf3mtaFgo2gy3wo598bX7QnvPW6_wisXn0/edit?gid=773565545#gid=773565545');
    var sheet = ss.getSheetByName('Books');
    var data = sheet.getDataRange().getValues();
    var body = data.slice(1); // skip header

    var suggestionsSet = new Set();
    body.forEach(function(row){
      var rowCat = (row[0]||"").toString().toLowerCase();       // category in col 1 (index 0)
      var cellVal = (row[colIndex]||"").toString().trim();      // the column we want to match (bookName/author/isbn)
      var cellValLC = cellVal.toLowerCase();
      
      // If category is non-empty, require the row's category to match exactly (case-insensitive).
      // If category is empty, we skip category filtering.
      if (category && rowCat !== category) {
        return; // skip this row
      }
      
      // If user typed something in 'value', partial match cellValLC.includes(value).
      if (value) {
        if (cellValLC.includes(value)) {
          suggestionsSet.add(cellVal);
        }
      } else {
        // If user didn't type anything but selected category, you might choose to return all possible suggestions
        // or none. Let's say we return all in that category:
        suggestionsSet.add(cellVal);
      }
    });

    // Return up to 30 unique suggestions
    return Array.from(suggestionsSet).slice(0, 30);

  } catch(err) {
    return [];
  }
}

/**
 * searchSheet(bookName, author, isbn, category, keywords)
 * same as before, except 'category' is used to filter rows by row[0].
 */
function searchSheet(bookName, author, isbn, category, keywords) {
  try {
    var ss = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1jW5nrLSSzXf3mtaFgo2gy3wo598bX7QnvPW6_wisXn0/edit?gid=773565545#gid=773565545');
    var sheet = ss.getSheetByName('Books');
    var data = sheet.getDataRange().getValues();
    var body = data.slice(1);

    var sBookName = bookName.toLowerCase();
    var sAuthor   = author.toLowerCase();
    var sISBN     = isbn.toLowerCase();
    var sCat      = category.toLowerCase();
    var sKeys     = keywords.toLowerCase();

    var filtered = body.filter(function(row){
      var colCat  = (row[0]||"").toString().toLowerCase();
      var colBook = (row[5]||"").toString().toLowerCase();
      var colAuth = (row[10]||"").toString().toLowerCase();
      var colISBN = (row[11]||"").toString().toLowerCase();
      var colDesc = (row[13]||"").toString().toLowerCase();
      var colKey  = (row[20]||"").toString().toLowerCase();

      var matchCat  = !sCat      || (colCat === sCat);
      var matchBook = !sBookName || colBook.includes(sBookName);
      var matchAuth = !sAuthor   || colAuth.includes(sAuthor);
      var matchIsbn = !sISBN     || colISBN.includes(sISBN);

      var matchKeys = true;
      if (sKeys) {
        matchKeys = (colDesc.includes(sKeys) || colKey.includes(sKeys));
      }
      return matchCat && matchBook && matchAuth && matchIsbn && matchKeys;
    });

    var finalRows = filtered.map(function(row){
      return [
        row[0],   // Category
        row[5],   // Book Name
        row[10],  // Author
        row[11],  // ISBN
        row[13]   // More info
      ];
    });

    var tableHeaders = ["Category","Book Name","Author","ISBN"];
    return { headers: tableHeaders, rows: finalRows };

  } catch(err) {
    return { headers: [], rows: [] };
  }
}
