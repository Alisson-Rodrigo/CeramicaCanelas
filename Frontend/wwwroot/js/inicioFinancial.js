console.log('Script js/dashboard-financeiro.js DEFINIDO.');

// =======================================================
// VARIÁVEL DE ESTADO PARA O GRÁFICO
// =======================================================
// Guarda a instância do Chart.js para que possa ser destruída antes de recriar.
let financialChartInstance = null;

// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de dashboard-financeiro.js foi chamada.');
    fetchFinancialDashboardData();
}

// =======================================================
// LÓGICA DA DASHBOARD
// =======================================================

async function fetchFinancialDashboardData() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const url = `${API_BASE_URL}/financial/dashboard-financial/summary`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Falha ao buscar dados (Status: ${response.status})`);

        const data = await response.json();
        
        updateFinancialCards(data);
        renderFinancialChart(data.monthlyChart);

    } catch (error) {
        console.error("❌ Erro ao carregar dados da dashboard:", error);
        // O resto do seu tratamento de erro aqui...
    }
}

function updateFinancialCards(data) {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    document.getElementById('current-balance').textContent = formatCurrency(data.currentBalance);
    document.getElementById('income-30-days').textContent = formatCurrency(data.totalIncome30Days);
    document.getElementById('expense-30-days').textContent = formatCurrency(data.totalExpense30Days);
    document.getElementById('pending-receivables').textContent = formatCurrency(data.pendingReceivables);
    document.getElementById('pending-payments').textContent = formatCurrency(data.pendingPayments);
    document.getElementById('customers-with-launches').textContent = data.customersWithLaunches;

    const saldoElement = document.getElementById('current-balance');
    saldoElement.classList.remove('income-color', 'expense-color');
    if (data.currentBalance > 0) {
        saldoElement.classList.add('income-color');
    } else if (data.currentBalance < 0) {
        saldoElement.classList.add('expense-color');
    }
}

/**
 * Renderiza o gráfico de movimentação financeira.
 * VERSÃO FINAL: Destrói a instância anterior do gráfico antes de criar uma nova.
 */
function renderFinancialChart(monthlyData) {
    const ctx = document.getElementById('financialChart');
    if (!ctx || !monthlyData) return;

    // --- PONTO CHAVE: DESTRUIR O GRÁFICO ANTIGO ---
    if (financialChartInstance) {
        financialChartInstance.destroy();
    }
    // ---------------------------------------------

    const labels = monthlyData.map(d => 
        new Date(d.month + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    );

    const incomeData = monthlyData.map(d => d.totalIncome);
    const expenseData = monthlyData.map(d => d.totalExpense);

    // Armazena a nova instância na variável global
    financialChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Entradas',
                    data: incomeData,
                    backgroundColor: 'rgba(25, 135, 84, 0.7)',
                    borderColor: 'rgba(25, 135, 84, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                },
                {
                    label: 'Saídas',
                    data: expenseData,
                    backgroundColor: 'rgba(220, 53, 69, 0.7)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000) return 'R$ ' + (value / 1000) + 'k';
                            return 'R$ ' + value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}