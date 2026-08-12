// js/line-cards.js

function costTypeSelectHtml(cls, extra){
  var opts = RATE_TYPES.map(function(ct){ return '<option value="'+ct+'">'+ct+'</option>'; }).join("");
  return '<select class="'+cls+'" '+(extra||"")+'>'+opts+'</select>';
}

function revealBlock(el, show){
  if(show){
    el.style.display = "block";
    requestAnimationFrame(function(){ el.classList.add("show"); });
  } else {
    el.classList.remove("show");
  }
}

function addLineCard(){
  lineIdCounter++;
  var id = "ln" + lineIdCounter;
  var card = document.createElement("div");
  card.className = "line-card";
  card.setAttribute("data-line-id", id);
  card.innerHTML =
    '<div class="line-card-top">' +
      '<span class="line-card-num">Line '+lineIdCounter+'</span>' +
      '<button type="button" class="remove-line-btn" title="Remove line">&times;</button>' +
    '</div>' +

    '<div class="form-group">' +
      '<label>Product Name *</label>' +
      '<input type="text" class="li-item" placeholder="e.g. Crimping Tool">' +
    '</div>' +

    '<div class="reveal-block chip-prompt" data-role="desc-prompt">' +
      '<span class="prompt-label">Add a description for this item?</span>' +
      '<button type="button" class="mini-btn yes" data-answer="yes">Yes</button>' +
      '<button type="button" class="mini-btn no" data-answer="no">No</button>' +
    '</div>' +

    '<div class="reveal-block" data-role="desc-field">' +
      '<div class="form-group" style="margin-bottom:0;">' +
        '<label>Description</label>' +
        '<textarea class="li-description" placeholder="Optional details about this item" style="min-height:80px;resize:vertical;"></textarea>' +
      '</div>' +
    '</div>' +

    '<div class="line-grid-3">' +
      '<div class="form-group">' +
        '<label>Client *</label>' +
        '<input type="text" class="li-client" placeholder="Client name">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Quantity *</label>' +
        '<input type="number" class="li-qty" min="1" value="1">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Priority</label>' +
        '<select class="li-priority">' +
          '<option value="Low">Low</option>' +
          '<option value="Medium" selected>Medium</option>' +
          '<option value="Urgent">Urgent</option>' +
        '</select>' +
      '</div>' +
    '</div>' +

    '<div class="form-group">' +
      '<label>Rate Type</label>' +
      '<div class="segmented-control li-ratetype-group">' +
        RATE_TYPES.map(function(rt){
          return '<button type="button" class="segmented-option'+(rt==="To Be Given Later"?" active":"")+'" data-value="'+rt+'">'+rt+'</button>';
        }).join("") +
      '</div>' +
    '</div>' +

    '<div class="li-rate-value-wrap"></div>' +

    '<div class="reveal-block chip-prompt" data-role="gst-prompt">' +
      '<span class="prompt-label">GST applicable?</span>' +
      '<button type="button" class="mini-btn yes" data-answer="yes">Yes</button>' +
      '<button type="button" class="mini-btn no" data-answer="no">No</button>' +
    '</div>' +

    '<div class="reveal-block" data-role="gst-field">' +
      '<div class="form-grid">' +
        '<div class="form-group">' +
          '<label>GST %</label>' +
          '<input type="number" class="li-gst-percent" min="0" max="100" placeholder="e.g. 18">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Rate after GST</label>' +
          '<input type="text" class="li-rate-after-gst" readonly style="background:var(--bg);">' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<button type="button" class="add-note-link" data-role="note-toggle">+ Add note</button>' +
    '<div class="reveal-block" data-role="note-field">' +
      '<input type="text" class="li-note" placeholder="Optional note" style="width:100%;">' +
    '</div>' +

    '<div class="line-total-row">' +
      '<span>Total</span>' +
      '<span class="line-total-value pending">&mdash;</span>' +
    '</div>';

  document.getElementById("lineCardsWrap").appendChild(card);
  wireLineCard(card);
}

function wireLineCard(card){
  var itemInput = card.querySelector(".li-item");
  var descPrompt = card.querySelector('[data-role="desc-prompt"]');
  var descField = card.querySelector('[data-role="desc-field"]');
  var descAnswered = false;

  itemInput.addEventListener("blur", function(){
    if(itemInput.value.trim() && !descAnswered){
      revealBlock(descPrompt, true);
    }
  });
  descPrompt.querySelectorAll(".mini-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      descAnswered = true;
      descPrompt.querySelectorAll(".mini-btn").forEach(function(b){ b.classList.remove("picked"); });
      btn.classList.add("picked");
      revealBlock(descPrompt, false);
      revealBlock(descField, btn.getAttribute("data-answer") === "yes");
    });
  });

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
  renderRateValueFields(card, rateValueWrap, "To Be Given Later");

  var gstPrompt = card.querySelector('[data-role="gst-prompt"]');
  var gstField = card.querySelector('[data-role="gst-field"]');
  gstPrompt.querySelectorAll(".mini-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      gstPrompt.querySelectorAll(".mini-btn").forEach(function(b){ b.classList.remove("picked"); });
      btn.classList.add("picked");
      card.setAttribute("data-gst-applicable", btn.getAttribute("data-answer"));
      revealBlock(gstPrompt, false);
      revealBlock(gstField, btn.getAttribute("data-answer") === "yes");
      computeLineTotal(card);
    });
  });

  var noteToggle = card.querySelector('[data-role="note-toggle"]');
  var noteField = card.querySelector('[data-role="note-field"]');
  var noteOpen = false;
  noteToggle.addEventListener("click", function(){
    noteOpen = !noteOpen;
    revealBlock(noteField, noteOpen);
    noteToggle.textContent = noteOpen ? "\u2212 Remove note" : "+ Add note";
  });

  card.querySelector(".li-qty").addEventListener("input", function(){ computeLineTotal(card); });
  card.addEventListener("input", function(e){
    if(e.target.classList.contains("li-gst-percent")){ computeLineTotal(card); }
  });

  card.querySelector(".remove-line-btn").addEventListener("click", function(){
    var wrap = document.getElementById("lineCardsWrap");
    if(wrap.children.length > 1){
      card.remove();
    } else {
      showToast("At least one line is required.", true);
    }
  });
}

function renderRateValueFields(card, wrap, rateType){
  if(rateType === "Range"){
    wrap.innerHTML = '<div class="cost-value-fields">' +
      '<input type="number" class="li-cost-min" placeholder="Min (₹)" min="0">' +
      '<input type="number" class="li-cost-max" placeholder="Max (₹)" min="0"></div>';
    wrap.querySelectorAll("input").forEach(function(inp){
      inp.addEventListener("input", function(){ computeLineTotal(card); });
    });
    revealBlock(card.querySelector('[data-role="gst-prompt"]'), false);
    revealBlock(card.querySelector('[data-role="gst-field"]'), false);
  } else if(rateType === "Approx" || rateType === "Exact"){
    wrap.innerHTML = '<input type="number" class="li-cost-value" placeholder="'+(rateType==="Exact"?"Exact":"Approx")+' rate (₹)" min="0" style="width:100%;">';
    var valInput = wrap.querySelector(".li-cost-value");
    var gstAnswered = false;
    valInput.addEventListener("blur", function(){
      if(valInput.value && !gstAnswered && card.getAttribute("data-gst-applicable") == null){
        revealBlock(card.querySelector('[data-role="gst-prompt"]'), true);
      }
    });
    valInput.addEventListener("input", function(){ computeLineTotal(card); });
  } else {
    wrap.innerHTML = "";
    revealBlock(card.querySelector('[data-role="gst-prompt"]'), false);
    revealBlock(card.querySelector('[data-role="gst-field"]'), false);
  }
  computeLineTotal(card);
}

function computeLineTotal(card){
  var rateType = card.querySelector(".segmented-option.active").getAttribute("data-value");
  var totalEl = card.querySelector(".line-total-value");
  var gstAfterEl = card.querySelector(".li-rate-after-gst");

  if(rateType !== "Approx" && rateType !== "Exact"){
    totalEl.textContent = "\u2014";
    totalEl.className = "line-total-value pending";
    if(gstAfterEl) gstAfterEl.value = "";
    return;
  }

  var valInput = card.querySelector(".li-cost-value");
  var rate = valInput ? parseFloat(valInput.value) || 0 : 0;
  var qty = parseFloat(card.querySelector(".li-qty").value) || 0;
  var gstApplicable = card.getAttribute("data-gst-applicable") === "yes";
  var rateAfterGst = rate;

  if(gstApplicable){
    var gstPct = parseFloat((card.querySelector(".li-gst-percent") || {}).value) || 0;
    rateAfterGst = rate + (rate * gstPct / 100);
    if(gstAfterEl) gstAfterEl.value = rateAfterGst ? "₹" + rateAfterGst.toFixed(2) : "";
  } else {
    if(gstAfterEl) gstAfterEl.value = "";
  }

  if(!rate){
    totalEl.textContent = "\u2014";
    totalEl.className = "line-total-value pending";
    return;
  }

  var total = qty * rateAfterGst;
  totalEl.textContent = "₹" + total.toLocaleString("en-IN", {maximumFractionDigits:2});
  totalEl.className = "line-total-value";
}

document.getElementById("addLineBtn").addEventListener("click", addLineCard);
