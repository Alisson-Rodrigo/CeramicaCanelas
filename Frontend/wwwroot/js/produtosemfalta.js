console.log('Script js/estoque.js DEFINIDO.');


// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de estoque.js foi chamada.');
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

        // Adiciona os parâmetros de paginação
        const params = new URLSearchParams({
            Page: currentPage,
            PageSize: 10
        });

        const search = document.getElementById('search')?.value;
        const categoryId = document.getElementById('categoryId')?.value;

        if (search) params.append('Search', search);
        if (categoryId) params.append('CategoryId', categoryId);

        const url = `${API_BASE_URL}/dashboard/reports/products/stock-outof?${params.toString()}`;
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

    // Calcula os totais a partir dos itens, como antes
    const totalProducts = data.totalItems || data.items.length;
    let outOfStock = 0;
    let lowStock = 0;

    (data.items || []).forEach(item => {
        if (item.stockCurrent <= 0) outOfStock++;
        else if (item.stockCurrent < item.stockMinimum) lowStock++;
    });

    const normalStock = totalProducts - outOfStock - lowStock;

    summaryContainer.innerHTML = `
        <div class="summary-item">
            <div class="summary-value">${totalProducts}</div>
            <div class="summary-label">Total de Produtos</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${outOfStock}</div>
            <div class="summary-label">Em Falta</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${lowStock}</div>
            <div class="summary-label">Estoque Baixo</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${normalStock}</div>
            <div class="summary-label">Estoque Normal</div>
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
        const statusInfo = getStatusInfo(item.stockCurrent, item.stockMinimum);
        const formattedDate = item.lastExit ? new Date(item.lastExit).toLocaleDateString('pt-BR') : 'N/A';
        
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.productName || 'N/A'}</td>
            <td>${item.category || 'N/A'}</td>
            <td>${item.stockCurrent}</td>
            <td>${item.stockMinimum}</td>
            <td>${formattedDate}</td>
            <td><span class="status-badge ${statusInfo.className}">${statusInfo.text}</span></td>
        `;
    });
}

function getStatusInfo(current, min) {
    if (current <= 0) {
        return { text: "Em Falta", className: "status-danger" };
    }
    if (current < min) {
        return { text: "Estoque Baixo", className: "status-warning" };
    }
    return { text: "Normal", className: "status-success" };
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