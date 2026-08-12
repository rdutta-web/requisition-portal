// js/my-requests.js

function renderMyRequests(){
  var wrap = document.getElementById("myRequestsTableWrap");
  wrap.innerHTML = '<div class="loading-note">Loading...</div>';
  apiGet({ action: "getDashboard", employeeEmail: state.currentUser }).then(function(rows){
    state.dashboardCache = Array.isArray(rows) ? rows : [];
    if(rows.error){ wrap.innerHTML = '<div class="card empty-state">'+(rows.error)+'</div>'; return; }
    if(!rows.length){ wrap.innerHTML = '<div class="card empty-state">No requests submitted yet.</div>'; return; }

    rows.sort(function(a,b){ return (b["Serial No"]||"").localeCompare(a["Serial No"]||""); });

    var groups = { "Today": [], "This Week": [], "This Month": [], "This Year": [], "Older": [] };
    rows.forEach(function(r){
      var grp = getDateGroup(r["Submission Date"]);
      if(!groups[grp]) groups[grp] = [];
      groups[grp].push(r);
    });

    var list = document.createElement("div");
    list.className = "req-card-list";

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

        var lineHtml = lineItems.map(function(li){
          var costStr = li.costType || "—";
          if(li.costType==="Exact"||li.costType==="Approx") costStr += li.costValue ? " — ₹"+Number(li.costValue).toLocaleString("en-IN") : "";
          if(li.costType==="Range") costStr += (li.costMin||li.costMax) ? " ₹"+(li.costMin||"?")+" – ₹"+(li.costMax||"?") : "";
          return '<div class="req-line-mini-card">' +
            '<div class="rlm-top"><span class="rlm-item">'+escapeHtml(li.item)+'</span>' +
            '<span class="rlm-meta">Qty: '+escapeHtml(String(li.qty||1))+'</span></div>' +
            '<div class="rlm-meta">Client: '+escapeHtml(li.client||"—")+'  ·  Rate: '+escapeHtml(costStr)+'  ·  Priority: '+escapeHtml(li.priority||"—")+'</div>' +
            (li.description ? '<div class="rlm-meta" style="margin-top:4px;">'+escapeHtml(li.description)+'</div>' : '') +
            (li.note ? '<div class="rlm-meta" style="margin-top:4px;font-style:italic;">Note: '+escapeHtml(li.note)+'</div>' : '') +
          '</div>';
        }).join("");

        var card = document.createElement("div");
        card.className = "req-card";
        card.innerHTML =
          '<div class="req-card-header">' +
            '<div>' +
              '<div class="req-card-serial">'+escapeHtml(r["Serial No"])+'</div>' +
              '<div style="margin-top:3px;"><span class="status-pill '+statusCls+'">'+escapeHtml(r["Status"])+'</span></div>' +
            '</div>' +
            '<div>' +
              '<div class="req-card-item">'+escapeHtml(r["Item Summary"])+'</div>' +
              '<div class="req-card-client">'+escapeHtml(r["Client(s)"] || "")+'</div>' +
            '</div>' +
            '<div class="marker-cell"><span class="marker-dot '+markerCls+'"></span>'+escapeHtml(r["Overall Cost Type"])+'</div>' +
            '<div style="font-size:13px;font-weight:600;">'+(r["Total Cost"] ? '₹'+Number(r["Total Cost"]).toLocaleString("en-IN") : '—')+'</div>' +
            '<div style="font-size:11.5px;color:var(--text-muted);">'+escapeHtml(indianDate)+'</div>' +
            '<span class="req-card-chevron">▼</span>' +
          '</div>' +
          '<div class="req-card-body">' +
            '<div class="req-card-body-inner">' +
              '<div class="req-detail-grid">' +
                '<div class="req-detail-field"><label>Submission Date</label><div class="rdv">'+escapeHtml(indianDate)+'</div></div>' +
                '<div class="req-detail-field"><label>Submission Time</label><div class="rdv">'+escapeHtml(String(r["Submission Time"]||"").slice(0,5))+'</div></div>' +
                '<div class="req-detail-field"><label>Sales Manager</label><div class="rdv">'+escapeHtml(r["Sales Manager"]||"—")+'</div></div>' +
                '<div class="req-detail-field"><label>Priority</label><div class="rdv">'+escapeHtml(r["Priority"]||"—")+'</div></div>' +
                '<div class="req-detail-field"><label>Cost Status</label><div class="rdv marker-cell"><span class="marker-dot '+markerCls+'"></span>'+escapeHtml(r["Overall Cost Type"])+'</div></div>' +
                '<div class="req-detail-field"><label>Director Comment</label><div class="rdv">'+(r["Director Comment"] ? escapeHtml(r["Director Comment"]) : '—')+'</div></div>' +
              '</div>' +
              (lineItems.length ? '<div class="req-line-items-section"><h4>Line Items</h4>'+lineHtml+'</div>' : '') +
              '<div class="req-card-actions">' +
                '<button class="edit-req-btn" data-serial="'+escapeHtml(r["Serial No"])+'">✏️ Edit this Requisition</button>' +
                '<button class="copy-link-btn card-copy-link" data-serial="'+escapeHtml(r["Serial No"])+'" style="font-size:11.5px;padding:7px 14px;">🔗 Copy Link</button>' +
              '</div>' +
            '</div>' +
          '</div>';

        var header = card.querySelector(".req-card-header");
        header.addEventListener("click", function(){
          var isOpen = card.classList.contains("open");
          list.querySelectorAll(".req-card.open").forEach(function(c){ c.classList.remove("open"); });
          if(!isOpen) card.classList.add("open");
        });

        card.querySelector(".edit-req-btn").addEventListener("click", function(e){
          e.stopPropagation();
          openEditView(r["Serial No"]);
        });

        card.querySelector(".card-copy-link").addEventListener("click", function(e){
          e.stopPropagation();
          var btn = this;
          var url = buildShareLink(r["Serial No"]);
          navigator.clipboard.writeText(url).then(function(){
            btn.textContent = "✓ Copied!"; btn.classList.add("copied");
            setTimeout(function(){ btn.textContent = "🔗 Copy Link"; btn.classList.remove("copied"); }, 2000);
          }).catch(function(){
            var ta = document.createElement("textarea"); ta.value = url;
            ta.style.position="fixed"; ta.style.opacity="0";
            document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
            btn.textContent = "✓ Copied!"; btn.classList.add("copied");
            setTimeout(function(){ btn.textContent = "🔗 Copy Link"; btn.classList.remove("copied"); }, 2000);
          });
        });

        list.appendChild(card);
      });
    });

    wrap.innerHTML = "";
    wrap.appendChild(list);
  }).catch(function(){
    wrap.innerHTML = '<div class="card empty-state">Could not load your requests. Check your connection.</div>';
  });
}