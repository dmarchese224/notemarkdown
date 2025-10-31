// IndexedDB Manager
class NotesDB {
  constructor() {
    this.dbName = 'MarkdownNotesDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('notes')) {
          const objectStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
          objectStore.createIndex('title', 'title', { unique: false });
          objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  async saveNote(note) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notes'], 'readwrite');
      const objectStore = transaction.objectStore('notes');
      const request = objectStore.put(note);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllNotes() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notes'], 'readonly');
      const objectStore = transaction.objectStore('notes');
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getNote(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notes'], 'readonly');
      const objectStore = transaction.objectStore('notes');
      const request = objectStore.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notes'], 'readwrite');
      const objectStore = transaction.objectStore('notes');
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Markdown Parser
class MarkdownParser {
  parse(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Escape HTML
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^[*-]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Paragraphs
    html = html.split('\n\n').map(para => {
      if (!para.match(/^<[h|u|o|p|b]/)) {
        return `<p>${para}</p>`;
      }
      return para;
    }).join('\n');

    return html;
  }
}

// Main Application
class MarkdownNotesApp {
  constructor() {
    this.db = new NotesDB();
    this.parser = new MarkdownParser();
    this.currentNote = null;
    this.notes = [];
    this.autoSaveTimer = null;
    this.darkMode = false;

    this.initElements();
  }

  initElements() {
    // Header
    this.toggleSidebarBtn = document.getElementById('toggleSidebar');
    this.toggleDarkModeBtn = document.getElementById('toggleDarkMode');

    // Sidebar
    this.sidebar = document.getElementById('sidebar');
    this.newNoteBtn = document.getElementById('newNoteBtn');
    this.importBtn = document.getElementById('importBtn');
    this.searchInput = document.getElementById('searchInput');
    this.sortSelect = document.getElementById('sortSelect');
    this.notesList = document.getElementById('notesList');

    // Editor
    this.noteTitleInput = document.getElementById('noteTitle');
    this.markdownInput = document.getElementById('markdownInput');
    this.markdownPreview = document.getElementById('markdownPreview');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.exportCloudBtn = document.getElementById('exportCloudBtn');
    this.deleteNoteBtn = document.getElementById('deleteNoteBtn');
    this.wordCount = document.getElementById('wordCount');
    this.charCount = document.getElementById('charCount');
    this.autoSaveStatus = document.getElementById('autoSaveStatus');

    // Toolbar
    this.toolbarButtons = document.querySelectorAll('.toolbar .btn-icon');

    // Modal
    this.cloudModal = document.getElementById('cloudModal');
    this.closeModalBtn = document.getElementById('closeModal');
    this.copyToClipboardBtn = document.getElementById('copyToClipboard');
    this.cloudServiceBtns = document.querySelectorAll('.cloud-service button');

    // Welcome Screen
    this.welcomeScreen = document.getElementById('welcomeScreen');
    this.createFirstNoteBtn = document.getElementById('createFirstNote');
    this.importFirstNoteBtn = document.getElementById('importFirstNote');

    // File Input
    this.fileInput = document.getElementById('fileInput');
  }

  async init() {
    try {
      await this.db.init();
      this.notes = await this.db.getAllNotes();
      
      if (this.notes.length === 0) {
        this.showWelcomeScreen();
      } else {
        this.renderNotesList();
        if (this.notes.length > 0) {
          this.loadNote(this.notes[0].id);
        }
      }

      this.attachEventListeners();
      this.checkDarkMode();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }

  attachEventListeners() {
    // Header
    this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
    this.toggleDarkModeBtn.addEventListener('click', () => this.toggleDarkMode());

    // Sidebar
    this.newNoteBtn.addEventListener('click', () => this.createNewNote());
    this.importBtn.addEventListener('click', () => this.importNotes());
    this.searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));
    this.sortSelect.addEventListener('change', () => this.renderNotesList());

    // Editor
    this.noteTitleInput.addEventListener('input', () => this.scheduleAutoSave());
    this.markdownInput.addEventListener('input', () => {
      this.updatePreview();
      this.updateStats();
      this.scheduleAutoSave();
    });
    this.downloadBtn.addEventListener('click', () => this.downloadNote());
    this.exportCloudBtn.addEventListener('click', () => this.showCloudModal());
    this.deleteNoteBtn.addEventListener('click', () => this.deleteCurrentNote());

    // Toolbar
    this.toolbarButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const md = e.currentTarget.getAttribute('data-md');
        this.insertMarkdown(md);
      });
    });

    // Modal
    this.closeModalBtn.addEventListener('click', () => this.hideCloudModal());
    this.cloudModal.addEventListener('click', (e) => {
      if (e.target === this.cloudModal) this.hideCloudModal();
    });
    this.copyToClipboardBtn.addEventListener('click', () => this.copyToClipboard());
    this.cloudServiceBtns.forEach(btn => {
      btn.addEventListener('click', () => this.downloadNote());
    });

    // Welcome Screen
    this.createFirstNoteBtn.addEventListener('click', () => {
      this.hideWelcomeScreen();
      this.createNewNote();
    });
    this.importFirstNoteBtn.addEventListener('click', () => {
      this.hideWelcomeScreen();
      this.importNotes();
    });

    // File Input
    this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  showWelcomeScreen() {
    this.welcomeScreen.classList.add('active');
  }

  hideWelcomeScreen() {
    this.welcomeScreen.classList.remove('active');
  }

  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.sidebar.classList.toggle('active');
    }
  }

  checkDarkMode() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.setAttribute('data-color-scheme', 'dark');
      this.darkMode = true;
    }
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    document.documentElement.setAttribute('data-color-scheme', this.darkMode ? 'dark' : 'light');
  }

  async createNewNote() {
    const now = new Date();
    const newNote = {
      title: `Note ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
      content: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    try {
      const id = await this.db.saveNote(newNote);
      newNote.id = id;
      this.notes.unshift(newNote);
      this.renderNotesList();
      this.loadNote(id);
      this.noteTitleInput.focus();
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }

  async loadNote(id) {
    try {
      const note = await this.db.getNote(id);
      if (note) {
        this.currentNote = note;
        this.noteTitleInput.value = note.title;
        this.markdownInput.value = note.content;
        this.updatePreview();
        this.updateStats();
        this.highlightActiveNote(id);
      }
    } catch (error) {
      console.error('Failed to load note:', error);
    }
  }

  highlightActiveNote(id) {
    document.querySelectorAll('.note-item').forEach(item => {
      item.classList.remove('active');
      if (parseInt(item.dataset.id) === id) {
        item.classList.add('active');
      }
    });
  }

  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => this.autoSave(), 3000);
  }

  async autoSave() {
    if (!this.currentNote) return;

    this.currentNote.title = this.noteTitleInput.value || 'Untitled';
    this.currentNote.content = this.markdownInput.value;
    this.currentNote.updatedAt = new Date().toISOString();

    try {
      await this.db.saveNote(this.currentNote);
      this.autoSaveStatus.textContent = 'Saved';
      setTimeout(() => {
        this.autoSaveStatus.textContent = '';
      }, 2000);
      
      // Update notes list
      const noteIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
      if (noteIndex !== -1) {
        this.notes[noteIndex] = { ...this.currentNote };
        this.renderNotesList();
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      this.autoSaveStatus.textContent = 'Save failed';
    }
  }

  updatePreview() {
    const markdown = this.markdownInput.value;
    const html = this.parser.parse(markdown);
    this.markdownPreview.innerHTML = html || '<p class="preview-placeholder">Preview will appear here...</p>';
  }

  updateStats() {
    const text = this.markdownInput.value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    
    this.wordCount.textContent = `${words} words`;
    this.charCount.textContent = `${chars} characters`;
  }

  renderNotesList() {
    const sortedNotes = this.sortNotes([...this.notes]);
    
    if (sortedNotes.length === 0) {
      this.notesList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <p>No notes yet. Create your first note!</p>
        </div>
      `;
      return;
    }

    this.notesList.innerHTML = sortedNotes.map(note => {
      const date = new Date(note.updatedAt);
      const preview = note.content.split('\n')[0].substring(0, 50) || 'Empty note';
      return `
        <div class="note-item" data-id="${note.id}">
          <div class="note-item-title">${note.title}</div>
          <div class="note-item-preview">${preview}</div>
          <div class="note-item-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    document.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        this.loadNote(id);
        if (window.innerWidth <= 768) {
          this.sidebar.classList.remove('active');
        }
      });
    });
  }

  sortNotes(notes) {
    const sortBy = this.sortSelect.value;
    
    switch (sortBy) {
      case 'newest':
        return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      case 'oldest':
        return notes.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      case 'alpha':
        return notes.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return notes;
    }
  }

  searchNotes(query) {
    if (!query.trim()) {
      this.renderNotesList();
      return;
    }

    const filtered = this.notes.filter(note => {
      const searchText = `${note.title} ${note.content}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    const sortedNotes = this.sortNotes(filtered);
    
    if (sortedNotes.length === 0) {
      this.notesList.innerHTML = `
        <div class="empty-state">
          <p>No notes found matching "${query}"</p>
        </div>
      `;
      return;
    }

    this.notesList.innerHTML = sortedNotes.map(note => {
      const date = new Date(note.updatedAt);
      const preview = note.content.split('\n')[0].substring(0, 50) || 'Empty note';
      return `
        <div class="note-item" data-id="${note.id}">
          <div class="note-item-title">${note.title}</div>
          <div class="note-item-preview">${preview}</div>
          <div class="note-item-date">${date.toLocaleDateString()}</div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        this.loadNote(id);
      });
    });
  }

  async deleteCurrentNote() {
    if (!this.currentNote) return;

    if (!confirm(`Delete "${this.currentNote.title}"?`)) {
      return;
    }

    try {
      await this.db.deleteNote(this.currentNote.id);
      this.notes = this.notes.filter(n => n.id !== this.currentNote.id);
      this.renderNotesList();

      if (this.notes.length > 0) {
        this.loadNote(this.notes[0].id);
      } else {
        this.currentNote = null;
        this.noteTitleInput.value = '';
        this.markdownInput.value = '';
        this.updatePreview();
        this.updateStats();
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }

  downloadNote() {
    if (!this.currentNote) return;

    const content = this.markdownInput.value;
    const filename = `${this.noteTitleInput.value || 'note'}.md`;
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  importNotes() {
    this.fileInput.click();
  }

  async handleFileImport(event) {
    const files = event.target.files;
    if (!files.length) return;

    for (let file of files) {
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        try {
          const content = await file.text();
          const now = new Date();
          const newNote = {
            title: file.name.replace(/\.(md|txt)$/, ''),
            content: content,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          };

          const id = await this.db.saveNote(newNote);
          newNote.id = id;
          this.notes.unshift(newNote);
        } catch (error) {
          console.error(`Failed to import ${file.name}:`, error);
        }
      }
    }

    this.renderNotesList();
    if (this.notes.length > 0) {
      this.loadNote(this.notes[0].id);
    }

    this.fileInput.value = '';
  }

  insertMarkdown(md) {
    const textarea = this.markdownInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let insertion = md;
    let cursorOffset = md.length;

    if (md.includes('text')) {
      insertion = md.replace('text', selectedText || 'text');
      if (!selectedText) {
        cursorOffset = md.indexOf('text');
      }
    } else if (md.includes('url')) {
      insertion = md.replace('text', selectedText || 'text');
      if (!selectedText) {
        cursorOffset = md.indexOf('text');
      }
    }

    textarea.value = text.substring(0, start) + insertion + text.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    
    this.updatePreview();
    this.scheduleAutoSave();
  }

  showCloudModal() {
    this.cloudModal.classList.add('active');
  }

  hideCloudModal() {
    this.cloudModal.classList.remove('active');
  }

  copyToClipboard() {
    const content = this.markdownInput.value;
    navigator.clipboard.writeText(content).then(() => {
      alert('Note copied to clipboard! You can now paste it into your cloud storage.');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  handleKeyboardShortcuts(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key === 's') {
      e.preventDefault();
      this.autoSave();
    } else if (modifier && e.key === 'n') {
      e.preventDefault();
      this.createNewNote();
    } else if (modifier && e.key === 'f') {
      e.preventDefault();
      this.searchInput.focus();
    } else if (modifier && e.key === 'b') {
      e.preventDefault();
      this.insertMarkdown('**text**');
    } else if (modifier && e.key === 'i') {
      e.preventDefault();
      this.insertMarkdown('*text*');
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new MarkdownNotesApp();
    app.init();
  });
} else {
  const app = new MarkdownNotesApp();
  app.init();
}