const fs = require('fs');
const https = require('https');
const { URLSearchParams } = require('url');

// Read the contents of a file
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

// Interact with ChatGPT and get the response
async function interactWithChatGPT(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;

  const data = new URLSearchParams({
    prompt: prompt,
    max_tokens: 100,
    temperature: 0.7,
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${apiKey}`,
    },
  };

  const response = await new Promise((resolve, reject) => {
    const req = https.request('https://api.openai.com/v1/engines/davinci-codex/completions', options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data.toString());
    req.end();
  });

  const jsonData = JSON.parse(response);
  const chatGPTResponse = jsonData.choices[0].text.trim();

  return chatGPTResponse;
}

// Export the results to Google Sheets
async function exportToGoogleSheets(results) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const spreadsheetId = '1P3o-dmyMex3yLp5M3kM7gAvG2xvyh-ii2MnBoPnrGS4';
  const range = 'Sheet1!A:K';

  const data = {
    values: [results],
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  };

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, options);
}

// Get the current GMT+7 date and time
function getCurrentDateTime() {
  const now = new Date();
  now.setHours(now.getHours() + 7); // Convert to GMT+7

  const date = now.toISOString().split('T')[0];
  const time = now.toISOString().split('T')[1].split('.')[0];

  return { date, time };
}

async function runTests() {
  const indexHTMLPath = './index.html';
  const scriptJSPath = './js/script.js';
  const styleCSSPath = './css/style.css';

  const isIndexHTMLExist = fs.existsSync(indexHTMLPath);
  const isScriptJSExist = fs.existsSync(scriptJSPath);
  const isStyleCSSExist = fs.existsSync(styleCSSPath);

  const { date, time } = getCurrentDateTime();

  const username = process.env.GITHUB_ACTOR;
  const repoUrl = process.env.GITHUB_REPOSITORY;

  let results = [
    username,
    repoUrl,
    date,
    time,
    isIndexHTMLExist ? '1' : '0', // File structure
    '', // Functions running well
    '', // Feedback for functions
    '', // Naming
    '', // Feedback for naming
    '', // CSS
    '', // Feedback for CSS
    '', // Final score
  ];

  // Test functions running well
  if (isScriptJSExist) {
    const jsContent = readFile(scriptJSPath);
    const promptFunctions = `Will this script have any errors? Answer with 1 if it will run correctly, and 0 if not. Answer only in 1 or 0.\n\n${jsContent}`;

    const functionsResponse = await interactWithChatGPT(promptFunctions);
    results[5] = functionsResponse.trim();
  }

  // Test feedback for functions
  if (isScriptJSExist) {
    const jsContent = readFile(scriptJSPath);
    const promptFeedback = `What's your feedback to optimize this code?\n\n${jsContent}`;

    const feedbackResponse = await interactWithChatGPT(promptFeedback);
    results[6] = feedbackResponse.trim();
  }

  // Test naming
  if (isScriptJSExist) {
    const jsContent = readFile(scriptJSPath);
    const promptNaming = `Is this JavaScript code well-named? Answer with 1 if it has good naming, and 0 if it's not. Answer only in 1 or 0.\n\n${jsContent}`;

    const namingResponse = await interactWithChatGPT(promptNaming);
    results[8] = namingResponse.trim();
  }

  // Test feedback for naming
  if (isScriptJSExist) {
    const jsContent = readFile(scriptJSPath);
    const promptFeedbackNaming = `What's your feedback about the naming of this JavaScript code?\n\n${jsContent}`;

    const feedbackNamingResponse = await interactWithChatGPT(promptFeedbackNaming);
    results[9] = feedbackNamingResponse.trim();
  }

  // Test CSS
  if (isStyleCSSExist) {
    const cssContent = readFile(styleCSSPath);
    const promptCSS = `Is this CSS code well-written? Answer with 1 if it is, and 0 if it's not. Answer only in 1 or 0.\n\n${cssContent}`;

    const cssResponse = await interactWithChatGPT(promptCSS);
    results[10] = cssResponse.trim();
  }

  // Calculate final score
  const score = results.slice(4, 10).reduce((sum, value) => sum + parseInt(value) || 0, 0);
  results[11] = score.toString();

  // Export results to Google Sheets
  await exportToGoogleSheets(results);
}

runTests().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});