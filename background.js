chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureTab") {
    try {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Capture Error:", chrome.runtime.lastError);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl: dataUrl });
        }
      });
    } catch (e) {
      sendResponse({ error: e.message });
    }
    return true; 
  }
});

