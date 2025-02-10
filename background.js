async function getCookie(domain, name) {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url: domain, name: name }, (cookie) => {
      if (chrome.runtime.lastError || !cookie) {
        reject(chrome.runtime.lastError || "Cookie not found");
      } else {
        resolve(cookie.value);
      }
    });
  });
}

function calculateGWA(gradesData) {
  let gradePoints = 0;
  let totalUnits = 0;

  for (const sem in gradesData["student_grades"]) {
    const semData = gradesData["student_grades"][sem];
    if ("values" in semData) {
      for (const course of semData["values"]) {
        const courseCode = course["course"]["course_code"];

        // Skip HK and NSTP courses
        if (courseCode.startsWith("HK") || courseCode.startsWith("NSTP")) continue;

        const grade = course["grade"];
        if (!["S", "U", "INC", "DRP", "4.00"].includes(grade) && !isNaN(parseFloat(grade))) {
          const numericGrade = parseFloat(grade);
          const units = parseInt(course["unit_taken"], 10);

          gradePoints += units * numericGrade;
          totalUnits += units;
        }
      }
    }
  }

  const gwa = totalUnits > 0 ? (gradePoints / totalUnits).toFixed(4) : 0;
  return { gwa, totalUnits, gradePoints };
}

async function fetchStudentGrades() {
  try {
    const domain = "https://amis.uplb.edu.ph";
    const cookieName = "auth._token.local";

    // Retrieve the auth token
    const rawToken = await getCookie(domain, cookieName);
    const authToken = decodeURIComponent(rawToken); // Decode the token
    console.log("Auth Token (Decoded):", authToken);

    // Make the API call
    const response = await fetch("https://api-amis.uplb.edu.ph/api/students/grades?summarize=true", {
      headers: {
        Authorization: "Bearer " + authToken,
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const gradesData = await response.json();
    console.log("Grades Data:", gradesData);

    // Calculate GWA
    const { gwa, totalUnits, gradePoints } = calculateGWA(gradesData);

    // Send the GWA and grades back to the popup
    chrome.runtime.sendMessage({
      type: "GRADES_DATA",
      data: gradesData,
      gwa,
      totalUnits,
      gradePoints,
    });
  } catch (error) {
    console.error("Error:", error);
    chrome.runtime.sendMessage({ type: "ERROR", error: "Log in to AMIS first" });
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_GRADES") {
    fetchStudentGrades();
    sendResponse({ status: "Fetching grades..." });
  }
});
