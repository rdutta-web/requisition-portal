// js/new-req.js

function resetNewReqForm(){
  document.getElementById("requisitionForm").reset();
  document.getElementById("lineCardsWrap").innerHTML = "";
  lineIdCounter = 0;
  addLineCard();

  var now = new Date();
  document.getElementById("reqDate").value =
    now.getFullYear() + "-" + pad2(now.getMonth()+1) + "-" + pad2(now.getDate());
  document.getElementById("reqTime").value =
    pad2(now.getHours()) + ":" + pad2(now.getMinutes());

  loadSerialPreview();
}

function collectLineItems(){
  var cards = Array.prototype.slice.call(document.getElementById("lineCardsWrap").children);
  return cards.map(function(card){
    var rateType = card.querySelector(".segmented-option.active").getAttribute("data-value");
    var li = {
      item: card.querySelector(".li-item").value.trim(),
      description: card.querySelector(".li-description").value.trim(),
      client: card.querySelector(".li-client").value.trim(),
      qty: parseInt(card.querySelector(".li-qty").value, 10) || 1,
      priority: card.querySelector(".li-priority").value,
      costType: rateType,
      costValue: "", costMin: "", costMax: "",
      gstApplicable: card.getAttribute("data-gst-applicable") === "yes",
      gstPercent: "",
      note: card.querySelector(".li-note").value.trim()
    };
    if(rateType === "Range"){
      var minEl = card.querySelector(".li-cost-min"), maxEl = card.querySelector(".li-cost-max");
      li.costMin = minEl ? minEl.value : "";
      li.costMax = maxEl ? maxEl.value : "";
    } else if(rateType === "Approx" || rateType === "Exact"){
      var valEl = card.querySelector(".li-cost-value");
      li.costValue = valEl ? valEl.value : "";
      if(li.gstApplicable){
        var gstEl = card.querySelector(".li-gst-percent");
        li.gstPercent = gstEl ? gstEl.value : "";
      }
    }
    return li;
  });
}

function validateLineItems(items){
  for(var i=0;i<items.length;i++){
    var li = items[i];
    if(!li.item){ return "Product name is required on every line."; }
    if(!li.client){ return "Client name is required on every line."; }
    if(!li.qty || li.qty < 1){ return "Quantity is required on every line."; }
  }
  return null;
}

document.getElementById("requisitionForm").addEventListener("submit", function(e){
  e.preventDefault();

  var lineItems = collectLineItems();
  var err = validateLineItems(lineItems);
  if(err){ showToast(err, true); return; }

  var u = state.currentUserProfile;
  var payload = {
    action: "newSubmission",
    employeeName: u.name,
    employeeEmail: state.currentUser,
    date: document.getElementById("reqDate").value,
    time: document.getElementById("reqTime").value,
    serialNumberOverride: null,
    salesManager: document.getElementById("salesManager").value.trim(),
    lineItems: lineItems
  };

  var btn = document.getElementById("submitReqBtn");
  btn.disabled = true; btn.textContent = "Submitting...";

  apiPost(payload).then(function(res){
    btn.disabled = false; btn.textContent = "Submit Requisition";
    if(res.error){ showToast(res.error, true); return; }
    if(res.shareToken){
      try{ localStorage.setItem("skt_" + res.serial, res.shareToken); }catch(e){}
    }
    showToast("Requisition " + res.serial + " submitted successfully.");
    showEmpView("landing");
    renderMyRequests();
  }).catch(function(){
    btn.disabled = false; btn.textContent = "Submit Requisition";
    showToast("Network error — could not submit. Please retry.", true);
  });
});

document.getElementById("choiceNew").addEventListener("click", function(){ showEmpView("new"); });
document.getElementById("backFromNew").addEventListener("click", function(){ showEmpView("landing"); renderMyRequests(); });