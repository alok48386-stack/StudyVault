/**
 * StudyVault Client-Side JavaScript
 * - Live Search Autocomplete with Debounce & Keyboard Nav
 * - Category Filter enhancements
 */

document.addEventListener('DOMContentLoaded', function () {
  initLiveSearch();
});

function initLiveSearch() {
  const searchInput = document.getElementById('search-input');
  const suggestionsBox = document.getElementById('search-suggestions');
  if (!searchInput || !suggestionsBox) return;

  let debounceTimer = null;
  let activeIndex = -1;

  searchInput.addEventListener('input', function () {
    const query = this.value.trim();
    clearTimeout(debounceTimer);
    activeIndex = -1;

    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    debounceTimer = setTimeout(() => {
      fetchSuggestions(query);
    }, 250);
  });

  searchInput.addEventListener('keydown', function (e) {
    const items = suggestionsBox.querySelectorAll('.suggestion-item');
    if (suggestionsBox.classList.contains('hidden') || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].click();
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', function (e) {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      hideSuggestions();
    }
  });

  function fetchSuggestions(query) {
    fetch('/api/search?q=' + encodeURIComponent(query))
      .then(response => {
        if (!response.ok) throw new Error('Network error');
        return response.json();
      })
      .then(data => {
        renderSuggestions(data);
      })
      .catch(err => {
        console.error('Search suggestion error:', err);
        hideSuggestions();
      });
  }

  function renderSuggestions(notes) {
    if (!notes || notes.length === 0) {
      suggestionsBox.innerHTML = `
        <div style="padding: 0.85rem 1rem; font-size: 0.85rem; color: #64748b;">
          No matching notes found. Press Enter to search all.
        </div>
      `;
      suggestionsBox.classList.remove('hidden');
      return;
    }

    let html = '';
    notes.forEach((note, index) => {
      html += `
        <div class="suggestion-item" data-url="${note.url}" role="option" tabindex="-1">
          <span class="suggestion-title">${escapeHtml(note.title)}</span>
          <div class="suggestion-badges">
            <span class="category-pill" style="font-size: 0.65rem;">${escapeHtml(note.category)}</span>
            <span class="file-badge ${note.file_type.toLowerCase()}" style="position: static; font-size: 0.65rem; padding: 0.15rem 0.35rem;">${note.file_type}</span>
          </div>
        </div>
      `;
    });

    suggestionsBox.innerHTML = html;
    suggestionsBox.classList.remove('hidden');

    // Click handler for suggestion items
    const items = suggestionsBox.querySelectorAll('.suggestion-item');
    items.forEach(item => {
      item.addEventListener('click', function () {
        const url = this.getAttribute('data-url');
        if (url) window.location.href = url;
      });
    });
  }

  function updateActiveItem(items) {
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  function hideSuggestions() {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
    activeIndex = -1;
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
