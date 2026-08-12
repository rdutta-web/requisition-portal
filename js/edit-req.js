// js/edit-req.js

function openEditView(serial){
  var contentWrap = document.getElementById("editReqContent");
  contentWrap.innerHTML = '<div class="loading-note">Loading '+escapeHtml(serial)+'...</div>';
  showEmpView("edit");

  apiGet({ action: "getBySerial", serial: serial }).then(function(r){
    if(r.error){ contentWrap.innerHTML = '<div class="card empty-state">'+escapeHtml(r.error)+'</div>'; return; }
    renderEditForm(r);
  }).catch(function(){
    contentWrap.innerHTML = '<div class="card empty-state">Could not reach server.</div>';
  });
}

function renderEditForm(r){
  var contentWrap = document.getElementById("editReqContent");
  var lineItems = [];
  try{ lineItems = JSON.parse(r["Line Items Detail"] || "[]"); }catch(e){ lineItems = []; }

  // Build the edit UI
  var lineCardsHtml = '';
  var lineCardIds = [];
  lineItems.forEach(function(li, idx){
    var lid = "edit-ln-"+(idx+1);
    lineCardIds.push(lid);
    var rateTypeBtns = ["To Be Given Later","Range","Approx","Exact"].map(function(rt){
      return '<button type="button" class="segmented-option'+(rt===li.costType?" active":"")+ '" data-value="'+rt+'">'+rt+'</button>';
    }).join("");

    var costFieldHtml = "";
    if(li.costType==="Range"){
      costFieldHtml = '<div class="cost-value-fields" style="margin-top:8px;">'+
        '<input type="number" class="li-cost-min" placeholder="Min (₹)" value="'+(li.costMin||"")+'">'+
        '<input type="number" class="li-cost-max" placeholder="Max (₹)" value="'+(li.costMax||"")+'">'+'</div>';
    } else if(li.costType==="Approx"||li.costType==="Exact"){
      costFieldHtml = '<input type="number" class="li-cost-value" placeholder="Rate (₹)" value="'+(li.costValue||"")+'" style="width:100%;margin-top:8px;">';
    }

    var gstHtml = (li.gstApplicable) ?
      '<div class="form-grid" style="margin-top:10px;">'+
        '<div class="form-group"><label>GST %</label><input type="number" class="li-gst-percent" value="'+(li.gstPercent||"")+'"></div>'+
        '<div class="form-group"><label>Rate after GST</label><input type="text" class="li-rate-after-gst" readonly style="background:var(--bg);"></div>'+
      '</div>' : "";

    lineCardsHtml +=
      '<div class="line-card" data-line-id="'+lid+'" data-gst-applicable="'+(li.gstApplicable?"yes":"no")+'">' +
        '<div class="line-card-top">' +
          '<span class="line-card-num">Line '+(idx+1)+'</span>' +
        '</div>' +
        '<div class="form-group"><label>Product Name *</label><input type="text" class="li-item" value="'+escapeHtml(li.item||"")+'"></div>' +
        '<div class="form-group" style="margin-top:12px;"><label>Description</label><textarea class="li-description" style="min-height:80px;resize:vertical;">'+escapeHtml(li.description||"")+'</textarea></div>' +
        '<div class="line-grid-3" style="margin-top:12px;">'+
          '<div class="form-group"><label>Client *</label><input type="text" class="li-client" value="'+escapeHtml(li.client||"")+'"></div>'+
          '<div class="form-group"><label>Quantity *</label><input type="number" class="li-qty" min="1" value="'+(li.qty||1)+'"></div>'+
          '<div class="form-group"><label>Priority</label>'+
            '<select class="li-priority">'+
              ['Low','Medium','Urgent'].map(function(p){ return '<option value="'+p+'"'+(p===li.priority?' selected':'')+'>'+p+'</option>'; }).join("")+
            '</select>'+
          '</div>'+
        '</div>'+
        '<div class="form-group" style="margin-top:4px;"><label>Rate Type</label><div class="segmented-control li-ratetype-group">'+rateTypeBtns+'</div></div>'+
        '<div class="li-rate-value-wrap" style="margin-top:8px;">'+costFieldHtml+'</div>'+
        gstHtml+
        '<div style="margin-top:10px;">'+
          '<button type="button" class="add-note-link" data-role="note-toggle">'+(li.note?"− Remove note":"+ Add note")+'</button>'+
          '<div class="reveal-block'+(li.note?" show":"")+ '" data-role="note-field" '+(li.note?'':'style="display:none;"')+'>'+
            '<input type="text" class="li-note" placeholder="Optional note" style="width:100%;margin-top:6px;" value="'+escapeHtml(li.note||"")+'">'+
          '</div>'+
        '</div>'+
        '<div class="line-total-row">'+
          '<span>Total</span>'+
          '<span class="line-total-value pending">—</span>'+
        '</div>'+
      '</div>';
  });

  contentWrap.innerHTML =
    '<div class="form-banner" style="margin-bottom:22px;">'+
      '<div class="fb-logo"><img src="logo.png" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="fb-fallback" style="display:none;">ST</span></div>'+
      '<div class="fb-text"><h2>Skytel Tele Services Pvt. Ltd.</h2><span>Edit Requisition — '+escapeHtml(r["Serial No"])+'</span></div>'+
    '</div>'+
    '<div class="card">'+
      '<div class="req-meta-row">'+
        '<div class="req-meta-field"><label>Date</label><input type="date" id="editReqDate" value="'+escapeHtml(String(r["Submission Date"]||"").slice(0,10))+'"></div>'+
        '<div class="req-meta-field"><label>Time</label><input type="time" id="editReqTime" value="'+escapeHtml(String(r["Submission Time"]||"").slice(0,5))+'"></div>'+
        '<div class="req-meta-field"><label>Requisition Number</label>'+
          '<div class="serial-input-group"><span class="serial-prefix-badge">SKY-PR-</span><input type="text" readonly value="'+escapeHtml(String(r["Serial No"]||"").replace(/^SKY-PR-/,""))+'"></div>'+
        '</div>'+
      '</div>'+
      '<div style="margin-bottom:18px;"><label class="field-label">Sales Manager</label>'+
        '<input type="text" id="editSalesManager" value="'+escapeHtml(r["Sales Manager"]||"")+ '" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:\'Inter\',sans-serif;font-size:13.5px;background:var(--bg);">'+
      '</div>'+
      '<div class="edit-section-title">Line Items</div>'+
      '<div id="editLineCardsWrap" class="line-cards-wrap">'+lineCardsHtml+'</div>'+
      '<button type="button" class="submit-btn" id="saveEditBtn" style="margin-top:8px;">Save Changes</button>'+
    '</div>';

  // Wire each card for rate-type switching + totals
  var editCards = Array.prototype.slice.call(document.getElementById("editLineCardsWrap").children);
  editCards.forEach(function(card){
    // Rate type segmented
    var rateGroup = card.querySelector(".li-ratetype-group");
    var rateValueWrap = card.querySelector(".li-rate-value-wrap");
    rateGroup.querySelectorAll(".segmented-option").forEach(function(btn){
      btn.addEventListener("click", function(){
        rateGroup.querySelectorAll(".segmented-option").forEach(function(b){ b.classList.remove("active"); });
        btn.classList.add("active");
        renderRateValueFields(card, rateValueWrap, btn.getAttribute("data-value"));
        computeLineTotal(card);
      });
    });
    // Qty change
    var qtyEl = card.querySelector(".li-qty");
    if(qtyEl) qtyEl.addEventListener("input", function(){ computeLineTotal(card); });
    card.addEventListener("input", function(e){
      if(e.target.classList.contains("li-gst-percent")) computeLineTotal(card);
      if(e.target.classList.contains("li-cost-value")) computeLineTotal(card);
      if(e.target.classList.contains("li-cost-min")||e.target.classList.contains("li-cost-max")) computeLineTotal(card);
    });
    // Note toggle
    var noteToggle = card.querySelector('[data-role="note-toggle"]');
    var noteField = card.querySelector('[data-role="note-field"]');
    if(noteToggle && noteField){
      var noteOpen = noteField.classList.contains("show");
      noteToggle.addEventListener("click", function(){
        noteOpen = !noteOpen;
        if(noteOpen){ noteField.style.display="block"; requestAnimationFrame(function(){ noteField.classList.add("show"); }); }
        else { noteField.classList.remove("show"); }
        noteToggle.textContent = noteOpen ? "− Remove note" : "+ Add note";
      });
    }
    // Compute initial total
    computeLineTotal(card);
  });

  // Save changes
  document.getElementById("saveEditBtn").addEventListener("click", function(){
    var updatedItems = editCards.map(function(card){
      var rateType = (card.querySelector(".segmented-option.active")||{getAttribute:function(){ return "To Be Given Later";}}).getAttribute("data-value");
      var li = {
        item: (card.querySelector(".li-item")||{value:""}).value.trim(),
        description: (card.querySelector(".li-description")||{value:""}).value.trim(),
        client: (card.querySelector(".li-client")||{value:""}).value.trim(),
        qty: parseInt((card.querySelector(".li-qty")||{value:"1"}).value,10)||1,
        priority: (card.querySelector(".li-priority")||{value:"Medium"}).value,
        costType: rateType,
        costValue:"", costMin:"", costMax:"",
        gstApplicable: card.getAttribute("data-gst-applicable")==="yes",
        gstPercent:"",
        note: (card.querySelector(".li-note")||{value:""}).value.trim()
      };
      if(!li.item){ showToast("Product name is required on every line.",true); throw new Error("validation"); }
      if(!li.client){ showToast("Client name is required on every line.",true); throw new Error("validation"); }
      if(rateType==="Range"){
        li.costMin=(card.querySelector(".li-cost-min")||{value:""}).value;
        li.costMax=(card.querySelector(".li-cost-max")||{value:""}).value;
      } else if(rateType==="Approx"||rateType==="Exact"){
        li.costValue=(card.querySelector(".li-cost-value")||{value:""}).value;
        if(li.gstApplicable) li.gstPercent=(card.querySelector(".li-gst-percent")||{value:""}).value;
      }
      return li;
    });

    var btn = document.getElementById("saveEditBtn");
    btn.disabled=true; btn.textContent="Saving...";
    apiPost({
      action:"updateRequisition",
      serial: r["Serial No"],
      employeeEmail: state.currentUser,
      lineItems: updatedItems,
      resetStatus: true // Tells backend to reset status to Pending
    }).then(function(res){
      btn.disabled=false; btn.textContent="Save Changes";
      if(res.error){ showToast(res.error,true); return; }
      showToast("Requisition "+r["Serial No"]+" updated. Director has been notified.");
      showEmpView("landing");
      renderMyRequests();
    }).catch(function(err){
      if(err.message!=="validation"){
        btn.disabled=false; btn.textContent="Save Changes";
        showToast("Network error — could not save. Please retry.",true);
      } else { btn.disabled=false; btn.textContent="Save Changes"; }
    });
  });
}