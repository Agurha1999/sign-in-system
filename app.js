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

// 🛑 Real-time Validation Functions
function validateField(field) {
  const value = field.value.trim();
  const name = field.name;
  let errorMessage = '';

  switch(name) {
    case 'name':
    case 'phone':
    case 'company':
    case 'ppe':
    case 'risk':
    case 'hazard':
    case 'keySelect':
      if (!value) {
        errorMessage = 'This field is required';
      }
      break;
    // You can add more validations here if needed (e.g., phone number format)
  }

  setError(field, errorMessage);
  return errorMessage === '';
}

function setError(field, message) {
  let errorElem = field.nextElementSibling;
  // If next element is not error-message, create it
  if (!errorElem || !errorElem.classList.contains('input-error')) {
    errorElem = document.createElement('span');
    errorElem.className = 'input-error';
    field.parentNode.insertBefore(errorElem, field.nextSibling);
  }
  errorElem.textContent = message;
}

// 📥 DOM Load
document.addEventListener('DOMContentLoaded', () => {
  const signInForm = document.getElementById('signInForm');
  if (signInForm) {
    // Add real-time validation listeners
    const inputsToValidate = ['name', 'phone', 'company', 'ppe', 'risk', 'hazard', 'keySelect'];
    inputsToValidate.forEach(id => {
      const field = document.getElementById(id);
      if (field) {
        field.addEventListener('input', () => validateField(field));
        // For selects, listen for change event too
        if (field.tagName.toLowerCase() === 'select') {
          field.addEventListener('change', () => validateField(field));
        }
      }
    });

    signInForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Validate all fields, prevent submission if any invalid
      let allValid = true;
      inputsToValidate.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
          const valid = validateField(field);
          if (!valid) allValid = false;
        }
      });
      if (!allValid) {
        alert("Please fix the errors in the form before submitting.");
        return;
      }

      const data = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        company: document.getElementById('company').value.trim(),
        trade: document.getElementById('trade').value.trim(),
        ppe: document.getElementById('ppe').value.trim(),
        risk: document.getElementById('risk').value.trim(),
        hazard: document.getElementById('hazard').value.trim(),
        other: document.getElementById('other').value.trim(),
        key: document.getElementById('keySelect')?.value || '',
        signInTime: new Date().toLocaleString(),
        signOutTime: null
      };

      const logs = JSON.parse(localStorage.getItem('signInLogs') || '[]');
      logs.push(data);
      localStorage.setItem('signInLogs', JSON.stringify(logs));
      logToGoogleSheet(data);

      alert("Sign-In recorded successfully!");
      signInForm.reset();

      // Clear all error messages after reset
      inputsToValidate.forEach(id => {
        const field = document.getElementById(id);
        if (field) setError(field, '');
      });

      showTab('signOut');
    });
  }

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
  checkWeeklyExport();
  setInterval(checkWeeklyExport, 60 * 1000);
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
  localStorage.removeItem('signInLogs');
}

// 📧 EmailJS - Sends CSV via your template
function sendEmailWithCSV(csvContent) {
  emailjs.send("service_z2jwxfw", "template_6yxcugi", {
    message: csvContent,
    to_email: "agurha1999@gmail.com",
    from_name: "Aman"
  }, "rIlwvYJeOw3D2fOA1").then(() => {
    alert("CSV emailed successfully.");
  }).catch(err => {
    console.error("Email failed:", err);
    alert("Failed to send email, but logs were still cleared.");
  });
}

// 🕒 Auto Weekly Export
function checkWeeklyExport() {
  const now = new Date();
  const lastExport = parseInt(localStorage.getItem('lastExportTime') || "0");
  const nowTime = now.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  if (now.getDay() === 0 && now.getHours() === 22 && now.getMinutes() === 0 && (nowTime - lastExport > oneWeek)) {
    exportAndClearLogs();
    localStorage.setItem('lastExportTime', nowTime.toString());
  }
}

// 🔐 Admin Key Management
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
