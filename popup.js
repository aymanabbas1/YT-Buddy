import { getActiveTabURL } from "./utils.js";

const GEMINI_API_KEY = "AIzaSyB7e6-GXfp8Mrq6EEOOCR9uZ7s_iQ2Tc_Q"; // Replace with your Gemini API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

const handleGeminiRequest = () => {
  const inputText = document.getElementById("input_text").value;
  const btnGemini = document.getElementById("btn_gemini");
  const resultText = document.getElementById("result_text");

  btnGemini.disabled = true;
  resultText.innerText = "Loading...";

  fetch(GEMINI_API_URL, {
    method: "POST",
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: inputText
        }]
      }]
    }),
    headers: {
      "Content-Type": "application/json"
    }
  })
  .then((response) => response.json())
  .then((result) => {
    btnGemini.disabled = false;
    resultText.innerText = result["candidates"][0]["content"]["parts"][0]["text"];
  })
  .catch((error) => {
    btnGemini.disabled = false;
    resultText.innerText = "Error: " + error.message;
  });
};





const addNewBookmark = (bookmarks, bookmark) => {
  const bookmarkTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");
  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";
  controlsElement.className = "bookmark-controls";
  setBookmarkAttributes("play", onPlay, controlsElement);
  setBookmarkAttributes("delete", onDelete, controlsElement);
  newBookmarkElement.id = "bookmark-" + bookmark.time;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);
  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlsElement);
  bookmarks.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks=[]) => {
  const bookmarksElement = document.getElementById("bookmarks");
  bookmarksElement.innerHTML = "";
  if (currentBookmarks.length > 0) {
    for (let i = 0; i < currentBookmarks.length; i++) {
      const bookmark = currentBookmarks[i];
      addNewBookmark(bookmarksElement, bookmark);
    }
  } else {
    bookmarksElement.innerHTML = '<i class="row">No bookmarks to show</i>';
  }
  return;
};

const onPlay = async e => {
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab = await getActiveTabURL();
  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmarkTime,
  });
};

const onDelete = async e => {
  const activeTab = await getActiveTabURL();
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const bookmarkElementToDelete = document.getElementById(
    "bookmark-" + bookmarkTime
  );

  bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);

  chrome.tabs.sendMessage(activeTab.id, {
    type: "DELETE",
    value: bookmarkTime,
  });
};

const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

const toggleAccordion = (accordionId) => {
  const accordion = document.getElementById(accordionId);
  accordion.classList.toggle("active");

  if (accordionId === "accordion-notes" && accordion.classList.contains("active")) {
    loadNotes();
  }
  else if (accordionId === "accordion-filter-comments" && accordion.classList.contains("active")) {
    loadFilterSettings();
  }
};

// Load filter settings from storage
function loadFilterSettings() {
  chrome.storage.sync.get("filterSettings", function(data) {
    const settings = data.filterSettings || { list: [], state: false };
    document.getElementById("filter-box").value = settings.list.join(',');
    document.getElementById("filter-toggle").checked = settings.state;
  });
}

const loadNotes = async () => {
  const activeTab = await getActiveTabURL();
  chrome.storage.sync.get([activeTab.url], (data) => {
    const notes = data[activeTab.url] || '';
    document.getElementById("notes").value = notes;
  });
};

const saveNotes = async () => {
  const notes = document.getElementById("notes").value;
  const activeTab = await getActiveTabURL();
  chrome.storage.sync.set({ [activeTab.url]: notes });
};

function saveFilterSettings() {
  const words = document.getElementById("filter-box").value.split(',').map(word => word.trim());
  const state = document.getElementById("filter-toggle").checked;
  
  chrome.storage.sync.set({ filterSettings: { list: words, state: state } });
  // Send message to content script
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_FILTER" });
  });
}


document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const queryParameters = activeTab.url.split("?")[1];
  const urlParameters = new URLSearchParams(queryParameters);
  const currentVideo = urlParameters.get("v");

  if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
    chrome.storage.sync.get([currentVideo], (data) => {
      const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
      viewBookmarks(currentVideoBookmarks);
    });
    document.getElementById("accordion-bookmarks").style.display = "block";
    document.getElementById("accordion-notes").style.display = "block";
    document.getElementById("not-video-message").style.display = "none";
    document.getElementById("blur-container").style.display = "block";
    document.getElementById("accordion-gemini").style.display = "block";
    document.getElementById("accordion-filter-comments").style.display = "block";

  } else if (activeTab.url.includes("youtube.com")) {
    // For YouTube homepage
    document.getElementById("blur-container").style.display = "block"; // Show checkbox
    document.getElementById("not-video-message").style.display = "block";
    document.getElementById("accordion-bookmarks").style.display = "none";
    document.getElementById("accordion-notes").style.display = "none";
    document.getElementById("accordion-gemini").style.display = "none";
    document.getElementById("accordion-filter-comments").style.display = "none";
  } else {
    document.getElementById("blur-container").style.display = "none";
    document.getElementById("not-video-message").style.display = "block";
    document.getElementById("accordion-bookmarks").style.display = "none";
    document.getElementById("accordion-notes").style.display = "none";
    document.getElementById("accordion-gemini").style.display = "none";
    document.getElementById("accordion-filter-comments").style.display = "none";

  }

  // Accordion Event Listeners
  document.querySelector("#accordion-bookmarks .accordion-header").addEventListener("click", () => toggleAccordion("accordion-bookmarks"));
  document.querySelector("#accordion-notes .accordion-header").addEventListener("click", () => toggleAccordion("accordion-notes"));
  document.querySelector("#accordion-filter-comments .accordion-header").addEventListener("click", () => toggleAccordion("accordion-filter-comments"));
  // Event Listener for Gemini Accordion Header
document.querySelector("#accordion-gemini .accordion-header").addEventListener("click", () => toggleAccordion("accordion-gemini"));

// Event Listener for Gemini Submit Button
document.getElementById("btn_gemini").addEventListener("click", handleGeminiRequest);

document.getElementById("filter-toggle").addEventListener("change", function() {
  saveFilterSettings();
});

  // Save Notes Button Event Listener
  document.getElementById("save-notes").addEventListener("click", saveNotes);
  const applyBlurring = (blurEnabled) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "TOGGLE_BLUR",
        value: blurEnabled,
      });
    });
  };
  
  const saveBlurState = (blurEnabled) => {
    chrome.storage.sync.set({ blurThumbnails: blurEnabled });
  };
  
  const loadBlurState = () => {
    chrome.storage.sync.get(['blurThumbnails'], (data) => {
      const blurEnabled = data.blurThumbnails || false;
      document.getElementById("blur-thumbnails").checked = blurEnabled;
      applyBlurring(blurEnabled);
    });
  };
  
  document.getElementById("blur-thumbnails").addEventListener("change", (event) => {
    const blurEnabled = event.target.checked;
    saveBlurState(blurEnabled);
    applyBlurring(blurEnabled);
  });
  // Load Checkbox State
  loadBlurState();
});
