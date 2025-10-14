console.log('Script js/venda.js DEFINIDO.');

// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de venda.js foi chamada.');
    initializeSaleForm();
    populateSelects();
    populateProductSelect();
    initializeHistoryFilters();
    fetchAndRenderHistory(1);
}

// =======================================================
// LÓGICA DO FORMULÁRIO PRINCIPAL
// =======================================================
function initializeSaleForm() {
    const saleForm = document.getElementById('saleForm');
    const amountPaidInput = document.getElementById('amountPaid');
    const discountInput = document.getElementById('saleDiscount');
    const itemsTbody = document.getElementById('saleItemsTbody');
    const addItemBtn = document.getElementById('add-sale-item-btn');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('saleDate').value = today;
    document.getElementById('paymentDate').value = "";

    saleForm.addEventListener('submit', handleSaleSubmit);
    if (amountPaidInput) amountPaidInput.addEventListener('input', updateTotals);
    if (discountInput) discountInput.addEventListener('input', updateTotals);
    if (addItemBtn) addItemBtn.addEventListener('click', addProductToCart);

    itemsTbody.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-delete-item')) {
            event.target.closest('tr').remove();
            updateTotals();
            checkPlaceholder();
        }
    });
}

function populateSelects() {
    const paymentSelect = document.getElementById('paymentMethod');
    const statusSelect = document.getElementById('saleStatus');
    if (paymentSelect && typeof paymentMethodMap !== 'undefined') {
        paymentSelect.innerHTML = '';
        for (const [key, value] of Object.entries(paymentMethodMap)) {
            paymentSelect.appendChild(new Option(value, key));
        }
    }
    if (statusSelect && typeof saleStatusMap !== 'undefined') {
        statusSelect.innerHTML = '';
        for (const [key, value] of Object.entries(saleStatusMap)) {
            statusSelect.appendChild(new Option(value, key));
        }
    }
}

function populateProductSelect() {
    const select = document.getElementById('product-select');
    if (!select || typeof productTypeMap === 'undefined') return;
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

    const discount = parseFloat(document.getElementById('saleDiscount').value) || 0;
    const total = subtotal - discount;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    const balance = total - amountPaid;

    document.getElementById('subtotal').textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total').textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('balance').textContent = balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function handleSaleSubmit(event) {
    event.preventDefault();
    const submitBtn = event.submitter || document.querySelector('#saleForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Enviando...";
        
        try {
            const itemsRows = document.querySelectorAll('#saleItemsTbody tr:not(#placeholder-row)');
            if (itemsRows.length === 0) {
                alert("A venda deve possuir ao menos um item.");
                return;
            }

            const items = Array.from(itemsRows).map(row => ({
                product: parseInt(row.dataset.productId, 10),
                quantity: parseFloat(row.dataset.quantity),
                unitPrice: parseFloat(row.dataset.price),
                break: parseFloat(row.dataset.break)
            }));

            const payments = [];
            const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
            const paymentDate = document.getElementById('paymentDate').value;
            if (amountPaid > 0) {
                if (!paymentDate) {
                    alert("A data do pagamento é obrigatória se houver valor pago.");
                    return;
                }
                payments.push({
                    paymentDate: paymentDate,
                    amount: amountPaid,
                    paymentMethod: parseInt(document.getElementById('paymentMethod').value, 10)
                });
            }

            const selectedStatus = parseInt(document.getElementById('saleStatus').value, 10);
            
            const salePayload = {
                noteNumber: parseInt(document.getElementById('noteNumber').value, 10),
                customerName: document.getElementById('customerName').value,
                customerAddress: document.getElementById('customerAddress').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                customerPhone: document.getElementById('customerPhone').value,
                date: document.getElementById('saleDate').value,
                discount: parseFloat(document.getElementById('saleDiscount').value) || 0,
                saleStatus: selectedStatus,
                items,
                payments
            };

            console.log("📤 Enviando payload JSON para Criação:", salePayload);
            const accessToken = localStorage.getItem('accessToken');
            const response = await fetch(`${API_BASE_URL}/sales`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(salePayload)
            });

            if (response.ok) {
                alert('Venda registrada com sucesso!');
                document.getElementById('saleForm').reset();
                initializeSaleForm();
                populateSelects();
                document.getElementById('saleItemsTbody').innerHTML = '';
                checkPlaceholder();
                updateTotals();
                fetchAndRenderHistory(1);
            } else {
                const errorText = await response.text();
                alert(`Erro ao salvar: ${errorText}`);
            }
        } catch (error) {
            alert(`Erro de conexão: ${error.message}`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Finalizar Venda";
            }
        }
    }
}

function addProductToCart() {
    const productSelect = document.getElementById('product-select');
    const quantityInput = document.getElementById('sale-quantity');
    const priceInput = document.getElementById('sale-unit-price');
    const breakInput = document.getElementById('sale-break'); 

    const productId = productSelect.value;
    const productName = productSelect.options[productSelect.selectedIndex].text;
    const quantity = parseFloat(quantityInput.value);
    const unitPrice = parseFloat(priceInput.value);
    const breakAmount = parseFloat(breakInput.value);

    if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0 || isNaN(breakAmount) || breakAmount < 0) {
        alert('Por favor, preencha todos os campos do item com valores válidos.');
        return;
    }

    const tbody = document.getElementById('saleItemsTbody');
    if (tbody.querySelector(`tr[data-product-id="${productId}"]`)) {
        alert('Este produto já foi adicionado.');
        return;
    }

    checkPlaceholder();

    const subtotal = (quantity * unitPrice);
    const newRow = document.createElement('tr');
    newRow.dataset.productId = productId;
    newRow.dataset.quantity = quantity;
    newRow.dataset.price = unitPrice;
    newRow.dataset.break = breakAmount;

    newRow.innerHTML = `
        <td>${productName}</td>
        <td>${quantity.toFixed(2)}</td>
        <td>${unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td>${breakAmount.toFixed(2)}</td>
        <td>${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td><button type="button" class="btn-action btn-delete-item">Remover</button></td>
    `;

    tbody.appendChild(newRow);
    updateTotals();

    productSelect.value = '';
    quantityInput.value = '1.00';
    priceInput.value = '0.00';
    breakInput.value = '0.00';
    productSelect.focus();
}

function checkPlaceholder() {
    const tbody = document.getElementById('saleItemsTbody');
    const placeholder = document.getElementById('placeholder-row');
    const hasItems = tbody.querySelector('tr:not(#placeholder-row)');

    if (placeholder && hasItems) {
        placeholder.style.display = 'none';
    } else if (placeholder) {
        placeholder.style.display = 'table-row';
    }
}

// =======================================================
// LÓGICA DA TABELA DE HISTÓRICO DE VENDAS
// =======================================================
function initializeHistoryFilters() {
    const filterBtn = document.getElementById('historyFilterBtn');
    const clearBtn = document.getElementById('historyClearBtn');
    const statusSelect = document.getElementById('historyStatus');

    if (statusSelect && typeof saleStatusMap !== 'undefined') {
        statusSelect.innerHTML = '<option value="">Todos os Status</option>';
        for (const [key, value] of Object.entries(saleStatusMap)) {
            statusSelect.appendChild(new Option(value, key));
        }
    }
    if (filterBtn) filterBtn.onclick = () => fetchAndRenderHistory(1);
    if (clearBtn) clearBtn.onclick = () => {
        document.getElementById('historySearch').value = '';
        document.getElementById('historyStatus').value = '';
        document.getElementById('historyStartDate').value = '';
        document.getElementById('historyEndDate').value = '';
        fetchAndRenderHistory(1);
    };
}

async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    Object.keys(originalRowHTML_Sale).forEach(key => delete originalRowHTML_Sale[key]);

    const tableBody = document.getElementById('sales-history-body');
    const colspan = 14;
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">Buscando vendas...</td></tr>`;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ Page: page, PageSize: 10 });

        const search = document.getElementById('historySearch')?.value;
        const status = document.getElementById('historyStatus')?.value;
        const startDate = document.getElementById('historyStartDate')?.value;
        const endDate = document.getElementById('historyEndDate')?.value;
        if (search) params.append('Search', search);
        if (status) params.append('Status', status);
        if (startDate) params.append('StartDate', startDate);
        if (endDate) params.append('EndDate', endDate);
        const url = `${API_BASE_URL}/sales/paged?${params.toString()}`;
        const response = await fetch(url, { cache: 'no-cache', headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar vendas (Status: ${response.status})`);
        const paginatedData = await response.json();

        historyItemsCache = paginatedData.items;
        renderHistoryTable(paginatedData.items);
        renderHistoryPagination(paginatedData);
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; color: red;">Erro: ${error.message}</td></tr>`;
    }
}

function renderHistoryTable(items) {
    const tableBody = document.getElementById('sales-history-body');
    tableBody.innerHTML = '';
    const colspan = 14;
    if (!items || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">Nenhuma venda encontrada.</td></tr>`;
        return;
    }
    items.forEach((item) => {
        const dateStr = item.saleDate || item.date;
        const date = new Date(dateStr);
        const formattedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');

        const totalBreak = (item.items || []).reduce((acc, curr) => acc + (curr.break || 0), 0);
        
        const formattedTotalBreak = totalBreak.toFixed(2);
        const formattedDiscount = (item.discount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formattedTotal = (item.totalNet || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formattedBalance = (item.remainingBalance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const statusText = saleStatusMap[item.status ?? item.saleStatus] || 'Desconhecido';

        const saleRow = document.createElement('tr');
        saleRow.className = 'sale-row';
        saleRow.id = `row-sale-${item.id}`;
        
        saleRow.innerHTML = `
            <td><button class="expand-btn">+</button></td>
            <td data-field="noteNumber">${item.noteNumber}</td>
            <td data-field="customerName">${item.customerName}</td>
            <td data-field="customerPhone">${item.customerPhone || 'N/A'}</td>
            <td data-field="city">${item.city || 'N/A'}</td>
            <td data-field="state">${item.state || 'N/A'}</td>
            <td data-field="saleDate">${formattedDate}</td>
            <td data-field="itemsCount">${item.itemsCount || 0}</td>
            <td data-field="totalBreak">${formattedTotalBreak}</td>
            <td data-field="discount">${formattedDiscount}</td>
            <td data-field="totalNet">${formattedTotal}</td>
            <td data-field="remainingBalance">${formattedBalance}</td>
            <td data-field="status">${statusText}</td>
            <td class="actions-cell" data-field="actions">
                <button type="button" class="btn-action btn-edit">Editar</button>
                <button type="button" class="btn-action btn-receipt">Recibo</button>
                <button type="button" class="btn-action btn-delete">Excluir</button>
            </td>
        `;

        saleRow.querySelector('.expand-btn').addEventListener('click', (e) => toggleItems(e.target, item.id));
        saleRow.querySelector('.btn-edit').addEventListener('click', () => editSale(item.id));
        saleRow.querySelector('.btn-receipt').addEventListener('click', () => generateReceipt(item.id));
        saleRow.querySelector('.btn-delete').addEventListener('click', () => deleteSale(item.id));
        tableBody.appendChild(saleRow);

        const itemsRow = document.createElement('tr');
        itemsRow.className = 'items-row';
        itemsRow.id = `items-${item.id}`;
        itemsRow.style.display = 'none';

        let itemsHtml = `<td colspan="${colspan}" class="items-container">`;
        
        itemsHtml += `<h4>Itens da Venda</h4><table class="nested-table items-table">
            <thead><tr><th>Produto</th><th>Quantidade</th><th>Preço Unit.</th><th>Quebra (Qtd)</th><th>Subtotal</th></tr></thead>
            <tbody>`;
        if (item.items && item.items.length > 0) {
            item.items.forEach(saleItem => {
                const productName = productNameMap[saleItem.product] || 'Produto desconhecido';
                const formattedBreak = (saleItem.break || 0).toFixed(2);
                const subtotal = (saleItem.quantity * saleItem.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                itemsHtml += `
                    <tr data-item-id="${saleItem.id}">
                        <td data-item-field="product">${productName}</td>
                        <td data-item-field="quantity">${saleItem.quantity.toFixed(2)}</td>
                        <td data-item-field="unitPrice">${(saleItem.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td data-item-field="break">${formattedBreak}</td>
                        <td>${subtotal}</td>
                    </tr>
                `;
            });
        } else {
             itemsHtml += '<tr><td colspan="5">Nenhum item encontrado.</td></tr>';
        }
        itemsHtml += '</tbody></table>';

        itemsHtml += `<h4 style="margin-top: 15px;">Pagamentos</h4><table class="nested-table payments-table">
            <thead><tr><th>Data Pag.</th><th>Valor Pago</th><th>Método</th></tr></thead>
            <tbody>`;
        
        if (item.payments && item.payments.length > 0) {
            item.payments.forEach(payment => {
                const paymentDateStr = payment.paymentDate || payment.date;
                const pDate = new Date(paymentDateStr);
                const formattedPaymentDate = new Date(pDate.getTime() + pDate.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
                const formattedAmount = (payment.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const paymentMethodText = paymentMethodMap[payment.paymentMethod] || 'Desconhecido';
                itemsHtml += `
                    <tr>
                        <td>${formattedPaymentDate}</td>
                        <td>${formattedAmount}</td>
                        <td>${paymentMethodText}</td>
                    </tr>
                `;
            });
        } else {
            itemsHtml += '<tr><td colspan="3">Nenhum pagamento registrado.</td></tr>';
        }
        itemsHtml += '</tbody></table>';

        itemsHtml += '</td>';
        itemsRow.innerHTML = itemsHtml;
        tableBody.appendChild(itemsRow);
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

// =======================================================
// EDIÇÃO E AÇÕES DA TABELA
// =======================================================

function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/"/g, '&quot;');
}

function updateEditedSaleTotals(saleId) {
    const row = document.getElementById(`row-sale-${saleId}`);
    const itemsRow = document.getElementById(`items-${saleId}`);
    if (!row || !itemsRow) return;

    let subtotal = 0;
    let totalBreak = 0;

    const itemInputs = itemsRow.querySelectorAll('.items-table tbody tr');
    itemInputs.forEach(itemTr => {
        const quantity = parseFloat(itemTr.querySelector('[name="quantity"]').value) || 0;
        const unitPrice = parseFloat(itemTr.querySelector('[name="unitPrice"]').value) || 0;
        const breakQty = parseFloat(itemTr.querySelector('[name="break"]').value) || 0;
        subtotal += quantity * unitPrice;
        totalBreak += breakQty;
    });

    const discountInput = row.querySelector('[name="Discount"]');
    const discount = discountInput ? (parseFloat(discountInput.value) || 0) : 0;

    const totalNet = subtotal - discount;

    let amountPaid = 0;
    const paymentInputs = itemsRow.querySelectorAll('.payments-table tbody tr');
    paymentInputs.forEach(paymentTr => {
        amountPaid += parseFloat(paymentTr.querySelector('[name="amount"]').value) || 0;
    });
    const remainingBalance = totalNet - amountPaid;

    row.querySelector('[data-field="totalBreak"]').textContent = totalBreak.toFixed(2);
    row.querySelector('[data-field="totalNet"]').textContent = totalNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    row.querySelector('[data-field="remainingBalance"]').textContent = remainingBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


window.toggleItems = (button, saleId) => {
    const itemsRow = document.getElementById(`items-${saleId}`);
    if (itemsRow.style.display === 'none') {
        itemsRow.style.display = 'table-row';
        button.textContent = '-';
    } else {
        itemsRow.style.display = 'none';
        button.textContent = '+';
    }
};

window.deleteSale = async (saleId) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            alert('Venda excluída com sucesso!');
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorText = await response.text();
            alert(`Erro ao excluir: ${errorText}`);
        }
    } catch (error) {
        alert(`Erro de conexão: ${error.message}`);
    }
};

window.generateReceipt = async (saleId) => {
    if (!saleId) {
        alert("ID da venda não encontrado para gerar o recibo.");
        return;
    }
    try {
        const accessToken = localStorage.getItem('accessToken');
        const url = `${API_BASE_URL}/sales/${saleId}/receipt`;
        
        console.log(`Gerando recibo para a venda ${saleId} a partir de: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            const blob = await response.blob();
            const fileURL = URL.createObjectURL(blob);
            window.open(fileURL, '_blank');
            URL.revokeObjectURL(fileURL);
        } else {
            const errorText = await response.text();
            alert(`Erro ao gerar recibo: ${errorText}`);
        }
    } catch (error) {
        alert(`Erro de conexão ao gerar recibo: ${error.message}`);
    }
};

window.editSale = (saleId) => {
    const item = historyItemsCache.find(i => i.id === saleId);
    if (!item) return;

    const row = document.getElementById(`row-sale-${saleId}`);
    const itemsRow = document.getElementById(`items-${item.id}`);
    if (!row || originalRowHTML_Sale[item.id]) return;

    if (itemsRow.style.display === 'none') {
        toggleItems(row.querySelector('.expand-btn'), saleId);
    }

    originalRowHTML_Sale[item.id] = { main: row.innerHTML, items: itemsRow.innerHTML };

    // --- Edição da Linha Principal ---
    const saleDateStr = (item.saleDate || item.date).split('T')[0];
    row.querySelector('[data-field="noteNumber"]').innerHTML = `<input type="number" name="NoteNumber" class="form-input" value="${escapeAttr(item.noteNumber)}">`;
    row.querySelector('[data-field="customerName"]').innerHTML = `<input type="text" name="CustomerName" class="form-input" value="${escapeAttr(item.customerName)}">`;
    row.querySelector('[data-field="customerPhone"]').innerHTML = `<input type="text" name="CustomerPhone" class="form-input" value="${escapeAttr(item.customerPhone)}">`;
    row.querySelector('[data-field="city"]').innerHTML = `<input type="text" name="City" class="form-input" value="${escapeAttr(item.city)}">`;
    row.querySelector('[data-field="state"]').innerHTML = `<input type="text" name="State" class="form-input" value="${escapeAttr(item.state)}">`;
    row.querySelector('[data-field="saleDate"]').innerHTML = `<input type="date" name="Date" class="form-input" value="${escapeAttr(saleDateStr)}">`;
    row.querySelector('[data-field="discount"]').innerHTML = `<input type="number" step="0.01" name="Discount" class="form-input" value="${escapeAttr(item.discount)}">`;
    
    const currentStatus = item.status ?? item.saleStatus ?? 0;
    let statusOptions = '';
    for (const [key, value] of Object.entries(saleStatusMap)) {
        const selected = parseInt(key) === parseInt(currentStatus) ? 'selected' : '';
        statusOptions += `<option value="${key}" ${selected}>${value}</option>`;
    }
    row.querySelector('[data-field="status"]').innerHTML = `<select name="Status" class="form-input">${statusOptions}</select>`;

    row.querySelector('[data-field="actions"]').innerHTML = `
        <button type="button" class="btn-action btn-save">Salvar</button>
        <button type="button" class="btn-action btn-cancel">Cancelar</button>
    `;

    row.querySelector('.btn-save').addEventListener('click', () => saveSaleChanges(item.id));
    row.querySelector('.btn-cancel').addEventListener('click', () => cancelEditSale(item.id));
    
    // --- Edição de Itens e Pagamentos ---
    const itemsContainer = itemsRow.querySelector('.items-container');

    const itemsTableBody = itemsContainer.querySelector('.items-table tbody');
    if (itemsTableBody) {
        itemsTableBody.innerHTML = '';
        (item.items || []).forEach(saleItem => {
            const newRow = document.createElement('tr');
            newRow.dataset.itemId = saleItem.id;
            newRow.innerHTML = `
                <td>${productNameMap[saleItem.product] || 'Desconhecido'}</td>
                <td><input type="number" step="0.01" class="form-input" name="quantity" value="${escapeAttr(saleItem.quantity)}"></td>
                <td><input type="number" step="0.01" class="form-input" name="unitPrice" value="${escapeAttr(saleItem.unitPrice)}"></td>
                <td><input type="number" step="0.01" class="form-input" name="break" value="${escapeAttr(saleItem.break)}"></td>
                <td></td>
            `;
            itemsTableBody.appendChild(newRow);
        });
    }

    const paymentsTableBody = itemsContainer.querySelector('.payments-table tbody');
    if(paymentsTableBody) {
        paymentsTableBody.innerHTML = '';
        (item.payments || []).forEach(payment => {
            const paymentDateStr = (payment.paymentDate || payment.date).split('T')[0];
            const paymentMethodOptions = Object.entries(paymentMethodMap)
                .map(([key, value]) => `<option value="${key}" ${parseInt(key) === payment.paymentMethod ? 'selected' : ''}>${value}</option>`)
                .join('');
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="date" name="paymentDate" class="form-input" value="${escapeAttr(paymentDateStr)}"></td>
                <td><input type="number" step="0.01" name="amount" class="form-input" value="${escapeAttr(payment.amount)}"></td>
                <td><select name="paymentMethod" class="form-input">${paymentMethodOptions}</select></td>
            `;
            paymentsTableBody.appendChild(newRow);
        });
    }

    const handleEditInput = () => {
        try {
            updateEditedSaleTotals(saleId);
        } catch (e) {
            console.error("Erro ao recalcular totais:", e);
        }
    };
    
    row.addEventListener('input', handleEditInput);
    itemsRow.addEventListener('input', handleEditInput);
};

window.saveSaleChanges = async (saleId) => {
    const row = document.getElementById(`row-sale-${saleId}`);
    const itemsRow = document.getElementById(`items-${saleId}`);
    if (!row) return;

    const saveBtn = row.querySelector('.btn-save');
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";

    try {
        const originalItem = historyItemsCache.find(i => i.id === saleId);
        if (!originalItem) { throw new Error("Dados originais da venda não encontrados."); }

        // --- Coleta de Itens ---
        const editedItems = [];
        const itemsTableBody = itemsRow.querySelector('.items-table tbody');
        itemsTableBody.querySelectorAll('tr').forEach(itemTr => {
            const originalSaleItem = originalItem.items.find(i => i.id === itemTr.dataset.itemId);
            if (originalSaleItem) {
                const productId = productStringToIdMap[originalSaleItem.product];
                editedItems.push({
                    id: originalSaleItem.id,
                    product: productId,
                    quantity: parseFloat(itemTr.querySelector('[name="quantity"]').value),
                    unitPrice: parseFloat(itemTr.querySelector('[name="unitPrice"]').value),
                    break: parseFloat(itemTr.querySelector('[name="break"]').value) || 0
                });
            }
        });

        // --- Coleta de Pagamentos ---
        const editedPayments = [];
        const paymentsTableBody = itemsRow.querySelector('.payments-table tbody');
        paymentsTableBody.querySelectorAll('tr').forEach(paymentTr => {
            editedPayments.push({
                paymentDate: paymentTr.querySelector('[name="paymentDate"]').value,
                amount: parseFloat(paymentTr.querySelector('[name="amount"]').value),
                paymentMethod: parseInt(paymentTr.querySelector('[name="paymentMethod"]').value, 10)
            });
        });

        // --- Montagem do Payload Final ---
        const saleData = {
            id: saleId,
            noteNumber: parseInt(row.querySelector('[name="NoteNumber"]').value, 10),
            customerName: row.querySelector('[name="CustomerName"]').value,
            customerPhone: row.querySelector('[name="CustomerPhone"]').value,
            city: row.querySelector('[name="City"]').value,
            state: row.querySelector('[name="State"]').value,
            status: parseInt(row.querySelector('[name="Status"]').value, 10),
            discount: parseFloat(row.querySelector('[name="Discount"]').value) || 0,
            date: row.querySelector('[name="Date"]').value,
            customerAddress: originalItem.customerAddress || '',
            items: editedItems,
            payments: editedPayments
        };
        
        const updatePayload = saleData;
        
        console.log("📤 Enviando payload JSON para Atualização:", updatePayload);
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/sales`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });

        if (response.ok) {
            alert('Venda atualizada com sucesso!');
            delete originalRowHTML_Sale[saleId];
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            try {
                const errorJson = await response.json();
                const errorMessages = errorJson.errors ? Object.values(errorJson.errors).flat().join('\n') : (errorJson.message || 'Erro desconhecido.');
                alert(`Erro ao salvar:\n${errorMessages}`);
            } catch (e) {
                const errorText = await response.text();
                alert(`Erro ao salvar: ${errorText}`);
            }
        }
    } catch (error) {
        alert(`Erro de conexão: ${error.message}`);
    } finally {
        if (row.querySelector('.btn-save')) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Salvar";
        }
    }
};

window.cancelEditSale = (saleId) => {
    const row = document.getElementById(`row-sale-${saleId}`);
    const itemsRow = document.getElementById(`items-${saleId}`);
    if (row && originalRowHTML_Sale[saleId]) {
        row.innerHTML = originalRowHTML_Sale[saleId].main;
        itemsRow.innerHTML = originalRowHTML_Sale[saleId].items;

        row.querySelector('.expand-btn').addEventListener('click', (e) => toggleItems(e.target, saleId));
        row.querySelector('.btn-edit').addEventListener('click', () => editSale(saleId));
        row.querySelector('.btn-delete').addEventListener('click', () => deleteSale(saleId));
        // Adiciona o listener para o botão de recibo novamente após cancelar
        row.querySelector('.btn-receipt').addEventListener('click', () => generateReceipt(saleId));
        delete originalRowHTML_Sale[saleId];
    }
};

// Chamar a inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initDynamicForm);