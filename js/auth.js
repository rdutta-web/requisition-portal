// js/auth.js

var authErrorEl = document.getElementById("authError");

function initGoogleSignIn(){
  if(typeof google === "undefined" || !google.accounts){
    setTimeout(initGoogleSignIn, 300);
    return;
  }

  var savedSession = localStorage.getItem("skytel_auth");
  if(savedSession){
    var profile = JSON.parse(savedSession);
    state.currentUser = profile.email;
    state.currentUserProfile = profile;
    enterApp();
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential
  });
  google.accounts.id.renderButton(
    document.getElementById("googleSignInBtn"),
    { theme: "outline", size: "large", shape: "pill", text: "signin_with", width: 260 }
  );
}

function decodeJwt(token){
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonStr = decodeURIComponent(atob(base64).split("").map(function(c){
    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(""));
  return JSON.parse(jsonStr);
}

function handleGoogleCredential(response){
  var payload;
  try{
    payload = decodeJwt(response.credential);
  }catch(err){
    showAuthError("Could not read Google sign-in response. Please try again.");
    return;
  }
  var email = (payload.email || "").toLowerCase().trim();
  var user = AUTHORIZED_USERS[email];

  if(!user){
    showAuthError("This Google account (" + email + ") is not registered for the portal. Contact the admin to be added.");
    return;
  }
  if(payload.email_verified === false){
    showAuthError("Your Google account email is not verified.");
    return;
  }

  authErrorEl.classList.remove("show");
  state.currentUser = email;
  state.currentUserProfile = {
    email: email,
    role: user.role,
    initials: user.initials,
    name: user.name || payload.name || email
  };
  localStorage.setItem("skytel_auth", JSON.stringify(state.currentUserProfile));
  enterApp();
}

function showAuthError(msg){
  authErrorEl.textContent = msg;
  authErrorEl.classList.add("show");
}

function enterApp(){
  var u = state.currentUserProfile;
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appScreen").style.display = "block";

  document.getElementById("userAvatar").textContent = u.initials;
  document.getElementById("userChipEmail").textContent = u.name;
  document.getElementById("userChipRole").textContent = u.role === "director" ? "Director" : "Employee";

  document.getElementById("employeePanel").classList.remove("active");
  document.getElementById("directorPanel").classList.remove("active");

  var hash = window.location.hash;
  var shared = parseShareHash(hash);

  if(shared && shared.serial){
    showSharedView(shared.serial, shared.token);
    return;
  }

  if(u.role === "director"){
    document.getElementById("dirGreeting").textContent = "Hi! Dear Sir";
    document.getElementById("directorPanel").classList.add("active");
    renderDirectorView();
  } else {
    document.getElementById("empGreeting").textContent = "Hi, " + firstName(u.name);
    document.getElementById("employeePanel").classList.add("active");
    showEmpView("landing");
    renderMyRequests();
  }
}

document.getElementById("logoutBtn").addEventListener("click", function(){
  localStorage.removeItem("skytel_auth");
  state.currentUser = null;
  state.currentUserProfile = null;
  document.getElementById("appScreen").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
  if(typeof google !== "undefined" && google.accounts){
    google.accounts.id.disableAutoSelect();
  }
});

initGoogleSignIn();