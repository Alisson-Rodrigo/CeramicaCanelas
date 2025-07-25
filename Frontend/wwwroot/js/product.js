console.log('Script js/product.js DEFINIDO (Paginação no Servidor).');



// Função de inicialização principal
function initDynamicForm() {
    console.log('▶️ initDynamicForm() de product.js foi chamada.');
    currentTablePage = 1;

    initializeProductForm(document.querySelector('.product-form'));
    loadProductCategories(document.querySelector('select[name="CategoryId"]'));
    initializeTableFilters();

    // Carrega categorias do filtro e depois busca os produtos
    loadProductCategories(document.querySelector('#categoryFilter'), 'Todas as Categorias')
        .then(() => {
            fetchAndRenderProducts(1);
        });
}

// Inicializa os botões de filtro e limpar
function initializeTableFilters() {
    const filterBtn = document.getElementById('filterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');

    if (filterBtn) {
        filterBtn.onclick = () => fetchAndRenderProducts(1);
    }

    if (clearFilterBtn) {
        clearFilterBtn.onclick = () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('minPriceInput').value = '';
            document.getElementById('maxPriceInput').value = '';
            document.getElementById('orderBySelect').value = 'name';
            document.getElementById('orderDirectionSelect').value = 'true';
            fetchAndRenderProducts(1);
        };
    }
}

// =======================================================
// LÓGICA DO FORMULÁRIO DE CADASTRO
// =======================================================

async function loadProductCategories(selectElement, defaultOptionText = 'Selecione uma categoria') {
    if (!selectElement) return;
    selectElement.disabled = true;
    selectElement.innerHTML = `<option value="">Carregando...</option>`;

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/categories`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        // <<< INÍCIO DA NOVA LÓGICA >>>

        // Se a resposta for bem-sucedida (status 2xx), processa normalmente.
        if (response.ok) {
            const categories = await response.json();
            
            if (!categories || categories.length === 0) {
                selectElement.innerHTML = `<option value="">Nenhuma categoria cadastrada</option>`;
                return; // Mantém o campo desabilitado.
            }

            selectElement.disabled = false;
            selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
            categories.forEach(category => {
                const option = new Option(category.name, category.id);
                selectElement.appendChild(option);
            });
            return; // Encerra a função.
        }

        // Se a resposta NÃO for bem-sucedida, lemos o corpo do erro.
        const errorData = await response.json().catch(() => null);

        // Verificamos se a mensagem de erro é a que esperamos para uma lista vazia.
        if (errorData && errorData.message === "Não há categórias cadastradas.") {
            // Se for, tratamos como um caso normal de lista vazia, sem exibir erro.
            selectElement.innerHTML = `<option value="">Nenhuma categoria cadastrada</option>`;
        } else {
            // Se for qualquer outro erro, lançamos para ser pego pelo catch.
            throw new Error(errorData?.message || `Erro ${response.status}`);
        }
        // <<< FIM DA NOVA LÓGICA >>>

    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        selectElement.innerHTML = '<option value="">Erro ao carregar</option>';
        selectElement.disabled = true;
        // Opcional: relançar o erro se a função que chama precisar saber da falha.
        // throw error; 
    }
}

function initializeProductForm(form) {
    if (!form) return;

    // --- INÍCIO DAS NOVAS LINHAS ---
    // Adiciona eventos de validação a todos os campos do formulário
    const inputs = form.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('input', () => validateField(input)); // Valida enquanto digita
        input.addEventListener('blur', () => validateField(input));  // Valida ao sair do campo
    });
    // --- FIM DAS NOVAS LINHAS ---

    form.onsubmit = (event) => {
        event.preventDefault();
        processAndSendProductData(form);
    };
}

async function processAndSendProductData(form) {
    // --- LÓGICA DE VALIDAÇÃO ATUALIZADA ---
    // Substitui a verificação manual pela verificação nativa do formulário
    if (!form.checkValidity()) {
        // Força a exibição dos estilos de erro em todos os campos inválidos
        form.querySelectorAll('.form-input').forEach(validateField);
        alert('Por favor, preencha todos os campos obrigatórios corretamente.');
        return; // Impede o envio do formulário
    }
    // --- FIM DA LÓGICA ATUALIZADA ---

    const formData = new FormData(form);
    const submitButton = form.querySelector('.submit-btn');
    const originalButtonHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="loading-spinner"></span> Salvando...`;

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData,
        });

        if (response.ok) {
            alert('Produto cadastrado com sucesso!');
            form.reset();

            // Limpa os estilos de validação após o sucesso
            form.querySelectorAll('.form-input').forEach(input => {
                input.classList.remove('is-valid', 'is-invalid');
            });

            loadProductCategories(document.querySelector('select[name="CategoryId"]'));
            fetchAndRenderProducts(1);
        } else {
            const errorData = await response.json();
            alert(`Erro: ${errorData.title || errorData.message || 'Erro ao salvar o produto.'}`);
        }
    } catch (error) {
        console.error('❌ Erro na requisição de cadastro:', error);
        alert('Falha na comunicação com o servidor.');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHTML;
    }
}


// =======================================================
// LÓGICA DA TABELA (PAGINAÇÃO E FILTROS NO SERVIDOR)
// =======================================================

async function fetchAndRenderProducts(page = 1) {
    currentTablePage = page;
    const tableBody = document.querySelector('#product-list-body');
    if (!tableBody) return;

    // <<< MODIFICAÇÃO >>> Colspan atualizado de 8 para 9 para corresponder à nova tabela
    tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Buscando...</td></tr>';

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) throw new Error("Não autenticado.");

        const orderByValue = (document.getElementById('orderBySelect')?.value || 'name').toLowerCase();
        const params = new URLSearchParams({
            Page: currentTablePage,
            PageSize: 10,
            OrderBy: orderByValue,
            Ascending: document.getElementById('orderDirectionSelect')?.value || 'true',
        });
        
        const search = document.getElementById('searchInput')?.value;
        const categoryId = document.getElementById('categoryFilter')?.value;
        const minPrice = document.getElementById('minPriceInput')?.value;
        const maxPrice = document.getElementById('maxPriceInput')?.value;

        if (search) params.append('Search', search);
        if (categoryId) params.append('CategoryId', categoryId);
        if (minPrice) params.append('MinPrice', minPrice);
        if (maxPrice) params.append('MaxPrice', maxPrice);

        const url = `${API_BASE_URL}/products/paged?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error(`Falha ao buscar produtos (Status: ${response.status})`);

        const paginatedData = await response.json();
        renderProductTable(paginatedData.items);
        renderPagination(paginatedData);

    } catch (error) {
        console.error("❌ Erro ao buscar produtos:", error);
        // <<< MODIFICAÇÃO >>> Colspan atualizado de 8 para 9
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">${error.message}</td></tr>`;
        document.getElementById('pagination-controls').innerHTML = '';
    }
}


// --- NOVA FUNÇÃO DE VALIDAÇÃO ---
function validateField(input) {
    // Limpa classes anteriores para evitar duplicidade
    input.classList.remove('is-valid', 'is-invalid');

    // checkValidity() usa os atributos do HTML (como 'required') para validar
    if (input.checkValidity()) {
        // Só marca como válido se o campo não estiver vazio
        if (input.value !== '') {
            input.classList.add('is-valid');
        }
    } else {
        // Marca como inválido se checkValidity() falhar
        input.classList.add('is-invalid');
    }
}

function renderProductTable(products) {
    const tableBody = document.querySelector('#product-list-body');
    tableBody.innerHTML = '';

    if (!products || products.length === 0) {
        // <<< MODIFICAÇÃO >>> Colspan atualizado de 8 para 9
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Nenhum produto encontrado.</td></tr>';
        return;
    }

    products.forEach(product => {
        const imageUrl = product.imageUrl || 'https://via.placeholder.com/60';
        const formattedValue = (product.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const productJsonString = JSON.stringify(product).replace(/'/g, "&apos;");
        // O HTML agora tem uma coluna para "Devolvível?", então este texto será usado.
        const isReturnableText = product.isReturnable ? 'Sim' : 'Não';

        // O HTML da linha agora inclui a célula <td> para o status "Devolvível?"
        const rowHTML = `
            <tr id="row-${product.id}">
                <td><img src="${imageUrl}" alt="${product.name}" class="product-table-img"></td>
                <td data-field="code">${product.code || 'N/A'}</td>
                <td data-field="name">${product.name}</td>
                <td data-field="category" data-category-id="${product.categoryId}">${product.categoryName || 'N/A'}</td>
                <td data-field="stock">${product.stockCurrent || 0}</td>
                <td data-field="minStock">${product.stockMinium || 0}</td>
                <td data-field="value">${formattedValue}</td>
                <td data-field="returnable">${isReturnableText}</td>
                <td class="actions-cell" data-field="actions">
                    <button class="btn-action btn-edit" onclick='editProduct(${productJsonString})'>Editar</button>
                    <button class="btn-action btn-delete" onclick="deleteProduct('${product.id}')">Excluir</button>
                </td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', rowHTML);
    });
}

function renderPagination(paginationData) {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;

    controlsContainer.innerHTML = '';
    if (!paginationData || paginationData.totalPages <= 1) return;
    
    const hasPreviousPage = paginationData.page > 1;
    const hasNextPage = paginationData.page < paginationData.totalPages;
    
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = !hasPreviousPage;
    prevButton.addEventListener('click', () => fetchAndRenderProducts(currentTablePage - 1));

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${paginationData.page} de ${paginationData.totalPages}`;
    pageInfo.className = 'pagination-info';

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próxima';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = !hasNextPage;
    nextButton.addEventListener('click', () => fetchAndRenderProducts(currentTablePage + 1));

    controlsContainer.appendChild(prevButton);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextButton);
}


// =======================================================
// LÓGICA DAS AÇÕES (EDITAR, SALVAR, CANCELAR, EXCLUIR)
// =======================================================

window.deleteProduct = async (productId) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            alert('Produto excluído com sucesso!');
            fetchAndRenderProducts(currentTablePage);
        } else {
            throw new Error('Falha ao excluir o produto.');
        }
    } catch (error) {
        alert(error.message);
    }
};

window.editProduct = async (product) => {
    const row = document.getElementById(`row-${product.id}`);
    if (!row) return;

    originalRowHTML_Product[product.id] = row.innerHTML;

    try {
        row.querySelector('[data-field="code"]').innerHTML = `<input type="text" name="Code" class="edit-input" value="${product.code || ''}">`;
        row.querySelector('[data-field="name"]').innerHTML = `<input type="text" name="Name" class="edit-input" value="${product.name}">`;
        row.querySelector('[data-field="minStock"]').innerHTML = `<input type="number" name="StockMinium" class="edit-input" value="${product.stockMinium || 0}">`;
        row.querySelector('[data-field="value"]').innerHTML = `<input type="number" step="0.01" name="Value" class="edit-input" value="${product.value || 0}">`;
        row.querySelector('[data-field="stock"]').innerHTML = `<input type="number" name="StockCurrent" class="edit-input" value="${product.stockCurrent || 0}" title="Estoque Atual (não editável)" readonly>`;

        const categoryCell = row.querySelector('[data-field="category"]');
        const categorySelect = document.createElement('select');
        categorySelect.className = 'edit-input';
        categorySelect.name = 'CategoryId';
        categoryCell.innerHTML = '';
        categoryCell.appendChild(categorySelect);
        await loadProductCategories(categorySelect);
        categorySelect.value = product.categoryId;

        // <<< MODIFICAÇÃO >>> Adicionada a edição para o campo "Devolvível?"
        const returnableCell = row.querySelector('[data-field="returnable"]');
        if (returnableCell) {
            const isReturnable = product.isReturnable;
            returnableCell.innerHTML = `
                <select name="IsReturnable" class="edit-input">
                    <option value="true" ${isReturnable ? 'selected' : ''}>Sim</option>
                    <option value="false" ${!isReturnable ? 'selected' : ''}>Não</option>
                </select>
            `;
        }

        row.querySelector('[data-field="actions"]').innerHTML = `
            <button class="btn-action btn-save" onclick="saveProductChanges('${product.id}')">Salvar</button>
            <button class="btn-action btn-cancel" onclick="cancelEditProduct('${product.id}')">Cancelar</button>
        `;
    } catch (error) {
        console.error("❌ Erro ao entrar no modo de edição:", error);
        alert("Não foi possível carregar os dados para edição. Verifique o console.");
        cancelEditProduct(product.id);
    }
};

window.saveProductChanges = async (productId) => {
    const row = document.getElementById(`row-${productId}`);
    if (!row) return;

    // --- INÍCIO DAS NOVAS LINHAS ---
    const saveButton = row.querySelector('.btn-save');
    if (saveButton) {
        saveButton.disabled = true;
        // Para um botão pequeno, só a animação já fica bom.
        saveButton.innerHTML = `<span class="loading-spinner"></span>`;
    }
    // --- FIM DAS NOVAS LINHAS ---

    const formData = new FormData();
    formData.append('Id', productId);

    const inputs = row.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.name === 'Value') {
            formData.append(input.name, input.value.replace(',', '.'));
        } else {
            formData.append(input.name, input.value);
        }
    });

    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });

        if (response.ok) {
            // Não precisa de alerta aqui, o reload da tabela já é um feedback
            fetchAndRenderProducts(currentTablePage);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao atualizar o produto.');
        }
    } catch (error) {
        alert(error.message);
        // A função cancelEditProduct já restaura a linha, então o botão de loading some.
        cancelEditProduct(productId);
    }
    // Não precisamos do bloco "finally" aqui, pois em ambos os casos (sucesso ou erro),
    // a linha da tabela é redesenhada, removendo o botão de "carregando".
};

window.cancelEditProduct = (productId) => {
    const row = document.getElementById(`row-${productId}`);
    if (row && originalRowHTML_Product[productId]) {
        row.innerHTML = originalRowHTML_Product[productId];
        delete originalRowHTML_Product[productId];
    }
};