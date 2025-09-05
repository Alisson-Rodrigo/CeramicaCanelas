console.log('Script js/dashboard-vendas.js DEFINIDO.');

// =======================================================
// VARIÁVEIS GLOBAIS
// =======================================================

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
        console.log('📊 Dados recebidos do dashboard:', data);
        
        updateKpiCards(data);
        renderSalesRevenueChart(data.salesByMonth, data.revenueByMonth);
        renderTopProductsChart(data.topProducts);
        renderPaymentMethodsChart(data.paymentMethodStats);
        renderTopCitiesChart(data.topCities);

    } catch (error) {
       
    } finally {
        if(loadingDiv) loadingDiv.style.display = 'none';
    }
}

function updateKpiCards(data) {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatNumber = (value) => (value || 0).toLocaleString('pt-BR');
    const formatPercentage = (value) => `${(value || 0).toFixed(2)}%`;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('revenue-this-month', formatCurrency(data.revenueThisMonth));
    setText('sales-this-month', formatNumber(data.salesThisMonth));
    setText('revenue-last-30d', formatCurrency(data.revenueLast30Days));
    setText('sales-last-30d', formatNumber(data.salesLast30Days));
    setText('confirmed-sales', formatNumber(data.confirmedSales));
    setText('pending-sales', formatNumber(data.pendingSales));
    setText('cancelled-sales', formatNumber(data.cancelledSales));
    setText('average-ticket', formatCurrency(data.averageTicket));
    setText('revenue-this-year', formatCurrency(data.revenueThisYear));
    setText('sales-this-year', formatNumber(data.salesThisYear));
    setText('unique-customers', formatNumber(data.uniqueCustomers));
    setText('monthly-growth', formatPercentage(data.monthlyGrowthPercentage));
}

function renderSalesRevenueChart(salesData, revenueData) {
    const ctx = document.getElementById('salesRevenueChart');
    if (!ctx) return;

    // Destruir gráfico existente se existir
    if (salesRevenueChart && typeof salesRevenueChart.destroy === 'function') {
        salesRevenueChart.destroy();
    }

    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Garantir que os dados existem e têm o tamanho correto
    const safeSalesData = Array.isArray(salesData) ? salesData : Array(12).fill(0);
    const safeRevenueData = Array.isArray(revenueData) ? revenueData : Array(12).fill(0);
    
    salesRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receita (R$)',
                    data: safeRevenueData,
                    type: 'line',
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.3,
                    yAxisID: 'yRevenue',
                },
                {
                    label: 'Nº de Vendas',
                    data: safeSalesData,
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
                yRevenue: { 
                    type: 'linear', 
                    display: true, 
                    position: 'left', 
                    title: { display: true, text: 'Receita (R$)' },
                    beginAtZero: true
                },
                ySales: { 
                    type: 'linear', 
                    display: true, 
                    position: 'right', 
                    grid: { drawOnChartArea: false }, 
                    title: { display: true, text: 'Nº de Vendas' },
                    beginAtZero: true
                }
            }
        }
    });
}

function renderTopProductsChart(topProducts) {
    const canvas = document.getElementById('topProductsChart');
    const emptyMessage = document.getElementById('topProductsEmpty');
    
    console.log('🛍️ Renderizando gráfico de produtos:', topProducts);
    
    if (!canvas) {
        console.warn('⚠️ Canvas topProductsChart não encontrado');
        return;
    }

    // Destruir gráfico existente se existir
    if (topProductsChart && typeof topProductsChart.destroy === 'function') {
        topProductsChart.destroy();
        topProductsChart = null;
    }

    // Verificar se há dados válidos
    if (!topProducts || !Array.isArray(topProducts) || topProducts.length === 0) {
        console.log('📊 Nenhum produto encontrado, ocultando gráfico');
        canvas.style.display = 'none';
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
            emptyMessage.textContent = 'Nenhum produto vendido ainda';
        } else {
            // Se não existe elemento de mensagem vazia, ocultar apenas o canvas
            const container = canvas.parentElement;
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6c757d;">Nenhum produto vendido ainda</div>';
            }
        }
        return;
    }
    
    // Mostrar canvas e ocultar mensagem vazia
    canvas.style.display = 'block';
    if (emptyMessage) emptyMessage.style.display = 'none';

    const labels = topProducts.map(p => p.productDescription || p.productName || 'Produto Sem Nome');
    const data = topProducts.map(p => p.salesCount || p.count || 0);

    console.log('📊 Criando gráfico de produtos com dados:', { labels, data });

    topProductsChart = new Chart(canvas, {
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
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Vendidos: ${context.parsed.x}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderPaymentMethodsChart(paymentStats) {
    const canvas = document.getElementById('paymentMethodsChart');
    const emptyMessage = document.getElementById('paymentMethodsEmpty');
    if (!canvas) return;

    // Destruir gráfico existente se existir
    if (paymentMethodsChart && typeof paymentMethodsChart.destroy === 'function') {
        paymentMethodsChart.destroy();
        paymentMethodsChart = null;
    }

    if (!paymentStats || !Array.isArray(paymentStats) || paymentStats.length === 0) {
        canvas.style.display = 'none';
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
            emptyMessage.textContent = 'Nenhuma venda com método de pagamento registrado';
        }
        return;
    }

    canvas.style.display = 'block';
    if (emptyMessage) emptyMessage.style.display = 'none';

    const labels = paymentStats.map(p => paymentMethodMap[p.paymentMethod] || paymentMethodMap[p.method] || p.paymentMethod || p.method || 'Outro');
    const data = paymentStats.map(p => p.count || p.salesCount || p.total || 0);

    paymentMethodsChart = new Chart(canvas, {
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
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderTopCitiesChart(topCities) {
    const canvas = document.getElementById('topCitiesChart');
    const emptyMessage = document.getElementById('topCitiesEmpty');
    
    console.log('🏙️ Renderizando gráfico de cidades:', topCities);
    
    if (!canvas) {
        console.warn('⚠️ Canvas topCitiesChart não encontrado');
        return;
    }

    // Destruir gráfico existente se existir
    if (topCitiesChart && typeof topCitiesChart.destroy === 'function') {
        topCitiesChart.destroy();
        topCitiesChart = null;
    }

    // Verificar se há dados válidos
    if (!topCities || !Array.isArray(topCities) || topCities.length === 0) {
        console.log('📊 Nenhuma cidade encontrada, ocultando gráfico');
        canvas.style.display = 'none';
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
            emptyMessage.textContent = 'Nenhuma cidade com vendas registradas';
        } else {
            // Se não existe elemento de mensagem vazia, ocultar apenas o canvas
            const container = canvas.parentElement;
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6c757d;">Nenhuma cidade com vendas registradas</div>';
            }
        }
        return;
    }

    // Mostrar canvas e ocultar mensagem vazia
    canvas.style.display = 'block';
    if (emptyMessage) emptyMessage.style.display = 'none';

    const labels = topCities.map(c => c.city || c.cityName || c.name || 'Cidade Não Informada');
    const data = topCities.map(c => c.count || c.salesCount || c.total || 0);

    console.log('📊 Criando gráfico de cidades com dados:', { labels, data });

    topCitiesChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas por Cidade',
                data: data,
                backgroundColor: '#0ea5e9',
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Vendas: ${context.parsed.x}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

// =======================================================
// FUNÇÃO DE LIMPEZA (OPCIONAL)
// =======================================================
function destroyAllCharts() {
    if (salesRevenueChart && typeof salesRevenueChart.destroy === 'function') {
        salesRevenueChart.destroy();
        salesRevenueChart = null;
    }
    if (topProductsChart && typeof topProductsChart.destroy === 'function') {
        topProductsChart.destroy();
        topProductsChart = null;
    }
    if (paymentMethodsChart && typeof paymentMethodsChart.destroy === 'function') {
        paymentMethodsChart.destroy();
        paymentMethodsChart = null;
    }
    if (topCitiesChart && typeof topCitiesChart.destroy === 'function') {
        topCitiesChart.destroy();
        topCitiesChart = null;
    }
}