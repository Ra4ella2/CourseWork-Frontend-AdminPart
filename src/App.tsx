import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "https://mymarket.somee.com";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
  isDeleted: boolean;
  imageUrl: string | null;
  category: string;
  description: string;
};

type OrderItem = {
  productName: string;
  quantity: number;
};

type Order = {
  id: number;
  userId: string;
  createdAt: string;
  status: string;
  items: OrderItem[];
};
type CategoryItem = {
  id: number;
  name: string;
};
type UserRow = {
  id: string;
  email: string;
};

type AuthResponse = {
  accessToken?: string;
};

const ORDER_STATUSES = ["Created", "Paid", "Shipped", "Completed", "Cancelled"];

function decodeJwt(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function getRolesFromToken(token: string) {
  const p = decodeJwt(token);
  if (!p) return [];

  const roles =
    p["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
    p.role ??
    p.roles;

  if (!roles) return [];
  return Array.isArray(roles) ? roles : [roles];
}

function isAdminToken(token: string) {
  return getRolesFromToken(token).some(
    (r) => String(r).toLowerCase() === "admin"
  );
}

function normalizeProduct(raw: any): Product {
  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    name: String(raw.name ?? raw.Name ?? ""),
    price: Number(raw.price ?? raw.Price ?? 0),
    stock: Number(raw.stock ?? raw.Stock ?? 0),
    isActive: Boolean(raw.isActive ?? raw.IsActive),
    isDeleted: Boolean(raw.isDeleted ?? raw.IsDeleted),
    imageUrl: raw.imageUrl ?? raw.ImageUrl ?? null,
    category: String(raw.category ?? raw.Category ?? "Laptop"),
    description: String(raw.description ?? raw.Description ?? ""),
  };
}

function normalizeOrder(raw: any): Order {
  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    userId: String(raw.userId ?? raw.UserId ?? ""),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ""),
    status: String(raw.status ?? raw.Status ?? ""),
    items: Array.isArray(raw.items ?? raw.Items)
      ? (raw.items ?? raw.Items).map((i: any) => ({
          productName: String(i.productName ?? i.ProductName ?? ""),
          quantity: Number(i.quantity ?? i.Quantity ?? 0),
        }))
      : [],
  };
}

function normalizeUser(raw: any): UserRow {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    email: String(raw.email ?? raw.Email ?? ""),
  };
}

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [activeTab, setActiveTab] = useState<"products" | "orders" | "users">(
    "products"
  );

  const [adminInfo, setAdminInfo] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [productsStatus, setProductsStatus] = useState("");
  const [productSearchId, setProductSearchId] = useState("");
  const [productSearchName, setProductSearchName] = useState("");

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newDescription, setNewDescription] = useState("");
  const [createMsg, setCreateMsg] = useState("");
  const [createMsgType, setCreateMsgType] = useState<"" | "ok" | "error">("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersStatus, setOrdersStatus] = useState("");
  const [orderSearchId, setOrderSearchId] = useState("");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersStatus, setUsersStatus] = useState("");

  const [productRowMsg, setProductRowMsg] = useState<Record<number, string>>(
    {}
  );
  const [productRowMsgType, setProductRowMsgType] = useState<
    Record<number, "" | "ok" | "error">
  >({});

  const [orderRowMsg, setOrderRowMsg] = useState<Record<number, string>>({});
  const [orderRowMsgType, setOrderRowMsgType] = useState<
    Record<number, "" | "ok" | "error">
  >({});

  const [productDrafts, setProductDrafts] = useState<Record<number, Product>>(
    {}
  );
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<
    Record<number, string>
  >({});

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesStatus, setCategoriesStatus] = useState("");

  const [newCategory, setNewCategory] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  
  const R = {
    productsList: "/api/admin/product",
    productGetById: (id: number) => `/api/admin/product/${id}`,
    productCreate: "/api/admin/product/post",

    productPatchName: (id: number) => `/api/admin/product/${id}/name`,
    productPatchPrice: (id: number) => `/api/admin/product/${id}/price`,
    productPatchStock: (id: number) => `/api/admin/product/${id}/stock`,
    productPatchActive: (id: number) => `/api/admin/product/${id}/active`,
    productPatchImage: (id: number) => `/api/admin/product/${id}/image`,
    productPatchCategory: (id: number) => `/api/admin/product/${id}/category`,
    productPatchDescription: (id: number) => `/api/admin/product/${id}/description`,

    productDelete: (id: number) => `/api/admin/product/${id}/delete`,
    productReturn: (id: number) => `/api/admin/product/${id}/return`,

    ordersList: "/api/admin/order",
    orderGetById: (id: number) => `/api/admin/order/${id}`,
    orderPatchStatus: (id: number) => `/api/admin/order/${id}/status/`,

    categoriesList: "/api/admin/categories",
    categoryCreate: "/api/admin/categories",
    categoryUpdate: (id: number) => `/api/admin/categories/${id}`,
    categoryDelete: (id: number) => `/api/admin/categories/${id}`,

    usersList: "/api/admin/users",
  };

  useEffect(() => {
    if (!accessToken) return;

    const payload = decodeJwt(accessToken);
    const mail = payload?.email ?? payload?.unique_name ?? "";
    setAdminInfo(mail ? `👤 ${mail}` : "👤 Admin");
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    if (activeTab === "products") {
      loadProducts();
      loadCategories();
    }
    if (activeTab === "orders") loadOrders();
    if (activeTab === "users") loadUsers();
  }, [activeTab, accessToken]);

  async function apiFetch<T = any>(
    path: string,
    {
      method = "GET",
      body = null,
      auth = true,
    }: { method?: string; body?: any; auth?: boolean } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth) {
      if (!accessToken) {
        const err: any = new Error("Треба увійти");
        err.status = 401;
        throw err;
      }
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    const text = await res.text().catch(() => "");
    let data: any;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        typeof data === "string"
          ? data
          : data?.message || data?.error || text || `HTTP ${res.status}`;
      const err: any = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return data as T;
  }

  function forceRelogin() {
    setAccessToken(null);
    setAdminInfo("");
    setPassword("");
    setProducts([]);
    setOrders([]);
    setUsers([]);
    setProductsStatus("");
    setOrdersStatus("");
    setUsersStatus("");
    setLoginMsg("Сесія закінчилася — увійди знову");
  }

  async function login(e?: React.FormEvent) {
    e?.preventDefault();
    setLoginMsg("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLoginMsg("Заповни email та пароль");
      return;
    }

    try {
      const res = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        auth: false,
        body: {
          email: trimmedEmail,
          password,
        },
      });

      if (!res?.accessToken) {
        throw new Error("Немає accessToken");
      }

      if (!isAdminToken(res.accessToken)) {
        setLoginMsg("Доступ заборонено: не Admin");
        return;
      }

      setAccessToken(res.accessToken);
      setLoginMsg("");
      setActiveTab("products");
    } catch (e: any) {
      setLoginMsg(e.message || "Помилка входа");
    }
  }

  function logout() {
    setAccessToken(null);
    setAdminInfo("");
    setPassword("");
    setLoginMsg("Ви вийшли");
  }

  async function loadProducts() {
    if (!accessToken) return;

    setProductsStatus("Завантаження...");
    setProducts([]);
    setProductDrafts({});

    try {
      const list = await apiFetch<any[]>(R.productsList, { auth: true });
      const normalized = (Array.isArray(list) ? list : []).map(normalizeProduct);

      setProducts(normalized);
      setProductsStatus(`Завантажено: ${normalized.length}`);

      const drafts: Record<number, Product> = {};
      normalized.forEach((p) => {
        drafts[p.id] = { ...p };
      });
      setProductDrafts(drafts);
    } catch (e: any) {
      setProductsStatus(`Помилка: ${e.message || e}`);
      if (e.status === 401) forceRelogin();
    }
  }

  async function loadCategories() {
    try {
      const list = await apiFetch<CategoryItem[]>(R.categoriesList);
      const normalized = Array.isArray(list) ? list : [];
      setCategories(normalized);
      setCategoriesStatus(`Завантажено категорій: ${normalized.length}`);

      if (!newCategory && normalized.length > 0) {
        setNewCategory(normalized[0].name);
      }
    } catch (e: any) {
      setCategories([]);
      setCategoriesStatus(`Помилка: ${e.message || e}`);
      if (e.status === 401) forceRelogin();
    }
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoriesStatus("Введи назву категорії");
      return;
    }

    try {
      await apiFetch(R.categoryCreate, {
        method: "POST",
        body: { name },
      });

      setNewCategoryName("");
      setCategoriesStatus("Категорію додано");
      await loadCategories();
    } catch (e: any) {
      setCategoriesStatus(e.message || "Помилка створення категорії");
      if (e.status === 401) forceRelogin();
    }
  }

  async function saveCategory(id: number) {
    const name = editingCategoryName.trim();
    if (!name) {
      setCategoriesStatus("Назва категорії не може бути порожньою");
      return;
    }

    try {
      await apiFetch(R.categoryUpdate(id), {
        method: "PATCH",
        body: { name },
      });

      setEditingCategoryId(null);
      setEditingCategoryName("");
      setCategoriesStatus("Категорію оновлено");
      await loadCategories();
      await loadProducts();
    } catch (e: any) {
      setCategoriesStatus(e.message || "Помилка оновлення категорії");
      if (e.status === 401) forceRelogin();
    }
  }

  async function removeCategory(id: number) {
    try {
      await apiFetch(R.categoryDelete(id), {
        method: "DELETE",
      });

      setCategoriesStatus("Категорію видалено");
      await loadCategories();
      await loadProducts();
    } catch (e: any) {
      setCategoriesStatus(e.message || "Помилка видалення категорії");
      if (e.status === 401) forceRelogin();
    }
  }

  async function searchProductById() {
    if (!accessToken) return;

    const id = Number(productSearchId || 0);
    if (!id) {
      loadProducts();
      return;
    }

    setProductsStatus(`Пошук товара #${id}...`);
    setProducts([]);

    try {
      const product = await apiFetch<any>(R.productGetById(id), { auth: true });
      const normalized = normalizeProduct(product);
      setProducts([normalized]);
      setProductsStatus(`Знайдено товар #${id}`);
      setProductDrafts({ [normalized.id]: { ...normalized } });
    } catch (e: any) {
      if (e.status === 404) {
        setProductsStatus(`Товар #${id} не знайдено`);
        setProducts([]);
        return;
      }
      setProductsStatus(`Помилка: ${e.message || e}`);
      if (e.status === 401) forceRelogin();
    }
  }

  async function createProduct() {
    if (!accessToken) return;

    setCreateMsg("");
    setCreateMsgType("");

    const name = newName.trim();
    const price = Number(newPrice || 0);
    const stock = Number(newStock || 0);
    const imageUrl = newImageUrl.trim();

    if (!name) {
      setCreateMsg("Назва обов'язкова");
      setCreateMsgType("error");
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      setCreateMsg("Ціна некоректна");
      setCreateMsgType("error");
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      setCreateMsg("Залишок некоректний");
      setCreateMsgType("error");
      return;
    }

    try {
      await apiFetch(R.productCreate, {
        method: "POST",
        auth: true,
        body: {
          name,
          price,
          stock,
          imageUrl: imageUrl || null,
          isActive: newActive,
          category: newCategory,
          description: newDescription.trim(),
        },
      });

      setCreateMsg("Створено!");
      setCreateMsgType("ok");

      setNewName("");
      setNewPrice("");
      setNewStock("");
      setNewImageUrl("");
      setNewActive(true);
      setProductSearchId("");
      setNewCategory("Laptop");
      setNewDescription("");

      await loadProducts();
    } catch (e: any) {
      setCreateMsg(e.message || "Помилка створення");
      setCreateMsgType("error");
      if (e.status === 401) forceRelogin();
    }
  }

  function updateProductDraft(
    id: number,
    field: keyof Product,
    value: string | number | boolean | null
  ) {
    setProductDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  }

  async function saveProduct(id: number) {
    const draft = productDrafts[id];
    if (!draft) return;

    setProductRowMsg((prev) => ({ ...prev, [id]: "" }));
    setProductRowMsgType((prev) => ({ ...prev, [id]: "" }));

    try {
      await apiFetch(R.productPatchName(id), {
        method: "PATCH",
        auth: true,
        body: { name: draft.name.trim() },
      });

      await apiFetch(R.productPatchPrice(id), {
        method: "PATCH",
        auth: true,
        body: { price: Number(draft.price) },
      });

      await apiFetch(R.productPatchStock(id), {
        method: "PATCH",
        auth: true,
        body: { stock: Number(draft.stock) },
      });

      await apiFetch(R.productPatchActive(id), {
        method: "PATCH",
        auth: true,
        body: { isActive: !!draft.isActive },
      });

      await apiFetch(R.productPatchImage(id), {
        method: "PATCH",
        auth: true,
        body: { imageUrl: draft.imageUrl?.trim() || null },
      });

      await apiFetch(R.productPatchCategory(id), {
        method: "PATCH",
        auth: true,
        body: { category: draft.category },
      });

      await apiFetch(R.productPatchDescription(id), {
        method: "PATCH",
        auth: true,
        body: { description: draft.description ?? "" },
      });

      setProductRowMsg((prev) => ({ ...prev, [id]: "Збережено!" }));
      setProductRowMsgType((prev) => ({ ...prev, [id]: "ok" }));

      const currentSearch = Number(productSearchId || 0);
      if (currentSearch) {
        await searchProductById();
      } else {
        await loadProducts();
      }
    } catch (e: any) {
      setProductRowMsg((prev) => ({ ...prev, [id]: e.message || "Помилка" }));
      setProductRowMsgType((prev) => ({ ...prev, [id]: "error" }));
      if (e.status === 401) forceRelogin();
    }
  }

  async function deleteProduct(id: number) {
    setProductRowMsg((prev) => ({ ...prev, [id]: "" }));
    setProductRowMsgType((prev) => ({ ...prev, [id]: "" }));

    try {
      await apiFetch(R.productDelete(id), {
        method: "DELETE",
        auth: true,
      });

      setProductRowMsg((prev) => ({ ...prev, [id]: "Видалено!" }));
      setProductRowMsgType((prev) => ({ ...prev, [id]: "ok" }));

      const currentSearch = Number(productSearchId || 0);
      if (currentSearch) {
        await searchProductById();
      } else {
        await loadProducts();
      }
    } catch (e: any) {
      setProductRowMsg((prev) => ({ ...prev, [id]: e.message || "Помилка" }));
      setProductRowMsgType((prev) => ({ ...prev, [id]: "error" }));
      if (e.status === 401) forceRelogin();
    }
  }

  async function returnProduct(id: number) {
    setProductRowMsg((prev) => ({ ...prev, [id]: "" }));
    setProductRowMsgType((prev) => ({ ...prev, [id]: "" }));

    try {
      await apiFetch(R.productReturn(id), {
        method: "PATCH",
        auth: true,
      });

      setProductRowMsg((prev) => ({ ...prev, [id]: "Відновлено!" }));
      setProductRowMsgType((prev) => ({ ...prev, [id]: "ok" }));

      const currentSearch = Number(productSearchId || 0);
      if (currentSearch) {
        await searchProductById();
      } else {
        await loadProducts();
      }
    } catch (e: any) {
      setProductRowMsg((prev) => ({ ...prev, [id]: e.message || "Помилка" }));
      setProductRowMsgType((prev) => ({ ...prev, [id]: "error" }));
      if (e.status === 401) forceRelogin();
    }
  }

  async function loadOrders() {
    if (!accessToken) return;

    setOrdersStatus("Завантаження...");
    setOrders([]);
    setOrderStatusDrafts({});

    try {
      const list = await apiFetch<any[]>(R.ordersList, { auth: true });
      const normalized = (Array.isArray(list) ? list : []).map(normalizeOrder);

      setOrders(normalized);
      setOrdersStatus(`Завантажено: ${normalized.length}`);

      const drafts: Record<number, string> = {};
      normalized.forEach((o) => {
        drafts[o.id] = o.status;
      });
      setOrderStatusDrafts(drafts);
    } catch (e: any) {
      setOrdersStatus(`Помилка: ${e.message || e}`);
      if (e.status === 401) forceRelogin();
    }
  }

  async function searchOrderById() {
    if (!accessToken) return;

    const id = Number(orderSearchId || 0);
    if (!id) {
      loadOrders();
      return;
    }

    setOrdersStatus(`Пошук заказа #${id}...`);
    setOrders([]);

    try {
      const order = await apiFetch<any>(R.orderGetById(id), { auth: true });
      const normalized = normalizeOrder(order);

      setOrders([normalized]);
      setOrdersStatus(`Знайдено заказ #${id}`);
      setOrderStatusDrafts({ [normalized.id]: normalized.status });
    } catch (e: any) {
      if (e.status === 404) {
        setOrdersStatus(`Заказ #${id} не знайдено`);
        setOrders([]);
        return;
      }
      setOrdersStatus(`Помилка: ${e.message || e}`);
      if (e.status === 401) forceRelogin();
    }
  }

  async function saveOrderStatus(id: number) {
    const status = orderStatusDrafts[id];

    setOrderRowMsg((prev) => ({ ...prev, [id]: "" }));
    setOrderRowMsgType((prev) => ({ ...prev, [id]: "" }));

    try {
      await apiFetch(R.orderPatchStatus(id), {
        method: "PATCH",
        auth: true,
        body: { status },
      });

      setOrderRowMsg((prev) => ({ ...prev, [id]: "Оновлено!" }));
      setOrderRowMsgType((prev) => ({ ...prev, [id]: "ok" }));

      const currentSearch = Number(orderSearchId || 0);
      if (currentSearch) {
        await searchOrderById();
      } else {
        await loadOrders();
      }
    } catch (e: any) {
      setOrderRowMsg((prev) => ({ ...prev, [id]: e.message || "Помилка" }));
      setOrderRowMsgType((prev) => ({ ...prev, [id]: "error" }));
      if (e.status === 401) forceRelogin();
    }
  }

  async function loadUsers() {
    if (!accessToken) return;

    setUsersStatus("Завантаження...");
    setUsers([]);

    try {
      const list = await apiFetch<any[]>(R.usersList, { auth: true });
      const normalized = (Array.isArray(list) ? list : []).map(normalizeUser);

      setUsers(normalized);
      setUsersStatus(`Завантажено: ${normalized.length}`);
    } catch (e: any) {
      setUsersStatus(`Помилка: ${e.message || e}`);
      if (e.status === 401) forceRelogin();
    }
  }
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearchName.trim().toLowerCase())
  );

  if (!accessToken) {
    return (
      <>
        <section id="loginScreen" className="screen">
          <div className="authCard">
            <div className="authTitle">eMarket • Admin</div>
            <div className="muted small">
              Вхід тільки для ролі <b>Admin</b>
            </div>

            <form className="authForm" onSubmit={login}>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="admin@site.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <button className="btn primary" type="submit">
                Увійти
              </button>
            </form>

            <div className={`hint ${loginMsg ? "error" : ""}`}>{loginMsg}</div>

            <div className="hint small">
              Якщо ти не адмін — відкрий користувацький сайт.
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section id="adminPanel" className="screen">
        <header className="topbar">
          <div className="brand">eMarket • Admin</div>

          <div className="actions">
            <div className="adminInfo">{adminInfo}</div>
            <button className="btn" type="button" onClick={logout}>
              Вихід
            </button>
          </div>
        </header>

        <main className="container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === "products" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("products")}
            >
              Товари
            </button>
            <button
              className={`tab ${activeTab === "orders" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("orders")}
            >
              Замовлення
            </button>
            <button
              className={`tab ${activeTab === "users" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("users")}
            >
              Користувачі
            </button>
          </div>

          {activeTab === "products" && (
            <section className="panel">
              <div className="row">
                <h1 className="title">Товари</h1>

                <div className="row innerActions productSearchBar">
                  <input
                    type="number"
                    placeholder="ID товару..."
                    className="searchIdInput"
                    value={productSearchId}
                    onChange={(e) => setProductSearchId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") searchProductById();
                    }}
                  />

                  <button className="btn" type="button" onClick={searchProductById}>
                    Знайти по ID
                  </button>

                  <input
                    type="text"
                    placeholder="Пошук по назві..."
                    className="searchNameInput"
                    value={productSearchName}
                    onChange={(e) => setProductSearchName(e.target.value)}
                  />

                  <button className="btn" type="button" onClick={loadProducts}>
                    Оновити
                  </button>
                </div>
              </div>

              <div className="muted small">{productsStatus}</div>

              <div className="card">
                <div className="cardTitle">Додати товар</div>

                <div className="formGrid">
                  <label>
                    Назва
                    <input
                      type="text"
                      placeholder="iPhone 15"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </label>

                  <label>
                    Ціна
                    <input
                      type="number"
                      placeholder="1000"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                    />
                  </label>

                  <label>
                    Кількість
                    <input
                      type="number"
                      placeholder="10"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                    />
                  </label>

                  <label className="fullWidth">
                    Image URL
                    <input
                      type="text"
                      placeholder="https://..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                    />
                  </label>

                  <label>
                    Категорія
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="fullWidth">
                    Опис
                    <textarea
                      rows={4}
                      placeholder="Опис товару..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </label>

                  <label className="checkboxLine">
                    <input
                      type="checkbox"
                      checked={newActive}
                      onChange={(e) => setNewActive(e.target.checked)}
                    />
                    <span>Активний</span>
                  </label>
                </div>

                <div className="row">
                  <button className="btn primary" type="button" onClick={createProduct}>
                    Створити
                  </button>
                </div>

                <div className={`hint ${createMsgType}`}>{createMsg}</div>
                <div className="card">
                  <div className="cardTitle">Категорії</div>

                  <div className="row innerActions categoryCreateRow">
                    <input
                      type="text"
                      placeholder="Нова категорія..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button className="btn" type="button" onClick={createCategory}>
                      Додати категорію
                    </button>
                  </div>

                  <div className="muted small">{categoriesStatus}</div>

                  <div className="categoriesList">
                    {categories.map((c) => (
                      <div key={c.id} className="categoryRow">
                        {editingCategoryId === c.id ? (
                          <>
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                            />
                            <button className="btn success" type="button" onClick={() => saveCategory(c.id)}>
                              Зберегти
                            </button>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(null);
                                setEditingCategoryName("");
                              }}
                            >
                              Скасувати
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="categoryName">{c.name}</div>
                            <div className="categoryActions">
                              <button
                                className="btn"
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(c.id);
                                  setEditingCategoryName(c.name);
                                }}
                              >
                                Редагувати
                              </button>
                              <button
                                className="btn danger"
                                type="button"
                                onClick={() => removeCategory(c.id)}
                              >
                                Видалити
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tableWrap">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Фото</th>
                      <th>Назва</th>
                      <th>Ціна</th>
                      <th>Залишок</th>
                      <th>Активний</th>
                      <th>Видалений</th>
                      <th>Image URL</th>
                      <th>Категорія</th>
                      <th>Description</th>
                      <th>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length ? (
                      filteredProducts.map((p) => {
                        const d = productDrafts[p.id] ?? p;
                        return (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>
                              {d.imageUrl ? (
                                <img
                                  src={d.imageUrl}
                                  alt={d.name}
                                  className="tableImage"
                                />
                              ) : (
                                <div className="noImage">Нема</div>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={d.name}
                                onChange={(e) =>
                                  updateProductDraft(p.id, "name", e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={d.price}
                                onChange={(e) =>
                                  updateProductDraft(
                                    p.id,
                                    "price",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={d.stock}
                                onChange={(e) =>
                                  updateProductDraft(
                                    p.id,
                                    "stock",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={!!d.isActive}
                                onChange={(e) =>
                                  updateProductDraft(
                                    p.id,
                                    "isActive",
                                    e.target.checked
                                  )
                                }
                              />
                            </td>
                            <td>{p.isDeleted ? "Так" : "Ні"}</td>
                            <td>
                              <input
                                type="text"
                                value={d.imageUrl ?? ""}
                                onChange={(e) =>
                                  updateProductDraft(
                                    p.id,
                                    "imageUrl",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <select
                                value={d.category}
                                onChange={(e) =>
                                  updateProductDraft(p.id, "category", e.target.value)
                                }
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <textarea
                                rows={4}
                                className="tableDescription"
                                value={d.description ?? ""}
                                onChange={(e) =>
                                  updateProductDraft(p.id, "description", e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <div className="tableActions">
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => saveProduct(p.id)}
                                >
                                  Зберегти
                                </button>

                                {!p.isDeleted ? (
                                  <button
                                    className="btn danger"
                                    type="button"
                                    onClick={() => deleteProduct(p.id)}
                                  >
                                    Видалити
                                  </button>
                                ) : (
                                  <button
                                    className="btn success"
                                    type="button"
                                    onClick={() => returnProduct(p.id)}
                                  >
                                    Повернути
                                  </button>
                                )}
                              </div>

                              <div className={`hint ${productRowMsgType[p.id] || ""}`}>
                                {productRowMsg[p.id] || ""}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={11}>
                          <div className="muted">Товарів немає</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "orders" && (
            <section className="panel">
              <div className="row">
                <h1 className="title">Замовлення</h1>

                <div className="row innerActions">
                  <input
                    type="number"
                    placeholder="ID заказа..."
                    className="searchIdInput"
                    value={orderSearchId}
                    onChange={(e) => setOrderSearchId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") searchOrderById();
                    }}
                  />
                  <button className="btn" type="button" onClick={searchOrderById}>
                    Знайти
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setOrderSearchId("");
                      loadOrders();
                    }}
                  >
                    Скинути
                  </button>
                  <button className="btn" type="button" onClick={loadOrders}>
                    Оновити
                  </button>
                </div>
              </div>

              <div className="muted small">{ordersStatus}</div>

              <div className="ordersList">
                {orders.length ? (
                  orders.map((o) => (
                    <div className="orderCard" key={o.id}>
                      <div className="orderTop">
                        <div>
                          <div className="orderTitle">Замовлення #{o.id}</div>
                          <div className="muted small">
                            UserId: {o.userId || "—"}
                          </div>
                          <div className="muted small">
                            Створено:{" "}
                            {o.createdAt
                              ? new Date(o.createdAt).toLocaleString()
                              : "—"}
                          </div>
                        </div>

                        <div className="orderControls">
                          <select
                            value={orderStatusDrafts[o.id] ?? o.status}
                            onChange={(e) =>
                              setOrderStatusDrafts((prev) => ({
                                ...prev,
                                [o.id]: e.target.value,
                              }))
                            }
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>

                          <button
                            className="btn primary"
                            type="button"
                            onClick={() => saveOrderStatus(o.id)}
                          >
                            Зберегти статус
                          </button>
                        </div>
                      </div>

                      <div className="itemsList">
                        {o.items.length ? (
                          o.items.map((item, idx) => (
                            <div className="itemRow" key={`${o.id}-${idx}`}>
                              <span>{item.productName}</span>
                              <span>x{item.quantity}</span>
                            </div>
                          ))
                        ) : (
                          <div className="muted">Немає позицій</div>
                        )}
                      </div>

                      <div className={`hint ${orderRowMsgType[o.id] || ""}`}>
                        {orderRowMsg[o.id] || ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="muted">Замовлень немає</div>
                )}
              </div>
            </section>
          )}

          {activeTab === "users" && (
            <section className="panel">
              <div className="row">
                <h1 className="title">Користувачі</h1>

                <div className="row innerActions">
                  <button className="btn" type="button" onClick={loadUsers}>
                    Оновити
                  </button>
                </div>
              </div>

              <div className="muted small">{usersStatus}</div>

              <div className="tableWrap">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length ? (
                      users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.email}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2}>
                          <div className="muted">Користувачів немає</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </section>
    </>
  );
}