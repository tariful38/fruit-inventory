// Backend API address.
// "/fruits" works when the page is opened from the FastAPI server (http://127.0.0.1:8000).
// If you open the HTML with Live Server, use: "http://127.0.0.1:8000/fruits"
const API_URL = "http://127.0.0.1:8000/fruits";

// null = adding a new fruit, a string = editing that SKU
let editingSku = null;


// ==========================================
// PART 1: API functions (one per CRUD action)
// ==========================================

// Sends the request; if the server says "error" we throw it so the page can show it
async function request(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(getErrorText(error));
    }
    if (response.status === 204) return null;   // delete returns nothing
    return response.json();
}

function jsonOptions(method, body) {
    return { method: method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// READ (all)  GET /fruits?search=..
function getFruits(search = "") {
    return request(search ? API_URL + "?search=" + encodeURIComponent(search) : API_URL);
}

// READ (one)  GET /fruits/{sku}
function getFruit(sku) {
    return request(API_URL + "/" + encodeURIComponent(sku));
}

// CREATE      POST /fruits
function createFruit(data) {
    return request(API_URL, jsonOptions("POST", data));
}

// UPDATE      PATCH /fruits/{sku}
function updateFruit(sku, data) {
    return request(API_URL + "/" + encodeURIComponent(sku), jsonOptions("PATCH", data));
}

// DELETE      DELETE /fruits/{sku}
function deleteFruit(sku) {
    return request(API_URL + "/" + encodeURIComponent(sku), { method: "DELETE" });
}

// STOCK IN / OUT   POST /fruits/{sku}/add-stock  and  /remove-stock
function addStock(sku, kg) {
    return request(API_URL + "/" + encodeURIComponent(sku) + "/add-stock", jsonOptions("POST", { quantity_kg: kg }));
}
function removeStock(sku, kg) {
    return request(API_URL + "/" + encodeURIComponent(sku) + "/remove-stock", jsonOptions("POST", { quantity_kg: kg }));
}


// ==========================================
// PART 2: Page functions
// ==========================================

// Makes text safe to put inside HTML (so a name like <b>x</b> can't break the page)
function esc(text) {
    return String(text)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getErrorText(error) {
    if (!error.detail) return "Request failed";
    if (typeof error.detail === "string") return error.detail;
    return error.detail.map(e => e.loc[e.loc.length - 1] + ": " + e.msg).join(", ");
}


// Show all fruits in the table
async function loadFruits() {
    try {
        const fruits = await getFruits(document.getElementById("search").value.trim());

        let rows = "";
        for (const f of fruits) {
            rows += `
                <tr>
                    <td>${esc(f.sku)}</td>
                    <td>${esc(f.name)}</td>
                    <td>${esc(f.category)}</td>
                    <td>${esc(f.origin)}</td>
                    <td>${f.quantity_kg}</td>
                    <td>${f.price_per_kg}</td>
                    <td>${f.reorder_level}</td>
                    <td>${f.expiry_date ?? "-"}</td>
                    <td>${f.total_value}</td>
                    <td>${esc(f.status)}</td>
                    <td>
                        <button class="btn btn-outline-success btn-sm" data-action="add" data-sku="${esc(f.sku)}">+ Stock</button>
                        <button class="btn btn-outline-secondary btn-sm" data-action="remove" data-sku="${esc(f.sku)}">- Stock</button>
                        <button class="btn btn-warning btn-sm" data-action="edit" data-sku="${esc(f.sku)}">Edit</button>
                        <button class="btn btn-danger btn-sm" data-action="delete" data-sku="${esc(f.sku)}">Delete</button>
                    </td>
                </tr>
            `;
        }
        document.getElementById("fruit-table").innerHTML = rows;
    } catch (error) {
        alert("Could not load fruits: " + error.message);
    }
}


// Save button: createFruit() or updateFruit()
async function handleSubmit(event) {
    event.preventDefault();   // stop the page from reloading

    const fruit = {
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
        if (editingSku === null) await createFruit(fruit);
        else await updateFruit(editingSku, fruit);

        alert("Saved!");
        document.getElementById("fruit-form").reset();   // clear the form
        document.getElementById("sku").disabled = false;
        editingSku = null;
        document.getElementById("form-title").innerText = "Add Fruit";
        loadFruits();
    } catch (error) {
        alert("Error: " + error.message);
    }
}


// Edit button: getFruit() then put the data into the form
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

        document.getElementById("sku").disabled = true;   // SKU can't be changed
        editingSku = sku;
        document.getElementById("form-title").innerText = "Edit Fruit (" + sku + ")";
    } catch (error) {
        alert("Error: " + error.message);
    }
}


// Delete button: deleteFruit()
async function handleDelete(sku) {
    if (!confirm("Delete this fruit?")) return;
    try {
        await deleteFruit(sku);
        loadFruits();
    } catch (error) {
        alert("Error: " + error.message);
    }
}


// + Stock / - Stock buttons: addStock() or removeStock()
async function handleStock(sku, action) {
    const text = prompt(action === "add" ? "How many kg to ADD?" : "How many kg to REMOVE?");
    if (text === null) return;

    const kg = Number(text);
    if (!(kg > 0)) { alert("Please enter a number greater than 0"); return; }

    try {
        if (action === "add") await addStock(sku, kg);
        else await removeStock(sku, kg);
        loadFruits();
    } catch (error) {
        alert("Error: " + error.message);
    }
}


// ---------- Connect the page to the functions above ----------
document.getElementById("fruit-form").addEventListener("submit", handleSubmit);
document.getElementById("search").addEventListener("input", loadFruits);

document.getElementById("fruit-table").addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const sku = button.dataset.sku;
    const action = button.dataset.action;
    if (action === "edit") startEdit(sku);
    if (action === "delete") handleDelete(sku);
    if (action === "add" || action === "remove") handleStock(sku, action);
});

// Show the fruits when the page opens
loadFruits();
