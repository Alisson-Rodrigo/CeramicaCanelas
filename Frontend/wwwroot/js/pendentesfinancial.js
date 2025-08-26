console.log('Script js/pendentes.js DEFINIDO.');


// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de pendentes.js foi chamada.');
    initializeFilters();
    fetchReportData(1);
}

function initializeFilters() {
    document.getElementById('searchButton')?.addEventListener('click', () => fetchReportData(1));
    document.getElementById('clearButton')?.addEventListener('click', clearFilters);
    
    // Popula o select de filtro de tipo
    const typeSelect = document.getElementById('type-filter');
    if (typeSelect && typeof launchTypeMap !== 'undefined') {
        typeSelect.innerHTML = '<option value="">Todos os Tipos</option>';
        for (const [key, value] of Object.entries(launchTypeMap)) {
            typeSelect.appendChild(new Option(value, key));
        }
    }
}

function clearFilters() {
    document.getElementById('type-filter').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    fetchReportData(1);
}

// =======================================================
// LÓGICA DE BUSCA E RENDERIZAÇÃO
// =======================================================
async function fetchReportData(page = 1) {
    currentPage = page;
    const loadingDiv = document.getElementById('loading');
    const resultsSection = document.getElementById('resultsSection');
    
    if(loadingDiv) loadingDiv.style.display = 'flex';
    if(resultsSection) resultsSection.style.display = 'none';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams({ Page: currentPage, PageSize: 10 });
        
        const type = document.getElementById('type-filter')?.value;
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        
        if (type) params.append('Type', type);

        // --- CORREÇÃO DE DATA APLICADA AQUI ---
        // Enviamos a data como string 'YYYY-MM-DD' para evitar problemas de fuso horário.
        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);
        // ------------------------------------

        const url = `${API_BASE_URL}/financial/dashboard-financial/summary/pending?${params.toString()}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);

        const data = await response.json();
        
        renderReportTable(data.items);
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

function renderReportTable(items) {
    const tableBody = document.getElementById('report-table-body');
    const noResultsDiv = document.getElementById('noResults');
    if(!tableBody || !noResultsDiv) return;

    tableBody.innerHTML = '';

    if (!items || items.length === 0) {
        noResultsDiv.style.display = 'block';
        return;
    }
    
    noResultsDiv.style.display = 'none';

    items.forEach(item => {
        // CORREÇÃO DE DATA: Trata a data recebida como UTC para exibir o dia correto.
        const date = new Date(item.launchDate);
        const formattedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');

        const formattedAmount = (item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const typeText = (typeof launchTypeMap !== 'undefined' && launchTypeMap[item.type]) ? launchTypeMap[item.type] : 'N/A';
        const amountClass = item.type === 1 ? 'income' : 'expense';
        const relatedEntity = item.type === 1 ? (item.customerName || 'N/A') : (item.categoryName || 'N/A');

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.description || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>${typeText}</td>
            <td>${relatedEntity}</td>
            <td class="${amountClass}">${formattedAmount}</td>
            <td class="actions-cell">
                <button class="btn-action btn-success" onclick="markAsPaid('${item.id}')">Marcar como Pago</button>
            </td>
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
    prevButton.onclick = () => fetchReportData(page - 1);
    
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.className = 'pagination-info';
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.onclick = () => fetchReportData(page + 1);
    
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}

window.markAsPaid = async (launchId) => {
    if (!confirm('Tem certeza que deseja marcar este lançamento como pago?')) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const url = `${API_BASE_URL}/financial/launch/${launchId}/mark-paid`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            alert('Lançamento atualizado para "Pago" com sucesso!');
            fetchReportData(currentPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro" }));
            showErrorModal({ title: "Falha ao Atualizar", detail: errorData.message || "Não foi possível marcar como pago."});
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};