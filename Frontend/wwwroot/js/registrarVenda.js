console.log('Script js/venda.js DEFINIDO.');


// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de venda.js foi chamada.');
    initializeSaleForm();
    populatePaymentMethods();
    populateProductSelect();
    initializeHistoryFilters();
    fetchAndRenderHistory(1);
}

// =======================================================
// LÓGICA DO FORMULÁRIO PRINCIPAL
// =======================================================
function initializeSaleForm() {
    const saleForm = document.getElementById('saleForm');
    const discountInput = document.getElementById('discount');
    const itemsTbody = document.getElementById('saleItemsTbody');
    const addItemBtn = document.getElementById('add-sale-item-btn');

    saleForm.addEventListener('submit', handleSaleSubmit);
    if(discountInput) discountInput.addEventListener('input', updateTotals);
    if(addItemBtn) addItemBtn.addEventListener('click', addProductToCart);
    
    itemsTbody.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-delete-item')) {
            event.target.closest('tr').remove();
            updateTotals();
            checkPlaceholder();
        }
    });
}

function populatePaymentMethods() {
    const paymentSelect = document.getElementById('paymentMethod');
    if (!paymentSelect) return;
    for (const [key, value] of Object.entries(paymentMethodMap)) {
        paymentSelect.appendChild(new Option(value, key));
    }
}

function populateProductSelect() {
    const select = document.getElementById('product-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione um produto</option>';
    for (const [key, value] of Object.entries(productTypeMap)) {
        select.appendChild(new Option(value, key));
    }
}

function updateTotals() {
    const itemRows = document.querySelectorAll('#saleItemsTbody tr:not(#placeholder-row)');
    let subtotal = 0;
    itemRows.forEach(row => {
        const quantity = parseFloat(row.dataset.quantity) || 0;
        const price = parseFloat(row.dataset.price) || 0;
        subtotal += quantity * price;
    });
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const total = subtotal - discount;
    document.getElementById('subtotal').textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total').textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function handleSaleSubmit(event) {
    event.preventDefault();
    const itemsRows = document.querySelectorAll('#saleItemsTbody tr:not(#placeholder-row)');
    if (itemsRows.length === 0) {
        showErrorModal({ title: "Validação", detail: "Adicione pelo menos um produto para registrar a venda." });
        return;
    }
    const saleItems = [];
    for (const row of itemsRows) {
        saleItems.push({
            product: parseInt(row.dataset.productId, 10),
            quantity: parseFloat(row.dataset.quantity),
            unitPrice: parseFloat(row.dataset.price)
        });
    }
    const payload = {
        noteNumber: parseInt(document.getElementById('noteNumber').value) || 0,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        customerName: document.getElementById('customerName').value,
        customerAddress: document.getElementById('customerAddress').value,
        customerPhone: document.getElementById('customerPhone').value,
        paymentMethod: parseInt(document.getElementById('paymentMethod').value),
        discount: parseFloat(document.getElementById('discount').value) || 0,
        items: saleItems
    };
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            alert('Venda registrada com sucesso!');
            document.getElementById('saleForm').reset();
            document.getElementById('saleItemsTbody').innerHTML = '<tr id="placeholder-row"><td colspan="5">Nenhum produto adicionado.</td></tr>';
            updateTotals();
            fetchAndRenderHistory(1);
        } else {
            const errorData = await response.json();
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
}

// =======================================================
// LÓGICA DO CARRINHO DE ITENS
// =======================================================
function addProductToCart() {
    const productSelect = document.getElementById('product-select');
    const quantityInput = document.getElementById('sale-quantity');
    const priceInput = document.getElementById('sale-unit-price');
    
    const productId = productSelect.value;
    const productName = productSelect.options[productSelect.selectedIndex].text;
    const quantity = parseFloat(quantityInput.value);
    const unitPrice = parseFloat(priceInput.value);

    if (!productId) { alert('Selecione um produto.'); return; }
    if (isNaN(quantity) || quantity <= 0) { alert('Insira uma quantidade válida.'); return; }
    if (isNaN(unitPrice) || unitPrice < 0) { alert('Insira um preço válido.'); return; }

    const tbody = document.getElementById('saleItemsTbody');
    if (tbody.querySelector(`tr[data-product-id="${productId}"]`)) {
        alert('Este produto já foi adicionado.');
        return;
    }

    checkPlaceholder();
    const subtotal = (quantity * unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const newRow = document.createElement('tr');
    newRow.dataset.productId = productId;
    newRow.dataset.quantity = quantity;
    newRow.dataset.price = unitPrice;

    newRow.innerHTML = `
        <td>${productName}</td>
        <td>${quantity}</td>
        <td>${unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td>${subtotal}</td>
        <td><button type="button" class="btn-action btn-delete-item">Remover</button></td>
    `;
    tbody.appendChild(newRow);
    updateTotals();
}

function checkPlaceholder() {
    const tbody = document.getElementById('saleItemsTbody');
    const placeholder = document.getElementById('placeholder-row');
    if (placeholder) placeholder.remove();
    if (tbody.children.length === 0) {
        tbody.innerHTML = '<tr id="placeholder-row"><td colspan="5">Nenhum item adicionado.</td></tr>';
    }
}

// =======================================================
// LÓGICA DA TABELA DE HISTÓRICO DE VENDAS
// =======================================================
function initializeHistoryFilters() {
    const filterBtn = document.getElementById('historyFilterBtn');
    const clearBtn = document.getElementById('historyClearBtn');
    const statusSelect = document.getElementById('historyStatus');

    if(statusSelect) {
        statusSelect.innerHTML = '<option value="">Todos os Status</option>';
        for (const [key, value] of Object.entries(saleStatusMap)) {
            statusSelect.appendChild(new Option(value, key));
        }
    }

    if(filterBtn) filterBtn.onclick = () => fetchAndRenderHistory(1);
    if(clearBtn) clearBtn.onclick = () => {
        document.getElementById('historySearch').value = '';
        document.getElementById('historyStatus').value = '';
        document.getElementById('historyStartDate').value = '';
        document.getElementById('historyEndDate').value = '';
        fetchAndRenderHistory(1);
    };
}

async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    const tableBody = document.getElementById('sales-history-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Buscando vendas...</td></tr>';
    
    try {
        const accessToken = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ Page: page, PageSize: 10, OrderBy: 'Date', Ascending: false });

        const search = document.getElementById('historySearch')?.value;
        const status = document.getElementById('historyStatus')?.value;
        const startDate = document.getElementById('historyStartDate')?.value;
        const endDate = document.getElementById('historyEndDate')?.value;

        if(search) params.append('Search', search);
        if(status) params.append('Status', status);
        if(startDate) params.append('StartDate', startDate);
        if(endDate) params.append('EndDate', endDate);

        const url = `${API_BASE_URL}/sales/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar vendas (Status: ${response.status})`);
        
        const paginatedData = await response.json();
        renderHistoryTable(paginatedData.items);
        renderHistoryPagination(paginatedData);
    } catch (error) {
        showErrorModal({ title: "Erro ao Listar Vendas", detail: error.message });
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">${error.message}</td></tr>`;
    }
}

function renderHistoryTable(items) {
    const tableBody = document.getElementById('sales-history-body');
    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhuma venda encontrada.</td></tr>';
        return;
    }
    items.forEach(item => {
        const formattedDate = new Date(item.date).toLocaleDateString('pt-BR');
        const formattedTotal = (item.totalAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const statusText = saleStatusMap[item.status] || 'N/A';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.noteNumber}</td>
            <td>${item.customerName}</td>
            <td>${formattedDate}</td>
            <td>${formattedTotal}</td>
            <td>${statusText}</td>
            <td class="actions-cell">
                </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderHistoryPagination(paginationData) {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    
    const { page, totalPages } = paginationData;
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = page <= 1;
    prevButton.onclick = () => fetchAndRenderHistory(page - 1);
    
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    pageInfo.className = 'pagination-info';
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = page >= totalPages;
    nextButton.onclick = () => fetchAndRenderHistory(page + 1);
    
    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}