// js/shared-view.js

function showSharedView(serial, token){
  // Hide all other panels, show the shared view section
  document.getElementById("employeePanel").classList.remove("active");
  document.getElementById("directorPanel").classList.remove("active");
  var panel = document.getElementById("sharedViewPanel");
  panel.style.display = "block";

  var content = document.getElementById("sharedViewContent");
  content.innerHTML = '<div class="loading-note">Loading requisition '+escapeHtml(serial)+'…</div>';

  var params = { action: "getBySerial", serial: serial };
  if(token) params.token = token;

  apiGet(params).then(function(r){
    if(r.error){ content.innerHTML = '<div class="card empty-state">This link is invalid or the requisition does not exist.</div>'; return; }
    renderSharedView(r, token);
  }).catch(function(){
    content.innerHTML = '<div class="card empty-state">Could not reach server. Check your connection.</div>';
  });
}

function buildShareLink(serial){
  var base = window.location.href.split("#")[0].split("?")[0];
  var token = "";
  try{ token = localStorage.getItem("skt_" + serial) || ""; }catch(e){}
  if(token) return base + "#view/" + encodeURIComponent(serial) + "/" + encodeURIComponent(token);
  return base + "#view/" + encodeURIComponent(serial);
}

// Extract serial + token from a #view/... hash
function parseShareHash(hash){
  if(!hash || hash.indexOf("#view/") !== 0) return null;
  var parts = hash.slice(6).split("/");
  return {
    serial: decodeURIComponent(parts[0] || "").trim(),
    token:  decodeURIComponent(parts[1] || "").trim() || null
  };
}

function renderSharedView(r, token){
  var content = document.getElementById("sharedViewContent");
  var lineItems = [];
  try{ lineItems = JSON.parse(r["Line Items Detail"] || "[]"); }catch(e){ lineItems = []; }

  var serial = r["Serial No"] || "";
  var statusCls = String(r["Status"]||"pending").toLowerCase();
  var markerCls = r["Marker Color"]==="Green" ? "green" : "red";
  // Build the share URL: use passed token directly (works for both owner and recipient)
  var base = window.location.href.split("#")[0].split("?")[0];
  var shareUrl = token
    ? base + "#view/" + encodeURIComponent(serial) + "/" + encodeURIComponent(token)
    : buildShareLink(serial);

  // Viewer identity — can they edit? Only the owner employee can edit.
  var u = state.currentUserProfile;
  var isOwner = (u && u.role === "employee" && r["Employee Email"] === state.currentUser);

  var lineHtml = lineItems.map(function(li, idx){
    var costStr = li.costType || "—";
    if(li.costType==="Exact"||li.costType==="Approx") costStr += li.costValue ? " — ₹"+Number(li.costValue).toLocaleString("en-IN") : "";
    if(li.costType==="Range") costStr += (li.costMin||li.costMax) ? " ₹"+(li.costMin||"?")+" – ₹"+(li.costMax||"?") : "";
    return '<div class="req-line-mini-card">'+
      '<div class="rlm-top">'+
        '<span class="rlm-item">'+(idx+1)+'. '+escapeHtml(li.item||"")+'</span>'+
        '<span class="rlm-meta">Qty: '+escapeHtml(String(li.qty||1))+'</span>'+
      '</div>'+
      '<div class="rlm-meta">Client: '+escapeHtml(li.client||"—")+'  ·  Rate: '+escapeHtml(costStr)+'  ·  Priority: '+escapeHtml(li.priority||"—")+'</div>'+
      (li.description ? '<div class="rlm-meta" style="margin-top:5px;">'+escapeHtml(li.description)+'</div>' : '')+
      (li.note ? '<div class="rlm-meta" style="margin-top:4px;font-style:italic;">Note: '+escapeHtml(li.note)+'</div>' : '')+
    '</div>';
  }).join("");

  content.innerHTML =
    '<div class="shared-view-banner">'+
      '<div class="fb-logo"><img src="logo.png" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="fb-fallback" style="display:none;">ST</span></div>'+
      '<div class="fb-text"><h2>Skytel Tele Services Pvt. Ltd.</h2><span>Purchase Requisition — '+escapeHtml(serial)+'</span></div>'+
    '</div>'+

    '<div class="card" style="margin-bottom:18px;">'+
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;">'+
        '<span class="serial-badge">'+escapeHtml(serial)+'</span>'+
        '<span class="status-pill '+statusCls+'">'+escapeHtml(r["Status"]||"Pending")+'</span>'+
        '<span class="marker-cell" style="font-size:12px;"><span class="marker-dot '+markerCls+'"></span>'+escapeHtml(r["Overall Cost Type"]||"")+'</span>'+
        (r["Total Cost"] ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:14px;font-weight:700;color:var(--navy);">₹'+Number(r["Total Cost"]).toLocaleString("en-IN")+'</span>' : '')+
      '</div>'+

      '<div class="ro-grid">'+
        '<div class="ro-field-group"><label>Submitted By</label><div class="ro-val">'+escapeHtml(r["Employee Name"]||"—")+'</div></div>'+
        '<div class="ro-field-group"><label>Date</label><div class="ro-val">'+toIndianDate(r["Submission Date"])+'</div></div>'+
        '<div class="ro-field-group"><label>Time</label><div class="ro-val">'+escapeHtml(String(r["Submission Time"]||"").slice(0,5))+'</div></div>'+
        '<div class="ro-field-group"><label>Sales Manager</label><div class="ro-val">'+escapeHtml(r["Sales Manager"]||"—")+'</div></div>'+
        '<div class="ro-field-group"><label>Priority</label><div class="ro-val">'+escapeHtml(r["Priority"]||"—")+'</div></div>'+
        '<div class="ro-field-group"><label>Director Comment</label><div class="ro-val">'+(r["Director Comment"] ? escapeHtml(r["Director Comment"]) : '—')+'</div></div>'+
      '</div>'+

      '<div class="req-line-items-section"><h4>Line Items</h4>'+lineHtml+'</div>'+

      // Share link box
      '<div style="margin-top:18px;padding-top:16px;border-top:1px dashed var(--border);">'+
        '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Shareable Link</div>'+
        '<div class="share-link-row">'+
          '<span class="sl-url" id="shareUrlDisplay">'+escapeHtml(shareUrl)+'</span>'+
          '<button class="copy-link-btn" id="copyLinkBtn">Copy Link</button>'+
        '</div>'+
      '</div>'+

      // Edit button — only for the requisition owner
      (isOwner ?
        '<div style="margin-top:16px;">'+
          '<button class="edit-req-btn" id="sharedEditBtn">✏️ Edit this Requisition</button>'+
        '</div>' : '')+
    '</div>';

  // Wire copy button
  document.getElementById("copyLinkBtn").addEventListener("click", function(){
    var btn = this;
    navigator.clipboard.writeText(shareUrl).then(function(){
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(function(){ btn.textContent = "Copy Link"; btn.classList.remove("copied"); }, 2000);
    }).catch(function(){
      // Fallback for http/non-secure contexts
      var ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(function(){ btn.textContent = "Copy Link"; btn.classList.remove("copied"); }, 2000);
    });
  });

  // Wire edit button (owner only)
  if(isOwner){
    document.getElementById("sharedEditBtn").addEventListener("click", function(){
      document.getElementById("sharedViewPanel").style.display = "none";
      window.location.hash = "";
      document.getElementById("employeePanel").classList.add("active");
      openEditView(serial);
    });
  }
}

// Back from shared view — return to the user's normal home
document.getElementById("backFromShared").addEventListener("click", function(){
  window.location.hash = "";
  document.getElementById("sharedViewPanel").style.display = "none";
  var u = state.currentUserProfile;
  if(!u) return;
  if(u.role === "director"){
    document.getElementById("directorPanel").classList.add("active");
    renderDirectorView();
  } else {
    document.getElementById("employeePanel").classList.add("active");
    showEmpView("landing");
    renderMyRequests();
  }
});