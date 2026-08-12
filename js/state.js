// js state.js

var state = {
  currentUser: null,
  currentUserProfile: null,
  dashboardCache: []   // last fetched rows from the Dashboard sheet
};

var pendingModalAction = null; // { requestId, decision }

var directorViewMode = "list"; // "list" | "grid"

var lineIdCounter = 0;