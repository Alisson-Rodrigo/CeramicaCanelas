console.log('Script js/lancamento.js DEFINIDO.');

// =======================================================
// INICIALIZAÇÃO
// =======================================================
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de lancamento.js foi chamada.');
    initializeLaunchForm();
    initializeLaunchCategoryModal();
    initializeCustomerModal();
    initializeImageProofModal();
    initializeHistoryFilters();
    fetchAndRenderHistory(1);
}

// =======================================================
// HELPER DE IMAGEM
// =======================================================
function getAuthenticatedImageUrl(imageUrl) {
    const urlObj = new URL(imageUrl);
    if (urlObj.hostname === 'localhost') {
        urlObj.protocol = 'http';
    }
    return urlObj.toString();
}

async function downloadImage(imageUrl, filename) {
    try {
        const urlObj = new URL(imageUrl);
        if (urlObj.hostname === 'localhost') {
            urlObj.protocol = 'http';
        }
        const correctedUrl = urlObj.toString();
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = correctedUrl;
        a.download = filename;
        a.target = '_blank';
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);

    } catch (error) {
        console.error('Erro ao baixar a imagem:', error);
        alert('Ocorreu um erro ao tentar baixar a imagem. Verifique o console para mais detalhes.');
    }
}


// =======================================================
// LÓGICA DO FORMULÁRIO PRINCIPAL (NOVO LANÇAMENTO)
// =======================================================
function initializeLaunchForm() {
    const typeSelection = document.getElementById('type-selection-group');
    const launchForm = document.getElementById('launchForm');
    const statusSelect = document.getElementById('status');
    const imageProofsInput = document.getElementById('imageProofs');

    populateEnumSelects();

    if (typeSelection) {
        typeSelection.addEventListener('change', (event) => {
            if (event.target.name === 'Type') {
                updateFormVisibility(event.target.value);
            }
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', (event) => {
            const dueDateGroup = document.getElementById('group-dueDate');
            if (dueDateGroup) {
                dueDateGroup.style.display = (event.target.value === '0') ? 'block' : 'none';
                if (event.target.value === '1') {
                    const dueDateInput = document.getElementById('dueDate');
                    if(dueDateInput) dueDateInput.value = '';
                }
            }
        });
    }
    
    if (imageProofsInput) {
        imageProofsInput.addEventListener('change', handleFileSelection);
    }

    if (launchForm) {
        launchForm.addEventListener('submit', handleLaunchSubmit);
    }
}

function handleFileSelection(event) {
    const files = event.target.files;
    if (files.length > 0) {
        for(const file of files) {
           launchFiles.push(file);
        }
    }
    renderFilePreviews();
    event.target.value = '';
}

function renderFilePreviews() {
    const container = document.getElementById('image-previews-container');
    if (!container) return;

    container.innerHTML = '';
    
    launchFiles.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        const img = document.createElement('img');
        img.className = 'preview-thumbnail';
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-preview-btn';
        removeBtn.textContent = 'X';
        removeBtn.type = 'button';
        removeBtn.onclick = () => {
            launchFiles.splice(index, 1);
            renderFilePreviews();
        };
        
        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        container.appendChild(previewItem);
    });
}

function updateFormVisibility(type) {
    const launchForm = document.getElementById('launchForm');
    const categoryGroup = document.getElementById('group-categoryId');
    const customerGroup = document.getElementById('group-customerId');

    if (launchForm) launchForm.style.display = 'block';
    resetFormOnTypeChange();

    const categoryLabel = document.querySelector('#group-categoryId label');

    // ✅ ALTERAÇÃO: Categoria agora é sempre visível e obrigatória para ambos os tipos.
    if (categoryGroup) categoryGroup.style.display = 'block';
    if (categoryLabel) categoryLabel.innerHTML = "Categoria <span style='color:red'>*</span>";

    if (type === '1') { // Entrada
        if (customerGroup) customerGroup.style.display = 'block';
    } else if (type === '2') { // Saída
        if (customerGroup) customerGroup.style.display = 'none';
    }
}

function populateEnumSelects() {
    const paymentSelect = document.getElementById('paymentMethod');
    const statusSelect = document.getElementById('status');

    if (paymentSelect && typeof paymentMethodMap !== 'undefined') {
        paymentSelect.innerHTML = '';
        for (const [key, value] of Object.entries(paymentMethodMap)) {
            paymentSelect.appendChild(new Option(value, key));
        }
    }
    
    if (statusSelect && typeof statusMap !== 'undefined') {
        statusSelect.innerHTML = '';
        for (const [key, value] of Object.entries(statusMap)) {
            const option = new Option(value, key);
            if (key === '1') option.selected = true;
            statusSelect.appendChild(option);
        }
    }
}

async function handleLaunchSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const selectedType = document.querySelector('input[name="Type"]:checked');
    if (!selectedType) {
        showErrorModal({ title: "Validação Falhou", detail: "Selecione o tipo: Entrada ou Saída." });
        return;
    }

    const submitBtn = event.submitter || form.querySelector('button[type="submit"]');
    let originalText = '';
    if (submitBtn) {
        originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Salvando...";
        submitBtn.classList.add("loading");
    }

    const formData = new FormData(form);
    formData.set('Type', selectedType.value);
    
    formData.delete('ImageProofs');
    if (launchFiles.length > 0) {
        launchFiles.forEach(file => {
            formData.append('ImageProofs', file);
        });
    }
    
    // ✅ ALTERAÇÃO: Validação de categoria agora é feita para ambos os tipos.
    if (!formData.get('CategoryId')) {
        showErrorModal({ title: "Validação Falhou", detail: "A Categoria é obrigatória." });
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.classList.remove("loading");
        }
        return;
    }

    if (selectedType.value === '1') { // Entrada
        if (!formData.get('CustomerId')) formData.delete('CustomerId');
        // A linha formData.delete('CategoryId') foi removida daqui.
    } else if (selectedType.value === '2') { // Saída
        formData.delete('CustomerId');
    }

    // ✅ CORREÇÃO: Garante que o campo DueDate não seja enviado se estiver vazio.
    const dueDateValue = formData.get('DueDate');
    if (!dueDateValue) {
        formData.delete('DueDate');
    }

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Lançamento salvo com sucesso!');
            resetFormCompletely();
            const typeRadio = document.querySelector('input[name="Type"]:checked');
            if (typeRadio) typeRadio.checked = false;
            form.style.display = 'none';
            fetchAndRenderHistory(1);
        } else {
            const errorData = await response.json().catch(() => ({
                title: "Erro desconhecido",
                detail: "A resposta da API não pôde ser lida."
            }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.classList.remove("loading");
        }
    }
}


// =======================================================
// LÓGICA DAS MODAIS (CATEGORIA, CLIENTE, IMAGENS)
// =======================================================

function initializeImageProofModal() {
    const modal = document.getElementById('imageProofModal');
    const closeBtn = document.getElementById('closeImageProofModalBtn');
    if (modal && closeBtn) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (event) => {
            if (event.target == modal) modal.style.display = "none";
        });
    }
}

window.openImageManagerModal = (imageUrls, imageIds, launchId) => {
    currentEditingLaunchId = launchId;
    openImageProofModal(imageUrls, imageIds, true);
};

window.openImageProofModal = (imageUrls, imageIds = null, isEditMode = false) => {
    const modal = document.getElementById('imageProofModal');
    const container = document.getElementById('imageProofContainer');
    const modalTitle = modal.querySelector('h3');
    
    if (!modal || !container || !modalTitle) return;

    if (isEditMode) {
        modalTitle.textContent = 'Gerenciar Comprovantes';
        modal.classList.add('edit-mode');
    } else {
        modalTitle.textContent = 'Comprovantes do Lançamento';
        modal.classList.remove('edit-mode');
    }

    container.innerHTML = '<p>Carregando imagens...</p>';
    if (!imageUrls || imageUrls.length === 0) {
        container.innerHTML = '<p>Nenhum comprovante disponível.</p>';
        modal.style.display = 'block';
        return;
    }
    
    container.innerHTML = '';
    
    imageUrls.forEach((originalUrl, index) => {
        const urlObj = new URL(originalUrl);
        if (urlObj.hostname === 'localhost') {
            urlObj.protocol = 'http';
        }
        const correctedUrl = urlObj.toString();

        let proofId;
        if (imageIds && imageIds[index]) {
            proofId = imageIds[index];
        } else {
            const fullFilename = originalUrl.substring(originalUrl.lastIndexOf('/') + 1);
            proofId = fullFilename.split('_')[0];
        }
        
        const elementId = `modal-proof-item-${proofId}`;

        const itemContainer = document.createElement('div');
        itemContainer.className = 'proof-item-container';
        itemContainer.id = elementId;
        
        let actionButtonHTML = '';
        if (isEditMode) {
            const isMarked = proofsToDeleteForEdit.includes(proofId);
            if (isMarked) {
                itemContainer.classList.add('marked-for-deletion');
            }
            actionButtonHTML = `<button type="button" class="btn-action btn-delete-proof ${isMarked ? 'btn-undo' : ''}" onclick="toggleProofForDeletion('${proofId}', '${elementId}')">${isMarked ? 'Desfazer' : 'Remover'}</button>`;
        } else {
            const filename = originalUrl.substring(originalUrl.lastIndexOf('/') + 1);
            actionButtonHTML = `<button type="button" class="btn-action btn-download" onclick="downloadImage('${originalUrl}', '${filename}')">Baixar</button>`;
        }

        itemContainer.innerHTML = `
            <a href="${correctedUrl}" target="_blank">
                <img src="${correctedUrl}" alt="Comprovante" title="Clique para ampliar">
            </a>
            ${actionButtonHTML}
        `;
        container.appendChild(itemContainer);
    });

    modal.style.display = 'block';
};

window.toggleProofForDeletion = (proofId, elementId) => {
    const proofItem = document.getElementById(elementId);
    if (!proofItem) return;
    
    const deleteBtn = proofItem.querySelector('.btn-delete-proof');
    const index = proofsToDeleteForEdit.indexOf(proofId);

    if (index > -1) {
        proofsToDeleteForEdit.splice(index, 1);
        proofItem.classList.remove('marked-for-deletion');
        deleteBtn.textContent = 'Remover';
        deleteBtn.classList.remove('btn-undo');
    } else {
        proofsToDeleteForEdit.push(proofId);
        proofItem.classList.add('marked-for-deletion');
        deleteBtn.textContent = 'Desfazer';
        deleteBtn.classList.add('btn-undo');
    }
    updateDeleteCountDisplay();
};

function updateDeleteCountDisplay() {
    if (currentEditingLaunchId) {
        const display = document.getElementById(`delete-count-${currentEditingLaunchId}`);
        if (display) {
            const count = proofsToDeleteForEdit.length;
            display.textContent = count > 0 ? `${count} imagem(s) para excluir` : '';
        }
    }
}

function initializeLaunchCategoryModal() {
    const modal = document.getElementById('categorySearchModal');
    const openBtn = document.getElementById('openCategoryModalBtn');
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector('.modal-close-btn');
    const filterBtn = modal.querySelector('#modalCategoryFilterBtn');
    const resultsContainer = modal.querySelector('#modalCategoryResultsContainer'); 

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentEditingLaunchId = null;
        modal.style.display = 'block';
        fetchAndRenderLaunchCategoriesInModal(1);
    });

    const closeModal = () => {
        modal.style.display = 'none';
        currentEditingLaunchId = null;
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target == modal) closeModal(); });
    if (filterBtn) filterBtn.addEventListener('click', () => fetchAndRenderLaunchCategoriesInModal(1));

    if (resultsContainer) {
        resultsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('select-category-btn')) {
                const categoryId = event.target.dataset.id;
                const categoryName = event.target.dataset.name;
                if (currentEditingLaunchId) {
                    const row = document.getElementById(`row-launch-${currentEditingLaunchId}`);
                    if (row) {
                        const categoryCell = row.querySelector('[data-field="category"]');
                        if (categoryCell) {
                           categoryCell.querySelector('.edit-selection-name').textContent = categoryName;
                           categoryCell.dataset.newCategoryId = categoryId;
                        }
                    }
                } else {
                    document.getElementById('selectedCategoryName').textContent = categoryName;
                    document.getElementById('categoryId').value = categoryId;
                }
                closeModal();
            }
        });
    }
}

function initializeCustomerModal() {
    const modal = document.getElementById('customerSearchModal');
    const openBtn = document.getElementById('openCustomerModalBtn');
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector('.modal-close-btn');
    const filterBtn = modal.querySelector('#modalCustomerFilterBtn');
    const resultsContainer = modal.querySelector('#modalCustomerResultsContainer');

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentEditingLaunchId = null;
        modal.style.display = 'block';
        fetchAndRenderCustomersInModal(1);
    });

    const closeModal = () => {
        modal.style.display = 'none';
        currentEditingLaunchId = null;
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target == modal) closeModal(); });
    if (filterBtn) filterBtn.addEventListener('click', () => fetchAndRenderCustomersInModal(1));

    if (resultsContainer) {
        resultsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('select-customer-btn')) {
                const customerId = event.target.dataset.id;
                const customerName = event.target.dataset.name;
                if (currentEditingLaunchId) {
                    const row = document.getElementById(`row-launch-${currentEditingLaunchId}`);
                    if (row) {
                        const customerCell = row.querySelector('[data-field="customer"]');
                        if (customerCell) {
                             customerCell.querySelector('.edit-selection-name').textContent = customerName;
                             customerCell.dataset.newCustomerId = customerId;
                        }
                    }
                } else {
                    document.getElementById('selectedCustomerName').textContent = customerName;
                    document.getElementById('customerId').value = customerId;
                }
                closeModal();
            }
        });
    }
}

async function fetchAndRenderLaunchCategoriesInModal(page = 1) {
    const resultsContainer = document.getElementById('modalCategoryResultsContainer');
    if(!resultsContainer) return;
    resultsContainer.innerHTML = '<p>Buscando...</p>';
    try {
        const accessToken = localStorage.getItem('accessToken');
        const search = document.getElementById('modalCategorySearchInput')?.value;
        const params = new URLSearchParams({ Page: page, PageSize: 5, OrderBy: 'Name' });
        if (search) params.append('Search', search);
        const url = `${API_BASE_URL}/financial/launch-categories/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha: ${response.status}`);
        const paginatedData = await response.json();
        renderLaunchCategoryModalResults(paginatedData.items, resultsContainer);
        renderLaunchCategoryModalPagination(paginatedData);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderLaunchCategoryModalResults(categories, container) {
    if (!categories || categories.length === 0) {
        container.innerHTML = '<p>Nenhuma categoria encontrada.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'results-table';
    table.innerHTML = `<thead><tr><th>Nome</th><th>Ação</th></tr></thead><tbody>
        ${categories.map(cat => `<tr><td>${cat.name}</td><td><button type="button" class="select-category-btn" data-id="${cat.id}" data-name="${cat.name}">Selecionar</button></td></tr>`).join('')}
    </tbody>`;
    container.innerHTML = '';
    container.appendChild(table);
}

function renderLaunchCategoryModalPagination(paginationData) {
    const controlsContainer = document.getElementById('modalCategoryPaginationControls');
    if(!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    const { page, totalPages } = paginationData;
    controlsContainer.innerHTML = `
        <button class="pagination-btn" onclick="fetchAndRenderLaunchCategoriesInModal(${page - 1})" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
        <span class="pagination-info">Página ${page} de ${totalPages}</span>
        <button class="pagination-btn" onclick="fetchAndRenderLaunchCategoriesInModal(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Próxima</button>
    `;
}

async function fetchAndRenderCustomersInModal(page = 1) {
    const resultsContainer = document.getElementById('modalCustomerResultsContainer');
    if(!resultsContainer) return;
    resultsContainer.innerHTML = '<p>Buscando...</p>';
    try {
        const accessToken = localStorage.getItem('accessToken');
        const search = document.getElementById('modalCustomerSearchInput')?.value;
        const params = new URLSearchParams({ Page: page, PageSize: 5, OrderBy: 'Name' });
        if (search) params.append('Search', search);
        const url = `${API_BASE_URL}/financial/customer/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha: ${response.status}`);
        const paginatedData = await response.json();
        renderCustomerModalResults(paginatedData.items, resultsContainer);
        renderCustomerModalPagination(paginatedData);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderCustomerModalResults(customers, container) {
    if (!customers || customers.length === 0) {
        container.innerHTML = '<p>Nenhum cliente encontrado.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'results-table';
    table.innerHTML = `<thead><tr><th>Nome</th><th>Documento</th><th>Ação</th></tr></thead><tbody>
        ${customers.map(c => `<tr><td>${c.name}</td><td>${c.document || 'N/A'}</td><td><button type="button" class="select-customer-btn" data-id="${c.id}" data-name="${c.name}">Selecionar</button></td></tr>`).join('')}
    </tbody>`;
    container.innerHTML = '';
    container.appendChild(table);
}

function renderCustomerModalPagination(paginationData) {
    const controlsContainer = document.getElementById('modalCustomerPaginationControls');
    if(!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    const { page, totalPages } = paginationData;
    controlsContainer.innerHTML = `
        <button class="pagination-btn" onclick="fetchAndRenderCustomersInModal(${page - 1})" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
        <span class="pagination-info">Página ${page} de ${totalPages}</span>
        <button class="pagination-btn" onclick="fetchAndRenderCustomersInModal(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Próxima</button>
    `;
}

// =======================================================
// LÓGICA DA TABELA DE HISTÓRICO
// =======================================================
function initializeHistoryFilters() {
    const filterBtn = document.getElementById('historyFilterBtn');
    const clearBtn = document.getElementById('historyClearBtn');
    const typeSelect = document.getElementById('historyType');
    const statusSelect = document.getElementById('historyStatus');

    if (typeSelect && typeof launchTypeMap !== 'undefined') {
        typeSelect.innerHTML = '<option value="">Todos os Tipos</option>';
        for (const [key, value] of Object.entries(launchTypeMap)) {
            typeSelect.appendChild(new Option(value, key));
        }
    }
    
    if (statusSelect && typeof statusMap !== 'undefined') {
        statusSelect.innerHTML = '<option value="">Todos os Status</option>';
        for (const [key, value] of Object.entries(statusMap)) {
            statusSelect.appendChild(new Option(value, key));
        }
    }

    if (filterBtn) filterBtn.onclick = () => fetchAndRenderHistory(1);
    if (clearBtn) clearBtn.onclick = () => {
        if(document.getElementById('historySearch')) document.getElementById('historySearch').value = '';
        if(document.getElementById('historyStartDate')) document.getElementById('historyStartDate').value = '';
        if(document.getElementById('historyEndDate')) document.getElementById('historyEndDate').value = '';
        if(typeSelect) typeSelect.value = '';
        if(statusSelect) statusSelect.value = '';
        fetchAndRenderHistory(1);
    };
}

async function fetchAndRenderHistory(page = 1) {
    currentHistoryPage = page;
    const tableBody = document.querySelector('#launch-history-body');
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center;">Buscando...</td></tr>`;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ Page: page, PageSize: 10, OrderBy: 'LaunchDate', Ascending: false });
        
        const search = document.getElementById('historySearch')?.value;
        const type = document.getElementById('historyType')?.value;
        const status = document.getElementById('historyStatus')?.value;
        const startDate = document.getElementById('historyStartDate')?.value;
        const endDate = document.getElementById('historyEndDate')?.value;
        
        if(search) params.append('Search', search);
        if(type) params.append('Type', type);
        if(status) params.append('Status', status);
        if(startDate) params.append('StartDate', startDate);
        if(endDate) params.append('EndDate', endDate);

        const url = `${API_BASE_URL}/financial/launch/paged?${params.toString()}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Falha ao buscar lançamentos (Status: ${response.status})`);
        
        const paginatedData = await response.json();
        historyItemsCache = paginatedData.items;
        renderHistoryTable(paginatedData.items, tableBody);
        renderHistoryPagination(paginatedData);
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: red;">${error.message}</td></tr>`;
    }
}

function renderHistoryTable(items, tableBody) {
    tableBody.innerHTML = '';
    if (!items || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center;">Nenhum lançamento encontrado.</td></tr>`;
        return;
    }
    items.forEach(item => {
        const itemJsonString = JSON.stringify(item).replace(/'/g, "&apos;");
        const date = new Date(item.launchDate);
        const formattedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
        const formattedAmount = (item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        let formattedDueDate = 'N/A';
        if (item.dueDate) {
            const dueDate = new Date(item.dueDate);
            formattedDueDate = new Date(dueDate.getTime() + dueDate.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
        }

        let typeDisplayHtml = item.type === 1 ? `<span class="type-indicator income">Entrada</span>` : `<span class="type-indicator expense">Saída</span>`;
        
        const statusText = statusMap[item.status] || 'N/A';
        const operator = item.operatorName || 'Desconhecido';
        const amountClass = item.type === 1 ? 'income' : 'expense';
        const categoryName = item.categoryName || 'N/A';
        const customerName = item.customerName || 'N/A';
        const paymentMethodText = paymentMethodMap[item.paymentMethod] || 'N/A';
        
        let proofsHtml = 'N/A';
        if (item.imageProofsUrls && item.imageProofsUrls.length > 0) {
            const imageUrlsJson = JSON.stringify(item.imageProofsUrls);
            const imageIdsJson = JSON.stringify(item.idImages || []);
            proofsHtml = `<button class="btn-action btn-view" onclick='openImageProofModal(${imageUrlsJson}, ${imageIdsJson})'>Visualizar</button>`;
        }
        
        const rowHTML = `
            <tr id="row-launch-${item.id}">
                <td data-field="type">${typeDisplayHtml}</td>
                <td data-field="description">${item.description}</td>
                <td data-field="amount" class="${amountClass}">${formattedAmount}</td>
                <td data-field="launchDate">${formattedDate}</td>
                <td data-field="category" data-category-id="${item.categoryId || ''}">${categoryName}</td>
                <td data-field="customer" data-customer-id="${item.customerId || ''}">${customerName}</td>
                <td data-field="paymentMethod">${paymentMethodText}</td>
                <td data-field="status">${statusText}</td>
                <td data-field="operator">${operator}</td>
                <td data-field="proofs">${proofsHtml}</td>
                <td data-field="dueDate">${formattedDueDate}</td>
                <td class="actions-cell" data-field="actions">
                    <button class="btn-action btn-edit" onclick='editLaunch(${itemJsonString})'>Editar</button>
                    <button class="btn-action btn-delete" onclick="deleteLaunch('${item.id}')">Excluir</button>
                </td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', rowHTML);
    });
}

function renderHistoryPagination(paginationData) {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    const { page, totalPages } = paginationData;
    controlsContainer.innerHTML = `
        <button class="pagination-btn" onclick="fetchAndRenderHistory(${page - 1})" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
        <span class="pagination-info">Página ${page} de ${totalPages}</span>
        <button class="pagination-btn" onclick="fetchAndRenderHistory(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Próxima</button>
    `;
}

// =======================================================
// AÇÕES DA TABELA (EDITAR, DELETAR, SALVAR, CANCELAR)
// =======================================================
window.openCategoryModalForEdit = (launchId) => {
    currentEditingLaunchId = launchId;
    document.getElementById('categorySearchModal').style.display = 'block';
    fetchAndRenderLaunchCategoriesInModal(1);
};

window.openCustomerModalForEdit = (launchId) => {
    currentEditingLaunchId = launchId;
    document.getElementById('customerSearchModal').style.display = 'block';
    fetchAndRenderCustomersInModal(1);
};

window.editLaunch = (item) => {
    const row = document.getElementById(`row-launch-${item.id}`);
    if (!row || originalRowHTML_Launch[item.id]) return;

    proofsToDeleteForEdit = []; 
    originalRowHTML_Launch[item.id] = row.innerHTML;

    row.querySelector('[data-field="description"]').innerHTML = `<textarea name="Description" class="edit-input">${item.description}</textarea>`;
    row.querySelector('[data-field="amount"]').innerHTML = `<input type="number" name="Amount" class="edit-input" value="${item.amount}" step="0.01">`;
    const isoDate = new Date(item.launchDate).toISOString().split('T')[0];
    row.querySelector('[data-field="launchDate"]').innerHTML = `<input type="date" name="LaunchDate" class="edit-input" value="${isoDate}">`;
    let paymentOptions = '';
    for (const [key, value] of Object.entries(paymentMethodMap)) {
        paymentOptions += `<option value="${key}" ${key == item.paymentMethod ? 'selected' : ''}>${value}</option>`;
    }
    row.querySelector('[data-field="paymentMethod"]').innerHTML = `<select name="PaymentMethod" class="edit-input">${paymentOptions}</select>`;
    let statusOptions = '';
    for (const [key, value] of Object.entries(statusMap)) {
        statusOptions += `<option value="${key}" ${key == item.status ? 'selected' : ''}>${value}</option>`;
    }
    row.querySelector('[data-field="status"]').innerHTML = `<select name="Status" class="edit-input">${statusOptions}</select>`;
    const originalDueDate = item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '';
    row.querySelector('[data-field="dueDate"]').innerHTML = `<input type="date" name="DueDate" class="edit-input" value="${originalDueDate}">`;
    
    const categoryCell = row.querySelector('[data-field="category"]');
    const customerCell = row.querySelector('[data-field="customer"]');

    if (customerCell) customerCell.dataset.newCustomerId = item.customerId || '';
    
    // ✅ ALTERAÇÃO: Categoria torna-se editável para ambos os tipos (Entrada e Saída).
    if (categoryCell) {
        categoryCell.dataset.newCategoryId = item.categoryId || '';
        categoryCell.innerHTML = `<div class="edit-selection-box"><span class="edit-selection-name">${item.categoryName || 'N/A'}</span><button type="button" class="btn-action btn-edit-modal" onclick="openCategoryModalForEdit('${item.id}')">Alterar</button></div>`;
    }

    // A lógica do cliente permanece condicional ao tipo.
    if (item.type === 1 && customerCell) {
        customerCell.innerHTML = `<div class="edit-selection-box"><span class="edit-selection-name">${item.customerName || 'N/A'}</span><button type="button" class="btn-action btn-edit-modal" onclick="openCustomerModalForEdit('${item.id}')">Alterar</button></div>`;
    }

    const proofsCell = row.querySelector('[data-field="proofs"]');
    if (proofsCell) {
        const imageUrlsJson = JSON.stringify(item.imageProofsUrls || []);
        const imageIdsJson = JSON.stringify(item.idImages || []);
        proofsCell.innerHTML = `
            <div class="edit-proofs-box">
                <button type="button" class="btn-action" onclick='openImageManagerModal(${imageUrlsJson}, ${imageIdsJson}, "${item.id}")'>
                    Gerenciar Imagens
                </button>
                <span id="delete-count-${item.id}" class="delete-count-display"></span>
                <hr style="margin: 5px 0;">
                <label>Adicionar novos:</label>
                <input type="file" name="ImageProofs" class="edit-input-file" multiple accept="image/*">
            </div>
        `;
    }
    
    updateDeleteCountDisplay();

    row.querySelector('[data-field="actions"]').innerHTML = `
        <button class="btn-action btn-save" onclick="saveLaunchChanges('${item.id}')">Salvar</button>
        <button class="btn-action btn-cancel" onclick="cancelLaunchEdit('${item.id}')">Cancelar</button>
    `;
};

window.saveLaunchChanges = async (launchId) => {
    const row = document.getElementById(`row-launch-${launchId}`);
    if (!row) return;

    const saveBtn = row.querySelector('.btn-save');
    let originalText = '';
    if (saveBtn) {
        originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = "Salvando...";
        saveBtn.classList.add("loading");
    }

    const originalItem = historyItemsCache.find(i => i.id === launchId);
    if (!originalItem) {
        showErrorModal({ title: "Erro", detail: "Dados originais não encontrados." });
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            saveBtn.classList.remove("loading");
        }
        return;
    }

    const formData = new FormData();
    formData.append('Id', launchId);
    formData.append('Description', row.querySelector('[name="Description"]').value);
    formData.append('Amount', row.querySelector('[name="Amount"]').value);
    formData.append('LaunchDate', row.querySelector('[name="LaunchDate"]').value);
    formData.append('Status', row.querySelector('[name="Status"]').value);
    formData.append('PaymentMethod', row.querySelector('[name="PaymentMethod"]').value);
    formData.append('Type', originalItem.type);
    const dueDateValue = row.querySelector('[name="DueDate"]').value;
    if (dueDateValue) formData.append('DueDate', dueDateValue);

    if (proofsToDeleteForEdit.length > 0) {
        proofsToDeleteForEdit.forEach(proofId => {
            formData.append('ProofsToDelete', proofId);
        });
    }

    const newImageFiles = row.querySelector('[name="ImageProofs"]')?.files;
    if (newImageFiles && newImageFiles.length > 0) {
        for (let i = 0; i < newImageFiles.length; i++) {
            formData.append('ImageProofs', newImageFiles[i]);
        }
    }

    // ✅ ALTERAÇÃO: A lógica para adicionar a categoria ao FormData agora é incondicional.
    const categoryCell = row.querySelector('[data-field="category"]');
    const newCategoryId = categoryCell?.dataset.newCategoryId;
    if (newCategoryId) {
        formData.append('CategoryId', newCategoryId);
    } else if (originalItem.categoryId) {
        formData.append('CategoryId', originalItem.categoryId);
    }

    // A lógica para cliente continua condicional ao tipo.
    if (originalItem.type === 1) {
        const customerCell = row.querySelector('[data-field="customer"]');
        const newCustomerId = customerCell?.dataset.newCustomerId;
        if (newCustomerId) {
            formData.append('CustomerId', newCustomerId);
        } else if (originalItem.customerId) {
            formData.append('CustomerId', originalItem.customerId);
        }
    }

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            alert('Lançamento atualizado com sucesso!');
            delete originalRowHTML_Launch[launchId];
            proofsToDeleteForEdit = [];
            currentEditingLaunchId = null;
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({
                title: "Erro ao Salvar",
                detail: "Ocorreu um erro inesperado."
            }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
        cancelLaunchEdit(launchId);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            saveBtn.classList.remove("loading");
        }
    }
};


window.deleteLaunch = async (launchId) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/financial/launch/${launchId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            alert('Lançamento excluído com sucesso!');
            fetchAndRenderHistory(currentHistoryPage);
        } else {
            const errorData = await response.json().catch(() => ({ title: "Erro ao Excluir" }));
            showErrorModal(errorData);
        }
    } catch (error) {
        showErrorModal({ title: "Erro de Conexão", detail: error.message });
    }
};

window.cancelLaunchEdit = (launchId) => {
    const row = document.getElementById(`row-launch-${launchId}`);
    if (row && originalRowHTML_Launch[launchId]) {
        row.innerHTML = originalRowHTML_Launch[launchId];
        delete originalRowHTML_Launch[launchId];
    }
    proofsToDeleteForEdit = []; 
    currentEditingLaunchId = null;
};


// =======================================================
// FUNÇÕES AUXILIARES DE LIMPEZA
// =======================================================
function resetFormCompletely() {
    const form = document.getElementById('launchForm');
    if(form) form.reset();
    
    launchFiles = [];
    renderFilePreviews();
    
    const launchDateInput = document.getElementById('launchDate');
    if(launchDateInput) launchDateInput.value = new Date().toISOString().split('T')[0];
    
    resetClientSelection();
    resetCategorySelection();
    resetSelectsToDefault();
}
function resetClientSelection() {
    const customerIdInput = document.getElementById('customerId');
    const customerNameSpan = document.getElementById('selectedCustomerName');
    if(customerIdInput) customerIdInput.value = '';
    if(customerNameSpan) customerNameSpan.textContent = 'Nenhum cliente selecionado';
}
function resetCategorySelection() {
    const categoryIdInput = document.getElementById('categoryId');
    const categoryNameSpan = document.getElementById('selectedCategoryName');
    if(categoryIdInput) categoryIdInput.value = '';
    if(categoryNameSpan) categoryNameSpan.textContent = 'Nenhuma categoria selecionada';
}
function resetSelectsToDefault() {
    const paymentSelect = document.getElementById('paymentMethod');
    const statusSelect = document.getElementById('status');
    const dueDateGroup = document.getElementById('group-dueDate');
    if (paymentSelect && paymentSelect.options.length > 0) paymentSelect.selectedIndex = 0;
    if (statusSelect) statusSelect.value = '1';
    if (dueDateGroup) dueDateGroup.style.display = 'none';
}
function resetFormOnTypeChange() {
    resetFormCompletely();
}

// Chamar a inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initDynamicForm);