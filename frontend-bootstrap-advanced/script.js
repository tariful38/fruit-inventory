// ==========================================
// script.js  ->  Calls the backend API from the frontend
// Part 1: API functions (one function per CRUD action)
// Part 2: Page functions (read the form, draw the table, show messages)
// ==========================================

// Address of the backend.
// "/fruits" works when the page is opened from the FastAPI server (http://127.0.0.1:8000).
// If you open the HTML with Live Server, use: "http://127.0.0.1:8000/fruits"
const API_URL = "/fruits";


// ==========================================
// PART 1: API functions
// ==========================================

// One helper that sends the request and turns errors into a normal JavaScript Error
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        let error = {};
        try { error = await response.json(); } catch (e) { /* no JSON body */ }
        throw new Error(getErrorText(error));
    }
    if (response.status === 204) return null;   // 204 = success, nothing to return (delete)
    return response.json();
}

// Builds the options for requests that send JSON
function jsonOptions(method, body) {
    return {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

// READ (all)   GET /fruits?search=..&category=..&status=..
function getFruits(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);   // skip empty filters
    }
    const query = params.toString();
    return request(query ? `${API_URL}?${query}` : API_URL);
}

// READ (one)   GET /fruits/{sku}
function getFruit(sku) {
    return request(`${API_URL}/${encodeURIComponent(sku)}`);
}

// CREATE       POST /fruits
function createFruit(data) {
    return request(API_URL, jsonOptions("POST", data));
}

// UPDATE       PATCH /fruits/{sku}
function updateFruit(sku, data) {
    return request(`${API_URL}/${encodeURIComponent(sku)}`, jsonOptions("PATCH", data));
}

// DELETE       DELETE /fruits/{sku}
function deleteFruit(sku) {
    return request(`${API_URL}/${encodeURIComponent(sku)}`, { method: "DELETE" });
}

// STOCK IN     POST /fruits/{sku}/add-stock
function addStock(sku, kg) {
    return request(`${API_URL}/${encodeURIComponent(sku)}/add-stock`, jsonOptions("POST", { quantity_kg: kg }));
}

// STOCK OUT    POST /fruits/{sku}/remove-stock
function removeStock(sku, kg) {
    return request(`${API_URL}/${encodeURIComponent(sku)}/remove-stock`, jsonOptions("POST", { quantity_kg: kg }));
}

// SUMMARY      GET /fruits/summary
function getSummary() {
    return request(`${API_URL}/summary`);
}


// ==========================================
// PART 2: Page functions
// ==========================================

// Remembers which SKU is being edited (null means adding a new fruit)
let editingSku = null;


// ---------- Show the table + summary cards ----------
async function loadFruits() {
    try {
        // The filters are sent to the backend, which does the searching
        const fruits = await getFruits({
            search: document.getElementById("search").value.trim(),
            category: document.getElementById("filter-category").value,
            status: document.getElementById("filter-status").value,
        });
        showFruits(fruits);

        const s = await getSummary();
        document.getElementById("stat-total").innerText = s.total_fruits;
        document.getElementById("stat-value").innerText = s.total_value.toFixed(2);
        document.getElementById("stat-low").innerText = s.low_stock;
        document.getElementById("stat-expiring").innerText = s.expiring_or_expired;
    } catch (error) {
        showMessage("Could not load fruits: " + error.message, "danger");
    }
}

// Draw the table rows
function showFruits(fruits) {
    const table = document.getElementById("fruit-table");
    document.getElementById("total").innerText = fruits.length + " fruits";

    if (fruits.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    No fruits found. Add one using the form above.
                </td>
            </tr>
        `;
        return;
    }

    // data-sku / data-action are read by the click listener below
    table.innerHTML = fruits.map(f => `
        <tr>
            <td>${esc(f.sku)}</td>
            <td>${esc(f.name)}</td>
            <td>${esc(f.category)}</td>
            <td>${esc(f.origin)}</td>
            <td>${f.quantity_kg}</td>
            <td>${f.price_per_kg}</td>
            <td>${f.reorder_level}</td>
            <td>${f.expiry_date ?? "-"}</td>
            <td><strong>${f.total_value}</strong></td>
            <td><span class="badge ${getBadgeColor(f.status)}">${esc(f.status)}</span></td>
            <td class="text-nowrap">
                <button class="btn btn-outline-success btn-sm" data-action="add" data-sku="${esc(f.sku)}" title="Add stock">+ Stock</button>
                <button class="btn btn-outline-secondary btn-sm" data-action="remove" data-sku="${esc(f.sku)}" title="Remove stock">- Stock</button>
                <button class="btn btn-warning btn-sm" data-action="edit" data-sku="${esc(f.sku)}">Edit</button>
                <button class="btn btn-danger btn-sm" data-action="delete" data-sku="${esc(f.sku)}">Delete</button>
            </td>
        </tr>
    `).join("");
}


// ---------- Form submit -> createFruit() or updateFruit() ----------
async function handleSubmit(event) {
    event.preventDefault();   // stop the page from reloading

    // Build an object from the form data
    const data = {
        name: document.getElementById("name").value,
        category: document.getElementById("category").value,
        origin: document.getElementById("origin").value,
        sku: document.getElementById("sku").value.trim(),
        quantity_kg: Number(document.getElementById("quantity").value),
        price_per_kg: Number(document.getElementById("price").value),
        reorder_level: Number(document.getElementById("reorder").value),
        expiry_date: document.getElementById("expiry").value,
    };

    try {
        if (editingSku === null) {
            await createFruit(data);
            showMessage("Fruit added!", "success");
        } else {
            await updateFruit(editingSku, data);
            showMessage("Fruit updated!", "success");
        }
        resetForm();
        loadFruits();
    } catch (error) {
        showMessage("Error: " + error.message, "danger");
    }
}


// ---------- Edit button -> getFruit() then fill the form ----------
async function startEdit(sku) {
    try {
        const f = await getFruit(sku);

        document.getElementById("name").value = f.name;
        document.getElementById("category").value = f.category;
        document.getElementById("origin").value = f.origin;
        document.getElementById("sku").value = f.sku;
        document.getElementById("quantity").value = f.quantity_kg;
        document.getElementById("price").value = f.price_per_kg;
        document.getElementById("reorder").value = f.reorder_level;
        document.getElementById("expiry").value = f.expiry_date;

        // SKU can't be updated (it identifies the fruit)
        document.getElementById("sku").disabled = true;

        editingSku = sku;
        document.getElementById("form-title").innerText = "Edit Fruit (" + sku + ")";
        document.getElementById("submit-btn").innerText = "Update Fruit";
        document.getElementById("submit-btn").className = "btn btn-warning";
        document.getElementById("cancel-btn").classList.remove("d-none");

        window.scrollTo({ top: 0, behavior: "smooth" });   // scroll up to the form
    } catch (error) {
        showMessage("Error: " + error.message, "danger");
    }
}


// ---------- Delete button -> deleteFruit() ----------
async function handleDelete(sku) {
    if (!confirm("Delete fruit " + sku + "?")) return;

    try {
        await deleteFruit(sku);
        showMessage("Fruit deleted!", "success");
        if (editingSku === sku) resetForm();
        loadFruits();
    } catch (error) {
        showMessage("Error: " + error.message, "danger");
    }
}


// ---------- + Stock / - Stock buttons -> addStock() or removeStock() ----------
async function handleStock(sku, action) {
    const text = prompt(action === "add" ? "How many kg to ADD?" : "How many kg to REMOVE?");
    if (text === null) return;   // user pressed Cancel

    const kg = Number(text);
    if (!(kg > 0)) {
        showMessage("Please enter a number greater than 0", "danger");
        return;
    }

    try {
        if (action === "add") await addStock(sku, kg);
        else await removeStock(sku, kg);
        showMessage(`${kg} kg ${action === "add" ? "added to" : "removed from"} ${sku}`, "success");
        loadFruits();
    } catch (error) {
        showMessage("Error: " + error.message, "danger");
    }
}


// ---------- Small helper functions ----------

// Makes text safe to put inside HTML (so a name like <b>x</b> can't break the page)
function esc(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Clear the form and go back to "Add" mode
function resetForm() {
    document.getElementById("fruit-form").reset();
    document.getElementById("sku").disabled = false;
    editingSku = null;
    document.getElementById("form-title").innerText = "Add New Fruit";
    document.getElementById("submit-btn").innerText = "Add Fruit";
    document.getElementById("submit-btn").className = "btn btn-success";
    document.getElementById("cancel-btn").classList.add("d-none");
}

// Show a Bootstrap alert at the top. type = "success" (green) or "danger" (red)
let messageTimer = null;
function showMessage(text, type) {
    const message = document.getElementById("message");
    message.innerText = text;
    message.className = "alert alert-" + type;

    clearTimeout(messageTimer);   // so an old timer can't hide a new message
    messageTimer = setTimeout(() => message.classList.add("d-none"), 3000);
}

// Pick a badge color for each status
function getBadgeColor(status) {
    if (status === "In Stock") return "bg-success";
    if (status === "Low Stock") return "bg-warning text-dark";
    if (status === "Expiring Soon") return "bg-info text-dark";
    return "bg-danger";   // Out of Stock / Expired
}

// Turn a FastAPI error into simple text
function getErrorText(error) {
    if (!error.detail) return "Request failed";
    if (typeof error.detail === "string") return error.detail;
    // For validation errors (e.g. price = 0)
    return error.detail.map(e => e.loc[e.loc.length - 1] + ": " + e.msg).join(", ");
}


// ---------- Connect the page to the functions above ----------
document.getElementById("fruit-form").addEventListener("submit", handleSubmit);

// One listener for all buttons inside the table
document.getElementById("fruit-table").addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const sku = button.dataset.sku;
    const action = button.dataset.action;
    if (action === "edit") startEdit(sku);
    if (action === "delete") handleDelete(sku);
    if (action === "add" || action === "remove") handleStock(sku, action);
});

// Search while typing (waits 300 ms after the last key so we don't call the API on every letter)
let searchTimer = null;
document.getElementById("search").addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadFruits, 300);
});
document.getElementById("filter-category").addEventListener("change", loadFruits);
document.getElementById("filter-status").addEventListener("change", loadFruits);

// Load the fruit list as soon as the page opens
loadFruits();
