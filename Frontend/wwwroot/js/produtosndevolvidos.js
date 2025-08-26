console.log('Script js/retiradas.js DEFINIDO.');



// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de retiradas.js foi chamada.');
    initializeSearch();
}

function initializeSearch() {
    document.getElementById('searchButton')?.addEventListener('click', () => performSearch(1));
    document.getElementById('clearButton')?.addEventListener('click', clearFilters);
    
    if (typeof loadProductCategories === 'function') {
        loadProductCategories(document.getElementById('categoryId'), 'Todas as Categorias')
            .then(() => {
                performSearch(1);
            });
    } else {
        console.warn("Função 'loadProductCategories' não encontrada.");
        performSearch(1);
    }
}

function clearFilters() {
    document.getElementById('search').value = '';
    document.getElementById('categoryId').value = '';
    document.getElementById('employeeName').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    performSearch(1);
}

// =======================================================
// LÓGICA DE BUSCA E RENDERIZAÇÃO
// =======================================================
async function performSearch(page = 1) {
    currentPage = page;
    const loadingDiv = document.getElementById('loading');
    const resultsSection = document.getElementById('resultsSection');
    
    if(loadingDiv) loadingDiv.style.display = 'flex';
    if(resultsSection) resultsSection.style.display = 'none';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams({ Page: currentPage, PageSize: 10 });
        const search = document.getElementById('search')?.value;
        const categoryId = document.getElementById('categoryId')?.value;
        const employeeName = document.getElementById('employeeName')?.value;
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;

        if (search) params.append('Search', search);
        if (categoryId) params.append('CategoryId', categoryId);
        if (employeeName) params.append('EmployeeName', employeeName);
        if (startDate) params.append('StartDate', new Date(startDate).toISOString());
        if (endDate) params.append('EndDate', new Date(endDate).toISOString());

        // A rota agora é a de produtos não devolvidos, que é paginada
        const url = `${API_BASE_URL}/dashboard/reports/products/unreturned-products?${params.toString()}`;
        console.log("📡 Buscando dados em:", url);

        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);

        const data = await response.json();
        
        // Verifica se o formato da resposta está correto
        if (!data.items || !data.hasOwnProperty('totalPages')) {
             throw new Error("A resposta da API não tem o formato paginado esperado (ex: { items: [], totalPages: 0 }).");
        }

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

    // Calcula os totais a partir dos itens, caso a API não os envie separados
    const totalRecords = data.totalItems || 0;
    const totalRetirada = data.items ? data.items.reduce((sum, item) => sum + item.quantityRetirada, 0) : 0;
    const totalDevolvida = data.items ? data.items.reduce((sum, item) => sum + item.quantityDevolvida, 0) : 0;
    const totalPendente = data.items ? data.items.reduce((sum, item) => sum + item.quantityPendente, 0) : 0;
    
    summaryContainer.innerHTML = `
        <div class="summary-item">
            <div class="summary-value">${totalRecords}</div>
            <div class="summary-label">Total de Registros</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totalRetirada}</div>
            <div class="summary-label">Total Retirado</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totalDevolvida}</div>
            <div class="summary-label">Total Devolvido</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totalPendente}</div>
            <div class="summary-label">Total Pendente</div>
        </div>
    `;
}

function renderResultsTable(items) {
    const tableBody = document.getElementById('tableBody');
    const noResultsDiv = document.getElementById('noResults');
    if(!tableBody || !noResultsDiv) return;

    tableBody.innerHTML = '';

    if (!items || items.length === 0) {
        noResultsDiv.style.display = 'block';
        if(tableBody.parentElement.parentElement) tableBody.parentElement.parentElement.style.display = 'none';
        return;
    }
    
    noResultsDiv.style.display = 'none';
    if(tableBody.parentElement.parentElement) tableBody.parentElement.parentElement.style.display = 'block';

    items.forEach(item => {
        const statusClass = item.quantityPendente > 0 ? 'status-pending' : 'status-returned';
        const statusText = item.quantityPendente > 0 ? 'Pendente' : 'Finalizado';
        const formattedDate = new Date(item.dataRetirada).toLocaleDateString('pt-BR');
        
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.productName || 'N/A'}</td>
            <td>${item.employeeName || 'N/A'}</td>
            <td>${item.quantityRetirada}</td>
            <td>${item.quantityDevolvida}</td>
            <td>${item.quantityPendente}</td>
            <td>${formattedDate}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
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
    prevButton.onclick = () => performSearch(page - 1);
    
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.className = 'pagination-info';
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.onclick = () => performSearch(page + 1);
    
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}