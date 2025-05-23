// 🔀 Tab Switching
function showTab(tabId) {
  document.getElementById('signIn').style.display = 'none';
  document.getElementById('signOut').style.display = 'none';
  document.getElementById(tabId).style.display = 'block';
  if (tabId === 'signOut') populateSignOutList();
}

// ✅ Google Sheets Logging
function logToGoogleSheet(data) {
  fetch("YOUR_WEB_APP_URL_HERE", {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).catch(error => console.error("Google Sheets logging failed:", error));
}

// 📥 DOM Load
document.addEventListener('DOMContentLoaded', () => {
  const signInForm = document.getElementById('signInForm');
  if (signInForm) {
    signInForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        company: document.getElementById('company').value,
        trade: document.getElementById('trade').value,
        ppe: document.getElementById('ppe').value,
        risk: document.getElementById('risk').value,
        hazard: document.getElementById('hazard').value,
        other: document.getElementById('other').value,
        key: document.getElementById('keySelect')?.value || '',
        signInTime: new Date().toLocaleString(),
        signOutTime: null
      };

      if (!data.name || !data.phone || !data.company || !data.ppe || !data.risk || !data.hazard || !data.key) {
        alert("Please fill in all required fields marked with *.");
        return;
      }

      const logs = JSON.parse(localStorage.getItem('signInLogs') || '[]');
      logs.push(data);
      localStorage.setItem('signInLogs', JSON.stringify(logs));
      logToGoogleSheet(data);

      alert("Sign-In recorded successfully!");
      signInForm.reset();
      showTab('signOut');
    });
  }

  // 🔑 Populate Key Dropdown
  const keySelect = document.getElementById('keySelect');
  if (keySelect) {
    const keys = JSON.parse(localStorage.getItem('keys') || '[]');
    keys.forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      keySelect.appendChild(opt);
    });
  }

  renderKeys();

  // Run weekly export check once immediately on load
  checkWeeklyExport();

  // Then check every minute while the page is open
  setInterval(checkWeeklyExport, 60 * 1000); // ⏱ Check every minute
});

// 🚪 Populate Sign-Out List
function populateSignOutList() {
  const logs = JSON.parse(localStorage.getItem('signInLogs') || '[]');
  const select = document.getElementById('signOutSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Select a name</option>';
  const activeNames = new Set();
  logs.forEach(log => {
    if (!log.signOutTime) activeNames.add(log.name);
  });

  activeNames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

// 🔓 Submit Sign-Out
function submitSignOut() {
  const name = document.getElementById('signOutSelect').value;
  if (!name) {
    alert("Please select a name to sign out.");
    return;
  }

  const logs = JSON.parse(localStorage.getItem('signInLogs') || '[]');
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].name === name && !logs[i].signOutTime) {
      logs[i].signOutTime = new Date().toLocaleString();
      localStorage.setItem('signInLogs', JSON.stringify(logs));
      logToGoogleSheet(logs[i]);
      alert("Sign-out recorded successfully!");
      populateSignOutList();
      return;
    }
  }

  alert("No active sign-in found for this name.");
}

// ⬇️ Manual Export
function manualExport() {
  const lastExport = localStorage.getItem('lastExportTime');
  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  if (!lastExport || isNaN(parseInt(lastExport)) || now - parseInt(lastExport) > oneWeekMs) {
    exportAndClearLogs();
    localStorage.setItem('lastExportTime', now.toString());
  } else {
    alert('Export already performed within the last week.');
  }
}

// 📤 Export + Email + Clear Logs
function exportAndClearLogs() {
  const logs = JSON.parse(localStorage.getItem('signInLogs') || '[]');
  if (logs.length === 0) return;

  const headers = ["Name", "Phone", "Company", "Trade", "PPE", "Risk", "Hazard", "Other", "Key", "SignIn Time", "SignOut Time"];
  const rows = logs.map(log => [
    `"${log.name}"`, `"${log.phone}"`, `"${log.company}"`, `"${log.trade || ''}"`,
    `"${log.ppe}"`, `"${log.risk}"`, `"${log.hazard}"`, `"${log.other || ''}"`,
    `"${log.key || ''}"`, `"${log.signInTime}"`, `"${log.signOutTime || ''}"`
  ]);

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `weekly-signin-${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  sendEmailWithCSV(csvContent);

  // Clear logs regardless of email success or failure
  localStorage.removeItem('signInLogs');
}

// 📧 EmailJS
function sendEmailWithCSV(csv) {
  emailjs.send("service_z2jwxfw", "template_6yxcugi", {
    message: csv,
    to_email: "agurha1999@gmail.com"
  }, "rIlwvYJeOw3D2fOA1").then(() => {
    console.log("Email sent.");
  }).catch(err => {
    console.error("Email failed but logs were cleared anyway:", err);
  });
}

// 🕒 Auto Weekly Export on Sunday 10 PM
function checkWeeklyExport() {
  const now = new Date();
  const lastExport = parseInt(localStorage.getItem('lastExportTime') || "0");
  const nowTime = now.getTime();

  const isSunday = now.getDay() === 0;
  const isTenPM = now.getHours() === 22 && now.getMinutes() === 0;

  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  if (isSunday && isTenPM && (nowTime - lastExport > oneWeek)) {
    console.log("⏳ Weekly auto-export triggered.");
    exportAndClearLogs();
    localStorage.setItem('lastExportTime', nowTime.toString());
  }
}

// 🔐 Admin Key Rendering
function loadKeys() {
  return JSON.parse(localStorage.getItem('keys') || '[]');
}
function saveKeys(keys) {
  localStorage.setItem('keys', JSON.stringify(keys));
}
function renderKeys() {
  const keys = loadKeys();
  const keyList = document.getElementById('keyList');
  if (!keyList) return;
  keyList.innerHTML = '';
  keys.forEach((key, index) => {
    const li = document.createElement('li');
    li.textContent = key + ' ';
    const btn = document.createElement('button');
    btn.textContent = 'Delete';
    btn.onclick = () => {
      keys.splice(index, 1);
      saveKeys(keys);
      renderKeys();
    };
    li.appendChild(btn);
    keyList.appendChild(li);
  });
}
function addKey() {
  const input = document.getElementById('newKeyInput');
  const newKey = input.value.trim();
  if (!newKey) return;
  const keys = loadKeys();
  if (!keys.includes(newKey)) {
    keys.push(newKey);
    saveKeys(keys);
    renderKeys();
  }
  input.value = '';
}
function generateCSVContent() {
  const logs = JSON.parse(localStorage.getItem('signInLogs') || '[]');
  if (logs.length === 0) return null;

  const headers = ["Name", "Phone", "Company", "Trade", "PPE", "Risk", "Hazard", "Other", "Key", "SignIn Time", "SignOut Time"];
  const rows = logs.map(log => [
    log.name, log.phone, log.company, log.trade || '',
    log.ppe, log.risk, log.hazard, log.other || '',
    log.key || '', log.signInTime, log.signOutTime || ''
  ]);
  return [headers, ...rows].map(e => e.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function exportAndEmailAndClear() {
  const csvContent = generateCSVContent();
  if (!csvContent) {
    alert("No data to export.");
    return;
  }

  // Export locally
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  a.href = url;
  a.download = `sign-in-logs-${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Email
  emailjs.send("service_z2jwxfw", "template_6yxcugi", {
    message: csvContent,
    to_email: "agurha1999@gmail.com",
    subject: "Weekly Contractor Logs"
  }).then(() => {
    alert("CSV emailed successfully.");
  }).catch((error) => {
    console.error("EmailJS failed:", error);
    alert("Failed to send email.");
  }).finally(() => {
    localStorage.removeItem('signInLogs');
    renderActiveWorkers();
  });
}

function emailLogsOnly() {
  const csvContent = generateCSVContent();
  if (!csvContent) {
    alert("No logs to email.");
    return;
  }

  emailjs.send("service_z2jwxfw", "template_6yxcugi", {
    message: csvContent,
    to_email: "agurha1999@gmail.com",
    subject: "Contractor Logs Snapshot"
  }).then(() => {
    alert("Logs emailed successfully.");
  }).catch((error) => {
    console.error("EmailJS failed:", error);
    alert("Failed to send email.");
  });
}

function exportLogsOnly() {
  const csvContent = generateCSVContent();
  if (!csvContent) {
    alert("No logs to export.");
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  a.href = url;
  a.download = `sign-in-logs-${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
