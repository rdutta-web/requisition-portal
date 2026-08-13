// js/director.js

var filterStatus = document.getElementById("filterStatus");
var filterPriority = document.getElementById("filterPriority");
filterStatus.addEventListener("change", renderDirectorView);
filterPriority.addEventListener("change", renderDirectorView);

document.getElementById("viewToggle").addEventListener("click", function(e){
  var btn = e.target.closest("button[data-view]");
  if(!btn) return;
  directorViewMode = btn.getAttribute("data-view");
  this.querySelectorAll("button").forEach(function(b){ b.classList.remove("active"); });
  btn.classList.add("active");
  renderDirectorTable(state.dashboardCache);
});

function renderDirectorView(){
  document.getElementById("directorTableWrap").innerHTML = '<div class="loading-note">Loading...</div>';
  apiGet({ action: "getDashboard" }).then(function(rows){
    if(rows.error){ document.getElementById("directorTableWrap").innerHTML = '<div class="card empty-state">'+escapeHtml(rows.error)+'</div>'; return; }
    state.dashboardCache = rows;
    renderStats(rows);
    renderDirectorTable(rows);
  }).catch(function(){
    document.getElementById("directorTableWrap").innerHTML = '<div class="card empty-state">Could not load dashboard. Check your connection.</div>';
  });
}

function renderStats(rows){
  var total = rows.length;
  var pending = rows.filter(function(r){ return r["Status"] === "Pending"; }).length;
  var approved = rows.filter(function(r){ return r["Status"] === "Approved"; }).length;
  var incomplete = rows.filter(function(r){ return r["Marker Color"] === "Red"; }).length;

  document.getElementById("statsRow").innerHTML =
    statCard(total, "Total Requests") +
    statCard(pending, "Pending Review") +
    statCard(approved, "Approved") +
    statCard(incomplete, "Incomplete Cost");
}

function statCard(num, label){
  return '<div class="stat-card"><div class="stat-num">'+num+'</div><div class="stat-label">'+label+'</div></div>';
}

function renderDirectorTable(rows){
  if(directorViewMode === "grid"){
    renderDirectorGridView(rows);
  } else {
    renderDirectorListView(rows);
  }
}

function renderDirectorListView(rows){
  var wrap = document.getElementById("directorTableWrap");
  var sFilter = filterStatus.value;
  var pFilter = filterPriority.value;

  var filtered = rows.filter(function(r){
    if(sFilter && r["Status"] !== sFilter) return false;
    if(pFilter && r["Priority"] !== pFilter) return false;
    return true;
  });
  

  if(filtered.length === 0){
    wrap.innerHTML = '<div class="card empty-state">No requests match this filter.</div>';
    return;
  }

  filtered.sort(function(a,b){ return (b["Serial No"]||"").localeCompare(a["Serial No"]||""); });

  // Grouping by Date for Director view as well
  var groups = { "Today": [], "This Week": [], "This Month": [], "This Year": [], "Older": [] };
  filtered.forEach(function(r){
    var grp = getDateGroup(r["Submission Date"]);
    if(!groups[grp]) groups[grp] = [];
    groups[grp].push(r);
  });

  var list = document.createElement("div");
  list.className = "req-card-list";
  var popup = document.getElementById("dirHoverPopup");

  ["Today", "This Week", "This Month", "This Year", "Older"].forEach(function(grpName){
    var grpRows = groups[grpName];
    if(!grpRows || !grpRows.length) return;

    var headerDiv = document.createElement("div");
    headerDiv.className = "explorer-group-header";
    headerDiv.innerHTML = "📂 " + grpName + " <span style='font-size:11px;color:var(--text-muted);font-weight:normal;'>(" + grpRows.length + ")</span>";
    list.appendChild(headerDiv);

    grpRows.forEach(function(r){
      var lineItems = [];
      try{ lineItems = JSON.parse(r["Line Items Detail"] || "[]"); }catch(e){ lineItems = []; }

      var statusCls = String(r["Status"]||"pending").toLowerCase();
      var markerCls = r["Marker Color"]==="Green" ? "green" : "red";
      var indianDate = toIndianDate(r["Submission Date"]);

      var actionCell = r["Status"] === "Pending" ?
        '<div class="action-btns">' +
          '<button class="action-btn approve" data-serial="'+escapeHtml(r["Serial No"])+'" data-decision="Approved">Approve</button>' +
          '<button class="action-btn reject" data-serial="'+escapeHtml(r["Serial No"])+'" data-decision="Rejected">Reject</button>' +
        '</div>' :
        '<span class="decided-note">'+(r["Director Comment"] ? escapeHtml(r["Director Comment"]) : 'Decision recorded')+'</span>';

      var lineHtml = lineItems.map(function(li){
        var costStr = li.costType || "—";
        if(li.costType==="Exact"||li.costType==="Approx") costStr += li.costValue ? " — ₹"+Number(li.costValue).toLocaleString("en-IN") : "";
        if(li.costType==="Range") costStr += (li.costMin||li.costMax) ? " ₹"+(li.costMin||"?")+" – ₹"+(li.costMax||"?") : "";
        return '<div class="req-line-mini-card">' +
          '<div class="rlm-top"><span class="rlm-item">'+escapeHtml(li.item)+'</span>' +
          '<span class="rlm-meta">Qty: '+escapeHtml(String(li.qty||1))+'</span></div>' +
          '<div class="rlm-meta">Client: '+escapeHtml(li.client||"—")+'  ·  Rate: '+escapeHtml(costStr)+'</div>' +
        '</div>';
      }).join("");

      var card = document.createElement("div");
      card.className = "req-card";
      card.innerHTML =
        '<div class="req-card-header" style="grid-template-columns: 130px 1.2fr 1fr 110px 100px 140px 40px;">' +
          '<div>' +
            '<div class="req-card-serial">'+escapeHtml(r["Serial No"])+'</div>' +
            '<div style="margin-top:3px;"><span class="status-pill '+statusCls+'">'+escapeHtml(r["Status"])+'</span></div>' +
          '</div>' +
          '<div>' +
            '<div class="req-card-item" style="font-size:13.5px;">'+escapeHtml(r["Employee Name"])+'</div>' +
            '<div class="req-card-client">'+escapeHtml(r["Item Summary"])+'</div>' +
          '</div>' +
          '<div style="font-size:12.5px;color:var(--text-muted);">'+escapeHtml(r["Client(s)"])+'</div>' +
          '<div class="marker-cell"><span class="marker-dot '+markerCls+'"></span>' +
            (r["Total Cost"] ? '₹'+Number(r["Total Cost"]).toLocaleString('en-IN') : escapeHtml(r["Overall Cost Type"])) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-muted);">'+escapeHtml(indianDate)+'</div>' +
          '<div>'+actionCell+'</div>' +
          '<span class="req-card-chevron">▼</span>' +
        '</div>' +
        '<div class="req-card-body">' +
          '<div class="req-card-body-inner">' +
            '<div class="req-detail-grid">' +
              '<div class="req-detail-field"><label>Employee</label><div class="rdv">'+escapeHtml(r["Employee Name"])+'</div></div>' +
              '<div class="req-detail-field"><label>Submitted Date</label><div class="rdv">'+escapeHtml(indianDate)+' at '+escapeHtml(String(r["Submission Time"]||"").slice(0,5))+'</div></div>' +
              '<div class="req-detail-field"><label>Priority</label><div class="rdv"><span class="priority-pill '+String(r["Priority"]||"low").toLowerCase()+'">'+escapeHtml(r["Priority"])+'</span></div></div>' +
              '<div class="req-detail-field"><label>Sales Manager</label><div class="rdv">'+escapeHtml(r["Sales Manager"]||"—")+'</div></div>' +
              '<div class="req-detail-field"><label>Cost Status</label><div class="rdv marker-cell"><span class="marker-dot '+markerCls+'"></span>'+escapeHtml(r["Overall Cost Type"])+'</div></div>' +
              '<div class="req-detail-field"><label>Director Comment</label><div class="rdv">'+(r["Director Comment"] ? escapeHtml(r["Director Comment"]) : '—')+'</div></div>' +
            '</div>' +
            (lineItems.length ? '<div class="req-line-items-section"><h4>Full Line Items Breakdown</h4>'+lineHtml+'</div>' : '') +
            '<div class="req-card-actions">' +
              '<button class="copy-link-btn dir-copy-link" data-serial="'+escapeHtml(r["Serial No"])+'">🔗 Copy Share Link</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      // Hover Popover logic
      var header = card.querySelector(".req-card-header");
      header.addEventListener("mouseenter", function(e){
        if(card.classList.contains("open")) return;
        var tooltipLines = lineItems.map(function(li){
          return '<div class="dhp-line"><b>'+escapeHtml(li.item)+'</b> (x'+li.qty+') — '+escapeHtml(li.client)+'</div>';
        }).join("");
        popup.innerHTML =
          '<div class="dhp-title">'+escapeHtml(r["Serial No"])+' — '+escapeHtml(r["Employee Name"])+'</div>' +
          '<div class="dhp-meta">Submitted on '+escapeHtml(indianDate)+' · Total: <b>'+(r["Total Cost"] ? '₹'+Number(r["Total Cost"]).toLocaleString('en-IN') : 'Pending')+'</b></div>' +
          '<div style="max-height:160px;overflow-y:auto;">'+tooltipLines+'</div>';
        popup.classList.add("show");
      });
      header.addEventListener("mousemove", function(e){
        var x = e.clientX + 16, y = e.clientY + 16;
        if(x + 320 > window.innerWidth) x = e.clientX - 336;
        if(y + 180 > window.innerHeight) y = e.clientY - 196;
        popup.style.left = Math.max(10, x) + "px";
        popup.style.top = Math.max(10, y) + "px";
      });
      header.addEventListener("mouseleave", function(){ popup.classList.remove("show"); });

      // Click to Expand
      header.addEventListener("click", function(){
        popup.classList.remove("show");
        var isOpen = card.classList.contains("open");
        list.querySelectorAll(".req-card.open").forEach(function(c){ c.classList.remove("open"); });
        if(!isOpen) card.classList.add("open");
      });

      // Action Buttons (stop propagation)
      card.querySelectorAll(".action-btn").forEach(function(btn){
        btn.addEventListener("click", function(e){
          e.stopPropagation();
          openModal(btn.getAttribute("data-serial"), btn.getAttribute("data-decision"));
        });
      });

      card.querySelectorAll(".dir-copy-link").forEach(function(btn){
        btn.addEventListener("click", function(e){
          e.stopPropagation();
          var url = buildShareLink(btn.getAttribute("data-serial"));
          navigator.clipboard.writeText(url).then(function(){
            btn.textContent = "✓ Copied!"; btn.classList.add("copied");
            setTimeout(function(){ btn.textContent = "🔗 Copy Share Link"; btn.classList.remove("copied"); }, 2000);
          }).catch(function(){
            var ta = document.createElement("textarea"); ta.value = url;
            ta.style.position="fixed"; ta.style.opacity="0";
            document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
            btn.textContent = "✓ Copied!"; btn.classList.add("copied");
            setTimeout(function(){ btn.textContent = "🔗 Copy Share Link"; btn.classList.remove("copied"); }, 2000);
          });
        });
      });

      list.appendChild(card);
    });
  });

  wrap.innerHTML = "";
  wrap.appendChild(list);
}

function renderDirectorGridView(rows){
  var wrap = document.getElementById("directorTableWrap");
  var sFilter = filterStatus.value;
  var pFilter = filterPriority.value;

  var filtered = rows.filter(function(r){
    if(sFilter && r["Status"] !== sFilter) return false;
    if(pFilter && r["Priority"] !== pFilter) return false;
    return true;
  });

  if(filtered.length === 0){
    wrap.innerHTML = '<div class="card empty-state">No requests match this filter.</div>';
    return;
  }

  filtered.sort(function(a,b){ return (b["Serial No"]||"").localeCompare(a["Serial No"]||""); });

  var groups = { "Today": [], "This Week": [], "This Month": [], "This Year": [], "Older": [] };
  filtered.forEach(function(r){
    var grp = getDateGroup(r["Submission Date"]);
    if(!groups[grp]) groups[grp] = [];
    groups[grp].push(r);
  });

  var container = document.createElement("div");

  ["Today", "This Week", "This Month", "This Year", "Older"].forEach(function(grpName){
    var grpRows = groups[grpName];
    if(!grpRows || !grpRows.length) return;

    var headerDiv = document.createElement("div");
    headerDiv.className = "explorer-group-header";
    headerDiv.innerHTML = "📂 " + grpName + " <span style='font-size:11px;color:var(--text-muted);font-weight:normal;'>(" + grpRows.length + ")</span>";
    container.appendChild(headerDiv);

    var grid = document.createElement("div");
    grid.className = "req-grid";

    grpRows.forEach(function(r){
      var lineItems = [];
      try{ lineItems = JSON.parse(r["Line Items Detail"] || "[]"); }catch(e){ lineItems = []; }

      var statusCls = String(r["Status"]||"pending").toLowerCase();
      var markerCls = r["Marker Color"]==="Green" ? "green" : "red";
      var indianDate = toIndianDate(r["Submission Date"]);

      var itemsHtml;
      if(lineItems.length > 1){
        var allRows = lineItems.map(function(li){
  return '<tr><td>'+escapeHtml(li.item||"")+'</td><td>'+escapeHtml(String(li.qty||1))+'</td><td>'+escapeHtml(li.client||"")+'</td></tr>';
}).join("");
itemsHtml = '<div class="rgc-mini-table" style="max-height:112px;overflow-y:auto;"><table><thead><tr><th>Item</th><th>Qty</th><th>Client</th></tr></thead>'+
  '<tbody>'+allRows+'</tbody></table>'+
'</div>';
      } else {
        var only = lineItems[0] || {};
        itemsHtml = '<div class="rgc-single-item">'+escapeHtml(only.item||r["Item Summary"]||"")+' &middot; Qty '+escapeHtml(String(only.qty||1))+' &middot; '+escapeHtml(only.client||"")+'</div>';
      }

      var actionsHtml = r["Status"] === "Pending" ?
        '<div class="action-btns">' +
          '<button class="action-btn approve" data-serial="'+escapeHtml(r["Serial No"])+'" data-decision="Approved">Approve</button>' +
          '<button class="action-btn reject" data-serial="'+escapeHtml(r["Serial No"])+'" data-decision="Rejected">Reject</button>' +
        '</div>' :
        '<span class="decided-note">'+(r["Director Comment"] ? escapeHtml(r["Director Comment"]) : 'Decided') +'</span>';

      var card = document.createElement("div");
      card.className = "req-grid-card";
      card.innerHTML =
        '<div class="rgc-top">' +
          '<span class="req-card-serial">'+escapeHtml(r["Serial No"])+'</span>' +
          '<span class="status-pill '+statusCls+'">'+escapeHtml(r["Status"])+'</span>' +
        '</div>' +
        '<div class="rgc-employee">'+escapeHtml(r["Employee Name"])+'</div>' +
        '<div class="rgc-date">'+escapeHtml(indianDate)+'</div>' +
        itemsHtml +
        '<div class="rgc-bottom">' +
          '<span class="marker-cell" style="font-size:11.5px;"><span class="marker-dot '+markerCls+'"></span>' +
            (r["Total Cost"] ? '₹'+Number(r["Total Cost"]).toLocaleString('en-IN') : escapeHtml(r["Overall Cost Type"])) +
          '</span>' +
          actionsHtml +
        '</div>';

      card.querySelectorAll(".action-btn").forEach(function(btn){
        btn.addEventListener("click", function(e){
          e.stopPropagation();
          openModal(btn.getAttribute("data-serial"), btn.getAttribute("data-decision"));
        });
      });

      card.addEventListener("click", function(){
        openGridDetailModal(r);
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  });

  wrap.innerHTML = "";
  wrap.appendChild(container);
}

function openGridDetailModal(r){
  var lineItems = [];
  try{ lineItems = JSON.parse(r["Line Items Detail"] || "[]"); }catch(e){ lineItems = []; }
  var markerCls = r["Marker Color"]==="Green" ? "green" : "red";
  var indianDate = toIndianDate(r["Submission Date"]);

  var lineHtml = lineItems.map(function(li){
    var costStr = li.costType || "—";
    if(li.costType==="Exact"||li.costType==="Approx") costStr += li.costValue ? " — ₹"+Number(li.costValue).toLocaleString("en-IN") : "";
    if(li.costType==="Range") costStr += (li.costMin||li.costMax) ? " ₹"+(li.costMin||"?")+" – ₹"+(li.costMax||"?") : "";
    return '<div class="req-line-mini-card">' +
      '<div class="rlm-top"><span class="rlm-item">'+escapeHtml(li.item)+'</span>' +
      '<span class="rlm-meta">Qty: '+escapeHtml(String(li.qty||1))+'</span></div>' +
      '<div class="rlm-meta">Client: '+escapeHtml(li.client||"—")+'  ·  Rate: '+escapeHtml(costStr)+'</div>' +
    '</div>';
  }).join("");

  document.getElementById("gridDetailContent").innerHTML =
    '<div class="req-detail-grid">' +
      '<div class="req-detail-field"><label>Employee</label><div class="rdv">'+escapeHtml(r["Employee Name"])+'</div></div>' +
      '<div class="req-detail-field"><label>Submitted</label><div class="rdv">'+escapeHtml(indianDate)+' at '+escapeHtml(String(r["Submission Time"]||"").slice(0,5))+'</div></div>' +
      '<div class="req-detail-field"><label>Priority</label><div class="rdv"><span class="priority-pill '+String(r["Priority"]||"low").toLowerCase()+'">'+escapeHtml(r["Priority"])+'</span></div></div>' +
      '<div class="req-detail-field"><label>Sales Manager</label><div class="rdv">'+escapeHtml(r["Sales Manager"]||"—")+'</div></div>' +
      '<div class="req-detail-field"><label>Cost Status</label><div class="rdv marker-cell"><span class="marker-dot '+markerCls+'"></span>'+escapeHtml(r["Overall Cost Type"])+'</div></div>' +
      '<div class="req-detail-field"><label>Director Comment</label><div class="rdv">'+(r["Director Comment"] ? escapeHtml(r["Director Comment"]) : '—')+'</div></div>' +
    '</div>' +
    (lineItems.length ? '<div class="req-line-items-section"><h4>Full Line Items Breakdown</h4>'+lineHtml+'</div>' : '');

  document.getElementById("gridDetailOverlay").classList.add("show");
}

document.getElementById("gridDetailCloseBtn").addEventListener("click", function(){
  document.getElementById("gridDetailOverlay").classList.remove("show");
});
document.getElementById("gridDetailOverlay").addEventListener("click", function(e){
  if(e.target === this) this.classList.remove("show");
});
