// js/utils.js

function toIndianDate(dateStr) {
  if (!dateStr) return "—";
  var clean = String(dateStr).slice(0, 10);
  var parts = clean.split("-");
  if (parts.length === 3) {
    return parts[2] + "-" + parts[1] + "-" + parts[0];
  }
  return clean;
}

function getDateGroup(dateStr) {
  if (!dateStr) return "Older";
  var clean = String(dateStr).slice(0, 10);
  var parts = clean.split("-");
  if (parts.length !== 3) return "Older";

  var targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var diffTime = today - targetDate;
  var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays > 0 && diffDays <= 7) return "This Week";
  if (targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear()) return "This Month";
  if (targetDate.getFullYear() === today.getFullYear()) return "This Year";
  return "Older";
}

function pad2(n){ return n < 10 ? "0"+n : ""+n; }

function apiGet(params, retries) {
  retries = retries || 3;
  var qs = Object.keys(params).map(function(k){
    return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
  }).join("&");

  return fetch(APPS_SCRIPT_URL + "?" + qs)
    .then(function(r) { return r.json(); })
    .catch(function(err) {
      if (retries > 1) {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(apiGet(params, retries - 1));
          }, 2000); // wait 2 seconds then retry
        });
      }
      throw err;
    });
}

function apiPost(payload, retries) {
  retries = retries || 3;
  return fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  })
    .then(function(r) { return r.json(); })
    .catch(function(err) {
      if (retries > 1) {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(apiPost(payload, retries - 1));
          }, 2000);
        });
      }
      throw err;
    });
}



function showToast(msg, isError){
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  setTimeout(function(){ t.className = "toast"; }, 3200);
}

function firstName(fullName){
  return (fullName || "").trim().split(" ")[0] || "there";
}

function showEmpView(view){
  document.getElementById("empLanding").style.display = view === "landing" ? "block" : "none";
  document.getElementById("empNewReq").style.display = view === "new" ? "block" : "none";
  document.getElementById("empUpdateReq").style.display = view === "update" ? "block" : "none";
  document.getElementById("empEditReq").style.display = view === "edit" ? "block" : "none";
  if(view === "new") resetNewReqForm();
  if(view === "update"){
    document.getElementById("updateResultWrap").innerHTML = "";
    loadIncompleteReqsDropdown();
  }
}

function escapeHtml(str){
  var div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}
