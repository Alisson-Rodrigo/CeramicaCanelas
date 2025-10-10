console.log('Script js/relatorio-extrato.js DEFINIDO.');

// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de relatorio-extrato.js foi chamada.');
    initializeReportPage();
    fetchReportData();
}

function initializeReportPage() {
    document.getElementById('generateReportBtn')?.addEventListener('click', fetchReportData);
    // ADICIONADO: Listener para o novo botão de limpar filtros
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearReportFilters);
}

// =======================================================
// LÓGICA DO RELATÓRIO
// =======================================================

// FUNÇÃO ADICIONADA: Limpa os inputs de data e busca os dados novamente
function clearReportFilters() {
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    fetchReportData();
}

async function fetchReportData() {
    const loadingDiv = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    
    if (loadingDiv) loadingDiv.style.display = 'flex';
    if (resultsSection) resultsSection.style.display = 'none';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const params = new URLSearchParams();
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;

        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);

        const url = `${API_BASE_URL}/extracts/report?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        
        if (!response.ok) {
            throw new Error(`Falha ao buscar relatório (Status: ${response.status})`);
        }
        
        const data = await response.json();
        
        updateReportUI(data);
        
        if (resultsSection) resultsSection.style.display = 'block';

    } catch (error) {
        if(typeof showErrorModal === 'function') {
            
        } else {
            alert(`Erro: ${error.message}`);
        }
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

function updateReportUI(data) {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';
    
    // ATUALIZAÇÃO: Lógica melhorada para exibir o período
    let periodText = 'Todos os Lançamentos';
    const formattedStart = formatDate(data.startDate);
    const formattedEnd = formatDate(data.endDate);

    if (formattedStart && formattedEnd) {
        periodText = `de ${formattedStart} a ${formattedEnd}`;
    } else if (formattedStart) {
        periodText = `A partir de ${formattedStart}`;
    } else if (formattedEnd) {
        periodText = `Até ${formattedEnd}`;
    }
    
    document.getElementById('report-period').textContent = periodText;
    document.getElementById('total-general').textContent = formatCurrency(data.totalGeneral);

    const tableBody = document.getElementById('totals-by-account-body');
    tableBody.innerHTML = '';
    if (data.totalsByAccount && Object.keys(data.totalsByAccount).length > 0) {
        for (const [account, total] of Object.entries(data.totalsByAccount)) {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${account}</td>
                <td>${formatCurrency(total)}</td>
            `;
        }
    } else {
        tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Nenhum dado encontrado para o período selecionado.</td></tr>';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicForm);
} else {
    initDynamicForm();
}