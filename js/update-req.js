// js/update-req.js

function loadIncompleteReqsDropdown(){
  var sel = document.getElementById("incompleteReqSelect");
  var note = document.getElementById("incompleteLoadNote");
  sel.innerHTML = '<option value="">Loading…</option>';
  sel.disabled = true;
  note.textContent = "";

  apiGet({ action: "getDashboard", employeeEmail: state.currentUser }).then(function(rows){
    sel.disabled = false;
    if(rows.error){ sel.innerHTML = '<option value="">Error loading — try again</option>'; return; }

   // Incomplete = Marker Color is Red (at least one line without Exact cost)
    // OR the requisition was Rejected (always editable regardless of cost completeness)
    var incomplete = rows.filter(function(r){
      if (r["Status"] === "Rejected") return true;
      return r["Marker Color"] === "Red" && r["Status"] === "Pending";
    });

    if(!incomplete.length){
      sel.innerHTML = '<option value="">No incomplete requisitions found</option>';
      note.textContent = "All your pending requisitions already have complete cost details.";
      return;
    }

    incomplete.sort(function(a,b){ return (b["Serial No"]||"").localeCompare(a["Serial No"]||""); });
    sel.innerHTML = '<option value="">— Select a requisition —</option>';
    incomplete.forEach(function(r){
      var label = r["Serial No"] + " — " + (r["Item Summary"]||"") + " (" + (r["Client(s)"]||"") + ")";
      var opt = document.createElement("option");
      opt.value = r["Serial No"];
      opt.textContent = label;
      sel.appendChild(opt);
    });
    note.textContent = incomplete.length + " incomplete requisition" + (incomplete.length>1?"s":"") + " found.";
  }).catch(function(){
    sel.disabled = false;
    sel.innerHTML = '<option value="">Network error — try again</option>';
  });
}

document.getElementById("loadIncompleteBtn").addEventListener("click", function(){
  var serial = document.getElementById("incompleteReqSelect").value.trim();
  if(!serial){ showToast("Please select a requisition from the list.", true); return; }
  var wrap = document.getElementById("updateResultWrap");
  wrap.innerHTML = '<div class="loading-note">Loading '+escapeHtml(serial)+'…</div>';

  apiGet({ action: "getBySerial", serial: serial }).then(function(r){
    if(r.error){ wrap.innerHTML = '<div class="card empty-state">'+escapeHtml(r.error)+'</div>'; return; }
    renderUpdateForm(r);
  }).catch(function(){
    wrap.innerHTML = '<div class="card empty-state">Could not reach the server. Check your connection.</div>';
  });
});

function renderUpdateForm(r){
  var wrap = document.getElementById("updateResultWrap");
  var lineItems = [];
  try{ lineItems = JSON.parse(r["Line Items Detail"] || "[]"); }catch(e){ lineItems = []; }

  var rowsHtml = lineItems.map(function(li, idx){
    return '<tr data-idx="'+idx+'">' +
      '<td>'+escapeHtml(li.item)+'</td>' +
      '<td>'+escapeHtml(String(li.qty))+'</td>' +
      '<td>'+escapeHtml(li.client)+'</td>' +
      '<td>'+costTypeSelectHtml("upd-costtype")+'</td>' +
      '<td class="upd-cost-wrap"></td>' +
      '</tr>';
  }).join("");

  wrap.innerHTML =
    '<div class="card">' +
      '<div style="margin-bottom:14px;"><span class="serial-badge">'+escapeHtml(r["Serial No"])+'</span> ' +
      '<span class="status-pill '+String(r["Status"]||"pending").toLowerCase()+'" style="margin-left:8px;">'+escapeHtml(r["Status"])+'</span></div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">'+escapeHtml(r["Item Summary"])+'</div>' +
      '<table class="line-items-table"><thead><tr><th>Item</th><th>Qty</th><th>Client</th><th>Cost Type</th><th>Cost Value</th></tr></thead>' +
      '<tbody id="updLineBody">'+rowsHtml+'</tbody></table>' +
      '<button type="button" class="submit-btn" id="saveUpdateBtn">Save Changes</button>' +
    '</div>';

  var updRows = Array.prototype.slice.call(document.getElementById("updLineBody").children);
  updRows.forEach(function(tr, idx){
    var li = lineItems[idx];
    var sel = tr.querySelector(".upd-costtype");
    sel.value = li.costType || "To Be Filled Later";
    renderUpdLineCostValue(tr, sel.value, li);
    sel.addEventListener("change", function(){ renderUpdLineCostValue(tr, this.value, li); });
  });

  document.getElementById("saveUpdateBtn").addEventListener("click", function(){
    var updatedItems = updRows.map(function(tr, idx){
      var orig = lineItems[idx];
      var costType = tr.querySelector(".upd-costtype").value;
      var li = { item: orig.item, qty: orig.qty, client: orig.client, costType: costType, costValue:"", costMin:"", costMax:"" };
      if(costType === "Range"){
        var minEl = tr.querySelector(".upd-cost-min"), maxEl = tr.querySelector(".upd-cost-max");
        li.costMin = minEl ? minEl.value : "";
        li.costMax = maxEl ? maxEl.value : "";
      } else if(costType === "Approx" || costType === "Exact"){
        var valEl = tr.querySelector(".upd-cost-value");
        li.costValue = valEl ? valEl.value : "";
      }
      return li;
    });

    var btn = document.getElementById("saveUpdateBtn");
    btn.disabled = true; btn.textContent = "Saving...";
    apiPost({
      action: "updateRequisition",
      serial: r["Serial No"],
      employeeEmail: state.currentUser,
      lineItems: updatedItems,
      resetStatus: true // Tells backend to reset status to Pending
    }).then(function(res){
      btn.disabled = false; btn.textContent = "Save Changes";
      if(res.error){ showToast(res.error, true); return; }
      showToast("Requisition " + r["Serial No"] + " updated.");
      showEmpView("landing");
      renderMyRequests();
    }).catch(function(){
      btn.disabled = false; btn.textContent = "Save Changes";
      showToast("Network error — could not save. Please retry.", true);
    });
  });
}

function renderUpdLineCostValue(tr, costType, li){
  var wrap = tr.querySelector(".upd-cost-wrap");
  if(costType === "Range"){
    wrap.innerHTML = '<div style="display:flex;gap:4px;">' +
      '<input type="number" class="upd-cost-min" placeholder="Min" min="0" value="'+(li.costMin||"")+'">' +
      '<input type="number" class="upd-cost-max" placeholder="Max" min="0" value="'+(li.costMax||"")+'"></div>';
  } else if(costType === "Approx" || costType === "Exact"){
    wrap.innerHTML = '<input type="number" class="upd-cost-value" placeholder="'+(costType==="Exact"?"Exact":"Approx")+'" min="0" value="'+(li.costValue||"")+'">';
  } else {
    wrap.innerHTML = "";
  }
}

document.getElementById("choiceUpdate").addEventListener("click", function(){ showEmpView("update"); });
document.getElementById("backFromUpdate").addEventListener("click", function(){ showEmpView("landing"); renderMyRequests(); });
document.getElementById("backFromEdit").addEventListener("click", function(){ showEmpView("landing"); renderMyRequests(); });