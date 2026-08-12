// js/modal.js

var modalOverlay = document.getElementById("modalOverlay");
var modalTitle = document.getElementById("modalTitle");
var modalSub = document.getElementById("modalSub");
var modalComment = document.getElementById("modalComment");
var modalConfirmBtn = document.getElementById("modalConfirmBtn");
var modalCancelBtn = document.getElementById("modalCancelBtn");

function openModal(serial, decision){
  pendingModalAction = { serial: serial, decision: decision };
  modalTitle.textContent = (decision === "Approved" ? "Approve" : "Reject") + " Request " + serial;
  modalSub.textContent = "Add an optional comment for the employee.";
  modalComment.value = "";
  modalConfirmBtn.className = "modal-confirm " + (decision === "Approved" ? "approve" : "reject");
  modalConfirmBtn.textContent = decision === "Approved" ? "Confirm Approve" : "Confirm Reject";
  modalOverlay.classList.add("show");
}

function closeModal(){
  modalOverlay.classList.remove("show");
  pendingModalAction = null;
}

modalCancelBtn.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", function(e){
  if(e.target === modalOverlay) closeModal();
});

modalConfirmBtn.addEventListener("click", function(){
  if(!pendingModalAction) return;
  modalConfirmBtn.disabled = true;
  apiPost({
    action: "decision",
    serial: pendingModalAction.serial,
    decision: pendingModalAction.decision,
    comment: modalComment.value.trim(),
    directorEmail: state.currentUser
  }).then(function(res){
    modalConfirmBtn.disabled = false;
    closeModal();
    if(res.error){ showToast(res.error, true); return; }
    renderDirectorView();
  }).catch(function(){
    modalConfirmBtn.disabled = false;
    closeModal();
    showToast("Network error — could not save decision.", true);
  });
});