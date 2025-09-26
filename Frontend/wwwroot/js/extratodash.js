console.log('Script js/relatorio-extrato.js DEFINIDO.');

// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de relatorio-extrato.js foi chamada.');
    initializeReportPage();
    fetchReportData(); // <<-- CARREGA O RELATÓRIO AUTOMATICAMENTE
}

function initializeReportPage() {
    document.getElementById('generateReportBtn')?.addEventListener('click', fetchReportData);
}

// =======================================================
// LÓGICA DO RELATÓRIO
// =======================================================
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
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);
        
        const data = await response.json();
        
        updateReportUI(data);
        
        if (resultsSection) resultsSection.style.display = 'block';

    } catch (error) {
        if(typeof showErrorModal === 'function') {
            showErrorModal({ title: "Erro ao Gerar Relatório", detail: error.message });
        } else {
            alert(`Erro: ${error.message}`);
        }
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

function updateReportUI(data) {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // CORREÇÃO: Usa timeZone: 'UTC' para evitar bugs de fuso horário
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--';
    
    // Atualiza os cards
    const period = `${formatDate(data.startDate)} a ${formatDate(data.endDate)}`;
    document.getElementById('report-period').textContent = (data.startDate && data.endDate) ? period : 'Período Completo';
    document.getElementById('total-general').textContent = formatCurrency(data.totalGeneral);

    // Atualiza a tabela de totais
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
        tableBody.innerHTML = '<tr><td colspan="2">Nenhum dado encontrado.</td></tr>';
    }
    
    // Renderiza o gráfico
    renderPaymentMethodsChart(data.totalsByAccount);
}

function renderPaymentMethodsChart(totalsByAccount) {
    const ctx = document.getElementById('paymentMethodsChart');
    if (!ctx) return;
    
    // Destruir gráfico anterior se existir, para evitar bugs
    if (ctx.chart) {
        ctx.chart.destroy();
    }

    if (!totalsByAccount || Object.keys(totalsByAccount).length === 0) {
        return;
    }

    const labels = Object.keys(totalsByAccount);
    const data = Object.values(totalsByAccount);
    
    ctx.chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total (R$)',
                data: data,
                backgroundColor: ['#0d6efd', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}
