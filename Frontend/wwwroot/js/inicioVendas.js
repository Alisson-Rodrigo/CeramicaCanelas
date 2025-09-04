
console.log('Script js/dashboard-vendas.js DEFINIDO.');

// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de dashboard-vendas.js foi chamada.');
    fetchDashboardData();
}

// =======================================================
// LÓGICA DO DASHBOARD
// =======================================================
async function fetchDashboardData() {
    const loadingDiv = document.getElementById('loading');
    if(loadingDiv) loadingDiv.style.display = 'flex';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const url = `${API_BASE_URL}/sales/dashboard`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);

        const data = await response.json();
        
        updateKpiCards(data);
        renderSalesRevenueChart(data.salesByMonth, data.revenueByMonth);
        renderTopProductsChart(data.topProducts);
        renderPaymentMethodsChart(data.paymentMethodStats);

    } catch (error) {
        console.error("❌ Erro ao carregar dados do dashboard:", error);
        if (typeof showErrorModal === 'function') {
            showErrorModal({ title: "Erro no Dashboard", detail: error.message });
        }
    } finally {
        if(loadingDiv) loadingDiv.style.display = 'none';
    }
}

function updateKpiCards(data) {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatNumber = (value) => (value || 0).toLocaleString('pt-BR');
    const formatPercentage = (value) => `${(value || 0).toFixed(2)}%`;

    document.getElementById('revenue-this-month').textContent = formatCurrency(data.revenueThisMonth);
    document.getElementById('sales-this-month').textContent = formatNumber(data.salesThisMonth);
    document.getElementById('average-ticket').textContent = formatCurrency(data.averageTicket);
    document.getElementById('pending-sales').textContent = formatNumber(data.pendingSales);
    document.getElementById('monthly-growth').textContent = formatPercentage(data.monthlyGrowthPercentage);
    document.getElementById('unique-customers').textContent = formatNumber(data.uniqueCustomers);
}

function renderSalesRevenueChart(salesData, revenueData) {
    const ctx = document.getElementById('salesRevenueChart');
    if (!ctx) return;

    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receita (R$)',
                    data: revenueData,
                    type: 'line',
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.3,
                    yAxisID: 'yRevenue',
                },
                {
                    label: 'Nº de Vendas',
                    data: salesData,
                    backgroundColor: '#ffc107',
                    borderColor: '#ffc107',
                    yAxisID: 'ySales',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yRevenue: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Receita (R$)' } },
                ySales: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Nº de Vendas' } }
            }
        }
    });
}

function renderTopProductsChart(topProducts) {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx || !topProducts || topProducts.length === 0) return;

    const labels = topProducts.map(p => p.productName);
    const data = topProducts.map(p => p.count);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade Vendida',
                data: data,
                backgroundColor: ['#0d6efd', '#6c757d', '#198754', '#dc3545', '#ffc107'],
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderPaymentMethodsChart(paymentStats) {
    const ctx = document.getElementById('paymentMethodsChart');
    if (!ctx || !paymentStats || paymentStats.length === 0) return;

    const labels = paymentStats.map(p => paymentMethodMap[p.paymentMethod] || 'Outro');
    const data = paymentStats.map(p => p.count);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas',
                data: data,
                backgroundColor: ['#fd7e14', '#20c997', '#6f42c1', '#d63384', '#0dcaf0'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}