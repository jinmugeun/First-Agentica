class ReportManager {
  constructor() {
    this.templates = new Map();
    this.reports = new Map();
    this.selectedTemplateId = null;
    this.driver = null;
    this.isConnected = false;

    this.initializeEventListeners();
    this.loadTemplates();
  }

  initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.id.replace('tab-', ''));
      });
    });

    // File upload
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
    uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
    uploadArea.addEventListener('drop', this.handleDrop.bind(this));

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.uploadTemplate(e.target.files[0]);
      }
    });

    // Report generation
    document.getElementById('generate-button').addEventListener('click', this.generateReport.bind(this));
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.remove('bg-blue-600', 'text-white');
      button.classList.add('text-gray-300');
    });
    document.getElementById(`tab-${tabName}`).classList.add('bg-blue-600', 'text-white');
    document.getElementById(`tab-${tabName}`).classList.remove('text-gray-300');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    document.getElementById(`${tabName}-section`).classList.remove('hidden');

    // Load data for specific tabs
    if (tabName === 'generate') {
      this.updateTemplateSelector();
    } else if (tabName === 'reports') {
      this.loadReports();
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    document.getElementById('upload-area').classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('upload-area').classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    document.getElementById('upload-area').classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.uploadTemplate(files[0]);
    }
  }

  async uploadTemplate(file) {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      alert('PDF 또는 DOCX 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    this.showUploadProgress(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', document.getElementById('template-title').value || file.name);
      formData.append('description', document.getElementById('template-description').value || '');

      const response = await fetch('/report/template/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('업로드 실패');
      }

      const result = await response.json();
      
      // Store template
      this.templates.set(result.templateId, result.template);
      
      // Update UI
      this.updateTemplatesList();
      this.updateTemplateSelector();
      
      // Clear form
      document.getElementById('template-title').value = '';
      document.getElementById('template-description').value = '';
      document.getElementById('file-input').value = '';

      alert('템플릿이 성공적으로 업로드되었습니다!');
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('업로드 중 오류가 발생했습니다: ' + error.message);
    } finally {
      this.showUploadProgress(false);
    }
  }

  showUploadProgress(show) {
    const placeholder = document.getElementById('upload-placeholder');
    const progress = document.getElementById('upload-progress');
    
    if (show) {
      placeholder.classList.add('hidden');
      progress.classList.remove('hidden');
    } else {
      placeholder.classList.remove('hidden');
      progress.classList.add('hidden');
    }
  }

  async loadTemplates() {
    try {
      const response = await fetch('/report/templates');
      if (response.ok) {
        const templates = await response.json();
        
        for (const [id, template] of Object.entries(templates)) {
          this.templates.set(id, template);
        }
        
        this.updateTemplatesList();
        this.updateTemplateSelector();
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  updateTemplatesList() {
    const container = document.getElementById('templates-container');
    
    if (this.templates.size === 0) {
      container.innerHTML = '<p class="text-gray-400 text-center py-8">아직 업로드된 템플릿이 없습니다</p>';
      return;
    }

    container.innerHTML = '';
    
    for (const [id, template] of this.templates.entries()) {
      const templateCard = document.createElement('div');
      templateCard.className = 'template-card bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors';
      templateCard.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-medium text-white">${template.filename}</h4>
            <p class="text-sm text-gray-300 mt-1">${template.sections.length}개 섹션</p>
            <div class="mt-2">
              ${template.sections.slice(0, 3).map(section => 
                `<span class="inline-block bg-blue-600 text-xs px-2 py-1 rounded mr-1 mb-1">${section.title}</span>`
              ).join('')}
              ${template.sections.length > 3 ? '<span class="text-gray-400 text-xs">...</span>' : ''}
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs text-gray-400">${template.type.toUpperCase()}</span>
          </div>
        </div>
      `;
      container.appendChild(templateCard);
    }
  }

  updateTemplateSelector() {
    const container = document.getElementById('template-selector');
    
    if (this.templates.size === 0) {
      container.innerHTML = '<p class="text-gray-400">템플릿을 먼저 업로드해주세요</p>';
      return;
    }

    container.innerHTML = '';
    
    for (const [id, template] of this.templates.entries()) {
      const templateOption = document.createElement('div');
      templateOption.className = `template-option cursor-pointer p-3 rounded-lg border ${
        this.selectedTemplateId === id 
          ? 'border-blue-400 bg-blue-600/20' 
          : 'border-gray-600 hover:border-gray-500'
      }`;
      
      templateOption.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <h4 class="font-medium">${template.filename}</h4>
            <p class="text-sm text-gray-400">${template.sections.length}개 섹션</p>
          </div>
          <div class="text-xs text-gray-400">${template.type.toUpperCase()}</div>
        </div>
      `;
      
      templateOption.addEventListener('click', () => {
        this.selectedTemplateId = id;
        this.updateTemplateSelector();
      });
      
      container.appendChild(templateOption);
    }
  }

  async generateReport() {
    if (!this.selectedTemplateId) {
      alert('템플릿을 선택해주세요.');
      return;
    }

    const title = document.getElementById('report-title').value.trim();
    const prompt = document.getElementById('report-prompt').value.trim();

    if (!title || !prompt) {
      alert('보고서 제목과 내용 설명을 모두 입력해주세요.');
      return;
    }

    const generateButton = document.getElementById('generate-button');
    generateButton.disabled = true;
    generateButton.textContent = '생성 중...';

    try {
      // Connect to WebSocket if not already connected
      if (!this.isConnected) {
        await this.connectToReportAgent();
      }

      if (!this.driver) {
        throw new Error('WebSocket 연결 실패');
      }

      // Send generation request through WebSocket
      const response = await this.driver.conversate(`보고서를 생성해주세요.
템플릿 ID: ${this.selectedTemplateId}
제목: ${title}
내용: ${prompt}`);

      if (response) {
        // Show preview
        this.showReportPreview(response);
        
        // Save report
        const reportId = this.generateReportId();
        this.reports.set(reportId, {
          id: reportId,
          title: title,
          content: response,
          templateId: this.selectedTemplateId,
          createdAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Report generation error:', error);
      alert('보고서 생성 중 오류가 발생했습니다: ' + error.message);
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = '보고서 생성하기';
    }
  }

  async connectToReportAgent() {
    try {
      const connector = new TGrid.WebSocketConnector(null, {
        describe: (message) => this.handleMessage(message),
        text: (message) => this.handleMessage(message),
      });

      await connector.connect('/report');
      this.driver = connector.getDriver();
      this.isConnected = true;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      throw error;
    }
  }

  handleMessage(message) {
    console.log('Received message:', message);
    return message;
  }

  showReportPreview(content) {
    const preview = document.getElementById('report-preview');
    const contentDiv = document.getElementById('report-content');
    
    // Render markdown content
    contentDiv.innerHTML = marked.parse(content);
    
    // Highlight code blocks
    contentDiv.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
    
    preview.classList.remove('hidden');
    preview.scrollIntoView({ behavior: 'smooth' });
  }

  generateReportId() {
    return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async loadReports() {
    const container = document.getElementById('reports-container');
    
    if (this.reports.size === 0) {
      container.innerHTML = '<p class="text-gray-400 text-center py-8">생성된 보고서가 없습니다</p>';
      return;
    }

    container.innerHTML = '';
    
    for (const [id, report] of this.reports.entries()) {
      const reportCard = document.createElement('div');
      reportCard.className = 'bg-gray-700 rounded-lg p-4';
      reportCard.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-medium text-white">${report.title}</h4>
            <p class="text-sm text-gray-400 mt-1">생성일: ${new Date(report.createdAt).toLocaleString()}</p>
            <p class="text-sm text-gray-400">템플릿: ${this.templates.get(report.templateId)?.filename || '알 수 없음'}</p>
          </div>
          <div class="flex space-x-2">
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm" onclick="reportManager.viewReport('${id}')">
              보기
            </button>
            <button class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm" onclick="reportManager.downloadReport('${id}')">
              다운로드
            </button>
          </div>
        </div>
      `;
      container.appendChild(reportCard);
    }
  }

  viewReport(reportId) {
    const report = this.reports.get(reportId);
    if (report) {
      this.showReportPreview(report.content);
      this.switchTab('generate');
    }
  }

  downloadReport(reportId) {
    const report = this.reports.get(reportId);
    if (report) {
      const blob = new Blob([report.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

// Initialize the report manager
const reportManager = new ReportManager();

// Download button event listener
document.getElementById('download-button').addEventListener('click', () => {
  const content = document.getElementById('report-content').textContent;
  const title = document.getElementById('report-title').value || 'report';
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});