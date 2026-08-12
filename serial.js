// js/serial.js

function loadSerialPreview(){
  var badge = document.getElementById("serialPrefixBadge");
  var input = document.getElementById("serialSuffixInput");
  input.value = "";
  apiGet({ action: "getSerialPreview", employeeEmail: state.currentUser }).then(function(res){
    if(res.error) return;
    badge.textContent = "SKY-PR-" + (res.prefix || "");
    input.value = res.padded;
    input.setAttribute("data-padlength", res.padLength);
  }).catch(function(){ /* silent — server will still assign a valid serial on submit */ });
}