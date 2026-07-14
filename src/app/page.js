"use client";

import React, { useState, useEffect } from "react";

export default function Home() {
  // --- States ---
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState("mock"); // "mock" | "live"
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"
  
  // Drawer states
  const [activeItem, setActiveItem] = useState(null); // Selected item for details/edit
  const [isCreateOpen, setIsCreateOpen] = useState(false); // Create drawer toggle
  
  // Forms states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState("Open");
  const [newOwner, setNewOwner] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newCategory, setNewCategory] = useState("Software");
  const [newReporter, setNewReporter] = useState("");
  const [newNote, setNewNote] = useState("");
  
  // Details update states
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateOwner, setUpdateOwner] = useState("");
  const [updatePriority, setUpdatePriority] = useState("");
  const [updateCategory, setUpdateCategory] = useState("");
  const [updateNote, setUpdateNote] = useState("");

  // Config settings overrides
  const [showGetUrlWarn, setShowGetUrlWarn] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // --- Fetching Data ---
  const fetchPunchlist = async (showToast = false) => {
    setIsLoading(true);
    try {
      // Build request headers to send GET url override if set in client storage
      const headers = {};
      const savedGetUrl = localStorage.getItem("getUrlOverride");
      if (savedGetUrl) {
        headers["x-get-url"] = savedGetUrl;
      }

      const res = await fetch("/api/punchlist", { headers });
      if (!res.ok) {
        throw new Error(`Failed to load data (HTTP ${res.status})`);
      }
      
      const json = await res.json();
      setMode(json.mode);
      setItems(json.data || []);
      
      if (json.mode === "mock" && !savedGetUrl) {
        setShowGetUrlWarn(true);
      } else {
        setShowGetUrlWarn(false);
      }

      if (showToast) {
        addToast("Data synced successfully", "success");
      }
    } catch (err) {
      console.error(err);
      addToast(err.message || "Failed to load punchlist items", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPunchlist();
  }, []);

  // --- Actions ---
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      addToast("Title and Description are required", "error");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: newTitle,
        description: newDescription,
        status: newStatus,
        task_owner: newOwner,
        target_closed_date: newTargetDate,
        // Enhanced optional fields
        priority: newPriority,
        category: newCategory,
        reported_by: newReporter || "Web Dashboard",
        note: newNote
      };

      const res = await fetch("/api/punchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to submit punchlist creation request.");
      }

      const result = await res.json();
      addToast(result.message || "Punchlist created successfully", "success");
      
      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewStatus("Open");
      setNewOwner("");
      setNewTargetDate("");
      setNewPriority("Medium");
      setNewCategory("Software");
      setNewReporter("");
      setNewNote("");
      
      setIsCreateOpen(false);
      // Reload list
      fetchPunchlist();
    } catch (err) {
      console.error(err);
      addToast(err.message || "Failed to create punchlist", "error");
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    setIsLoading(true);
    try {
      const payload = {
        id: activeItem.id,
        status: updateStatus,
        task_owner: updateOwner,
        note: updateNote,
        // Enhanced optional fields for mock state sync
        priority: updatePriority,
        category: updateCategory
      };

      const res = await fetch("/api/punchlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to update punchlist status.");
      }

      const result = await res.json();
      addToast(result.message || "Status updated successfully", "success");
      
      setActiveItem(null);
      fetchPunchlist();
    } catch (err) {
      console.error(err);
      addToast(err.message || "Failed to update punchlist", "error");
      setIsLoading(false);
    }
  };

  const openItemDetails = (item) => {
    setActiveItem(item);
    setUpdateStatus(item.status);
    setUpdateOwner(item.task_owner || "");
    setUpdatePriority(item.priority || "Medium");
    setUpdateCategory(item.category || "Software");
    setUpdateNote(item.note || "");
  };

  // Toast Utility
  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- Filtering & Computation ---
  // Ensure we match case-insensitively
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id?.toString().includes(searchQuery) ||
      item.task_owner?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus =
      statusFilter === "All" ||
      item.status?.toLowerCase() === statusFilter.toLowerCase();
      
    const matchesPriority =
      priorityFilter === "All" ||
      (item.priority || "Medium").toLowerCase() === priorityFilter.toLowerCase();

    const matchesCategory =
      categoryFilter === "All" ||
      (item.category || "Other").toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  // Calculate stats based on all items
  const stats = {
    total: items.length,
    open: items.filter(i => i.status?.toLowerCase() === "open").length,
    progress: items.filter(i => i.status?.toLowerCase() === "in progress").length,
    critical: items.filter(i => (i.priority || "Medium").toLowerCase() === "critical").length
  };

  // Group columns for Kanban board
  const kanbanColumns = [
    { title: "Open", key: "Open", class: "open" },
    { title: "In Progress", key: "In Progress", class: "progress" },
    { title: "Closed", key: "Closed", class: "closed" }
  ];

  return (
    <div className="app-container">
      {/* Toast Notification Area */}
      <div className="notification-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <i className={`fa-solid ${
              t.type === "success" ? "fa-circle-check" : 
              t.type === "error" ? "fa-circle-exclamation" : "fa-circle-info"
            }`}></i>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo-container" style={{ padding: "4px", background: "#FFFFFF" }}>
            <img src="/botsync-logo.png" alt="Botsync Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div className="brand-text">
            <h1>TCF Project PunchLists</h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {showGetUrlWarn && (
            <span style={{ fontSize: "0.8rem", color: "var(--color-progress)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <i className="fa-solid fa-triangle-exclamation"></i> Mock Database Active
            </span>
          )}
          <div className={`mode-badge ${mode}`}>
            <i className={`fa-solid ${mode === "live" ? "fa-circle-dot" : "fa-circle-pause"}`}></i>
            {mode === "live" ? "SharePoint Connected" : "Local Mock Storage"}
          </div>
        </div>
      </header>

      {/* Statistics Panels */}
      <section className="stats-container">
        <div className="stat-card total">
          <div className="stat-info">
            <div className="stat-label">Total Tracked</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-icon">
            <i className="fa-solid fa-folder-open"></i>
          </div>
        </div>
        <div className="stat-card open">
          <div className="stat-info">
            <div className="stat-label">Unassigned / Open</div>
            <div className="stat-value">{stats.open}</div>
          </div>
          <div className="stat-icon">
            <i className="fa-solid fa-circle-dot"></i>
          </div>
        </div>
        <div className="stat-card progress">
          <div className="stat-info">
            <div className="stat-label">Active / In Progress</div>
            <div className="stat-value">{stats.progress}</div>
          </div>
          <div className="stat-icon">
            <i className="fa-solid fa-spinner spinner"></i>
          </div>
        </div>

        <div className="stat-card critical">
          <div className="stat-info">
            <div className="stat-label">Blockers / Critical</div>
            <div className="stat-value">{stats.critical}</div>
          </div>
          <div className="stat-icon">
            <i className="fa-solid fa-circle-exclamation"></i>
          </div>
        </div>
      </section>

      {/* Main Grid: Sidebar Filters + Main content area */}
      <div className="dashboard-layout">
        
        {/* Sidebar Filters */}
        <aside className="sidebar-panel">
          <div className="filter-group">
            <div className="panel-title">
              <i className="fa-solid fa-magnifying-glass"></i> Search Punchlist
            </div>
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="ID, Title, Owner, Desc..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">STATUS FILTER</div>
            <div className="filter-options">
              {["All", "Open", "In Progress", "Closed"].map((status) => (
                <button
                  key={status}
                  className={`filter-btn ${statusFilter === status ? "active" : ""}`}
                  onClick={() => setStatusFilter(status)}
                >
                  <span>{status}</span>
                  <span className="badge-count">
                    {status === "All"
                      ? items.length
                      : items.filter((i) => i.status?.toLowerCase() === status.toLowerCase()).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">PRIORITY FILTER</div>
            <div className="filter-options">
              {["All", "Critical", "High", "Medium", "Low"].map((prio) => (
                <button
                  key={prio}
                  className={`filter-btn ${priorityFilter === prio ? "active" : ""}`}
                  onClick={() => setPriorityFilter(prio)}
                >
                  <span>{prio} Priority</span>
                  <span className="badge-count">
                    {prio === "All"
                      ? items.length
                      : items.filter((i) => (i.priority || "Medium").toLowerCase() === prio.toLowerCase()).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">CATEGORY FILTER</div>
            <div className="filter-options">
              {["All", "Software", "Hardware", "Safety", "Network", "Other"].map((cat) => (
                <button
                  key={cat}
                  className={`filter-btn ${categoryFilter === cat ? "active" : ""}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  <span>{cat}</span>
                  <span className="badge-count">
                    {cat === "All"
                      ? items.length
                      : items.filter((i) => (i.category || "Other").toLowerCase() === cat.toLowerCase()).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="content-area">
          
          {/* Controls toolbar */}
          <div className="controls-bar">
            <div className="view-tabs">
              <button
                className={`tab-btn ${viewMode === "kanban" ? "active" : ""}`}
                onClick={() => setViewMode("kanban")}
              >
                <i className="fa-solid fa-grip"></i> Kanban Board
              </button>
              <button
                className={`tab-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <i className="fa-solid fa-list"></i> Table View
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn-secondary" onClick={() => fetchPunchlist(true)} disabled={isLoading}>
                <i className={`fa-solid fa-rotate ${isLoading ? "spinner" : ""}`}></i> Refresh
              </button>
              <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
                <i className="fa-solid fa-plus"></i> New Punchlist
              </button>
            </div>
          </div>

          {/* Loading Screen Overlay inside view */}
          {isLoading && items.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-spinner spinner" style={{ color: "var(--accent-cyan)" }}></i>
              <h3>Loading Punchlist items</h3>
              <p>Communicating with database endpoints...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-circle-question"></i>
              <h3>No punchlist items found</h3>
              <p>Try resetting filters or searching for different terms.</p>
            </div>
          ) : viewMode === "kanban" ? (
            
            /* --- KANBAN VIEW --- */
            <div className="kanban-board">
              {kanbanColumns.map((col) => {
                const columnItems = filteredItems.filter(
                  (i) => (i.status || "Open").toLowerCase() === col.key.toLowerCase()
                );
                
                return (
                  <div key={col.key} className="kanban-column">
                    <div className="column-header">
                      <div className="column-title">
                        <span className={`column-dot ${col.class}`}></span>
                        {col.title}
                      </div>
                      <span className="badge-count">{columnItems.length}</span>
                    </div>

                    <div className="cards-container">
                      {columnItems.map((item) => {
                        const isCritical = (item.priority || "Medium").toLowerCase() === "critical";
                        return (
                          <div
                            key={item.id}
                            className={`punch-card ${isCritical ? "critical-level" : ""}`}
                            onClick={() => openItemDetails(item)}
                          >
                            <div className="card-top">
                              <span className="card-id">ID-{item.id}</span>
                              <div className="card-badges">
                                {item.priority && (
                                  <span className={`badge priority-${item.priority.toLowerCase()}`}>
                                    {item.priority}
                                  </span>
                                )}
                                {item.category && (
                                  <span className="badge category">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="card-title">{item.title}</div>
                            <div className="card-desc">{item.description}</div>

                            {item.note && (
                              <div className="card-note" style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem", background: "rgba(6, 43, 34, 0.05)", borderLeft: "2px solid var(--accent-primary)", borderRadius: "2px", margin: "0.5rem 0", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                <strong>Note:</strong> {item.note}
                              </div>
                            )}

                            <div className="card-footer">
                              <div className="card-owner">
                                <div className="avatar-circle">
                                  {(item.task_owner || "U").substring(0, 1).toUpperCase()}
                                </div>
                                <span>{item.task_owner || "Unassigned"}</span>
                              </div>

                              {item.target_closed_date && (
                                <div className="card-date">
                                  <i className="fa-regular fa-calendar"></i>
                                  <span>{item.target_closed_date}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            
            /* --- LIST/TABLE VIEW --- */
            <div className="list-view">
              <div className="table-wrapper">
                <table className="punch-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Task Owner</th>
                      <th>Target Closed Date</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} onClick={() => openItemDetails(item)}>
                        <td style={{ fontWeight: 600 }}>#{item.id}</td>
                        <td className="table-title-cell">{item.title}</td>
                        <td>
                          <span className={`badge priority-${(item.priority || "Medium").toLowerCase()}`}>
                            {item.priority || "Medium"}
                          </span>
                        </td>
                        <td>
                          <span className="badge category">{item.category || "General"}</span>
                        </td>
                        <td>
                          <span className={`badge status-${(item.status || "Open").toLowerCase().replace(" ", "-")}`}>
                            {item.status || "Open"}
                          </span>
                        </td>
                        <td>{item.task_owner || "Unassigned"}</td>
                        <td>{item.target_closed_date || "-"}</td>
                        <td style={{ fontStyle: "italic", fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.note || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- SIDEBAR DETAIL DRAWER --- */}
      <div className={`drawer-overlay ${activeItem ? "open" : ""}`} onClick={() => setActiveItem(null)}>
        <div className={`details-drawer ${activeItem ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>PUNCHLIST DETAILS</span>
              <h2>ID-{activeItem?.id}</h2>
            </div>
            <button className="btn-close" onClick={() => setActiveItem(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {activeItem && (
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="form-group">
                <label>Title</label>
                <div style={{ color: "var(--brand-primary)", fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>{activeItem.title}</div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <div style={{ color: "var(--brand-primary)", fontSize: "0.9rem", lineHeight: 1.5, background: "rgba(6, 43, 34, 0.03)", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid var(--border-color)" }}>
                  {activeItem.description}
                </div>
              </div>

              <div className="form-group">
                <label>Reported By</label>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <i className="fa-regular fa-user" style={{ marginRight: "0.5rem" }}></i>
                  {activeItem.reported_by || "SharePoint Integration"}
                </div>
              </div>

              <div className="form-group">
                <label>Target Closed Date</label>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <i className="fa-regular fa-calendar" style={{ marginRight: "0.5rem" }}></i>
                  {activeItem.target_closed_date || "Not Specified"}
                </div>
              </div>

              <hr style={{ borderColor: "var(--border-color)", margin: "0.5rem 0" }} />

              <div className="form-group">
                <label htmlFor="update-status">Current Status</label>
                <select
                  id="update-status"
                  className="form-control"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="update-owner">Task Owner (Email or Name)</label>
                <input
                  id="update-owner"
                  type="text"
                  className="form-control"
                  placeholder="e.g. engineer@company.com"
                  value={updateOwner}
                  onChange={(e) => setUpdateOwner(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="update-priority">Priority</label>
                <select
                  id="update-priority"
                  className="form-control"
                  value={updatePriority}
                  onChange={(e) => setUpdatePriority(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="update-category">Category</label>
                <select
                  id="update-category"
                  className="form-control"
                  value={updateCategory}
                  onChange={(e) => setUpdateCategory(e.target.value)}
                >
                  <option value="Software">Software</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Safety">Safety</option>
                  <option value="Network">Network</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="update-note">Note / Resolution Comments</label>
                <textarea
                  id="update-note"
                  className="form-control"
                  rows="3"
                  placeholder="Add notes or update history..."
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                />
              </div>

              <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isLoading}>
                  <i className="fa-solid fa-floppy-disk"></i> {isLoading ? "Updating..." : "Save Changes"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setActiveItem(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* --- CREATE PUNCHLIST DRAWER --- */}
      <div className={`drawer-overlay ${isCreateOpen ? "open" : ""}`} onClick={() => setIsCreateOpen(false)}>
        <div className={`details-drawer ${isCreateOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>ISSUE REPORTING</span>
              <h2>Create Punchlist</h2>
            </div>
            <button className="btn-close" onClick={() => setIsCreateOpen(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div className="form-group">
              <label htmlFor="new-title">Title *</label>
              <input
                id="new-title"
                type="text"
                className="form-control"
                placeholder="Brief issue summary"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-description">Detailed Description *</label>
              <textarea
                id="new-description"
                className="form-control"
                placeholder="Include error codes, robot status, and site layout location details..."
                required
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-status">Initial Status</label>
              <select
                id="new-status"
                className="form-control"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="new-owner">Task Owner</label>
              <input
                id="new-owner"
                type="text"
                className="form-control"
                placeholder="Responsible engineer name/email"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-reporter">Reported By</label>
              <input
                id="new-reporter"
                type="text"
                className="form-control"
                placeholder="Client contact or site inspector"
                value={newReporter}
                onChange={(e) => setNewReporter(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-target-date">Target Closed Date</label>
              <input
                id="new-target-date"
                type="date"
                className="form-control"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-priority">Priority</label>
              <select
                id="new-priority"
                className="form-control"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical (Blocker)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="new-category">Category</label>
              <select
                id="new-category"
                className="form-control"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
                <option value="Safety">Safety</option>
                <option value="Network">Network</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="new-note">Initial Note</label>
              <textarea
                id="new-note"
                className="form-control"
                rows="2"
                placeholder="Initial comments..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isLoading}>
                <i className="fa-solid fa-circle-check"></i> {isLoading ? "Submitting..." : "Submit Punchlist"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>


    </div>
  );
}
