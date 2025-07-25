console.log('Script js/relatorio-retiradas.js DEFINIDO.');


// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de relatorio-retiradas.js foi chamada.');
    initializeSearch();
}

function initializeSearch() {
    document.getElementById('searchButton')?.addEventListener('click', () => searchRetiradas(1));
    document.getElementById('clearButton')?.addEventListener('click', clearFilters);
    searchRetiradas(1); // Carga inicial
}

function clearFilters() {
    document.getElementById('searchEmployee').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    searchRetiradas(1);
}

// =======================================================
// LÓGICA DE BUSCA E RENDERIZAÇÃO
// =======================================================
async function searchRetiradas(page = 1) {
    currentPage = page;
    const loadingDiv = document.getElementById('loading');
    const resultsSection = document.getElementById('resultsSection');
    
    if(loadingDiv) loadingDiv.style.display = 'flex';
    if(resultsSection) resultsSection.style.display = 'none';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const pageSize = 10;
        const employeeName = document.getElementById('searchEmployee')?.value;
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;

        const params = new URLSearchParams({ Page: currentPage, PageSize: pageSize });
        if (employeeName) params.append('EmployeeName', employeeName);
        if (startDate) params.append('StartDate', new Date(startDate).toISOString());
        if (endDate) params.append('EndDate', new Date(endDate).toISOString());

        const url = `${API_BASE_URL}/dashboard/reports/employees?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);

        const data = await response.json();
        
        updateSummary(data);
        renderResultsTable(data.items);
        renderPagination(data);
        
        if(resultsSection) resultsSection.style.display = 'block';

    } catch (error) {
        if(typeof showErrorModal === 'function') {
        } else {
        }
    } finally {
        if(loadingDiv) loadingDiv.style.display = 'none';
    }
}

function updateSummary(data) {
    const summaryContainer = document.getElementById('resultsSummary');
    if (!summaryContainer) return;
    
    const items = data.items || [];
    const totalRetiradas = items.reduce((sum, item) => sum + item.quantityRetirada, 0);
    const quantidadeDevolvida = items.reduce((sum, item) => sum + item.quantityDevolvida, 0);
    const quantidadePendente = items.reduce((sum, item) => sum + item.quantityPendente, 0);

    summaryContainer.innerHTML = `
        <div class="summary-item">
            <div class="summary-value">${data.totalItems || 0}</div>
            <div class="summary-label">Total de Registros</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totalRetiradas}</div>
            <div class="summary-label">Qtd. Retirada (pág.)</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${quantidadeDevolvida}</div>
            <div class="summary-label">Qtd. Devolvida (pág.)</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${quantidadePendente}</div>
            <div class="summary-label">Qtd. Pendente (pág.)</div>
        </div>
    `;
}

function renderResultsTable(items) {
    const tableBody = document.getElementById('resultsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (!items || items.length === 0) return;

    items.forEach(item => {
        const formattedDate = new Date(item.dataRetirada).toLocaleString('pt-BR');
        
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.employeeName || 'N/A'}</td>
            <td>${item.productName || 'N/A'}</td>
            <td>${item.quantityRetirada}</td>
            <td>${item.quantityDevolvida}</td>
            <td>${item.quantityPendente}</td>
            <td>${formattedDate}</td>
        `;
    });
}

function renderPagination(paginationData) {
     const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    
    if (!paginationData || !paginationData.totalPages || paginationData.totalPages <= 1) return;
    
    const page = paginationData.page;
    const totalPages = paginationData.totalPages;
    
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = page <= 1;
    prevButton.onclick = () => searchRetiradas(page - 1);
    
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.className = 'pagination-info';
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.onclick = () => searchRetiradas(page + 1);
    
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}