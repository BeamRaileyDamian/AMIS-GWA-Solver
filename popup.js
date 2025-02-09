document.getElementById("fetchGrades").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "FETCH_GRADES" }, (response) => {
    console.log(response.status);
  });
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "GRADES_DATA") {
    const gwaOutput = `GWA: ${message.gwa}\nUnits Towards GWA: ${message.totalUnits}`;
    document.getElementById("output").innerText = gwaOutput;
  } else if (message.type === "ERROR") {
    document.getElementById("output").innerText = `Error: ${message.error}`;
  }
});
