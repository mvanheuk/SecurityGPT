// Add this function to detect "rss" in user input
function detectRssKeyword(userInput) {
    const regex = /\brss\b/i; // Matches the word "rss" case-insensitive, surrounded by word boundaries
    return regex.test(userInput);
}
  
// Add this function to extract CVE ID from user input
function extractCveId(userInput) {
    const regex = /CVE-\d{4}-\d+/;
    const match = userInput.match(regex);
    return match ? match[0] : null;
}
  
// Add this function to fetch CVE data
async function fetchCveData(cveId) {
    const response = await fetch(`https://services.nvd.nist.gov/rest/json/cve/1.0/${cveId}`);
    if (response.ok) {
      return response.json();
    }
    return null;
}

// generate unique ID for each message div of bot
// necessary for typing text effect for that specific reply
// without unique ID, typing text will work on every element
function generateUniqueId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
}

export {extractCveId, fetchCveData, detectRssKeyword, generateUniqueId};