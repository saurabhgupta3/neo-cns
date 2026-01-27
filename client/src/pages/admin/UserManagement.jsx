import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faUserShield, faSearch, faUndo, faUsers, faUserCheck, faUserTimes, faUserSlash } from "@fortawesome/free-solid-svg-icons";
import "./Admin.css";

export default function UserManagement() {
    const { authFetch } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("active"); // "all", "active", "inactive", "deleted"
    const [editModal, setEditModal] = useState({ show: false, user: null });
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        fetchUsers();
    }, [statusFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // Include deleted users when viewing deleted tab
            const includeDeleted = statusFilter === "deleted" || statusFilter === "all";
            const res = await authFetch(`/users${includeDeleted ? "?includeDeleted=true" : ""}`);
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete "${userName}"?`)) {
            return;
        }

        try {
            const res = await authFetch(`/users/${userId}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("User deleted successfully");
                fetchUsers(); // Refresh to update counts
            } else {
                const data = await res.json();
                toast.error(data.message || "Failed to delete user");
            }
        } catch (error) {
            toast.error("Error deleting user");
        }
    };

    const handleRestore = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to restore "${userName}"?`)) {
            return;
        }

        try {
            const res = await authFetch(`/users/${userId}/restore`, { method: "PUT" });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                fetchUsers(); // Refresh list
            } else {
                toast.error(data.message || "Failed to restore user");
            }
        } catch (error) {
            toast.error("Error restoring user");
        }
    };

    const handleEditClick = (user) => {
        setEditForm({
            name: user.name,
            phone: user.phone || "",
            address: user.address || "",
            role: user.role,
            isActive: user.isActive,
            isAvailable: user.isAvailable
        });
        setEditModal({ show: true, user });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`/users/${editModal.user._id}`, {
                method: "PUT",
                body: editForm
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("User updated successfully");
                setUsers(users.map(u => u._id === editModal.user._id ? data.user : u));
                setEditModal({ show: false, user: null });
            } else {
                toast.error(data.message || "Failed to update user");
            }
        } catch (error) {
            toast.error("Error updating user");
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const res = await authFetch(`/users/${userId}/role`, {
                method: "PUT",
                body: { role: newRole }
            });

            if (res.ok) {
                toast.success(`Role changed to ${newRole}`);
                setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
            } else {
                const data = await res.json();
                toast.error(data.message || "Failed to change role");
            }
        } catch (error) {
            toast.error("Error changing role");
        }
    };

    const handleToggleActive = async (userId) => {
        try {
            const res = await authFetch(`/users/${userId}/toggle-active`, {
                method: "PUT"
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setUsers(users.map(u => u._id === userId ? data.user : u));
            } else {
                toast.error(data.message || "Failed to toggle status");
            }
        } catch (error) {
            toast.error("Error toggling status");
        }
    };

    // Filter users based on status and search
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = !roleFilter || user.role === roleFilter;

        // Status filter
        let matchesStatus = true;
        if (statusFilter === "active") {
            matchesStatus = user.isActive && !user.deletedAt;
        } else if (statusFilter === "inactive") {
            matchesStatus = !user.isActive && !user.deletedAt;
        } else if (statusFilter === "deleted") {
            matchesStatus = user.deletedAt !== null;
        }

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Count stats
    const stats = {
        all: users.length,
        active: users.filter(u => u.isActive && !u.deletedAt).length,
        inactive: users.filter(u => !u.isActive && !u.deletedAt).length,
        deleted: users.filter(u => u.deletedAt).length
    };

    if (loading) {
        return (
            <div className="admin-container text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <h2 className="mb-4">
                <FontAwesomeIcon icon={faUserShield} className="me-2" />
                User Management
            </h2>

            {/* Status Filter Tabs */}
            <div className="filter-tabs mb-4">
                <button
                    className={`filter-tab ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                >
                    <FontAwesomeIcon icon={faUsers} className="me-2" />
                    All ({stats.all})
                </button>
                <button
                    className={`filter-tab ${statusFilter === "active" ? "active" : ""}`}
                    onClick={() => setStatusFilter("active")}
                >
                    <FontAwesomeIcon icon={faUserCheck} className="me-2" />
                    Active ({stats.active})
                </button>
                <button
                    className={`filter-tab ${statusFilter === "inactive" ? "active" : ""}`}
                    onClick={() => setStatusFilter("inactive")}
                >
                    <FontAwesomeIcon icon={faUserTimes} className="me-2" />
                    Inactive ({stats.inactive})
                </button>
                <button
                    className={`filter-tab ${statusFilter === "deleted" ? "active" : ""}`}
                    onClick={() => setStatusFilter("deleted")}
                >
                    <FontAwesomeIcon icon={faUserSlash} className="me-2" />
                    Deleted ({stats.deleted})
                </button>
            </div>

            {/* Search and Filter */}
            <div className="admin-search">
                <div className="position-relative flex-grow-1">
                    <FontAwesomeIcon icon={faSearch} className="position-absolute" style={{ left: '12px', top: '12px', color: '#999' }} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="courier">Courier</option>
                    <option value="user">User</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="admin-card">
                <div className="admin-card-body">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Status</th>
                                {statusFilter === "deleted" && <th>Deleted On</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={statusFilter === "deleted" ? 7 : 6} className="text-center text-muted py-4">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user._id} className={user.deletedAt ? "deleted-row" : ""}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{user.phone || "-"}</td>
                                        <td>
                                            {user.deletedAt ? (
                                                <span className={`role-badge ${user.role}`}>{user.role}</span>
                                            ) : (
                                                <select
                                                    className={`role-badge ${user.role}`}
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                    style={{ border: 'none', cursor: 'pointer' }}
                                                >
                                                    <option value="user">User</option>
                                                    <option value="courier">Courier</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            )}
                                        </td>
                                        <td>
                                            {user.deletedAt ? (
                                                <span className="status-badge cancelled">Deleted</span>
                                            ) : (
                                                <button
                                                    className={`action-btn ${user.isActive ? 'assign' : 'delete'}`}
                                                    onClick={() => handleToggleActive(user._id)}
                                                >
                                                    {user.isActive ? "Active" : "Inactive"}
                                                </button>
                                            )}
                                        </td>
                                        {statusFilter === "deleted" && (
                                            <td>
                                                {user.deletedAt ? new Date(user.deletedAt).toLocaleDateString() : "-"}
                                            </td>
                                        )}
                                        <td>
                                            {user.deletedAt ? (
                                                <button
                                                    className="action-btn assign"
                                                    onClick={() => handleRestore(user._id, user.name)}
                                                    title="Restore user"
                                                >
                                                    <FontAwesomeIcon icon={faUndo} /> Restore
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => handleEditClick(user)}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDelete(user._id, user.name)}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editModal.show && (
                <div className="modal-overlay" onClick={() => setEditModal({ show: false, user: null })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4>Edit User</h4>
                            <button className="modal-close" onClick={() => setEditModal({ show: false, user: null })}>
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Phone</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Address</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Role</label>
                                <select
                                    className="form-control"
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="courier">Courier</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn btn-primary flex-grow-1">
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setEditModal({ show: false, user: null })}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
